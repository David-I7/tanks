package com.tanks.server.websocket.dto.gameplay.playerIntent;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.AimIntentRequestPayload;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.FireIntentIntentRequestPayload;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.MoveIntentRequestPayload;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.SelectProjectileIntentRequestPayload;
import lombok.Builder;

@Builder
public record OnlinePlayerIntentRequestDto<T extends OnlinePlayerIntentRequestPayload>(
        String gameSessionId,
        long playerId,
        String intentId,
        long lastConfirmedDiffSequence,
        long lastConfirmedDiffServerTick,
        OnlinePlayerIntentRequestType type,
        @JsonTypeInfo(
                use = JsonTypeInfo.Id.NAME,
                include = JsonTypeInfo.As.EXTERNAL_PROPERTY,
                property = "type"
        )
        @JsonSubTypes({
                @JsonSubTypes.Type(value = MoveIntentRequestPayload.class, name = "MOVE"),
                @JsonSubTypes.Type(value = AimIntentRequestPayload.class, name = "AIM"),
                @JsonSubTypes.Type(value = SelectProjectileIntentRequestPayload.class, name = "SELECT_PROJECTILE_SLOT"),
                @JsonSubTypes.Type(value = FireIntentIntentRequestPayload.class, name = "FIRE")
        })
        T payload) {
}
