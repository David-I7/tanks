package com.tanks.server.websocket.controllers;

import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.security.entites.WebSocketPrincipal;
import com.tanks.server.websocket.services.GameSessionService;
import com.tanks.server.websocket.services.LobbyService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class GameSessionController {

    private final GameSessionService gameSessionService;

    private final LobbyService lobbyService;

    // TODO: Implement game start logic
    @MessageMapping("/game/{id}/send")
    @SendTo("/topic/game/{id}")
    public GameSession startGame(@DestinationVariable UUID id){
        return null;
    }

    @MessageMapping("/game/create")
    @PreAuthorize("@webSocketAuthorizationService.canCreateGame(authentication, '/game/create')")
    public void createGame(Principal principal){
        WebSocketPrincipal wsPrincipal = (WebSocketPrincipal)principal;
        UserSession host = wsPrincipal.getUserSession();

        Lobby lobby = lobbyService.findById(host.getLobbyId());

        gameSessionService.create(lobby);
    }

}
