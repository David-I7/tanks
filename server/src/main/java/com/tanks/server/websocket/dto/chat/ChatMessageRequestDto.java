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
public class ChatMessageRequestDto {

    private ChatMessageType type;

    private String message;

}
