package com.tanks.server.websocket.dto.gameplay.playerIntent.payloads;

import com.tanks.server.websocket.dto.gameplay.playerIntent.OnlinePlayerIntentRequestPayload;

public class FireIntentIntentRequestPayload implements OnlinePlayerIntentRequestPayload {
    private final double angle;
    private final double power;

    public FireIntentIntentRequestPayload(double angle, double power) {
        this.angle = angle;
        this.power = power;
    }

    public double getAngle() {
        return angle;
    }

    public double getPower() {
        return power;
    }
}
