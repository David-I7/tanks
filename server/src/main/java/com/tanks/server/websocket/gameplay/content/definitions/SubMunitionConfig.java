package com.tanks.server.websocket.gameplay.content.definitions;

public record SubMunitionConfig(
        int count,
        String projectileDefinitionId,
        double spreadAngleDegrees,
        double velocityScale) {
}
