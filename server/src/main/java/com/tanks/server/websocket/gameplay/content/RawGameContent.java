package com.tanks.server.websocket.gameplay.content;

import java.util.HashMap;
import java.util.Map;
import com.tanks.server.websocket.gameplay.content.definitions.ProjectileDefinition;
import com.tanks.server.websocket.gameplay.content.definitions.TankConfig;
import com.tanks.server.websocket.gameplay.content.definitions.TankDefaults;
import com.tanks.server.websocket.gameplay.content.definitions.TankDefinition;
import com.tanks.server.websocket.gameplay.content.definitions.ValidationRules;
import com.tanks.server.websocket.gameplay.content.definitions.WorldDefinition;

public record RawGameContent(
        String version,
        WorldDefinition world,
        TankDefaults tankDefaults,
        Map<String, TankConfig> tanks,
        Map<String, ProjectileDefinition> projectiles,
        ValidationRules validation) {

    public GameContent toGameContent() {
        Map<String, TankDefinition> hydratedTanks = new HashMap<>();
        if (tanks != null) {
            for (Map.Entry<String, TankConfig> entry : tanks.entrySet()) {
                hydratedTanks.put(entry.getKey(), entry.getValue().toTankDefinition(entry.getKey(), tankDefaults));
            }
        }
        Map<String, ProjectileDefinition> hydratedProjectiles = new HashMap<>();
        if (projectiles != null) {
            for (Map.Entry<String, ProjectileDefinition> entry : projectiles.entrySet()) {
                hydratedProjectiles.put(entry.getKey(), entry.getValue().withId(entry.getKey()));
            }
        }
        return new GameContent(
                version,
                world,
                tankDefaults,
                Map.copyOf(hydratedTanks),
                Map.copyOf(hydratedProjectiles),
                validation);
    }
}
