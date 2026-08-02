package com.tanks.server.websocket.gameplay.world;

import java.util.ArrayList;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

public class World {
    private final Map<Long, TankState> tanks;
    private final Map<Long, ProjectileState> projectiles;
    private final List<DamageTrailState> damageTrails;
    private WorldMatchState match;

    public World() {
        tanks = new LinkedHashMap<>();
        projectiles = new LinkedHashMap<>();
        damageTrails = new ArrayList<>();
        match = WorldMatchState.builder()
                .activePlayerId(1)
                .turnNumber(1)
                .turnEndsAtServerTick(0)
                .winnerPlayerId(null)
                .build();
    }

    public World(World other) {
        tanks = new LinkedHashMap<>();
        other.tanks.forEach((id, tank) -> tanks.put(id, new TankState(tank)));
        projectiles = new LinkedHashMap<>();
        other.projectiles.forEach((id, projectile) -> projectiles.put(id, new ProjectileState(projectile)));
        damageTrails = new ArrayList<>();
        if (other.damageTrails != null) {
            other.damageTrails.forEach(trail -> damageTrails.add(new DamageTrailState(trail)));
        }
        match = new WorldMatchState(other.match);
    }

    public Map<Long, TankState> tanks() { return tanks; }
    public Map<Long, ProjectileState> projectiles() { return projectiles; }
    public List<DamageTrailState> damageTrails() { return damageTrails; }
    public WorldMatchState match() { return match; }

    public TankState requireTankByPlayer(long playerId) {
        return tanks.values().stream().filter(t -> t.playerId() == playerId).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown player: " + playerId));
    }
}
