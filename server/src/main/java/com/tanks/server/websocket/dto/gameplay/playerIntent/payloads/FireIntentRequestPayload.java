package com.tanks.server.websocket.dto.gameplay.playerIntent.payloads;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.tanks.server.websocket.dto.gameplay.playerIntent.OnlinePlayerIntentRequestPayload;

public class FireIntentRequestPayload implements OnlinePlayerIntentRequestPayload {
    private final double angle;
    private final double power;

    @JsonCreator
    public FireIntentRequestPayload(
            @JsonProperty("angle") double angle,
            @JsonProperty("power") double power) {
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
