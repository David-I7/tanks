package com.tanks.server.websocket.gameplay.content.definitions;

import java.util.List;

public record LootCrateConfig(
        int hpValue,
        int fuelValue,
        int ammoValue,
        double collectionRadius,
        double dropSpeed,
        List<Integer> spawnScheduleSeconds,
        double spawnEdgeMargin,
        int maxActiveCrates) {

    public LootCrateConfig {
        spawnScheduleSeconds = List.copyOf(spawnScheduleSeconds);
    }
}
