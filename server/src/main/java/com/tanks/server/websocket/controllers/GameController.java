package com.tanks.server.websocket.controllers;

import com.tanks.server.websocket.game.MatchManager;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class GameController {

    private final MatchManager matchManager;

    public GameController(MatchManager matchManager){
        this.matchManager = matchManager;
    }

    @MessageMapping("/match/{matchId}/create")
    @SendTo("/topic/match/{matchId}")
    public void createMatch(@DestinationVariable String matchId){

    }

}
