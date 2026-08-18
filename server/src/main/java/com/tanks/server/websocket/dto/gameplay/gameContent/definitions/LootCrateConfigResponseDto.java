package com.tanks.server.websocket.dto.gameplay.gameContent.definitions;

import java.util.List;
import com.tanks.server.websocket.gameplay.content.definitions.LootCrateConfig;

public record LootCrateConfigResponseDto(
        int hpValue,
        int fuelValue,
        int ammoValue,
        double collectionRadius,
        double dropSpeed,
        List<Integer> spawnScheduleSeconds,
        double spawnEdgeMargin,
        int maxActiveCrates) {

    public static LootCrateConfigResponseDto from(LootCrateConfig value) {
        return new LootCrateConfigResponseDto(
                value.hpValue(),
                value.fuelValue(),
                value.ammoValue(),
                value.collectionRadius(),
                value.dropSpeed(),
                List.copyOf(value.spawnScheduleSeconds()),
                value.spawnEdgeMargin(),
                value.maxActiveCrates());
    }
}
