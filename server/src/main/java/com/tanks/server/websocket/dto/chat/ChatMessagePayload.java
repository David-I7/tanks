package com.tanks.server.websocket.dto.chat;

import com.fasterxml.jackson.annotation.JsonInclude;

public record ChatMessagePayload(
        @JsonInclude(JsonInclude.Include.NON_NULL) String message,
        String triggeredBy
) {
}
