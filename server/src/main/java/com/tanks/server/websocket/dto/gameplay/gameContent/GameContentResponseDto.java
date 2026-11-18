package com.tanks.server.websocket.dto.gameplay.gameContent;

import com.tanks.server.websocket.dto.gameplay.gameContent.definitions.ProjectileDefinitionResponseDto;
import com.tanks.server.websocket.dto.gameplay.gameContent.definitions.TankDefinitionResponseDto;
import com.tanks.server.websocket.dto.gameplay.gameContent.definitions.WorldDefinitionResponseDto;
import com.tanks.server.websocket.gameplay.content.GameContent;

import java.util.Map;
import java.util.stream.Collectors;

public record GameContentResponseDto(
        String version,
        WorldDefinitionResponseDto world,
        Map<String, TankDefinitionResponseDto> tanks,
        Map<String, ProjectileDefinitionResponseDto> projectiles) {

    public static GameContentResponseDto from(GameContent content) {
        return new GameContentResponseDto(
                content.version(),
                WorldDefinitionResponseDto.from(content.world()),
                content.tanks().entrySet().stream().collect(Collectors.toUnmodifiableMap(
                        Map.Entry::getKey, entry -> TankDefinitionResponseDto.from(entry.getValue()))),
                content.projectiles().entrySet().stream().collect(Collectors.toUnmodifiableMap(
                        Map.Entry::getKey, entry -> ProjectileDefinitionResponseDto.from(entry.getValue()))));
    }
}
