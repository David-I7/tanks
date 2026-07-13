package com.tanks.server.websocket.gameplay.simulation;

import java.util.List;
import java.util.Optional;
import com.tanks.server.websocket.dto.gameplay.OnlineDiffResponsePayloads;
import com.tanks.server.websocket.dto.gameplay.OnlinePlayerIntentRequestPayloads;
import com.tanks.server.websocket.gameplay.content.GameContent;
import com.tanks.server.websocket.gameplay.world.TerrainModel;
import com.tanks.server.websocket.gameplay.world.World;

public interface GameSimulation {
    Optional<OnlineDiffResponsePayloads.MovementSegment> move(GameContent content, World world,
            TerrainModel terrain, String intentId, long playerId,
            OnlinePlayerIntentRequestPayloads.Move request, long startedServerTick);

    OnlineDiffResponsePayloads.ProjectileResolution fire(GameContent content, World world,
            TerrainModel terrain, String intentId, long projectileEntityId, long playerId,
            OnlinePlayerIntentRequestPayloads.Fire request);

    OnlineDiffResponsePayloads.TerrainPatch deformTerrain(GameContent content, World world,
            TerrainModel terrain, String projectileDefinitionId,
            com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto impact);

    List<OnlineDiffResponsePayloads.MovementSegment> settleUnsupportedTanks(GameContent content,
            World world, TerrainModel terrain, long startedServerTick);
}
