package com.tanks.server.websocket.services;

import com.tanks.server.entities.User;
import com.tanks.server.entities.gameResult.GameOutcome;
import com.tanks.server.entities.gameResult.GameResult;
import com.tanks.server.repositories.GameResultRepository;
import com.tanks.server.repositories.UserRepository;
import com.tanks.server.utils.IdFactory;
import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffResponseDto;
import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffResponsePayload;
import com.tanks.server.websocket.dto.gameplay.diffResponse.enums.*;
import com.tanks.server.websocket.dto.gameplay.diffResponse.payloads.*;
import com.tanks.server.websocket.dto.gameplay.playerIntent.*;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.*;
import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineStateDiffResponseType;
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
import java.util.Optional;
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
            var content = contentCatalog.current();
            var initialWorld = initialWorldFactory.create(content, 0, host.getUsername(),
                    opponent.getUsername());
            GameSession gameSession = GameSession.builder()
                    .id(gameSessionId)
                    .hostId(host.getId())
                    .playerA(host.getUsername())
                    .playerB(opponent.getUsername())
                    .createdAt(OffsetDateTime.now())
                    .state(GameSessionState.CREATED)
                    .gameContentVersion(content.version())
                    .world(initialWorld.world())
                    .terrainModel(initialWorld.terrainModel())
                    .build();

            savedGameSession = gameRepository.save(gameSession);

            GameEventResponseDto response = new GameEventResponseDto(
                    GameEventType.GAME_CREATED,
                    new GameEventPayload(savedGameSession.getId(), savedGameSession.getHostId(), host.getUsername()));

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
        gameSession.getWorld().match().wind(contentCatalog.require(gameSession.getGameContentVersion()).world().generateWind());
        gameSession.setMatchEndsAtServerTick(gameSession.getServerTick() + 5400L);
        gameSession.setNextDiffSequence(2);
        gameSession.setTurnStartDiffSequence(1);
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

    public boolean sendResyncStateToPlayer(UUID gameSessionId, String username,
            ResyncReason reason) {
        GameSession gameSession = findById(gameSessionId);
        if (!GameSessionState.CREATED.equals(gameSession.getState())
                && !GameSessionState.STARTED.equals(gameSession.getState())
                && !GameSessionState.ENDED.equals(gameSession.getState())) {
            return false;
        }

        var resyncDiff = initialStateFactory.createResyncForPlayer(gameSession, reason,
                localPlayerId(gameSession, username));

        eventPublisher.publishEvent(new OnlineGameplayEvent(
                this,
                username,
                "/queue/replies",
                resyncDiff));

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

    public boolean processPlayerIntent(GameSession gameSession, OnlinePlayerIntentRequestDto<?> intent) {
        if (intent == null) {
            return false;
        }

        String username = playerUsername(gameSession, intent.playerId());
        IntentRejectionReason rejectionReason = rejectionReason(gameSession, username, intent);

        if (rejectionReason != null) {
            log.info("Intent rejected reason={} intent={}", rejectionReason, intent);
            publishIntentRejection(gameSession, intent, rejectionReason);
            return false;
        }

        if (intent.type() == OnlinePlayerIntentRequestType.MOVE) {
            MoveIntentRequestPayload move = extractMovePayload(intent);
            if (move != null) {
                if (!publishMovementSegment(gameSession, intent, move)) {
                    log.debug("Movement rejected: {}", intent);
                    return false;
                }
                log.debug("Movement accepted: {}", intent);
                return true;
            }
        }

        if (intent.type() == OnlinePlayerIntentRequestType.AIM) {
            AimIntentRequestPayload aim = extractAimPayload(intent);
            if (aim != null) {
                var tank = gameSession.getWorld().requireTankByPlayer(intent.playerId());
                tank.aimAngle(aim.getAngle());
                tank.power(aim.getPower());
                publishDiff(
                        gameSession,
                        OnlineStateDiffResponseType.AIM_UPDATE,
                        intent.intentId(),
                        gameSession.getServerTick(),
                        AimUpdate.builder()
                                .playerId(intent.playerId())
                                .angle(aim.getAngle())
                                .power(aim.getPower())
                                .build());
                log.debug("Aim accepted: {}", intent);
                return true;
            }
        }

        if (intent.type() == OnlinePlayerIntentRequestType.SELECT_PROJECTILE_SLOT) {
            SelectProjectileIntentRequestPayload select = extractSelectProjectileSlotPayload(intent);
            if (select != null) {
                var tank = gameSession.getWorld().requireTankByPlayer(intent.playerId());
                tank.selectedProjectileSlotId(String.valueOf(select.getSlot()));
                log.debug("Select projectile slot accepted: {}", intent);
                return true;
            }
        }

        if (intent.type() == OnlinePlayerIntentRequestType.FIRE) {
            FireIntentIntentRequestPayload fire = extractFirePayload(intent);
            if (fire != null) {
                publishProjectileResolution(gameSession, intent, fire);
                log.debug("Fire accepted: {}", intent);
                return true;
            }
        }

        log.debug("Intent accepted: {}", intent);
        return true;
    }

    public boolean acceptPlayerIntent(String username, UUID gameSessionId, OnlinePlayerIntentRequestDto<?> intent) {
        if (intent == null || intent.intentId() == null || intent.intentId().isBlank() || intent.type() == null) {
            return false;
        }
        if (gameSessionId == null || !gameSessionId.toString().equals(intent.gameSessionId())) {
            return false;
        }
        GameSession gameSession = findById(gameSessionId);
        if (!GameSessionState.STARTED.equals(gameSession.getState())) {
            return false;
        }
        if (!playerUsername(gameSession, intent.playerId()).equals(username)) {
            return false;
        }

        boolean processed = processPlayerIntent(gameSession, intent);
        gameRepository.save(gameSession);
        return processed;
    }

    public GameSession findById(UUID gameSessionId) {
        return gameRepository.findById(gameSessionId).orElseThrow(() -> new ProblemDetailException(HttpStatus.NOT_FOUND,
                "Game session not found", URI.create("about:blank")));
    }

    public GameSession addConnectedUser(UUID gameSessionId, Long userId) {
        GameSession gameSession = findById(gameSessionId);
        if (userId != null) {
            if (!gameSession.getConnectedUserIds().contains(userId) && gameSession.getConnectedUserIds().size() >= 2) {
                throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "Game session already has 2 players",
                        URI.create("about:blank"));
            }
            gameSession.getConnectedUserIds().add(userId);
        }
        return gameRepository.save(gameSession);
    }

    public void removeConnectedUser(UUID gameSessionId, Long userId) {
        Optional<GameSession> gameSessionOpt = gameRepository.findById(gameSessionId);
        if (gameSessionOpt.isEmpty()) {
            log.debug("Game session {} not found when removing connected user {}", gameSessionId, userId);
            return;
        }
        GameSession gameSession = gameSessionOpt.get();
        if (userId != null) {
            gameSession.getConnectedUserIds().remove(userId);
        }
        gameRepository.save(gameSession);
    }

    private MoveIntentRequestPayload extractMovePayload(OnlinePlayerIntentRequestDto<?> intent) {
        if (intent == null || intent.payload() == null) {
            return null;
        }
        if (intent.payload() instanceof MoveIntentRequestPayload move) {
            return move;
        }
        if (intent.payload() instanceof java.util.Map<?, ?> map) {
            Object dirObj = map.get("direction");
            if (dirObj instanceof Number num) {
                return new MoveIntentRequestPayload(num.intValue());
            }
        }
        return null;
    }

    private AimIntentRequestPayload extractAimPayload(OnlinePlayerIntentRequestDto<?> intent) {
        if (intent == null || intent.payload() == null) {
            return null;
        }
        if (intent.payload() instanceof AimIntentRequestPayload aim) {
            return aim;
        }
        if (intent.payload() instanceof java.util.Map<?, ?> map) {
            Object angleObj = map.get("angle");
            Object powerObj = map.get("power");
            if (angleObj instanceof Number angleNum && powerObj instanceof Number powerNum) {
                return new AimIntentRequestPayload(angleNum.doubleValue(), powerNum.doubleValue());
            }
        }
        return null;
    }

    private FireIntentIntentRequestPayload extractFirePayload(OnlinePlayerIntentRequestDto<?> intent) {
        if (intent == null || intent.payload() == null) {
            return null;
        }
        if (intent.payload() instanceof FireIntentIntentRequestPayload fire) {
            return fire;
        }
        if (intent.payload() instanceof java.util.Map<?, ?> map) {
            Object angleObj = map.get("angle");
            Object powerObj = map.get("power");
            if (angleObj instanceof Number angleNum && powerObj instanceof Number powerNum) {
                return new FireIntentIntentRequestPayload(angleNum.doubleValue(), powerNum.doubleValue());
            }
        }
        return null;
    }

    private SelectProjectileIntentRequestPayload extractSelectProjectileSlotPayload(OnlinePlayerIntentRequestDto<?> intent) {
        if (intent == null || intent.payload() == null) {
            return null;
        }
        if (intent.payload() instanceof SelectProjectileIntentRequestPayload select) {
            return select;
        }
        if (intent.payload() instanceof java.util.Map<?, ?> map) {
            Object slotObj = map.get("slot");
            if (slotObj instanceof Number slotNum) {
                return new SelectProjectileIntentRequestPayload(slotNum.intValue());
            }
        }
        return null;
    }

    private IntentRejectionReason rejectionReason(
            GameSession gameSession,
            String username,
            OnlinePlayerIntentRequestDto<?> intent) {
        if (!GameSessionState.STARTED.equals(gameSession.getState())
                || !gameSession.getId().toString().equals(intent.gameSessionId())
                || !validPayload(gameSession, intent)) {
            return IntentRejectionReason.INVALID_PAYLOAD;
        }

        if (!playerUsername(gameSession, intent.playerId()).equals(username)
                || !isActivePlayer(gameSession, intent.playerId())) {
            return IntentRejectionReason.NOT_ACTIVE_PLAYER;
        }

        if (gameSession.getPendingTurnTransitionAtServerTick() > 0) {
            return IntentRejectionReason.NOT_ACTIVE_PLAYER;
        }

        if (intent.lastConfirmedDiffSequence() < gameSession.getTurnStartDiffSequence()
                || intent.lastConfirmedDiffSequence() > gameSession.getNextDiffSequence() - 1) {
            return IntentRejectionReason.STALE_BASE_STATE;
        }

        if (intent.type() == OnlinePlayerIntentRequestType.MOVE) {
            MoveIntentRequestPayload move = extractMovePayload(intent);
            if (move != null) {
                IntentRejectionReason movementRejection = movementRejectionReason(
                        gameSession,
                        intent.playerId(),
                        move);
                if (movementRejection != null) {
                    return movementRejection;
                }
            }
        }

        return null;
    }

    private boolean validPayload(GameSession gameSession, OnlinePlayerIntentRequestDto<?> intent) {
        if (intent.intentId() == null || intent.intentId().isBlank() || intent.type() == null) {
            return false;
        }

        if (intent.type() == OnlinePlayerIntentRequestType.MOVE) {
            MoveIntentRequestPayload move = extractMovePayload(intent);
            return move != null && (move.getDirection() == -1 || move.getDirection() == 1);
        }
        if (intent.type() == OnlinePlayerIntentRequestType.AIM) {
            AimIntentRequestPayload aim = extractAimPayload(intent);
            if (aim == null) return false;
            var validation = contentCatalog.require(gameSession.getGameContentVersion()).validation();
            return aim.getPower() >= validation.minFirePower() && aim.getPower() <= validation.maxFirePower()
                    && aim.getAngle() >= validation.minAimAngle() && aim.getAngle() <= validation.maxAimAngle();
        }
        if (intent.type() == OnlinePlayerIntentRequestType.SELECT_PROJECTILE_SLOT) {
            SelectProjectileIntentRequestPayload select = extractSelectProjectileSlotPayload(intent);
            return select != null;
        }
        if (intent.type() == OnlinePlayerIntentRequestType.FIRE) {
            FireIntentIntentRequestPayload fire = extractFirePayload(intent);
            if (fire == null) {
                return false;
            }
            var validation = contentCatalog.require(gameSession.getGameContentVersion()).validation();
            return fire.getPower() >= validation.minFirePower() && fire.getPower() <= validation.maxFirePower()
                    && fire.getAngle() >= validation.minAimAngle() && fire.getAngle() <= validation.maxAimAngle();
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

    private void publishIntentRejection(
            GameSession gameSession,
            OnlinePlayerIntentRequestDto<?> intent,
            IntentRejectionReason reason) {
        String username = playerUsername(gameSession, intent.playerId());
        long sequence = gameSession.getNextDiffSequence();
        gameSession.setNextDiffSequence(sequence + 1);
        gameSession.setLastDiffServerTick(gameSession.getServerTick());

        OnlineDiffResponseDto dto = OnlineDiffResponseDto.builder()
                .gameSessionId(gameSession.getId().toString())
                .sequence(sequence)
                .serverTick(gameSession.getServerTick())
                    .type(OnlineStateDiffResponseType.INTENT_REJECTION)
                .intentId(intent.intentId())
                .payload(IntentRejection.builder()
                        .playerId(intent.playerId())
                        .reason(reason)
                        .authoritativeSequence(gameSession.getNextDiffSequence())
                        .authoritativeServerTick(gameSession.getServerTick())
                        .build())
                .build();

        eventPublisher.publishEvent(new OnlineGameplayEvent(
                this,
                username,
                "/queue/replies",
                dto));
    }

    private IntentRejectionReason movementRejectionReason(
            GameSession gameSession,
            long playerId,
            MoveIntentRequestPayload move) {
        if (gameSession.getWorld().requireTankByPlayer(playerId).fuel() <= 0) {
            return IntentRejectionReason.INSUFFICIENT_FUEL;
        }
        return null;
    }

    private boolean publishMovementSegment(
            GameSession gameSession,
            OnlinePlayerIntentRequestDto<?> intent,
            MoveIntentRequestPayload move) {
        long sequence = gameSession.getNextDiffSequence();
        var resolved = gameSimulation.move(contentCatalog.require(gameSession.getGameContentVersion()),
                gameSession.getWorld(), gameSession.getTerrainModel(),
                intent.intentId(), intent.playerId(), move, gameSession.getServerTick());
        if (resolved.isEmpty()) {
            publishIntentRejection(gameSession, intent,
                    IntentRejectionReason.IMPASSABLE_TERRAIN);
            return false;
        }
        var segment = resolved.get();
        gameSession.setNextDiffSequence(sequence + 1);
        gameSession.setLastDiffServerTick(segment.endedServerTick());

        OnlineDiffResponseDto diff = new OnlineDiffResponseDto(
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
            FireIntentIntentRequestPayload fire) {
        long firingPlayerId = intent.playerId();
        long targetPlayerId = firingPlayerId == 1 ? 2 : 1;
        var firingTank = gameSession.getWorld().requireTankByPlayer(firingPlayerId);
        firingTank.aimAngle(fire.getAngle());
        firingTank.power(fire.getPower());

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

        long shotDurationTicks = Math.max(1L, (long) projectile.trajectory().size());
        gameSession.setPendingTurnTransitionAtServerTick(gameSession.getServerTick() + shotDurationTicks);
        gameSession.setPendingTurnTransitionIntentId(intent.intentId());
    }

    public void executePendingTurnTransition(GameSession gameSession) {
        if (gameSession.getPendingTurnTransitionAtServerTick() <= 0) {
            return;
        }
        gameSession.setPendingTurnTransitionAtServerTick(0);
        String intentId = gameSession.getPendingTurnTransitionIntentId();
        gameSession.setPendingTurnTransitionIntentId(null);

        long previousPlayerId = gameSession.getWorld().match().activePlayerId();
        long activePlayerId = previousPlayerId == 1 ? 2 : 1;
        advanceTurnAfterShot(gameSession, previousPlayerId, activePlayerId, intentId);

        com.tanks.server.websocket.gameplay.world.TankState tank1 = gameSession.getWorld().requireTankByPlayer(1L);
        com.tanks.server.websocket.gameplay.world.TankState tank2 = gameSession.getWorld().requireTankByPlayer(2L);

        boolean tank1Alive = tank1 != null && tank1.alive();
        boolean tank2Alive = tank2 != null && tank2.alive();

        if (!tank1Alive && !tank2Alive) {
            finalizeDrawResult(gameSession);
            publishDiff(
                    gameSession,
                    OnlineStateDiffResponseType.TERMINAL_GAME,
                    intentId,
                    gameSession.getServerTick(),
                    TerminalGame.builder()
                            .winnerPlayerId(null)
                            .reason(TerminalGameReason.DRAW)
                            .finalState(initialStateFactory.createStateSnapshot(gameSession))
                            .build());
        } else if (!tank1Alive) {
            finalizeWinResult(gameSession, 2L);
            publishDiff(
                    gameSession,
                    OnlineStateDiffResponseType.TERMINAL_GAME,
                    intentId,
                    gameSession.getServerTick(),
                    TerminalGame.builder()
                            .winnerPlayerId(2L)
                            .reason(TerminalGameReason.LAST_TANK_STANDING)
                            .finalState(initialStateFactory.createStateSnapshot(gameSession))
                            .build());
        } else if (!tank2Alive) {
            finalizeWinResult(gameSession, 1L);
            publishDiff(
                    gameSession,
                    OnlineStateDiffResponseType.TERMINAL_GAME,
                    intentId,
                    gameSession.getServerTick(),
                    TerminalGame.builder()
                            .winnerPlayerId(1L)
                            .reason(TerminalGameReason.LAST_TANK_STANDING)
                            .finalState(initialStateFactory.createStateSnapshot(gameSession))
                            .build());
        }
    }

    public void forfeitGame(UUID gameId, String forfeitingUsername) {
        GameSession gameSession = gameRepository.findById(gameId).orElse(null);
        if (gameSession == null || gameSession.getState() != GameSessionState.STARTED) {
            return;
        }

        Long winnerPlayerId = null;
        if (forfeitingUsername.equals(gameSession.getPlayerA())) {
            winnerPlayerId = 2L;
        } else if (forfeitingUsername.equals(gameSession.getPlayerB())) {
            winnerPlayerId = 1L;
        } else {
            return;
        }

        finalizeWinResult(gameSession, winnerPlayerId);
        publishDiff(
                gameSession,
                OnlineStateDiffResponseType.TERMINAL_GAME,
                null,
                gameSession.getServerTick(),
                TerminalGame.builder()
                        .winnerPlayerId(winnerPlayerId)
                        .reason(TerminalGameReason.FORFEIT)
                        .finalState(initialStateFactory.createStateSnapshot(gameSession))
                        .build());
        log.debug("Game {} forfeited by {}: winner={}", gameId, forfeitingUsername, winnerPlayerId);
    }

    private void finalizeDrawResult(GameSession gameSession) {
        OffsetDateTime endedAt = OffsetDateTime.now();
        User playerA = userByUsername(gameSession.getPlayerA());
        User playerB = userByUsername(gameSession.getPlayerB());

        gameResultRepository.save(GameResult.builder()
                .playerA(playerA)
                .playerB(playerB)
                .winner(null)
                .outcome(GameOutcome.DRAW)
                .gameStartedAt(gameStartedAt(gameSession, endedAt))
                .gameEndedAt(endedAt)
                .build());

        gameSession.setEndedAt(endedAt);
        gameSession.setState(GameSessionState.ENDED);
        gameSession.getWorld().match().winnerPlayerId(null);
        log.debug("Game ended in DRAW: {} vs {}", playerA.getUsername(), playerB.getUsername());
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
        double wind = contentCatalog.require(gameSession.getGameContentVersion()).world().generateWind();
        gameSession.getWorld().match().wind(wind);
        gameSession.getWorld().match().activePlayerId(activePlayerId);
        gameSession.getWorld().match().turnNumber(gameSession.getWorld().match().turnNumber() + 1);
        gameSession.getWorld().match().turnEndsAtServerTick(
                gameSession.getServerTick() + ServerSimulationLoopService.TURN_TIMER_TICKS);

        publishDiff(
                gameSession,
                OnlineStateDiffResponseType.TURN_TRANSITION,
                intentId,
                gameSession.getServerTick(),
                TurnTransition.builder()
                        .previousPlayerId(previousPlayerId)
                        .activePlayerId(activePlayerId)
                        .turnNumber(gameSession.getWorld().match().turnNumber())
                        .phase(TurnPhase.AIMING)
                        .turnEndsAtServerTick(gameSession.getWorld().match().turnEndsAtServerTick())
                        .matchEndsAtServerTick(gameSession.getMatchEndsAtServerTick())
                        .wind(wind)
                        .build());
        gameSession.setTurnStartDiffSequence(gameSession.getNextDiffSequence() - 1);
        spawnLootCrate(gameSession);
        log.debug("Turn advanced after shot: {} -> {}", previousPlayerId, activePlayerId);
    }

    public void spawnLootCrate(GameSession gameSession) {
        if (gameSession == null || gameSession.getWorld() == null || gameSession.getTerrainModel() == null) {
            return;
        }
        var content = contentCatalog.require(gameSession.getGameContentVersion());
        double minX = 100.0;
        double maxX = content.world().width() - 100.0;
        double dropX = Math.round((minX + java.util.concurrent.ThreadLocalRandom.current().nextDouble() * (maxX - minX)) * 1000.0) / 1000.0;
        double targetY = gameSession.getTerrainModel().surfaceY(dropX);

        String[] crateTypes = {"hp", "fuel", "ammo"};
        String crateType = crateTypes[java.util.concurrent.ThreadLocalRandom.current().nextInt(crateTypes.length)];
        int value = "hp".equals(crateType) ? 25 : 50;
        String crateId = "crate-" + UUID.randomUUID().toString().substring(0, 8);

        com.tanks.server.websocket.gameplay.world.LootCrateState crateState = com.tanks.server.websocket.gameplay.world.LootCrateState.builder()
                .crateId(crateId)
                .crateType(crateType)
                .x(dropX)
                .y(0.0)
                .targetY(targetY)
                .isLanding(true)
                .collected(false)
                .value(value)
                .build();

        gameSession.getWorld().lootCrates().add(crateState);

        publishDiff(
                gameSession,
                OnlineStateDiffResponseType.CRATE_SPAWNED,
                null,
                gameSession.getServerTick(),
                CrateSpawned.builder()
                        .crateId(crateId)
                        .crateType(crateType)
                        .dropX(dropX)
                        .targetY(targetY)
                        .value(value)
                        .build());
        log.debug("Supply crate spawned: {} at x={}", crateId, dropX);
    }

    public void finalizeMatchTimeExpired(GameSession gameSession, Long winnerPlayerId) {
        finalizeWinResult(gameSession, winnerPlayerId != null ? winnerPlayerId : 0);
        publishDiff(
                gameSession,
                OnlineStateDiffResponseType.TERMINAL_GAME,
                null,
                gameSession.getServerTick(),
                TerminalGame.builder()
                        .winnerPlayerId(winnerPlayerId)
                        .reason(TerminalGameReason.MATCH_TIME_EXPIRED)
                        .finalState(initialStateFactory.createStateSnapshot(gameSession))
                        .build());
    }

    private long projectileEntityId(GameSession gameSession) {
        return 20 + gameSession.getNextDiffSequence() - 2;
    }

    private void publishDiff(
            GameSession gameSession,
            OnlineStateDiffResponseType type,
            String intentId,
            long serverTick,
            OnlineDiffResponsePayload payload) {
        long sequence = gameSession.getNextDiffSequence();
        OnlineDiffResponseDto diff = new OnlineDiffResponseDto(
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
}
