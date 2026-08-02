package com.tanks.server.websocket.dto.gameplay.gameContent.definitions;

import java.util.List;
import com.tanks.server.websocket.gameplay.content.definitions.TankDefinition;
import com.tanks.server.websocket.gameplay.content.definitions.TankVisual;

public record TankDefinitionResponseDto(
        String id,
        String name,
        int maxHealth,
        int maxFuel,
        int movementQuantum,
        int fuelRate,
        int climbCapability,
        int width,
        int height,
        TankVisual visual,
        List<String> loadout) {

    public static TankDefinitionResponseDto from(TankDefinition value) {
        return new TankDefinitionResponseDto(
                value.id(),
                value.name(),
                value.maxHealth(),
                value.maxFuel(),
                value.movementQuantum(),
                value.fuelRate(),
                value.climbCapability(),
                value.width(),
                value.height(),
                value.visual(),
                value.loadout());
    }
}
