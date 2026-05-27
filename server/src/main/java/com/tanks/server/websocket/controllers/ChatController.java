package com.tanks.server.websocket.controllers;

import com.tanks.server.websocket.dto.chat.ChatMessageRequestDto;
import com.tanks.server.websocket.dto.chat.ChatMessageResponseDto;
import jakarta.validation.Valid;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class ChatController {

    @MessageMapping("/chat/{id}/send")
    @SendTo("/topic/lobby/{id}/chat")
    public ChatMessageResponseDto sendMessage(@DestinationVariable String id, @Valid ChatMessageRequestDto chatMessage, Principal principal){

        ChatMessageResponseDto responseDto = ChatMessageResponseDto.builder()
                .type(chatMessage.getType())
                .message(chatMessage.getMessage())
                .sender(principal.getName())
                .build();

        return responseDto;
    }

}
