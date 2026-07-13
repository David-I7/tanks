package com.tanks.server.websocket.dto.gameplay;

public enum OnlineStateDiffResponseType {
        INITIAL_STATE,
        RESYNC_STATE,
        MOVEMENT_SEGMENT,
        PROJECTILE_RESOLUTION,
        TERRAIN_PATCH,
        INTENT_REJECTION,
        TURN_TRANSITION,
        TERMINAL_GAME
}
