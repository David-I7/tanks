package com.tanks.server.websocket.controllers;

import com.tanks.server.websocket.dto.chat.ChatMessageDto;
import jakarta.validation.Valid;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class ChatController {

    @MessageMapping("/chat/send")
    @SendTo("/topic/chat")
    public ChatMessageDto sendMessage(@Valid ChatMessageDto chatMessage, Principal principal){
        chatMessage.setSender(principal.getName());

        return chatMessage;
    }

}
