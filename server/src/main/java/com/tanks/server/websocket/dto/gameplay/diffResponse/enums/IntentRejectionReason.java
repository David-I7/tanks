package com.tanks.server.websocket.dto.gameplay.diffResponse.enums;

public enum IntentRejectionReason {
    STALE_BASE_STATE,
    NOT_ACTIVE_PLAYER,
    INVALID_PAYLOAD,
    TURN_ALREADY_RESOLVING,
    INSUFFICIENT_FUEL,
    OUT_OF_BOUNDS,
    IMPASSABLE_TERRAIN
}
