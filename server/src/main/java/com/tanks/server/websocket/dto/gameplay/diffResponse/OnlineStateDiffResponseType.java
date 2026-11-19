package com.tanks.server.websocket.dto.gameplay.diffResponse;

public enum OnlineStateDiffResponseType {
        INITIAL_STATE,
        RESYNC_STATE,
        MOVEMENT_SEGMENT,
        AIM_UPDATE,
        PROJECTILE_RESOLUTION,
        TERRAIN_PATCH,
        INTENT_REJECTION,
        TURN_TRANSITION,
        TERMINAL_GAME,
        CRATE_SPAWNED
}
