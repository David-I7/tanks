package com.tanks.server.websocket.controllers;

import com.tanks.server.websocket.dto.chat.ChatEventRequestDto;
import com.tanks.server.websocket.dto.chat.ChatEventResponseDto;
import com.tanks.server.websocket.dto.chat.ChatMessagePayload;
import com.tanks.server.websocket.security.entities.WebSocketPrincipal;
import jakarta.validation.Valid;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

@Controller
public class ChatController {

    @MessageMapping("/chat/{id}/send")
    @SendTo("/topic/lobby/{id}")
    @PreAuthorize("@lobbyAuthorizationService.canSendMessageToTopic(authentication, '/topic/lobby/' + #id)")
    public ChatEventResponseDto sendMessage(
            @DestinationVariable String id,
            @Valid @Payload ChatEventRequestDto chatMessage,
            Authentication authentication) {
        WebSocketPrincipal principal = (WebSocketPrincipal) authentication.getPrincipal();

        return ChatEventResponseDto.builder()
                .type(chatMessage.getType())
                .payload(new ChatMessagePayload(chatMessage.getMessage(), principal.getNickname()))
                .build();
    }

}
