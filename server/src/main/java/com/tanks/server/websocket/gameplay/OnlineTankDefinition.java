package com.tanks.server.websocket.gameplay;

import java.util.List;

public record OnlineTankDefinition(
        String id,
        String name,
        String renderAssetId,
        double maxHealth,
        double maxFuel,
        List<OnlineProjectileSlotDefinition> loadout) {

    public OnlineTankDefinition {
        loadout = List.copyOf(loadout);
    }
}
