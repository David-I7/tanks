package com.tanks.server.websocket.dto.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Null;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ChatMessageDto{

    @NotNull
    private ChatMessageType type;

    @Null
    private String sender;

    @NotBlank
    private String message;

}
