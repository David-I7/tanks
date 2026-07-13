package com.tanks.server.websocket.services;

import com.tanks.server.entities.User;
import com.tanks.server.entities.gameResult.GameOutcome;
import com.tanks.server.entities.gameResult.GameResult;
import com.tanks.server.repositories.GameResultRepository;
import com.tanks.server.repositories.UserRepository;
import com.tanks.server.utils.IdFactory;
import com.tanks.server.websocket.dto.gameplay.OnlineDiffEnvelopeDto;
import com.tanks.server.websocket.dto.gameplay.OnlineDiffPayloads;
import com.tanks.server.websocket.dto.gameplay.OnlineGameplayProtocolVersion;
import com.tanks.server.websocket.dto.gameplay.OnlineIntentPayloads;
import com.tanks.server.websocket.dto.gameplay.OnlinePlayerIntentDto;
import com.tanks.server.websocket.dto.gameplay.OnlinePlayerIntentType;
import com.tanks.server.websocket.dto.gameplay.OnlineStateDiffType;
import com.tanks.server.websocket.dto.gameplay.OnlineTankDamageDto;
import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;
import com.tanks.server.websocket.dto.game.GameEventResponseDto;
import com.tanks.server.websocket.dto.game.GameEventType;
import com.tanks.server.websocket.dto.game.GameIdPayload;
import com.tanks.server.websocket.dto.game.GameStartPayload;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.lobby.LobbyStatus;
import com.tanks.server.websocket.entities.lobby.LobbyType;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.events.GameEvent;
import com.tanks.server.websocket.events.OnlineGameplayEvent;
import com.tanks.server.websocket.gameplay.OnlineInitialStateFactory;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.gameplay.OnlineGameplayRules;
import com.tanks.server.websocket.repositories.GameSessionRepository;
import com.tanks.server.websocket.repositories.LobbyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
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
    private final RedisClaimService redisClaimService;
    private final OnlineGameplayRules gameplayRules;
    private final OnlineInitialStateFactory initialStateFactory;
    private final GameResultRepository gameResultRepository;
    private final UserRepository userRepository;

    public GameSession create(Lobby lobby) {
        synchronized (lobby.getId().toString().intern()) {
            Lobby freshLobby = lobbyRepository.findById(lobby.getId())
                    .orElseThrow(() -> new ProblemDetailException(HttpStatus.NOT_FOUND, "The lobby with the provided id does not exist.", URI.create("about:blank")));

            if (freshLobby.getStatus() != LobbyStatus.READY || freshLobby.getOpponentId() == null) {
                throw new ProblemDetailException(HttpStatus.CONFLICT, "Lobby is no longer ready to create a game.", URI.create("/game/create"));
            }

            UserSession host = userSessionService.findById(freshLobby.getHostId());
            UserSession opponent = userSessionService.findById(freshLobby.getOpponentId());
            UserSession originalHost = new UserSession(host);
            UserSession originalOpponent = new UserSession(opponent);
            GameSession savedGameSession = null;

            try {
                UUID gameSessionId = IdFactory.randomUUID();
                GameSession gameSession = GameSession.builder()
                        .id(gameSessionId)
                        .playerA(host.getUsername())
                        .playerB(opponent.getUsername())
                        .createdAt(OffsetDateTime.now())
                        .state(GameSessionState.CREATED)
                        .gameplayDefinitionVersion(gameplayRules.currentVersion())
                        .build();

                savedGameSession = gameRepository.save(gameSession);

                GameEventResponseDto response = new GameEventResponseDto(
                        GameEventType.GAME_CREATED,
                        "@SERVER",
                        new GameIdPayload(savedGameSession.getId(), null)
                );

                userSessionService.transitionToGame(host, savedGameSession.getId());
                userSessionService.transitionToGame(opponent, savedGameSession.getId());

                userSessionService.save(host);
                userSessionService.save(opponent);
                redisClaimService.markUserSessionReloadRequired(host.getId());
                redisClaimService.markUserSessionReloadRequired(opponent.getId());

                lobbyRepository.delete(freshLobby);
                if (freshLobby.getType() == LobbyType.QUICK_MATCH) {
                    quickMatchService.delete(freshLobby);
                }

                eventPublisher.publishEvent(new GameEvent(this, host.getUsername(), "/queue/replies", response));
                eventPublisher.publishEvent(new GameEvent(this, opponent.getUsername(), "/queue/replies", response));

                return savedGameSession;
            } catch (RuntimeException ex) {
                if (host != null) {
                    redisClaimService.deleteUserSessionReloadRequired(host.getId());
                }
                if (opponent != null) {
                    redisClaimService.deleteUserSessionReloadRequired(opponent.getId());
                }
                if (host != null && originalHost != null) {
                    restoreUserSession(host, originalHost);
                    saveUserSessionQuietly(host);
                }
                if (opponent != null && originalOpponent != null) {
                    restoreUserSession(opponent, originalOpponent);
                    saveUserSessionQuietly(opponent);
                }
                if (savedGameSession != null) {
                    deleteGameQuietly(savedGameSession);
                }
                throw ex;
            }
        }
    }

    public void startGame(GameSession gameSession) {
        synchronized (gameSession.getId().toString().intern()) {
            GameSession freshGameSession = findById(gameSession.getId());
            if (!GameSessionState.CREATED.equals(freshGameSession.getState())) {
                return;
            }

            freshGameSession.setStartedAt(OffsetDateTime.now());
            freshGameSession.setPlayerTurn(freshGameSession.getPlayerA());
            freshGameSession.setPlayerTurnExpiresAt(ServerSimulationLoopService.TURN_TIMER_TICKS);
            freshGameSession.setServerTick(0);
            freshGameSession.setTurnNumber(1);
            freshGameSession.setNextDiffSequence(2);
            freshGameSession.setLastDiffServerTick(0);
            initializeTankState(freshGameSession);
            freshGameSession.setState(GameSessionState.STARTED);
            gameRepository.save(freshGameSession);

            eventPublisher.publishEvent(new GameEvent(
                    this,
                    freshGameSession.getPlayerA(),
                    "/queue/replies",
                    gameStartedResponse(freshGameSession, PLAYER_A_ID)));
            eventPublisher.publishEvent(new GameEvent(
                    this,
                    freshGameSession.getPlayerB(),
                    "/queue/replies",
                    gameStartedResponse(freshGameSession, PLAYER_B_ID)));
            sendInitialStateToPlayer(freshGameSession, freshGameSession.getPlayerA());
            sendInitialStateToPlayer(freshGameSession, freshGameSession.getPlayerB());
        }
    }

    private GameEventResponseDto gameStartedResponse(GameSession gameSession, long localPlayerId) {
        return new GameEventResponseDto(
                GameEventType.GAME_STARTED,
                "@SERVER",
                new GameStartPayload(
                        gameSession.getId(),
                        gameSession.getPlayerA(),
                        gameSession.getPlayerB(),
                        gameSession.getStartedAt(),
                        gameSession.getGameplayDefinitionVersion(),
                        localPlayerId));
    }

    public void sendInitialStateToPlayer(GameSession gameSession, String username) {
        eventPublisher.publishEvent(new OnlineGameplayEvent(
                this,
                username,
                "/queue/replies",
                initialStateFactory.createForPlayer(gameSession, localPlayerId(gameSession, username))));
    }

    public boolean sendResyncStateToPlayer(UUID gameSessionId, String username, OnlineDiffPayloads.ResyncReason reason) {
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

    public boolean acceptPlayerIntent(String username, UUID gameSessionId, OnlinePlayerIntentDto<?> intent) {
        if (intent == null) {
            return false;
        }

        GameSession gameSession = findById(gameSessionId);
        OnlineDiffPayloads.IntentRejectionReason rejectionReason = rejectionReason(gameSession, username, intent);

        if (rejectionReason != null) {
            if (rejectionReason == OnlineDiffPayloads.IntentRejectionReason.INVALID_PAYLOAD) {
                return false;
            }
            publishIntentRejection(gameSession, intent, rejectionReason);
            gameRepository.save(gameSession);
            return false;
        }

        if (intent.type() == OnlinePlayerIntentType.MOVE && intent.payload() instanceof OnlineIntentPayloads.Move move) {
            publishMovementSegment(gameSession, intent, move);
            gameRepository.save(gameSession);
            return true;
        }

        if (intent.type() == OnlinePlayerIntentType.FIRE && intent.payload() instanceof OnlineIntentPayloads.Fire fire) {
            publishProjectileResolution(gameSession, intent, fire);
            gameRepository.save(gameSession);
            return true;
        }

        setUnresolvedIntent(gameSession, intent.playerId(), intent.intentId());
        gameRepository.save(gameSession);
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
        synchronized (gameSessionId.toString().intern()) {
            GameSession gameSession = findById(gameSessionId);
            gameSession.setConnectedPlayerCount(gameSession.getConnectedPlayerCount() + 1);
            return gameRepository.save(gameSession);
        }
    }

    public void decremenentPlayerCount(UUID gameSessionId){
        synchronized (gameSessionId.toString().intern()) {
            try {
                GameSession gameSession = findById(gameSessionId);
                gameSession.setConnectedPlayerCount(gameSession.getConnectedPlayerCount() - 1);
                gameRepository.save(gameSession);
            } catch (RuntimeException ex) {
                // Ignore if game session not found
            }
        }
    }

    private OnlineDiffPayloads.IntentRejectionReason rejectionReason(
            GameSession gameSession,
            String username,
            OnlinePlayerIntentDto<?> intent) {
        if (!OnlineGameplayProtocolVersion.V1.equals(intent.protocolVersion())
                || !GameSessionState.STARTED.equals(gameSession.getState())
                || !gameSession.getId().toString().equals(intent.gameSessionId())
                || !validPayload(intent)) {
            return OnlineDiffPayloads.IntentRejectionReason.INVALID_PAYLOAD;
        }

        if (!playerUsername(gameSession, intent.playerId()).equals(username)
                || !isActivePlayer(gameSession, intent.playerId())) {
            return OnlineDiffPayloads.IntentRejectionReason.NOT_ACTIVE_PLAYER;
        }

        if (intent.lastConfirmedDiffSequence() != gameSession.getNextDiffSequence() - 1
                || intent.lastConfirmedDiffServerTick() != gameSession.getLastDiffServerTick()) {
            return OnlineDiffPayloads.IntentRejectionReason.STALE_BASE_STATE;
        }

        if (unresolvedIntentId(gameSession, intent.playerId()) != null) {
            return OnlineDiffPayloads.IntentRejectionReason.TURN_ALREADY_RESOLVING;
        }

        if (intent.type() == OnlinePlayerIntentType.MOVE && intent.payload() instanceof OnlineIntentPayloads.Move move) {
            OnlineDiffPayloads.IntentRejectionReason movementRejection = movementRejectionReason(
                    gameSession,
                    intent.playerId(),
                    move);
            if (movementRejection != null) {
                return movementRejection;
            }
        }

        return null;
    }

    private boolean validPayload(OnlinePlayerIntentDto<?> intent) {
        if (intent.intentId() == null || intent.intentId().isBlank() || intent.type() == null) {
            return false;
        }

        if (intent.type() == OnlinePlayerIntentType.MOVE && intent.payload() instanceof OnlineIntentPayloads.Move move) {
            return gameplayRules.acceptsMoveIntent(move);
        }
        if (intent.type() == OnlinePlayerIntentType.FIRE && intent.payload() instanceof OnlineIntentPayloads.Fire fire) {
            return gameplayRules.acceptsFireIntent(fire);
        }

        return false;
    }

    private boolean isActivePlayer(GameSession gameSession, long playerId) {
        return playerUsername(gameSession, playerId).equals(gameSession.getPlayerTurn());
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
            OnlinePlayerIntentDto<?> intent,
            OnlineDiffPayloads.IntentRejectionReason reason) {
        long sequence = gameSession.getNextDiffSequence();
        gameSession.setNextDiffSequence(sequence + 1);
        gameSession.setLastDiffServerTick(gameSession.getServerTick());

        OnlineDiffEnvelopeDto<OnlineDiffPayloads.IntentRejection> diff = new OnlineDiffEnvelopeDto<>(
                OnlineGameplayProtocolVersion.V1,
                gameSession.getId().toString(),
                sequence,
                gameSession.getServerTick(),
                OnlineStateDiffType.INTENT_REJECTION,
                intent.intentId(),
                new OnlineDiffPayloads.IntentRejection(
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

    private OnlineDiffPayloads.IntentRejectionReason movementRejectionReason(
            GameSession gameSession,
            long playerId,
            OnlineIntentPayloads.Move move) {
        initializeTankState(gameSession);
        OnlineVec2Dto from = tankPosition(gameSession, playerId);
        if (!gameplayRules.hasFuelForMove(tankFuel(gameSession, playerId), move)) {
            return OnlineDiffPayloads.IntentRejectionReason.INSUFFICIENT_FUEL;
        }
        if (!gameplayRules.isMoveInBounds(from, move)) {
            return OnlineDiffPayloads.IntentRejectionReason.OUT_OF_BOUNDS;
        }
        return null;
    }

    private void publishMovementSegment(
            GameSession gameSession,
            OnlinePlayerIntentDto<?> intent,
            OnlineIntentPayloads.Move move) {
        initializeTankState(gameSession);
        long sequence = gameSession.getNextDiffSequence();
        gameSession.setNextDiffSequence(sequence + 1);

        OnlineDiffPayloads.MovementSegment segment = gameplayRules.createMovementSegment(
                intent.intentId(),
                intent.playerId(),
                tankEntityId(intent.playerId()),
                tankPosition(gameSession, intent.playerId()),
                move,
                tankFuel(gameSession, intent.playerId()),
                gameSession.getServerTick());
        applyMovementSegment(gameSession, segment);
        gameSession.setLastDiffServerTick(segment.endedServerTick());

        OnlineDiffEnvelopeDto<OnlineDiffPayloads.MovementSegment> diff = new OnlineDiffEnvelopeDto<>(
                OnlineGameplayProtocolVersion.V1,
                gameSession.getId().toString(),
                sequence,
                segment.endedServerTick(),
                OnlineStateDiffType.MOVEMENT_SEGMENT,
                intent.intentId(),
                segment);

        eventPublisher.publishEvent(new OnlineGameplayEvent(
                this,
                null,
                "/topic/game/" + gameSession.getId(),
                diff));
    }

    private void initializeTankState(GameSession gameSession) {
        if (gameSession.getPlayerATankX() == null) {
            gameSession.setPlayerATankX(OnlineGameplayRules.PLAYER_A_INITIAL_TANK_X);
        }
        if (gameSession.getPlayerATankY() == null) {
            gameSession.setPlayerATankY(OnlineGameplayRules.PLAYER_A_INITIAL_TANK_Y);
        }
        if (gameSession.getPlayerATankFuel() == null) {
            gameSession.setPlayerATankFuel(OnlineGameplayRules.INITIAL_TANK_FUEL);
        }
        if (gameSession.getPlayerATankHealth() == null) {
            gameSession.setPlayerATankHealth(
                    gameplayRules.maxTankHealth(OnlineGameplayRules.PLAYER_A_TANK_DEFINITION_ID));
        }
        if (gameSession.getPlayerBTankX() == null) {
            gameSession.setPlayerBTankX(OnlineGameplayRules.PLAYER_B_INITIAL_TANK_X);
        }
        if (gameSession.getPlayerBTankY() == null) {
            gameSession.setPlayerBTankY(OnlineGameplayRules.PLAYER_B_INITIAL_TANK_Y);
        }
        if (gameSession.getPlayerBTankFuel() == null) {
            gameSession.setPlayerBTankFuel(OnlineGameplayRules.INITIAL_TANK_FUEL);
        }
        if (gameSession.getPlayerBTankHealth() == null) {
            gameSession.setPlayerBTankHealth(
                    gameplayRules.maxTankHealth(OnlineGameplayRules.PLAYER_B_TANK_DEFINITION_ID));
        }
    }

    private OnlineVec2Dto tankPosition(GameSession gameSession, long playerId) {
        if (playerId == 1) {
            return new OnlineVec2Dto(gameSession.getPlayerATankX(), gameSession.getPlayerATankY());
        }
        return new OnlineVec2Dto(gameSession.getPlayerBTankX(), gameSession.getPlayerBTankY());
    }

    private double tankFuel(GameSession gameSession, long playerId) {
        if (playerId == 1) {
            return gameSession.getPlayerATankFuel();
        }
        return gameSession.getPlayerBTankFuel();
    }

    private long tankEntityId(long playerId) {
        return playerId == 1 ? 10 : 11;
    }

    private void publishProjectileResolution(
            GameSession gameSession,
            OnlinePlayerIntentDto<?> intent,
            OnlineIntentPayloads.Fire fire) {
        initializeTankState(gameSession);
        long firingPlayerId = intent.playerId();
        long targetPlayerId = firingPlayerId == 1 ? 2 : 1;
        String projectileDefinitionId = gameplayRules.projectileDefinitionIdForSlot(fire.projectileSlotId());
        OnlineGameplayRules.ResolvedProjectile projectile = gameplayRules.resolveProjectile(
                projectileDefinitionId,
                firingPlayerId,
                tankPosition(gameSession, firingPlayerId),
                targetPlayerId,
                tankPosition(gameSession, targetPlayerId),
                fire);
        List<OnlineTankDamageDto> damagedTanks = new ArrayList<>();
        double targetRemainingHealth = tankHealth(gameSession, targetPlayerId);
        if (projectile.hitPlayerId() != null) {
            double damage = gameplayRules.calculateDamage(projectileDefinitionId);
            targetRemainingHealth = applyDamage(gameSession, projectile.hitPlayerId(), damage);
            damagedTanks.add(new OnlineTankDamageDto(
                    tankEntityId(projectile.hitPlayerId()),
                    projectile.hitPlayerId(),
                    damage,
                    targetRemainingHealth));
        }

        publishDiff(
                gameSession,
                OnlineStateDiffType.PROJECTILE_RESOLUTION,
                intent.intentId(),
                gameSession.getServerTick(),
                gameplayRules.createProjectileResolution(
                        intent.intentId(),
                        projectileEntityId(gameSession),
                        firingPlayerId,
                        projectileDefinitionId,
                        projectile.launch(),
                        projectile.trajectory(),
                        projectile.impact(),
                        damagedTanks));

        publishDiff(
                gameSession,
                OnlineStateDiffType.TERRAIN_PATCH,
                intent.intentId(),
                gameSession.getServerTick(),
                new OnlineDiffPayloads.TerrainPatch(
                        gameplayRules.createTerrainPatches(projectileDefinitionId, projectile.impact())));

        advanceTurnAfterShot(gameSession, firingPlayerId, targetPlayerId, intent.intentId());

        if (projectile.hitPlayerId() != null && targetRemainingHealth <= 0) {
            finalizeWinResult(gameSession, firingPlayerId);
            publishDiff(
                    gameSession,
                    OnlineStateDiffType.TERMINAL_GAME,
                    intent.intentId(),
                    gameSession.getServerTick(),
                    new OnlineDiffPayloads.TerminalGame(
                            firingPlayerId,
                            OnlineDiffPayloads.TerminalGameReason.LAST_TANK_STANDING,
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
        gameSession.setPlayerTurn(playerUsername(gameSession, activePlayerId));
        gameSession.setTurnNumber(gameSession.getTurnNumber() + 1);
        gameSession.setPlayerTurnExpiresAt(gameSession.getServerTick() + ServerSimulationLoopService.TURN_TIMER_TICKS);

        publishDiff(
                gameSession,
                OnlineStateDiffType.TURN_TRANSITION,
                intentId,
                gameSession.getServerTick(),
                new OnlineDiffPayloads.TurnTransition(
                        previousPlayerId,
                        activePlayerId,
                        gameSession.getTurnNumber(),
                        OnlineDiffPayloads.TurnPhase.AIMING,
                        gameSession.getPlayerTurnExpiresAt()));
    }

    private double applyDamage(GameSession gameSession, long playerId, double damage) {
        double healthBefore = tankHealth(gameSession, playerId);
        double remainingHealth = Math.max(0, healthBefore - damage);
        if (playerId == 1) {
            gameSession.setPlayerATankHealth(remainingHealth);
        } else {
            gameSession.setPlayerBTankHealth(remainingHealth);
        }
        return remainingHealth;
    }

    private double tankHealth(GameSession gameSession, long playerId) {
        if (playerId == 1) {
            return gameSession.getPlayerATankHealth();
        }
        return gameSession.getPlayerBTankHealth();
    }

    private long projectileEntityId(GameSession gameSession) {
        return 20 + gameSession.getNextDiffSequence() - 2;
    }

    private <TPayload> void publishDiff(
            GameSession gameSession,
            OnlineStateDiffType type,
            String intentId,
            long serverTick,
            TPayload payload) {
        long sequence = gameSession.getNextDiffSequence();
        OnlineDiffEnvelopeDto<TPayload> diff = new OnlineDiffEnvelopeDto<>(
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

    private void applyMovementSegment(GameSession gameSession, OnlineDiffPayloads.MovementSegment segment) {
        if (segment.playerId() == 1) {
            gameSession.setPlayerATankX(segment.to().x());
            gameSession.setPlayerATankY(segment.to().y());
            gameSession.setPlayerATankFuel(segment.fuelAfter());
        } else if (segment.playerId() == 2) {
            gameSession.setPlayerBTankX(segment.to().x());
            gameSession.setPlayerBTankY(segment.to().y());
            gameSession.setPlayerBTankFuel(segment.fuelAfter());
        }
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
