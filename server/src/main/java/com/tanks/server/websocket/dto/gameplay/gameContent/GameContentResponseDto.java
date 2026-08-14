package com.tanks.server.websocket.dto.gameplay.gameContent;

import java.util.Map;
import com.tanks.server.websocket.dto.gameplay.gameContent.definitions.*;
import com.tanks.server.websocket.gameplay.content.GameContent;

public record GameContentResponseDto(
        String version,
        WorldDefinitionResponseDto world,
        Map<String, TankDefinitionResponseDto> tanks,
        Map<String, ProjectileDefinitionResponseDto> projectiles) {

    public static GameContentResponseDto from(GameContent content) {
        return new GameContentResponseDto(
                content.version(),
                WorldDefinitionResponseDto.from(content.world()),
                content.tanks().entrySet().stream().collect(java.util.stream.Collectors.toUnmodifiableMap(
                        Map.Entry::getKey, entry -> TankDefinitionResponseDto.from(entry.getValue()))),
                content.projectiles().entrySet().stream().collect(java.util.stream.Collectors.toUnmodifiableMap(
                        Map.Entry::getKey, entry -> ProjectileDefinitionResponseDto.from(entry.getValue()))));
    }
}
