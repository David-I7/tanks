package com.tanks.server.websocket.gameplay;

import java.util.List;

import org.springframework.stereotype.Service;

import com.tanks.server.websocket.dto.gameplay.OnlineDiffEnvelopeDto;
import com.tanks.server.websocket.dto.gameplay.OnlineDiffPayloads;
import com.tanks.server.websocket.dto.gameplay.OnlineGameStateSnapshotDto;
import com.tanks.server.websocket.dto.gameplay.OnlineGameplayProtocolVersion;
import com.tanks.server.websocket.dto.gameplay.OnlineMatchSnapshotDto;
import com.tanks.server.websocket.dto.gameplay.OnlineStateDiffType;
import com.tanks.server.websocket.dto.gameplay.OnlineTerrainSnapshotDto;
import com.tanks.server.websocket.dto.gameplay.OnlineTerrainSnapshotDto.TerrainSnapshotKind;
import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;

@Service
public class OnlineInitialStateFactory {

    private final OnlineGameplayRules gameplayRules;

    public OnlineInitialStateFactory(OnlineGameplayRules gameplayRules) {
        this.gameplayRules = gameplayRules;
    }

    public OnlineDiffEnvelopeDto<OnlineDiffPayloads.InitialState> create(GameSession gameSession) {
        long initialSequence = 1;
        return new OnlineDiffEnvelopeDto<>(
                OnlineGameplayProtocolVersion.V1,
                gameSession.getId().toString(),
                initialSequence,
                0,
                OnlineStateDiffType.INITIAL_STATE,
                null,
                new OnlineDiffPayloads.InitialState(initialSequence + 1, createSnapshot(gameSession)));
    }

    public OnlineDiffEnvelopeDto<OnlineDiffPayloads.ResyncState> createResync(
            GameSession gameSession,
            OnlineDiffPayloads.ResyncReason reason) {
        long replacesSequence = Math.max(1, gameSession.getNextDiffSequence() - 1);
        return new OnlineDiffEnvelopeDto<>(
                OnlineGameplayProtocolVersion.V1,
                gameSession.getId().toString(),
                replacesSequence,
                gameSession.getLastDiffServerTick(),
                OnlineStateDiffType.RESYNC_STATE,
                null,
                new OnlineDiffPayloads.ResyncState(replacesSequence, reason, createSnapshot(gameSession)));
    }

    private OnlineGameStateSnapshotDto createSnapshot(GameSession gameSession) {
        return new OnlineGameStateSnapshotDto(
                gameSession.getGameplayDefinitionVersion(),
                new OnlineMatchSnapshotDto(
                        matchPhase(gameSession),
                        activePlayerId(gameSession),
                        2,
                        gameSession.getTurnNumber(),
                        turnTimeRemainingTicks(gameSession),
                        winnerPlayerId(gameSession)),
                new OnlineTerrainSnapshotDto.Heightmap(TerrainSnapshotKind.HEIGHTMAP, 960, 560,
                        List.of(420, 420, 421, 422, 424, 426, 428, 430, 431, 430, 428, 426, 424, 422, 421, 420)),
                List.of(
                        gameplayRules.createTankSnapshot(
                                10,
                                1,
                                gameSession.getPlayerA(),
                                OnlineGameplayRules.PLAYER_A_TANK_DEFINITION_ID,
                                new OnlineVec2Dto(playerAX(gameSession), playerAY(gameSession)),
                                1,
                                playerAHealth(gameSession),
                                playerAFuel(gameSession)),
                        gameplayRules.createTankSnapshot(
                                11,
                                2,
                                gameSession.getPlayerB(),
                                OnlineGameplayRules.PLAYER_B_TANK_DEFINITION_ID,
                                new OnlineVec2Dto(playerBX(gameSession), playerBY(gameSession)),
                                -1,
                                playerBHealth(gameSession),
                                playerBFuel(gameSession))),
                List.of());
    }

    private static double playerAX(GameSession gameSession) {
        return gameSession.getPlayerATankX() == null
                ? OnlineGameplayRules.PLAYER_A_INITIAL_TANK_X
                : gameSession.getPlayerATankX();
    }

    private static double playerAY(GameSession gameSession) {
        return gameSession.getPlayerATankY() == null
                ? OnlineGameplayRules.PLAYER_A_INITIAL_TANK_Y
                : gameSession.getPlayerATankY();
    }

    private static double playerBX(GameSession gameSession) {
        return gameSession.getPlayerBTankX() == null
                ? OnlineGameplayRules.PLAYER_B_INITIAL_TANK_X
                : gameSession.getPlayerBTankX();
    }

    private static double playerBY(GameSession gameSession) {
        return gameSession.getPlayerBTankY() == null
                ? OnlineGameplayRules.PLAYER_B_INITIAL_TANK_Y
                : gameSession.getPlayerBTankY();
    }

    private static double playerAFuel(GameSession gameSession) {
        return gameSession.getPlayerATankFuel() == null
                ? OnlineGameplayRules.INITIAL_TANK_FUEL
                : gameSession.getPlayerATankFuel();
    }

    private double playerAHealth(GameSession gameSession) {
        return gameSession.getPlayerATankHealth() == null
                ? gameplayRules.maxTankHealth(OnlineGameplayRules.PLAYER_A_TANK_DEFINITION_ID)
                : gameSession.getPlayerATankHealth();
    }

    private static double playerBFuel(GameSession gameSession) {
        return gameSession.getPlayerBTankFuel() == null
                ? OnlineGameplayRules.INITIAL_TANK_FUEL
                : gameSession.getPlayerBTankFuel();
    }

    private double playerBHealth(GameSession gameSession) {
        return gameSession.getPlayerBTankHealth() == null
                ? gameplayRules.maxTankHealth(OnlineGameplayRules.PLAYER_B_TANK_DEFINITION_ID)
                : gameSession.getPlayerBTankHealth();
    }

    private static OnlineMatchSnapshotDto.MatchPhase matchPhase(GameSession gameSession) {
        if (GameSessionState.ENDED.equals(gameSession.getState())) {
            return OnlineMatchSnapshotDto.MatchPhase.GAME_OVER;
        }
        return OnlineMatchSnapshotDto.MatchPhase.AIMING;
    }

    private static long activePlayerId(GameSession gameSession) {
        if (gameSession.getPlayerA() != null && gameSession.getPlayerA().equals(gameSession.getPlayerTurn())) {
            return 1;
        }
        if (gameSession.getPlayerB() != null && gameSession.getPlayerB().equals(gameSession.getPlayerTurn())) {
            return 2;
        }
        return 1;
    }

    private static long turnTimeRemainingTicks(GameSession gameSession) {
        return Math.max(0, gameSession.getPlayerTurnExpiresAt() - gameSession.getServerTick());
    }

    private static Long winnerPlayerId(GameSession gameSession) {
        if (!GameSessionState.ENDED.equals(gameSession.getState())) {
            return null;
        }
        boolean playerAAlive = gameSession.getPlayerATankHealth() == null || gameSession.getPlayerATankHealth() > 0;
        boolean playerBAlive = gameSession.getPlayerBTankHealth() == null || gameSession.getPlayerBTankHealth() > 0;
        if (playerAAlive == playerBAlive) {
            return null;
        }
        return playerAAlive ? 1L : 2L;
    }
}
