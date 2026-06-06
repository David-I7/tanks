package com.tanks.server.websocket.controllers;

import com.tanks.server.websocket.dto.chat.ChatEventRequestDto;
import com.tanks.server.websocket.dto.chat.ChatEventResponseDto;
import com.tanks.server.websocket.dto.chat.ChatMessagePayload;
import jakarta.validation.Valid;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class ChatController {

    @MessageMapping("/chat/{id}/send")
    @SendTo("/topic/lobby/{id}")
    public ChatEventResponseDto sendMessage(@DestinationVariable String id, @Valid ChatEventRequestDto chatMessage, Principal principal){

        ChatEventResponseDto responseDto = ChatEventResponseDto.builder()
                .type(chatMessage.getType())
                .payload(new ChatMessagePayload(chatMessage.getMessage()))
                .sender(principal.getName())
                .build();

        return responseDto;
    }

}
