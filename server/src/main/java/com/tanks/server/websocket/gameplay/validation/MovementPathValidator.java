package com.tanks.server.websocket.gameplay.validation;

import com.tanks.server.websocket.gameplay.content.TankDefinition;

public final class MovementPathValidator {
    private MovementPathValidator() {}

    public static boolean withinBounds(int x, TankDefinition tank, int worldWidth) {
        return x - tank.halfWidth() >= 0 && x + tank.halfWidth() < worldWidth;
    }

    public static boolean canClimb(double currentY, double nextY, TankDefinition tank) {
        return currentY - nextY <= tank.climbCapability();
    }
}
