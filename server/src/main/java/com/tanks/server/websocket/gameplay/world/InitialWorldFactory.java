package com.tanks.server.websocket.gameplay.world;

import java.util.ArrayList;
import java.util.Random;
import org.springframework.stereotype.Service;
import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;
import com.tanks.server.websocket.gameplay.content.GameContent;
import com.tanks.server.websocket.gameplay.content.SpawnRegion;

@Service
public class InitialWorldFactory {
    public InitialWorld create(GameContent content, long seed, String playerA, String playerB) {
        Random random = new Random(seed);
        var definition = content.world();
        var surface = new ArrayList<Integer>(definition.width());
        double phaseA = random.nextDouble() * Math.PI * 2;
        double phaseB = random.nextDouble() * Math.PI * 2;
        for (int x = 0; x < definition.width(); x++) {
            int y = (int) Math.round(definition.height() * .64
                    + Math.sin(x * .009 + phaseA) * 58
                    + Math.sin(x * .024 + phaseB) * 22);
            surface.add(Math.min(definition.bedrockY(), Math.max(0, y)));
        }
        TerrainModel terrain = new TerrainModel(definition, surface);
        World world = new World();
        addTank(world, terrain, content, random, 10, 1, playerA, "vanguard", 1,
                definition.playerASpawnRegion());
        addTank(world, terrain, content, random, 11, 2, playerB, "specter", -1,
                definition.playerBSpawnRegion());
        world.match().activePlayerId(1);
        world.match().turnNumber(1);
        world.match().turnEndsAtServerTick(definition.tickRateHz() * 30L);
        return new InitialWorld(world, terrain);
    }

    private static void addTank(World world, TerrainModel terrain, GameContent content, Random random,
            long entityId, long playerId, String displayName, String definitionId, int facing, SpawnRegion region) {
        int x = random.nextInt(region.minX(), region.maxX() + 1);
        var definition = content.requireTank(definitionId);
        world.tanks().put(entityId, new TankState(entityId, playerId, displayName, definitionId,
                new OnlineVec2Dto(x, terrain.surfaceY(x) - definition.trackGroundOffset()), facing,
                definition.loadout().getFirst().id(), definition.maxHealth(), definition.maxFuel()));
    }
}
