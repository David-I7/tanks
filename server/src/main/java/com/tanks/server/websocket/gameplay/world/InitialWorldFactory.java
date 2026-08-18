package com.tanks.server.websocket.gameplay.world;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import org.springframework.stereotype.Service;
import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;
import com.tanks.server.websocket.gameplay.content.GameContent;
import com.tanks.server.websocket.gameplay.content.definitions.SpawnRegion;

@Service
public class InitialWorldFactory {
    public static final long PLAYER_A_ENTITY_ID = 10L;
    public static final long PLAYER_B_ENTITY_ID = 11L;
    public static final long PLAYER_A_ID = 1L;
    public static final long PLAYER_B_ID = 2L;

    public InitialWorld create(GameContent content, long seed, String playerA, String playerB, String tankDefA, String tankDefB) {
        Random random = new Random(seed);
        var definition = content.world();
        var surface = new ArrayList<Integer>(definition.width());
        double phaseA = random.nextDouble() * Math.PI * 2;
        double phaseB = random.nextDouble() * Math.PI * 2;
        for (int x = 0; x < definition.width(); x++) {
            int y = (int) Math.round(definition.height() * .64
                    + Math.sin(x * .009 + phaseA) * 58
                    + Math.sin(x * .024 + phaseB) * 22);
            surface.add(Math.min(definition.height() - 1, Math.max(0, y)));
        }
        TerrainModel terrain = new TerrainModel(definition, surface);
        World world = new World();

        addTank(world, terrain, content, random, PLAYER_A_ENTITY_ID, PLAYER_A_ID, playerA, tankDefA, 1,
                definition.playerASpawnRegion());
        addTank(world, terrain, content, random, PLAYER_B_ENTITY_ID, PLAYER_B_ID, playerB, tankDefB, -1,
                definition.playerBSpawnRegion());
        world.match().activePlayerId(PLAYER_A_ID);
        world.match().turnNumber(1);
        world.match().turnEndsAtServerTick((long) definition.tickRateHz() * definition.turnDurationSeconds());
        world.match().biome(definition.selectBiome());
        return new InitialWorld(world, terrain);
    }

    private static void addTank(World world, TerrainModel terrain, GameContent content, Random random,
            long entityId, long playerId, String displayName, String definitionId, int facing, SpawnRegion region) {
        int x = random.nextInt(region.minX(), region.maxX() + 1);
        var definition = content.requireTank(definitionId);
        Map<String, Integer> weaponAmmo = new HashMap<>();
        for (String slotId : definition.loadout()) {
            var projDef = content.requireProjectile(slotId);
            weaponAmmo.put(slotId, projDef.isDefault() ? -1 : 1);
        }
        world.tanks().put(entityId, TankState.builder()
                .entityId(entityId)
                .playerId(playerId)
                .displayName(displayName)
                .definitionId(definitionId)
                .position(new OnlineVec2Dto(x, terrain.surfaceY(x) - definition.trackGroundOffset()))
                .facing(facing)
                .aimAngle(facing == 1 ? -Math.PI / 4 : -Math.PI * 0.75)
                .power(360.0)
                .selectedProjectileSlotId(definition.loadout().getFirst())
                .health(definition.maxHealth())
                .fuel(definition.maxFuel())
                .weaponAmmo(weaponAmmo)
                .build());
    }
}
