package com.tanks.server.websocket.gameplay;

import java.util.Map;
import java.util.Optional;

public record OnlineGameplayDefinitions(
        String version,
        Map<String, OnlineTankDefinition> tanks,
        Map<String, OnlineProjectileDefinition> projectiles,
        OnlineValidationRules validation) {

    public OnlineGameplayDefinitions {
        tanks = Map.copyOf(tanks);
        projectiles = Map.copyOf(projectiles);
    }

    public Optional<OnlineTankDefinition> tank(String tankDefinitionId) {
        return Optional.ofNullable(tanks.get(tankDefinitionId));
    }

    public Optional<OnlineProjectileDefinition> projectile(String projectileDefinitionId) {
        return Optional.ofNullable(projectiles.get(projectileDefinitionId));
    }
}
