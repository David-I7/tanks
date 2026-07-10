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

    private OnlineGameStateSnapshotDto createSnapshot(GameSession gameSession) {
        return new OnlineGameStateSnapshotDto(
                gameSession.getGameplayDefinitionVersion(),
                new OnlineMatchSnapshotDto(OnlineMatchSnapshotDto.MatchPhase.AIMING, 1, 2, 1, 900, null),
                new OnlineTerrainSnapshotDto.Heightmap(TerrainSnapshotKind.HEIGHTMAP, 960, 560,
                        List.of(420, 420, 421, 422, 424, 426, 428, 430, 431, 430, 428, 426, 424, 422, 421, 420)),
                List.of(
                        gameplayRules.createTankSnapshot(
                                10,
                                1,
                                gameSession.getPlayerA(),
                                "vanguard",
                                new OnlineVec2Dto(playerAX(gameSession), playerAY(gameSession)),
                                1,
                                playerAFuel(gameSession)),
                        gameplayRules.createTankSnapshot(
                                11,
                                2,
                                gameSession.getPlayerB(),
                                "specter",
                                new OnlineVec2Dto(playerBX(gameSession), playerBY(gameSession)),
                                -1,
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

    private static double playerBFuel(GameSession gameSession) {
        return gameSession.getPlayerBTankFuel() == null
                ? OnlineGameplayRules.INITIAL_TANK_FUEL
                : gameSession.getPlayerBTankFuel();
    }
}
