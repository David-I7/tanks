package com.tanks.server.websocket.gameplay.content.definitions;

public record BouncerConfig(
        int bounceCount,
        double durationSeconds,
        int damagePerBounce,
        double shockwaveRadius) {
}
