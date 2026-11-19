package com.tanks.server.websocket.dto.gameplay.gameContent.definitions;

import com.tanks.server.websocket.gameplay.content.definitions.ValidationRules;

public record ValidationRulesResponseDto(
        double minFirePower,
        double maxFirePower,
        double minAimAngle,
        double maxAimAngle) {

    public static ValidationRulesResponseDto from(ValidationRules value) {
        if (value == null) {
            return null;
        }
        return new ValidationRulesResponseDto(
                value.minFirePower(),
                value.maxFirePower(),
                value.minAimAngle(),
                value.maxAimAngle());
    }
}
