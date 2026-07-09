package com.tanks.server.websocket.gameplay;

public record OnlineProjectilePhysics(
        double radius,
        double gravityScale,
        double drag,
        double muzzleVelocityScale) {
}
