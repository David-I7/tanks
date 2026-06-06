package com.tanks.server.websocket.dto.chat;

import com.tanks.server.websocket.validation.ValidChatMessageRequestDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@ValidChatMessageRequestDto
public class ChatEventRequestDto {

    private ChatEventType type;

    private String message;

}
