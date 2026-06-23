package com.tanks.server.websocket.controllers;

import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.lobby.LobbyStatus;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.security.entites.WebSocketPrincipal;
import com.tanks.server.websocket.services.GameSessionService;
import com.tanks.server.websocket.services.LobbyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.net.URI;
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
    @PreAuthorize("@gameAuthorizationService.canCreateGame(authentication, '/game/create')")
    public void createGame(Authentication authentication){
        WebSocketPrincipal wsPrincipal = (WebSocketPrincipal) authentication.getPrincipal();
        UserSession host = wsPrincipal.getUserSession();

        Lobby lobby = lobbyService.findById(host.getLobbyId());

        // Authorization logic is here to avoid making 2 requests for the lobby
        if(lobby.getStatus() != LobbyStatus.READY){
            throw new ProblemDetailException(
                    HttpStatus.UNAUTHORIZED,
                    "Lobby only has one player.",
                    URI.create("/game/create")
            );
        }

        if(!lobby.getHostId().equals(host.getId())){
            throw new ProblemDetailException(
                    HttpStatus.UNAUTHORIZED,
                    "Player is not the host of the lobby.",
                    URI.create("/game/create")
            );
        }

        gameSessionService.create(lobby);
    }

}
