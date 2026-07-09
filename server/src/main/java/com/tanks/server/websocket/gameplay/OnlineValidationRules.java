package com.tanks.server.websocket.gameplay;

public record OnlineValidationRules(
        int maxMoveIntentDistance,
        double minFirePower,
        double maxFirePower,
        double minAimAngle,
        double maxAimAngle) {
}
