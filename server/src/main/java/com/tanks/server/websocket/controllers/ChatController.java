package com.tanks.server.websocket.controllers;

import com.tanks.server.websocket.dto.chat.ChatEventRequestDto;
import com.tanks.server.websocket.dto.chat.ChatEventResponseDto;
import com.tanks.server.websocket.dto.chat.ChatMessagePayload;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.security.services.LobbyAuthorizationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.net.URI;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final LobbyAuthorizationService lobbyAuthorizationService;

    @MessageMapping("/chat/{id}/send")
    @SendTo("/topic/lobby/{id}")
    public ChatEventResponseDto sendMessage(
            @DestinationVariable String id,
            @Valid @Payload ChatEventRequestDto chatMessage,
            Authentication authentication){
        if (!lobbyAuthorizationService.canSendMessageToTopic(authentication, "/topic/lobby/" + id)) {
            throw new ProblemDetailException(
                    HttpStatus.UNAUTHORIZED,
                    "User is not connected to a lobby.",
                    URI.create("/topic/lobby/" + id)
            );
        }

        ChatEventResponseDto responseDto = ChatEventResponseDto.builder()
                .type(chatMessage.getType())
                .payload(new ChatMessagePayload(chatMessage.getMessage()))
                .sender(authentication.getName())
                .build();

        return responseDto;
    }

}
