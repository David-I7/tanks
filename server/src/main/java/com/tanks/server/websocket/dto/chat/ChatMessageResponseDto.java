package com.tanks.server.websocket.dto.chat;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Data
public class ChatMessageResponseDto  {

    private ChatMessageType type;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String message;

    private String sender;

}
