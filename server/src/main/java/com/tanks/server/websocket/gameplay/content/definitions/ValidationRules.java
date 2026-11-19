package com.tanks.server.websocket.gameplay.content.definitions;

public record ValidationRules(
        double minFirePower,
        double maxFirePower,
        double minAimAngle,
        double maxAimAngle) {
}
