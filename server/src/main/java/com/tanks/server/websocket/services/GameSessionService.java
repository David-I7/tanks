package com.tanks.server.websocket.services;

import com.tanks.server.entities.User;
import com.tanks.server.entities.gameResult.GameOutcome;
import com.tanks.server.entities.gameResult.GameResult;
import com.tanks.server.repositories.GameResultRepository;
import com.tanks.server.repositories.UserRepository;
import com.tanks.server.utils.IdFactory;
import com.tanks.server.websocket.dto.gameplay.OnlineDiffResponseDto;
import com.tanks.server.websocket.dto.gameplay.OnlineDiffResponsePayloads;
import com.tanks.server.websocket.dto.gameplay.OnlineGameplayProtocolVersion;
import com.tanks.server.websocket.dto.gameplay.OnlinePlayerIntentRequestPayloads;
import com.tanks.server.websocket.dto.gameplay.OnlinePlayerIntentRequestDto;
import com.tanks.server.websocket.dto.gameplay.OnlinePlayerIntentRequestType;
import com.tanks.server.websocket.dto.gameplay.OnlineStateDiffResponseType;
import com.tanks.server.websocket.dto.game.GameEventResponseDto;
import com.tanks.server.websocket.dto.game.GameEventType;
import com.tanks.server.websocket.dto.game.GameEventPayload;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.lobby.LobbyType;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.events.GameEvent;
import com.tanks.server.websocket.events.OnlineGameplayEvent;
import com.tanks.server.websocket.gameplay.simulation.GameStateResponseFactory;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.gameplay.content.GameContentCatalog;
import com.tanks.server.websocket.gameplay.simulation.GameSimulation;
import com.tanks.server.websocket.gameplay.world.InitialWorldFactory;
import com.tanks.server.websocket.repositories.GameSessionRepository;
import com.tanks.server.websocket.repositories.LobbyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class GameSessionService {
    private static final long PLAYER_A_ID = 1;
    private static final long PLAYER_B_ID = 2;

    private final GameSessionRepository gameRepository;
    private final UserSessionService userSessionService;
    private final LobbyRepository lobbyRepository;
    private final QuickMatchService quickMatchService;
    private final ApplicationEventPublisher eventPublisher;
    private final ClaimService claimService;
    private final GameContentCatalog contentCatalog;
    private final InitialWorldFactory initialWorldFactory;
    private final GameSimulation gameSimulation;
    private final GameStateResponseFactory initialStateFactory;
    private final GameResultRepository gameResultRepository;
    private final UserRepository userRepository;

    public GameSession create(Lobby lobby) {
        UserSession host = userSessionService.findById(lobby.getHost().getId());
        UserSession opponent = userSessionService.findById(lobby.getOpponent().getId());
        UserSession originalHost = new UserSession(host);
        UserSession originalOpponent = new UserSession(opponent);
        GameSession savedGameSession = null;

        try {
            UUID gameSessionId = IdFactory.randomUUID();
            long generationSeed = gameSessionId.getMostSignificantBits() ^ gameSessionId.getLeastSignificantBits();
            var content = contentCatalog.current();
            var initialWorld = initialWorldFactory.create(content, generationSeed, host.getUsername(), opponent.getUsername());
            GameSession gameSession = GameSession.builder()
                    .id(gameSessionId)
                    .hostId(host.getId())
                    .playerA(host.getUsername())
                    .playerB(opponent.getUsername())
                    .createdAt(OffsetDateTime.now())
                    .state(GameSessionState.CREATED)
                    .gameContentVersion(content.version())
                    .generationSeed(generationSeed)
                    .world(initialWorld.world())
                    .terrainModel(initialWorld.terrainModel())
                    .build();

            savedGameSession = gameRepository.save(gameSession);

            GameEventResponseDto response = new GameEventResponseDto(
                    GameEventType.GAME_CREATED,
                    new GameEventPayload(savedGameSession.getId(), savedGameSession.getHostId(), host.getUsername())
            );

            userSessionService.transitionToGame(host, savedGameSession.getId());
            userSessionService.transitionToGame(opponent, savedGameSession.getId());

            userSessionService.save(host);
            userSessionService.save(opponent);
            claimService.markUserSessionReloadRequired(host.getId());
            claimService.markUserSessionReloadRequired(opponent.getId());

            lobbyRepository.delete(lobby);
            if (lobby.getType() == LobbyType.QUICK_MATCH) {
                quickMatchService.delete(lobby);
            }

            eventPublisher.publishEvent(new GameEvent(this, host.getUsername(), "/queue/replies", response));
            eventPublisher.publishEvent(new GameEvent(this, opponent.getUsername(), "/queue/replies", response));

            log.info("Game created: {} vs {}", host.getUsername(), opponent.getUsername());
            return savedGameSession;
        } catch (RuntimeException ex) {

            claimService.deleteUserSessionReloadRequired(host.getId());
            claimService.deleteUserSessionReloadRequired(opponent.getId());
            userSessionService.save(originalHost);
            userSessionService.save(originalOpponent);

            if (savedGameSession != null) {
                deleteGameQuietly(savedGameSession);
            }

            log.error("Failed to create game", ex);
            throw ex;
        }
    }

    public void startGame(GameSession gameSession) {
        if (!GameSessionState.CREATED.equals(gameSession.getState())) {
            return;
        }

        gameSession.setStartedAt(OffsetDateTime.now());
        gameSession.setServerTick(0);
        gameSession.getWorld().match().activePlayerId(PLAYER_A_ID);
        gameSession.getWorld().match().turnNumber(1);
        gameSession.getWorld().match().turnEndsAtServerTick(
                contentCatalog.require(gameSession.getGameContentVersion()).world().tickRateHz() * 30L);
        gameSession.setNextDiffSequence(2);
        gameSession.setLastDiffServerTick(0);
        gameSession.setState(GameSessionState.STARTED);
        gameRepository.save(gameSession);

        sendInitialStateToPlayer(gameSession, gameSession.getPlayerA());
        sendInitialStateToPlayer(gameSession, gameSession.getPlayerB());

        log.debug("Game started: {} vs {}", gameSession.getPlayerA(), gameSession.getPlayerB());
    }

    public void sendInitialStateToPlayer(GameSession gameSession, String username) {
        eventPublisher.publishEvent(new OnlineGameplayEvent(
                this,
                username,
                "/queue/replies",
                initialStateFactory.createForPlayer(gameSession, localPlayerId(gameSession, username))));

        log.debug("Initial state sent to player: {}", username);
    }

    public boolean sendResyncStateToPlayer(UUID gameSessionId, String username, OnlineDiffResponsePayloads.ResyncReason reason) {
        GameSession gameSession = findById(gameSessionId);
        if (!GameSessionState.STARTED.equals(gameSession.getState())
                && !GameSessionState.ENDED.equals(gameSession.getState())) {
            return false;
        }

        eventPublisher.publishEvent(new OnlineGameplayEvent(
                this,
                username,
                "/queue/replies",
                initialStateFactory.createResyncForPlayer(gameSession, reason, localPlayerId(gameSession, username))));

        log.debug("Resync state sent to player: {}", username);
        return true;
    }

    private long localPlayerId(GameSession gameSession, String username) {
        if (gameSession.getPlayerA().equals(username)) {
            return PLAYER_A_ID;
        }
        if (gameSession.getPlayerB().equals(username)) {
            return PLAYER_B_ID;
        }
        return 0;
    }

    public boolean acceptPlayerIntent(String username, UUID gameSessionId, OnlinePlayerIntentRequestDto<?> intent) {
        if (intent == null) {
            return false;
        }

        GameSession gameSession = findById(gameSessionId);
        OnlineDiffResponsePayloads.IntentRejectionReason rejectionReason = rejectionReason(gameSession, username, intent);

        if (rejectionReason != null) {
            if (rejectionReason == OnlineDiffResponsePayloads.IntentRejectionReason.INVALID_PAYLOAD) {
                log.debug("Invalid intent payload: {}", intent);
                return false;
            }
            publishIntentRejection(gameSession, intent, rejectionReason);
            gameRepository.save(gameSession);
            log.debug("Intent rejected: {}", intent);
            return false;
        }

        if (intent.type() == OnlinePlayerIntentRequestType.MOVE && intent.payload() instanceof OnlinePlayerIntentRequestPayloads.Move move) {
            if (!publishMovementSegment(gameSession, intent, move)) {
                gameRepository.save(gameSession);
                log.debug("Movement rejected: {}", intent);
                return false;
            }
            gameRepository.save(gameSession);
            log.debug("Movement accepted: {}", intent);
            return true;
        }

        if (intent.type() == OnlinePlayerIntentRequestType.FIRE && intent.payload() instanceof OnlinePlayerIntentRequestPayloads.Fire fire) {
            publishProjectileResolution(gameSession, intent, fire);
            gameRepository.save(gameSession);
            log.debug("Projectile accepted: {}", intent);
            return true;
        }

        setUnresolvedIntent(gameSession, intent.playerId(), intent.intentId());
        gameRepository.save(gameSession);
        log.debug("Intent accepted: {}", intent);
        return true;
    }

    public boolean resolvePlayerIntent(UUID gameSessionId, long playerId, String intentId) {
        if (intentId == null) {
            return false;
        }

        GameSession gameSession = findById(gameSessionId);
        if (!intentId.equals(unresolvedIntentId(gameSession, playerId))) {
            return false;
        }

        clearUnresolvedIntent(gameSession, playerId);
        gameRepository.save(gameSession);
        return true;
    }

    public GameSession findById(UUID gameSessionId) {
        return gameRepository.findById(gameSessionId).orElseThrow(() -> new ProblemDetailException(HttpStatus.NOT_FOUND,"Game session not found", URI.create("about:blank")));
    }

    public GameSession getAndIncrementPlayerCount(UUID gameSessionId){
        GameSession gameSession = findById(gameSessionId);
        if (gameSession.getConnectedPlayerCount() >= 2)
            throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "Game session already has 2 players", URI.create("about:blank"));
        gameSession.setConnectedPlayerCount(gameSession.getConnectedPlayerCount() + 1);
        return gameRepository.save(gameSession);
    }

    public void decremenentPlayerCount(UUID gameSessionId){
        GameSession gameSession = findById(gameSessionId);
        if (gameSession.getConnectedPlayerCount() <= 0)
            throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "Game session is already empty", URI.create("about:blank"));
        gameSession.setConnectedPlayerCount(gameSession.getConnectedPlayerCount() - 1);
        gameRepository.save(gameSession);
    }

    private OnlineDiffResponsePayloads.IntentRejectionReason rejectionReason(
            GameSession gameSession,
            String username,
            OnlinePlayerIntentRequestDto<?> intent) {
        if (!OnlineGameplayProtocolVersion.V1.equals(intent.protocolVersion())
                || !GameSessionState.STARTED.equals(gameSession.getState())
                || !gameSession.getId().toString().equals(intent.gameSessionId())
                || !validPayload(gameSession, intent)) {
            return OnlineDiffResponsePayloads.IntentRejectionReason.INVALID_PAYLOAD;
        }

        if (!playerUsername(gameSession, intent.playerId()).equals(username)
                || !isActivePlayer(gameSession, intent.playerId())) {
            return OnlineDiffResponsePayloads.IntentRejectionReason.NOT_ACTIVE_PLAYER;
        }

        if (intent.lastConfirmedDiffSequence() != gameSession.getNextDiffSequence() - 1
                || intent.lastConfirmedDiffServerTick() != gameSession.getLastDiffServerTick()) {
            return OnlineDiffResponsePayloads.IntentRejectionReason.STALE_BASE_STATE;
        }

        if (unresolvedIntentId(gameSession, intent.playerId()) != null) {
            return OnlineDiffResponsePayloads.IntentRejectionReason.TURN_ALREADY_RESOLVING;
        }

        if (intent.type() == OnlinePlayerIntentRequestType.MOVE && intent.payload() instanceof OnlinePlayerIntentRequestPayloads.Move move) {
            OnlineDiffResponsePayloads.IntentRejectionReason movementRejection = movementRejectionReason(
                    gameSession,
                    intent.playerId(),
                    move);
            if (movementRejection != null) {
                return movementRejection;
            }
        }

        return null;
    }

    private boolean validPayload(GameSession gameSession, OnlinePlayerIntentRequestDto<?> intent) {
        if (intent.intentId() == null || intent.intentId().isBlank() || intent.type() == null) {
            return false;
        }

        if (intent.type() == OnlinePlayerIntentRequestType.MOVE && intent.payload() instanceof OnlinePlayerIntentRequestPayloads.Move move) {
            return move.direction() == -1 || move.direction() == 1;
        }
        if (intent.type() == OnlinePlayerIntentRequestType.FIRE && intent.payload() instanceof OnlinePlayerIntentRequestPayloads.Fire fire) {
        var validation = contentCatalog.require(gameSession.getGameContentVersion()).validation();
            return fire.power() >= validation.minFirePower() && fire.power() <= validation.maxFirePower()
                    && fire.angle() >= validation.minAimAngle() && fire.angle() <= validation.maxAimAngle()
                    && contentCatalog.require(gameSession.getGameContentVersion()).tanks().values().stream().flatMap(tank -> tank.loadout().stream())
                            .anyMatch(slot -> slot.id().equals(fire.projectileSlotId()));
        }

        return false;
    }

    private boolean isActivePlayer(GameSession gameSession, long playerId) {
        return gameSession.getWorld().match().activePlayerId() == playerId;
    }

    private String playerUsername(GameSession gameSession, long playerId) {
        if (playerId == 1) {
            return gameSession.getPlayerA();
        }
        if (playerId == 2) {
            return gameSession.getPlayerB();
        }
        return "";
    }

    private String unresolvedIntentId(GameSession gameSession, long playerId) {
        if (playerId == 1) {
            return gameSession.getPlayerAUnresolvedIntentId();
        }
        if (playerId == 2) {
            return gameSession.getPlayerBUnresolvedIntentId();
        }
        return null;
    }

    private void setUnresolvedIntent(GameSession gameSession, long playerId, String intentId) {
        if (playerId == 1) {
            gameSession.setPlayerAUnresolvedIntentId(intentId);
        } else if (playerId == 2) {
            gameSession.setPlayerBUnresolvedIntentId(intentId);
        }
    }

    private void clearUnresolvedIntent(GameSession gameSession, long playerId) {
        if (playerId == 1) {
            gameSession.setPlayerAUnresolvedIntentId(null);
        } else if (playerId == 2) {
            gameSession.setPlayerBUnresolvedIntentId(null);
        }
    }

    private void publishIntentRejection(
            GameSession gameSession,
            OnlinePlayerIntentRequestDto<?> intent,
            OnlineDiffResponsePayloads.IntentRejectionReason reason) {
        long sequence = gameSession.getNextDiffSequence();
        gameSession.setNextDiffSequence(sequence + 1);
        gameSession.setLastDiffServerTick(gameSession.getServerTick());

        OnlineDiffResponseDto<OnlineDiffResponsePayloads.IntentRejection> diff = new OnlineDiffResponseDto<>(
                OnlineGameplayProtocolVersion.V1,
                gameSession.getId().toString(),
                sequence,
                gameSession.getServerTick(),
                OnlineStateDiffResponseType.INTENT_REJECTION,
                intent.intentId(),
                new OnlineDiffResponsePayloads.IntentRejection(
                        intent.intentId(),
                        intent.playerId(),
                        reason,
                        gameSession.getNextDiffSequence(),
                        gameSession.getServerTick()));

        eventPublisher.publishEvent(new OnlineGameplayEvent(
                this,
                null,
                "/topic/game/" + gameSession.getId(),
                diff));
    }

    private OnlineDiffResponsePayloads.IntentRejectionReason movementRejectionReason(
            GameSession gameSession,
            long playerId,
            OnlinePlayerIntentRequestPayloads.Move move) {
        if (gameSession.getWorld().requireTankByPlayer(playerId).fuel() <= 0) {
            return OnlineDiffResponsePayloads.IntentRejectionReason.INSUFFICIENT_FUEL;
        }
        return null;
    }

    private boolean publishMovementSegment(
            GameSession gameSession,
            OnlinePlayerIntentRequestDto<?> intent,
            OnlinePlayerIntentRequestPayloads.Move move) {
        long sequence = gameSession.getNextDiffSequence();
        var resolved = gameSimulation.move(contentCatalog.require(gameSession.getGameContentVersion()), gameSession.getWorld(), gameSession.getTerrainModel(),
                intent.intentId(), intent.playerId(), move, gameSession.getServerTick());
        if (resolved.isEmpty()) {
            publishIntentRejection(gameSession, intent, OnlineDiffResponsePayloads.IntentRejectionReason.IMPASSABLE_TERRAIN);
            return false;
        }
        var segment = resolved.get();
        gameSession.setNextDiffSequence(sequence + 1);
        gameSession.setLastDiffServerTick(segment.endedServerTick());

        OnlineDiffResponseDto<OnlineDiffResponsePayloads.MovementSegment> diff = new OnlineDiffResponseDto<>(
                OnlineGameplayProtocolVersion.V1,
                gameSession.getId().toString(),
                sequence,
                segment.endedServerTick(),
                OnlineStateDiffResponseType.MOVEMENT_SEGMENT,
                intent.intentId(),
                segment);

        eventPublisher.publishEvent(new OnlineGameplayEvent(
                this,
                null,
                "/topic/game/" + gameSession.getId(),
                diff));
        return true;
    }

    private void publishProjectileResolution(
            GameSession gameSession,
            OnlinePlayerIntentRequestDto<?> intent,
            OnlinePlayerIntentRequestPayloads.Fire fire) {
        long firingPlayerId = intent.playerId();
        long targetPlayerId = firingPlayerId == 1 ? 2 : 1;
        var content = contentCatalog.require(gameSession.getGameContentVersion());
        var projectile = gameSimulation.fire(content, gameSession.getWorld(), gameSession.getTerrainModel(),
                intent.intentId(), projectileEntityId(gameSession), firingPlayerId, fire);

        publishDiff(
                gameSession,
                OnlineStateDiffResponseType.PROJECTILE_RESOLUTION,
                intent.intentId(),
                gameSession.getServerTick(),
                projectile);

        publishDiff(
                gameSession,
                OnlineStateDiffResponseType.TERRAIN_PATCH,
                intent.intentId(),
                gameSession.getServerTick(),
                gameSimulation.deformTerrain(content, gameSession.getWorld(), gameSession.getTerrainModel(),
                        projectile.projectileDefinitionId(), projectile.impact()));

        for (var settlement : gameSimulation.settleUnsupportedTanks(content, gameSession.getWorld(),
                gameSession.getTerrainModel(), gameSession.getServerTick())) {
            publishDiff(gameSession, OnlineStateDiffResponseType.MOVEMENT_SEGMENT, null,
                    settlement.endedServerTick(), settlement);
        }

        advanceTurnAfterShot(gameSession, firingPlayerId, targetPlayerId, intent.intentId());

        if (!gameSession.getWorld().requireTankByPlayer(targetPlayerId).alive()) {
            finalizeWinResult(gameSession, firingPlayerId);
            publishDiff(
                    gameSession,
                    OnlineStateDiffResponseType.TERMINAL_GAME,
                    intent.intentId(),
                    gameSession.getServerTick(),
                    new OnlineDiffResponsePayloads.TerminalGame(
                            firingPlayerId,
                            OnlineDiffResponsePayloads.TerminalGameReason.LAST_TANK_STANDING,
                            initialStateFactory.createStateSnapshot(gameSession)));
        }
    }

    private void finalizeWinResult(GameSession gameSession, long winnerPlayerId) {
        OffsetDateTime endedAt = OffsetDateTime.now();
        User playerA = userByUsername(gameSession.getPlayerA());
        User playerB = userByUsername(gameSession.getPlayerB());
        User winner = winnerPlayerId == 1 ? playerA : playerB;

        gameResultRepository.save(GameResult.builder()
                .playerA(playerA)
                .playerB(playerB)
                .winner(winner)
                .outcome(GameOutcome.WIN)
                .gameStartedAt(gameStartedAt(gameSession, endedAt))
                .gameEndedAt(endedAt)
                .build());

        gameSession.setEndedAt(endedAt);
        gameSession.setState(GameSessionState.ENDED);
        gameSession.getWorld().match().winnerPlayerId(winnerPlayerId);
        log.debug("Game ended: {} vs {}", playerA, playerB);
    }

    private User userByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ProblemDetailException(
                        HttpStatus.NOT_FOUND,
                        "Game result participant not found.",
                        URI.create("about:blank")));
    }

    private OffsetDateTime gameStartedAt(GameSession gameSession, OffsetDateTime endedAt) {
        if (gameSession.getStartedAt() != null) {
            return gameSession.getStartedAt();
        }
        if (gameSession.getCreatedAt() != null) {
            return gameSession.getCreatedAt();
        }
        return endedAt;
    }

    private void advanceTurnAfterShot(
            GameSession gameSession,
            long previousPlayerId,
            long activePlayerId,
            String intentId) {
        gameSession.getWorld().match().activePlayerId(activePlayerId);
        gameSession.getWorld().match().turnNumber(gameSession.getWorld().match().turnNumber() + 1);
        gameSession.getWorld().match().turnEndsAtServerTick(
                gameSession.getServerTick() + ServerSimulationLoopService.TURN_TIMER_TICKS);

        publishDiff(
                gameSession,
                OnlineStateDiffResponseType.TURN_TRANSITION,
                intentId,
                gameSession.getServerTick(),
                new OnlineDiffResponsePayloads.TurnTransition(
                        previousPlayerId,
                        activePlayerId,
                        gameSession.getWorld().match().turnNumber(),
                        OnlineDiffResponsePayloads.TurnPhase.AIMING,
                        gameSession.getWorld().match().turnEndsAtServerTick()));
        log.debug("Turn advanced after shot: {} -> {}", previousPlayerId, activePlayerId);
    }

    private long projectileEntityId(GameSession gameSession) {
        return 20 + gameSession.getNextDiffSequence() - 2;
    }

    private <TPayload> void publishDiff(
            GameSession gameSession,
            OnlineStateDiffResponseType type,
            String intentId,
            long serverTick,
            TPayload payload) {
        long sequence = gameSession.getNextDiffSequence();
        OnlineDiffResponseDto<TPayload> diff = new OnlineDiffResponseDto<>(
                OnlineGameplayProtocolVersion.V1,
                gameSession.getId().toString(),
                sequence,
                serverTick,
                type,
                intentId,
                payload);

        gameSession.setNextDiffSequence(sequence + 1);
        gameSession.setLastDiffServerTick(serverTick);
        eventPublisher.publishEvent(new OnlineGameplayEvent(
                this,
                null,
                "/topic/game/" + gameSession.getId(),
                diff));
    }

    private void deleteGameQuietly(GameSession gameSession) {
        try {
            gameRepository.delete(gameSession);
        } catch (RuntimeException cleanupEx) {
            log.warn("Failed to clean up game session '{}' after failed operation", gameSession.getId(), cleanupEx);
        }
    }

    private void saveUserSessionQuietly(UserSession userSession) {
        try {
            userSessionService.save(userSession);
        } catch (RuntimeException restoreEx) {
            log.warn("Failed to restore user session '{}' after failed game creation", userSession.getId(), restoreEx);
        }
    }

    private void restoreUserSession(UserSession target, UserSession source) {
        target.setState(source.getState());
        target.setGameSessionId(source.getGameSessionId());
        target.setLobbyId(source.getLobbyId());
        target.setSocketSessionId(source.getSocketSessionId());
        target.setTopicSubscriptions(source.getTopicSubscriptions());
    }
}
