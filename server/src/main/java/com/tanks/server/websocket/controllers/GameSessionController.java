package com.tanks.server.websocket.controllers;

import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.services.GameSessionService;
import lombok.AllArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.util.UUID;

@Controller
@AllArgsConstructor
public class GameSessionController {

    private final GameSessionService gameService;

    @MessageMapping("/game/{id}/send")
    @SendTo("/topic/lobby{id}/game")
    public GameSession createGame(@DestinationVariable UUID id){
        if(true) throw new IllegalStateException("HAHAH");
        return null;
    }

}
