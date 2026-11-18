package com.tanks.server.websocket.services;

import com.tanks.server.domain.Lobby;
import com.tanks.server.domain.LobbyType;
import com.tanks.server.domain.Player;
import com.tanks.server.repositories.GameSessionRepository;
import com.tanks.server.repositories.LobbyRepository;
import com.tanks.server.websocket.dto.game.GameEventPayload;
import com.tanks.server.websocket.dto.game.GameEventResponseDto;
import com.tanks.server.websocket.dto.game.GameEventType;
import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffBatchResponseDto;
import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffResponseDto;
import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffResponsePayload;
import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineStateDiffResponseType;
import com.tanks.server.websocket.dto.gameplay.diffResponse.enums.IntentRejectionReason;
import com.tanks.server.websocket.dto.gameplay.diffResponse.enums.ResyncReason;
import com.tanks.server.websocket.dto.gameplay.diffResponse.enums.TerminalGameReason;
import com.tanks.server.websocket.dto.gameplay.diffResponse.enums.TurnPhase;
import com.tanks.server.websocket.dto.gameplay.diffResponse.payloads.AimUpdate;
import com.tanks.server.websocket.dto.gameplay.diffResponse.payloads.CrateSpawned;
import com.tanks.server.websocket.dto.gameplay.diffResponse.payloads.IntentRejection;
import com.tanks.server.websocket.dto.gameplay.diffResponse.payloads.TerminalGame;
import com.tanks.server.websocket.dto.gameplay.diffResponse.payloads.TurnTransition;
import com.tanks.server.websocket.dto.gameplay.playerIntent.OnlinePlayerIntentRequestDto;
import com.tanks.server.websocket.dto.gameplay.playerIntent.OnlinePlayerIntentRequestType;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.AimIntentRequestPayload;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.FireIntentRequestPayload;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.MoveIntentRequestPayload;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.SelectProjectileIntentRequestPayload;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.events.GameEvent;
import com.tanks.server.websocket.events.OnlineGameplayEvent;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.gameplay.content.GameContentCatalog;
import com.tanks.server.websocket.gameplay.simulation.GameSimulation;
import com.tanks.server.websocket.gameplay.simulation.GameStateResponseFactory;
import com.tanks.server.websocket.gameplay.world.InitialWorldFactory;
import com.tanks.server.websocket.gameplay.world.LootCrateState;
import com.tanks.server.websocket.gameplay.world.TankState;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
@Slf4j
public class GameSessionService {
    private static final long PLAYER_A_ID = 1;
    private static final long PLAYER_B_ID = 2;

    private final GameSessionRepository gameRepository;
    private final LobbyRepository lobbyRepository;
    private final QuickMatchService quickMatchService;
    private final ApplicationEventPublisher eventPublisher;
    private final GameContentCatalog contentCatalog;
    private final InitialWorldFactory initialWorldFactory;
    private final GameSimulation gameSimulation;
    private final GameStateResponseFactory initialStateFactory;

