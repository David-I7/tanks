package com.tanks.server.websocket.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Data
public class ChatEventResponseDto {

    private ChatEventType type;

    private String sender;

    private ChatMessagePayload payload;

}
