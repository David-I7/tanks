package com.tanks.server.websocket.controllers;

import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.security.entites.WebSocketPrincipal;
import com.tanks.server.websocket.services.GameSessionService;
import com.tanks.server.websocket.services.LobbyService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class GameSessionController {

    private final GameSessionService gameSessionService;
    private final LobbyService lobbyService;

    @MessageMapping("/game/create")
    @PreAuthorize("@gameAuthorizationService.canCreateGame(authentication, '/game/create')")
    public void createGame(Authentication authentication){
        WebSocketPrincipal wsPrincipal = (WebSocketPrincipal) authentication.getPrincipal();
        UserSession host = wsPrincipal.getUserSession();

        Lobby lobby = lobbyService.findById(host.getLobbyId());
        gameSessionService.create(lobby);
    }
}
