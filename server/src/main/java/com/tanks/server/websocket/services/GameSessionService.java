package com.tanks.server.websocket.services;

import com.tanks.server.entities.User;
import com.tanks.server.entities.gameResult.GameOutcome;
import com.tanks.server.entities.gameResult.GameResult;
import com.tanks.server.repositories.GameResultRepository;
import com.tanks.server.repositories.UserRepository;
import com.tanks.server.utils.IdFactory;
import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffBatchResponseDto;
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
import com.tanks.server.websocket.gameplay.world.LootCrateState;
import com.tanks.server.websocket.gameplay.world.TankState;
import com.tanks.server.websocket.repositories.GameSessionRepository;
import com.tanks.server.websocket.repositories.LobbyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.util.concurrent.ThreadLocalRandom;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
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
            String tankDefA = lobby.getHost().getTankDefinitionId();
            String tankDefB = lobby.getOpponent().getTankDefinitionId();
            var initialWorld = initialWorldFactory.create(content, 0, host.getUsername(),
                    opponent.getUsername(), tankDefA, tankDefB);
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

        var worldDef = contentCatalog.require(gameSession.getGameContentVersion()).world();
        gameSession.setStartedAt(OffsetDateTime.now());
        gameSession.setServerTick(0);
        gameSession.getWorld().match().activePlayerId(PLAYER_A_ID);
        gameSession.getWorld().match().turnNumber(1);
        long matchEndsAt = gameSession.getServerTick() + (long) worldDef.tickRateHz() * worldDef.matchDurationSeconds();
        gameSession.setMatchEndsAtServerTick(matchEndsAt);
        long standardTurnEnd = (long) worldDef.tickRateHz() * worldDef.turnDurationSeconds();
        long turnEndsAt = (matchEndsAt > 0) ? Math.min(standardTurnEnd, matchEndsAt) : standardTurnEnd;
        gameSession.getWorld().match().turnEndsAtServerTick(turnEndsAt);
        gameSession.getWorld().match()
                .wind(worldDef.generateWind());
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

    public void sendResyncStateToPlayer(UUID gameSessionId, String username,
            ResyncReason reason) {
        GameSession gameSession = findById(gameSessionId);
        var resyncDiff = initialStateFactory.createResyncForPlayer(gameSession, reason,
                localPlayerId(gameSession, username));

        eventPublisher.publishEvent(new OnlineGameplayEvent(
                this,
                username,
                "/queue/replies",
                resyncDiff));

        log.debug("Resync state sent to player: {}", username);
    }

    private long localPlayerId(GameSession gameSession, String username) {
        if (gameSession.getPlayerA().equals(username)) {
            return PLAYER_A_ID;
        }
        if (gameSession.getPlayerB().equals(username)) {
            return PLAYER_B_ID;
        }
        throw new ProblemDetailException(
                HttpStatus.BAD_REQUEST,
                "User " + username + " is not a participant in game session " + gameSession.getId(),
                URI.create("about:blank"));
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
                tank.aimAngle(aim.angle());
                tank.power(aim.power());
                publishDiff(
                        gameSession,
                        OnlineStateDiffResponseType.AIM_UPDATE,
                        intent.intentId(),
                        gameSession.getServerTick(),
                        AimUpdate.builder()
                                .playerId(intent.playerId())
                                .angle(aim.angle())
                                .power(aim.power())
                                .build());
                log.debug("Aim accepted: {}", intent);
                return true;
            }
        }

        if (intent.type() == OnlinePlayerIntentRequestType.SELECT_PROJECTILE_SLOT) {
            SelectProjectileIntentRequestPayload select = extractSelectProjectileSlotPayload(intent);
            if (select != null) {
                var tank = gameSession.getWorld().requireTankByPlayer(intent.playerId());
                var content = contentCatalog.require(gameSession.getGameContentVersion());
                var tankDef = content.requireTank(tank.definitionId());
                int slot = select.slot();
                if (slot >= 0 && slot < tankDef.loadout().size()) {
                    tank.selectedProjectileSlotId(tankDef.loadout().get(slot));
                    log.debug("Select projectile slot accepted: {}", intent);
                    return true;
                }
                return false;
            }
        }

        if (intent.type() == OnlinePlayerIntentRequestType.FIRE) {
            FireIntentIntentRequestPayload fire = extractFirePayload(intent);
            if (fire != null) {
                publishShotOutcomeBatch(gameSession, intent, fire);
                log.debug("Fire accepted: {}", intent);
                return true;
            }
        }

        log.debug("Intent accepted: {}", intent);
        return true;
    }

    public boolean acceptPlayerIntent(UUID gameSessionId, OnlinePlayerIntentRequestDto<?> intent) {
        GameSession gameSession = findById(gameSessionId);
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
        gameSession.getConnectedUserIds().remove(userId);
        gameRepository.save(gameSession);
    }

    private MoveIntentRequestPayload extractMovePayload(OnlinePlayerIntentRequestDto<?> intent) {
        if (intent != null && intent.payload() instanceof MoveIntentRequestPayload move) {
            return move;
        }
        return null;
    }

    private AimIntentRequestPayload extractAimPayload(OnlinePlayerIntentRequestDto<?> intent) {
        if (intent != null && intent.payload() instanceof AimIntentRequestPayload aim) {
            return aim;
        }
        return null;
    }

    private FireIntentIntentRequestPayload extractFirePayload(OnlinePlayerIntentRequestDto<?> intent) {
        if (intent != null && intent.payload() instanceof FireIntentIntentRequestPayload fire) {
            return fire;
        }
        return null;
    }

    private SelectProjectileIntentRequestPayload extractSelectProjectileSlotPayload(
            OnlinePlayerIntentRequestDto<?> intent) {
        if (intent != null && intent.payload() instanceof SelectProjectileIntentRequestPayload select) {
            return select;
        }
        return null;
    }

    private IntentRejectionReason rejectionReason(
            GameSession gameSession,
            String username,
            OnlinePlayerIntentRequestDto<?> intent) {
        if (!GameSessionState.STARTED.equals(gameSession.getState())
                || !gameSession.getId().toString().equals(intent.gameSessionId())) {
            return IntentRejectionReason.INVALID_PAYLOAD;
        }

        if (!playerUsername(gameSession, intent.playerId()).equals(username)
                || !isActivePlayer(gameSession, intent.playerId())) {
            return IntentRejectionReason.NOT_ACTIVE_PLAYER;
        }

        if (gameSession.getPendingTurnTransitionAtServerTick() > 0) {
            return IntentRejectionReason.NOT_ACTIVE_PLAYER;
        }

        if (!validPayload(gameSession, intent)) {
            return IntentRejectionReason.INVALID_PAYLOAD;
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
            return move != null && (move.direction() == -1 || move.direction() == 1);
        }
        if (intent.type() == OnlinePlayerIntentRequestType.AIM) {
            AimIntentRequestPayload aim = extractAimPayload(intent);
            if (aim == null)
                return false;
            var validation = contentCatalog.require(gameSession.getGameContentVersion()).validation();
            return aim.power() >= validation.minFirePower() && aim.power() <= validation.maxFirePower()
                    && aim.angle() >= -Math.PI && aim.angle() <= 0.0;
        }
        if (intent.type() == OnlinePlayerIntentRequestType.SELECT_PROJECTILE_SLOT) {
            SelectProjectileIntentRequestPayload select = extractSelectProjectileSlotPayload(intent);
            if (select == null)
                return false;
            var tank = gameSession.getWorld().requireTankByPlayer(intent.playerId());
            if (tank == null)
                return false;
            var content = contentCatalog.require(gameSession.getGameContentVersion());
            var tankDef = content.requireTank(tank.definitionId());
            int slot = select.slot();
            return slot >= 0 && slot < tankDef.loadout().size();
        }
        if (intent.type() == OnlinePlayerIntentRequestType.FIRE) {
            FireIntentIntentRequestPayload fire = extractFirePayload(intent);
            if (fire == null) {
                return false;
            }
            var validation = contentCatalog.require(gameSession.getGameContentVersion()).validation();
            return fire.power() >= validation.minFirePower() && fire.power() <= validation.maxFirePower()
                    && fire.angle() >= -Math.PI && fire.angle() <= 0.0;
        }

        return false;
    }

    private boolean isActivePlayer(GameSession gameSession, long playerId) {
        return gameSession.getWorld().match().activePlayerId() == playerId;
    }

    private String playerUsername(GameSession gameSession, long playerId) {
        if (playerId == PLAYER_A_ID) {
            return gameSession.getPlayerA();
        }
        if (playerId == PLAYER_B_ID) {
            return gameSession.getPlayerB();
        }
        throw new ProblemDetailException(
                HttpStatus.BAD_REQUEST,
                "Invalid player id: " + playerId,
                URI.create("about:blank"));
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

    public void publishShotOutcomeBatch(
            GameSession gameSession,
            OnlinePlayerIntentRequestDto<?> intent,
            FireIntentIntentRequestPayload fire) {
        long firingPlayerId = intent.playerId();
        var firingTank = gameSession.getWorld().requireTankByPlayer(firingPlayerId);
        firingTank.aimAngle(fire.angle());
        firingTank.power(fire.power());

        var content = contentCatalog.require(gameSession.getGameContentVersion());
        var projectile = gameSimulation.fire(content, gameSession.getWorld(), gameSession.getTerrainModel(),
                intent.intentId(), projectileEntityId(gameSession), firingPlayerId, fire);

        List<OnlineDiffResponseDto> diffs = new ArrayList<>();

        // 1. PROJECTILE_RESOLUTION
        diffs.add(createDiffDto(
                gameSession,
                OnlineStateDiffResponseType.PROJECTILE_RESOLUTION,
                intent.intentId(),
                gameSession.getServerTick(),
                projectile));

        // 2. TERRAIN_PATCH
        diffs.add(createDiffDto(
                gameSession,
                OnlineStateDiffResponseType.TERRAIN_PATCH,
                intent.intentId(),
                gameSession.getServerTick(),
                gameSimulation.deformTerrain(content, gameSession.getWorld(), gameSession.getTerrainModel(),
                        projectile.projectileDefinitionId(), projectile.impact())));

        // 3. MOVEMENT_SEGMENT (settlements)
        var settlements = gameSimulation.settleUnsupportedTanks(content, gameSession.getWorld(),
                gameSession.getTerrainModel(), gameSession.getServerTick());
        for (var settlement : settlements) {
            diffs.add(createDiffDto(
                    gameSession,
                    OnlineStateDiffResponseType.MOVEMENT_SEGMENT,
                    null,
                    settlement.endedServerTick(),
                    settlement));
        }

        // Schedule turn transition or game completion after flight + impact +
        // settlement animation
        int trajectorySteps = projectile.trajectory() != null ? Math.max(0, projectile.trajectory().size() - 1) : 0;
        int maxSubSteps = projectile.subMunitions() != null ? projectile.subMunitions().stream()
                .mapToInt(s -> {
                    int subSteps = s.trajectory() != null ? Math.max(0, s.trajectory().size() - 1) : 0;
                    int subDelayTicks = s.delaySeconds() != null
                            ? (int) Math.ceil(s.delaySeconds() * content.world().tickRateHz())
                            : 0;
                    return subDelayTicks + subSteps;
                })
                .max().orElse(0) : 0;
        int flightTicks = trajectorySteps + maxSubSteps;
        var firedProjDef = content.projectiles().get(projectile.projectileDefinitionId());
        int damageTrailTicks = (firedProjDef != null && firedProjDef.damageTrail() != null)
                ? (int) Math.ceil(firedProjDef.damageTrail().durationSeconds() * content.world().tickRateHz())
                : 0;
        int impactTicks = (int) Math.ceil(content.world().postImpactDelaySeconds() * content.world().tickRateHz());
        int settlementTicks = settlements.isEmpty() ? 0 : (int) content.world().movementSegmentDurationTicks();
        long totalDelayTicks = Math.max(15, flightTicks + damageTrailTicks + impactTicks + settlementTicks);

        long transitionTick = gameSession.getServerTick() + totalDelayTicks;
        gameSession.setPendingTurnTransitionAtServerTick(transitionTick);
        gameSession.setPendingTurnTransitionIntentId(intent.intentId());

        publishBatch(gameSession, intent.intentId(), diffs);
    }

    public void publishTurnStartBatch(
            GameSession gameSession,
            long previousPlayerId,
            long activePlayerId) {
        List<OnlineDiffResponseDto> diffs = new ArrayList<>();
        appendTurnStartDiffs(gameSession, previousPlayerId, activePlayerId, null, diffs);
        publishBatch(gameSession, null, diffs);
    }

    private void appendTurnStartDiffs(
            GameSession gameSession,
            long previousPlayerId,
            long activePlayerId,
            String intentId,
            List<OnlineDiffResponseDto> diffs) {
        var content = contentCatalog.require(gameSession.getGameContentVersion());
        double wind = content.world().generateWind();
        gameSession.getWorld().match().wind(wind);
        gameSession.getWorld().match().activePlayerId(activePlayerId);
        gameSession.getWorld().match().turnNumber(gameSession.getWorld().match().turnNumber() + 1);
        long standardTurnEnd = gameSession.getServerTick() + (long) content.world().tickRateHz() * content.world().turnDurationSeconds();
        long turnEndsAt = (gameSession.getMatchEndsAtServerTick() > 0)
                ? Math.min(standardTurnEnd, gameSession.getMatchEndsAtServerTick())
                : standardTurnEnd;
        gameSession.getWorld().match().turnEndsAtServerTick(turnEndsAt);

        var activeTank = gameSession.getWorld().requireTankByPlayer(activePlayerId);
        if (activeTank != null) {
            var activeTankDef = content.requireTank(activeTank.definitionId());
            activeTank.fuel(activeTankDef.maxFuel());
        }

        OnlineDiffResponseDto turnDiff = createDiffDto(
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
        diffs.add(turnDiff);
        gameSession.setTurnStartDiffSequence(turnDiff.sequence());
    }

    public void executePendingTurnTransition(GameSession gameSession) {
        if (gameSession.getPendingTurnTransitionAtServerTick() <= 0) {
            return;
        }
        gameSession.setPendingTurnTransitionAtServerTick(0);
        String intentId = gameSession.getPendingTurnTransitionIntentId();
        gameSession.setPendingTurnTransitionIntentId(null);

        TankState tank1 = gameSession.getWorld().requireTankByPlayer(1L);
        TankState tank2 = gameSession.getWorld().requireTankByPlayer(2L);

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
        } else {
            long previousPlayerId = gameSession.getWorld().match().activePlayerId();
            long activePlayerId = previousPlayerId == 1 ? 2 : 1;
            publishTurnStartBatch(gameSession, previousPlayerId, activePlayerId);
        }
    }

    public void forfeitGame(UUID gameId, String forfeitingUsername) {
        GameSession gameSession = findById(gameId);
        long winnerPlayerId = forfeitingUsername.equals(gameSession.getPlayerA()) ? PLAYER_B_ID : PLAYER_A_ID;

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
                .gameStartedAt(gameStartedAt(gameSession))
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
        User winner = winnerPlayerId == PLAYER_A_ID ? playerA : playerB;

        gameResultRepository.save(GameResult.builder()
                .playerA(playerA)
                .playerB(playerB)
                .winner(winner)
                .outcome(GameOutcome.WIN)
                .gameStartedAt(gameStartedAt(gameSession))
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

    private OffsetDateTime gameStartedAt(GameSession gameSession) {
        if (gameSession.getStartedAt() == null) {
            throw new IllegalStateException("Game session " + gameSession.getId() + " has not been started yet");
        }
        return gameSession.getStartedAt();
    }

    private OnlineDiffResponseDto createCrateSpawnDiff(GameSession gameSession) {
        if (gameSession == null || gameSession.getWorld() == null || gameSession.getTerrainModel() == null) {
            return null;
        }
        var content = contentCatalog.require(gameSession.getGameContentVersion());
        var crateConfig = content.world().lootCrates();
        if (gameSession.getWorld().lootCrates() != null && gameSession.getWorld().lootCrates().size() >= crateConfig.maxActiveCrates()) {
            return null;
        }
        double edgeMargin = crateConfig.spawnEdgeMargin();
        double minX = edgeMargin;
        double maxX = content.world().width() - edgeMargin;
        double dropX = Math.round((minX + ThreadLocalRandom.current().nextDouble() * (maxX - minX)) * 1000.0) / 1000.0;
        double targetY = gameSession.getTerrainModel().surfaceY(dropX);

        String[] crateTypes = { "hp", "fuel", "ammo" };
        String crateType = crateTypes[ThreadLocalRandom.current().nextInt(crateTypes.length)];
        int value = "hp".equals(crateType) ? crateConfig.hpValue() : ("fuel".equals(crateType) ? crateConfig.fuelValue() : crateConfig.ammoValue());
        String crateId = "crate-" + UUID.randomUUID().toString().substring(0, 8);

        LootCrateState crateState = LootCrateState.builder()
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

        return createDiffDto(
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
    }

    public void spawnLootCrate(GameSession gameSession) {
        OnlineDiffResponseDto crateDiff = createCrateSpawnDiff(gameSession);
        if (crateDiff != null) {
            eventPublisher.publishEvent(new OnlineGameplayEvent(
                    this,
                    null,
                    "/topic/game/" + gameSession.getId(),
                    crateDiff));
        }
    }

    public void finalizeMatchTimeExpired(GameSession gameSession, Long winnerPlayerId) {
        if (winnerPlayerId != null) {
            finalizeWinResult(gameSession, winnerPlayerId);
        } else {
            finalizeDrawResult(gameSession);
        }
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

    private static final long BASE_PROJECTILE_ENTITY_ID = 20L;

    private long projectileEntityId(GameSession gameSession) {
        return BASE_PROJECTILE_ENTITY_ID + gameSession.getNextDiffSequence() - 2;
    }

    private OnlineDiffResponseDto createDiffDto(
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
        return diff;
    }

    private void publishBatch(
            GameSession gameSession,
            String intentId,
            List<OnlineDiffResponseDto> diffs) {
        if (diffs == null || diffs.isEmpty()) {
            return;
        }
        long firstSequence = diffs.get(0).sequence();
        OnlineDiffBatchResponseDto batch = OnlineDiffBatchResponseDto.builder()
                .gameSessionId(gameSession.getId().toString())
                .sequence(firstSequence)
                .serverTick(gameSession.getServerTick())
                .intentId(intentId)
                .diffs(diffs)
                .build();

        eventPublisher.publishEvent(new OnlineGameplayEvent(
                this,
                null,
                "/topic/game/" + gameSession.getId(),
                batch));
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
