package com.tanks.server.websocket.gameplay.simulation;

import java.util.List;
import java.util.Optional;
import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;
import com.tanks.server.websocket.dto.gameplay.diffResponse.payloads.MovementSegment;
import com.tanks.server.websocket.dto.gameplay.diffResponse.payloads.ProjectileResolution;
import com.tanks.server.websocket.dto.gameplay.diffResponse.payloads.TerrainPatch;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.FireIntentIntentRequestPayload;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.MoveIntentRequestPayload;
import com.tanks.server.websocket.gameplay.content.GameContent;
import com.tanks.server.websocket.gameplay.world.TerrainModel;
import com.tanks.server.websocket.gameplay.world.World;

public interface GameSimulation {
    Optional<MovementSegment> move(GameContent content, World world,
            TerrainModel terrain, String intentId, long playerId,
            MoveIntentRequestPayload request, long startedServerTick);

    ProjectileResolution fire(GameContent content, World world,
            TerrainModel terrain, String intentId, long projectileEntityId, long playerId,
            FireIntentIntentRequestPayload request);

    TerrainPatch deformTerrain(GameContent content, World world,
            TerrainModel terrain, String projectileDefinitionId,
            OnlineVec2Dto impact);

    List<MovementSegment> settleUnsupportedTanks(GameContent content,
            World world, TerrainModel terrain, long startedServerTick);
}
