package com.tanks.server.websocket.gameplay.content.definitions;

public record DamageTrailConfig(
        double radius,
        double damagePerSecond,
        double durationSeconds,
        HazardType hazardType) {
}