    public GameSession create(Lobby lobby) {
        Player host = lobby.getHost();
        Player opponent = lobby.getOpponent();
        GameSession savedGameSession = null;

        try {
            UUID gameSessionId = UUID.randomUUID();
            var content = contentCatalog.current();
            var initialWorld = initialWorldFactory.create(
                    content,
                    ThreadLocalRandom.current().nextLong(),
                    host.nickname(),
                    opponent.nickname(),
                    host.tankId(),
                    opponent.tankId());
            GameSession gameSession = GameSession.builder()
                    .id(gameSessionId)
                    .hostId(host.id())
                    .playerA(host)
                    .playerB(opponent)
                    .createdAt(OffsetDateTime.now())
                    .state(GameSessionState.CREATED)
                    .gameContentVersion(content.version())
                    .world(initialWorld.world())
                    .terrainModel(initialWorld.terrainModel())
                    .build();

            savedGameSession = gameRepository.save(gameSession);

            GameEventResponseDto response = new GameEventResponseDto(
                    GameEventType.GAME_CREATED,
                    new GameEventPayload(savedGameSession.getId(), savedGameSession.getHostId(), host.id()));

            lobby.setState(LobbyState.IN_GAME);
            lobby.setGameSessionId(savedGameSession.getId());
            lobbyRepository.save(lobby);
            if (lobby.getType() == LobbyType.PUBLIC) {
                quickMatchService.delete(lobby.getId());
            }

            eventPublisher.publishEvent(new GameEvent(this, host.id().toString(), "/queue/replies", response));
            eventPublisher.publishEvent(new GameEvent(this, opponent.id().toString(), "/queue/replies", response));

            log.info("Game created: {} ({}) vs {} ({})", host.nickname(), host.id(), opponent.nickname(), opponent.id());
            return savedGameSession;
        } catch (RuntimeException ex) {
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

        sendInitialStateToPlayer(gameSession, gameSession.getPlayerA().id());
        sendInitialStateToPlayer(gameSession, gameSession.getPlayerB().id());

        log.debug("Game started: {} vs {}", gameSession.getPlayerA().nickname(), gameSession.getPlayerB().nickname());
    }

    public void sendInitialStateToPlayer(GameSession gameSession, UUID playerUuid) {
        eventPublisher.publishEvent(new OnlineGameplayEvent(
                this,
                playerUuid.toString(),
                "/queue/replies",
                initialStateFactory.createForPlayer(gameSession, localPlayerId(gameSession, playerUuid))));

        log.debug("Initial state sent to player: {}", playerUuid);
    }

    public boolean sendResyncStateToPlayer(UUID gameSessionId, UUID playerUuid, ResyncReason reason) {
        GameSession gameSession = findById(gameSessionId);
        if (!GameSessionState.CREATED.equals(gameSession.getState())
                && !GameSessionState.STARTED.equals(gameSession.getState())
                && !GameSessionState.ENDED.equals(gameSession.getState())) {
            return false;
        }

        var resyncDiff = initialStateFactory.createResyncForPlayer(gameSession, reason,
                localPlayerId(gameSession, playerUuid));

        eventPublisher.publishEvent(new OnlineGameplayEvent(
                this,
                playerUuid.toString(),
                "/queue/replies",
                resyncDiff));

        log.debug("Resync state sent to player: {}", playerUuid);
        return true;
    }

    private long localPlayerId(GameSession gameSession, UUID playerUuid) {
        if (gameSession.getPlayerA() != null && gameSession.getPlayerA().id().equals(playerUuid)) {
            return PLAYER_A_ID;
        }
        if (gameSession.getPlayerB() != null && gameSession.getPlayerB().id().equals(playerUuid)) {
            return PLAYER_B_ID;
        }
        throw new IllegalArgumentException("Player " + playerUuid + " is not a participant in game " + gameSession.getId());
    }

    public boolean processPlayerIntent(GameSession gameSession, OnlinePlayerIntentRequestDto<?> intent) {
        if (intent == null) {
            return false;
        }

        UUID playerUuid = playerUuid(gameSession, intent.playerId());
        IntentRejectionReason rejectionReason = rejectionReason(gameSession, playerUuid, intent);

        if (rejectionReason != null) {
            log.info("Intent rejected reason={} intent={}", rejectionReason, intent);
            publishIntentRejection(gameSession, intent, rejectionReason);
            return false;
        }

        if (intent.type() == OnlinePlayerIntentRequestType.MOVE && intent.payload() instanceof MoveIntentRequestPayload move) {
            if (!publishMovementSegment(gameSession, intent, move)) {
                log.debug("Movement rejected: {}", intent);
                return false;
            }
            log.debug("Movement accepted: {}", intent);
            return true;
        }

        if (intent.type() == OnlinePlayerIntentRequestType.AIM && intent.payload() instanceof AimIntentRequestPayload aim) {
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

        if (intent.type() == OnlinePlayerIntentRequestType.SELECT_PROJECTILE_SLOT
                && intent.payload() instanceof SelectProjectileIntentRequestPayload select) {
            var tank = gameSession.getWorld().requireTankByPlayer(intent.playerId());
            var content = contentCatalog.require(gameSession.getGameContentVersion());
            var tankDef = content.requireTank(tank.definitionId());
            tank.selectedProjectileSlotId(tankDef.loadout().get(select.getSlot()));
            log.debug("Select projectile slot accepted: {}", intent);
            return true;
        }

        if (intent.type() == OnlinePlayerIntentRequestType.FIRE && intent.payload() instanceof FireIntentRequestPayload fire) {
            publishShotOutcomeBatch(gameSession, intent, fire);
            log.debug("Fire accepted: {}", intent);
            return true;
        }

        log.debug("Intent accepted: {}", intent);
        return true;
    }

    public boolean acceptPlayerIntent(UUID playerUuid, UUID gameSessionId, OnlinePlayerIntentRequestDto<?> intent) {
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
        UUID expectedUuid = playerUuid(gameSession, intent.playerId());
        if (expectedUuid == null || !expectedUuid.equals(playerUuid)) {
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

    public GameSession addConnectedPlayer(UUID gameSessionId, UUID playerId) {
        GameSession gameSession = findById(gameSessionId);
        if (playerId != null) {
            if (!gameSession.getConnectedPlayerIds().contains(playerId) && gameSession.getConnectedPlayerIds().size() >= 2) {
                throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "Game session already has 2 players",
                        URI.create("about:blank"));
            }
            gameSession.getConnectedPlayerIds().add(playerId);
        }
        return gameRepository.save(gameSession);
    }

    public void removeConnectedPlayer(UUID gameSessionId, UUID playerId) {
        Optional<GameSession> gameSessionOpt = gameRepository.findById(gameSessionId);
        if (gameSessionOpt.isEmpty()) {
            log.debug("Game session {} not found when removing connected player {}", gameSessionId, playerId);
            return;
        }
        GameSession gameSession = gameSessionOpt.get();
        if (playerId != null) {
            gameSession.getConnectedPlayerIds().remove(playerId);
        }
        if (gameSession.getConnectedPlayerCount() == 0) {
            gameRepository.delete(gameSession);
            lobbyRepository.findAll().stream()
                    .filter(l -> gameSessionId.equals(l.getGameSessionId()))
                    .findFirst()
                    .ifPresent(lobbyRepository::delete);
            log.info("Deleted game session {} and its lobby after all players disconnected", gameSessionId);
            return;
        }
        gameRepository.save(gameSession);
    }

    private IntentRejectionReason rejectionReason(
            GameSession gameSession,
            UUID playerUuid,
            OnlinePlayerIntentRequestDto<?> intent) {
        if (!GameSessionState.STARTED.equals(gameSession.getState())
                || !gameSession.getId().toString().equals(intent.gameSessionId())
                || !validPayload(gameSession, intent)) {
            return IntentRejectionReason.INVALID_PAYLOAD;
        }

        UUID expectedUuid = playerUuid(gameSession, intent.playerId());
        if (expectedUuid == null || !expectedUuid.equals(playerUuid)
                || !isActivePlayer(gameSession, intent.playerId())) {
            return IntentRejectionReason.NOT_ACTIVE_PLAYER;
        }

        if (intent.lastConfirmedDiffSequence() < gameSession.getTurnStartDiffSequence()
                || intent.lastConfirmedDiffSequence() > gameSession.getNextDiffSequence() - 1) {
            return IntentRejectionReason.STALE_BASE_STATE;
        }

        if (intent.type() == OnlinePlayerIntentRequestType.MOVE && intent.payload() instanceof MoveIntentRequestPayload move) {
            IntentRejectionReason movementRejection = movementRejectionReason(gameSession, intent.playerId(), move);
            if (movementRejection != null) {
                return movementRejection;
            }
        }

        return null;
    }

    private boolean validPayload(GameSession gameSession, OnlinePlayerIntentRequestDto<?> intent) {
        if (intent.intentId() == null || intent.intentId().isBlank() || intent.type() == null || intent.payload() == null) {
            return false;
        }

        if (intent.type() == OnlinePlayerIntentRequestType.MOVE && intent.payload() instanceof MoveIntentRequestPayload move) {
            return move.getDirection() == -1 || move.getDirection() == 1;
        }
        if (intent.type() == OnlinePlayerIntentRequestType.AIM && intent.payload() instanceof AimIntentRequestPayload aim) {
            var validation = contentCatalog.require(gameSession.getGameContentVersion()).validation();
            return aim.getPower() >= validation.minFirePower() && aim.getPower() <= validation.maxFirePower()
                    && aim.getAngle() >= -Math.PI && aim.getAngle() <= 0.0;
        }
        if (intent.type() == OnlinePlayerIntentRequestType.SELECT_PROJECTILE_SLOT
                && intent.payload() instanceof SelectProjectileIntentRequestPayload select) {
            var tank = gameSession.getWorld().requireTankByPlayer(intent.playerId());
            var content = contentCatalog.require(gameSession.getGameContentVersion());
            var tankDef = content.requireTank(tank.definitionId());
            int slot = select.getSlot();
            return slot >= 0 && slot < tankDef.loadout().size();
        }
        if (intent.type() == OnlinePlayerIntentRequestType.FIRE && intent.payload() instanceof FireIntentRequestPayload fire) {
            var validation = contentCatalog.require(gameSession.getGameContentVersion()).validation();
            return fire.getPower() >= validation.minFirePower() && fire.getPower() <= validation.maxFirePower()
                    && fire.getAngle() >= -Math.PI && fire.getAngle() <= 0.0;
        }

        return false;
    }

    private boolean isActivePlayer(GameSession gameSession, long playerId) {
        return gameSession.getWorld().match().activePlayerId() == playerId;
    }

    private UUID playerUuid(GameSession gameSession, long playerId) {
        if (playerId == PLAYER_A_ID && gameSession.getPlayerA() != null) {
            return gameSession.getPlayerA().id();
        }
        if (playerId == PLAYER_B_ID && gameSession.getPlayerB() != null) {
            return gameSession.getPlayerB().id();
        }
        return null;
    }

    private void publishIntentRejection(
            GameSession gameSession,
            OnlinePlayerIntentRequestDto<?> intent,
            IntentRejectionReason reason) {
        UUID playerUuid = playerUuid(gameSession, intent.playerId());
        if (playerUuid == null) {
            return;
        }
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
                playerUuid.toString(),
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
            FireIntentRequestPayload fire) {
        long firingPlayerId = intent.playerId();
        var firingTank = gameSession.getWorld().requireTankByPlayer(firingPlayerId);
        firingTank.aimAngle(fire.getAngle());
        firingTank.power(fire.getPower());

        var content = contentCatalog.require(gameSession.getGameContentVersion());
        var projectile = gameSimulation.fire(content, gameSession.getWorld(), gameSession.getTerrainModel(),
                intent.intentId(), projectileEntityId(gameSession), firingPlayerId, fire);

        List<OnlineDiffResponseDto> diffs = new ArrayList<>();

        diffs.add(createDiffDto(
                gameSession,
                OnlineStateDiffResponseType.PROJECTILE_RESOLUTION,
                intent.intentId(),
                gameSession.getServerTick(),
                projectile));

        diffs.add(createDiffDto(
                gameSession,
                OnlineStateDiffResponseType.TERRAIN_PATCH,
                intent.intentId(),
                gameSession.getServerTick(),
                gameSimulation.deformTerrain(content, gameSession.getWorld(), gameSession.getTerrainModel(),
                        projectile.projectileDefinitionId(), projectile.impact())));

        for (var settlement : gameSimulation.settleUnsupportedTanks(content, gameSession.getWorld(),
                gameSession.getTerrainModel(), gameSession.getServerTick())) {
            diffs.add(createDiffDto(
                    gameSession,
                    OnlineStateDiffResponseType.MOVEMENT_SEGMENT,
                    null,
                    settlement.endedServerTick(),
                    settlement));
        }

        TankState tank1 = gameSession.getWorld().requireTankByPlayer(1L);
        TankState tank2 = gameSession.getWorld().requireTankByPlayer(2L);

        boolean tank1Alive = tank1 != null && tank1.alive();
        boolean tank2Alive = tank2 != null && tank2.alive();

        if (!tank1Alive && !tank2Alive) {
            finalizeDrawResult(gameSession);
            diffs.add(createDiffDto(
                    gameSession,
                    OnlineStateDiffResponseType.TERMINAL_GAME,
                    intent.intentId(),
                    gameSession.getServerTick(),
                    TerminalGame.builder()
                            .winnerPlayerId(null)
                            .reason(TerminalGameReason.DRAW)
                            .finalState(initialStateFactory.createStateSnapshot(gameSession))
                            .build()));
        } else if (!tank1Alive) {
            finalizeWinResult(gameSession, 2L);
            diffs.add(createDiffDto(
                    gameSession,
                    OnlineStateDiffResponseType.TERMINAL_GAME,
                    intent.intentId(),
                    gameSession.getServerTick(),
                    TerminalGame.builder()
                            .winnerPlayerId(2L)
                            .reason(TerminalGameReason.LAST_TANK_STANDING)
                            .finalState(initialStateFactory.createStateSnapshot(gameSession))
                            .build()));
        } else if (!tank2Alive) {
            finalizeWinResult(gameSession, 1L);
            diffs.add(createDiffDto(
                    gameSession,
                    OnlineStateDiffResponseType.TERMINAL_GAME,
                    intent.intentId(),
                    gameSession.getServerTick(),
                    TerminalGame.builder()
                            .winnerPlayerId(1L)
                            .reason(TerminalGameReason.LAST_TANK_STANDING)
                            .finalState(initialStateFactory.createStateSnapshot(gameSession))
                            .build()));
        } else {
            long previousPlayerId = gameSession.getWorld().match().activePlayerId();
            long activePlayerId = previousPlayerId == 1 ? 2 : 1;
            appendTurnStartDiffs(gameSession, previousPlayerId, activePlayerId, intent.intentId(), diffs);
        }

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
        double wind = contentCatalog.require(gameSession.getGameContentVersion()).world().generateWind();
        gameSession.getWorld().match().wind(wind);
        gameSession.getWorld().match().activePlayerId(activePlayerId);
        gameSession.getWorld().match().turnNumber(gameSession.getWorld().match().turnNumber() + 1);
        gameSession.getWorld().match().turnEndsAtServerTick(
                gameSession.getServerTick() + ServerSimulationLoopService.TURN_TIMER_TICKS);

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

        OnlineDiffResponseDto crateDiff = createCrateSpawnDiff(gameSession);
        if (crateDiff != null) {
            diffs.add(crateDiff);
        }
    }

    public void finalizeDamageTrailKills(GameSession gameSession) {
        TankState tank1 = gameSession.getWorld().requireTankByPlayer(1L);
        TankState tank2 = gameSession.getWorld().requireTankByPlayer(2L);

        boolean tank1Alive = tank1 != null && tank1.alive();
        boolean tank2Alive = tank2 != null && tank2.alive();

        if (!tank1Alive && !tank2Alive) {
            finalizeDrawResult(gameSession);
            publishDiff(
                    gameSession,
                    OnlineStateDiffResponseType.TERMINAL_GAME,
                    null,
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
                    null,
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
                    null,
                    gameSession.getServerTick(),
                    TerminalGame.builder()
                            .winnerPlayerId(1L)
                            .reason(TerminalGameReason.LAST_TANK_STANDING)
                            .finalState(initialStateFactory.createStateSnapshot(gameSession))
                            .build());
        }
    }

    public void forfeitGame(UUID gameId, UUID forfeitingPlayerUuid) {
        GameSession gameSession = gameRepository.findById(gameId).orElse(null);
        if (gameSession == null || gameSession.getState() != GameSessionState.STARTED) {
            return;
        }

        Long winnerPlayerId;
        if (gameSession.getPlayerA() != null && forfeitingPlayerUuid.equals(gameSession.getPlayerA().id())) {
            winnerPlayerId = 2L;
        } else if (gameSession.getPlayerB() != null && forfeitingPlayerUuid.equals(gameSession.getPlayerB().id())) {
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
        log.debug("Game {} forfeited by {}: winner={}", gameId, forfeitingPlayerUuid, winnerPlayerId);
    }

    private void finalizeDrawResult(GameSession gameSession) {
        OffsetDateTime endedAt = OffsetDateTime.now();
        gameSession.setEndedAt(endedAt);
        gameSession.setState(GameSessionState.ENDED);
        gameSession.getWorld().match().winnerPlayerId(null);
        log.debug("Game ended in DRAW: {}", gameSession.getId());
    }

    private void finalizeWinResult(GameSession gameSession, long winnerPlayerId) {
        OffsetDateTime endedAt = OffsetDateTime.now();
        gameSession.setEndedAt(endedAt);
        gameSession.setState(GameSessionState.ENDED);
        gameSession.getWorld().match().winnerPlayerId(winnerPlayerId);
        log.debug("Game ended: {}, winner={}", gameSession.getId(), winnerPlayerId);
    }

    private OnlineDiffResponseDto createCrateSpawnDiff(GameSession gameSession) {
        if (gameSession == null || gameSession.getWorld() == null || gameSession.getTerrainModel() == null) {
            return null;
        }
        var content = contentCatalog.require(gameSession.getGameContentVersion());
        double minX = 100.0;
        double maxX = content.world().width() - 100.0;
        double dropX = Math.round((minX + ThreadLocalRandom.current().nextDouble() * (maxX - minX)) * 1000.0) / 1000.0;
        double targetY = gameSession.getTerrainModel().surfaceY(dropX);

        String[] crateTypes = {"hp", "fuel", "ammo"};
        String crateType = crateTypes[ThreadLocalRandom.current().nextInt(crateTypes.length)];
        int value = "hp".equals(crateType) ? 25 : 50;
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

    public void finalizeMatchTimeExpired(GameSession gameSession, Long winnerPlayerId) {
        if (winnerPlayerId == null) {
            finalizeDrawResult(gameSession);
        } else {
            finalizeWinResult(gameSession, winnerPlayerId);
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

    private long projectileEntityId(GameSession gameSession) {
        return 20 + gameSession.getNextDiffSequence() - 2;
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
