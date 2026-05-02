package com.tanks.server.controllers;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

@Controller
public class LobbyController {

    @MessageMapping("/lobby/create")
    public void createLobby(Authentication authentication){
        System.out.println(authentication);
    }
}
