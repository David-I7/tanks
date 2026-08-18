package com.tanks.server.websocket.dto.gameplay.playerIntent.payloads;

import com.tanks.server.websocket.dto.gameplay.playerIntent.OnlinePlayerIntentRequestPayload;

public record AimIntentRequestPayload(double angle, double power) implements OnlinePlayerIntentRequestPayload {
}
