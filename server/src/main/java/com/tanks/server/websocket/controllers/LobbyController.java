package com.tanks.server.websocket.controllers;

import com.tanks.server.websocket.entities.lobby.LobbyType;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.security.entites.WebSocketPrincipal;
import com.tanks.server.websocket.services.LobbyService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class LobbyController {

    private final LobbyService lobbyService;

    @PreAuthorize("@webSocketAuthorizationService.canJoinOrCreateLobby(authentication, '/lobby/create/private')")
    @MessageMapping("/lobby/create/private")
    public void createLobby(Authentication authentication) {
        WebSocketPrincipal principal = (WebSocketPrincipal) authentication.getPrincipal();
        UserSession userSession = principal.getUserSession();
        lobbyService.create(userSession, LobbyType.PRIVATE);
    }

    @PreAuthorize("@webSocketAuthorizationService.canJoinOrCreateLobby(authentication, '/lobby/join/private/' + #id)")
    @MessageMapping("/lobby/join/private/{id}")
    public void joinPrivateLobby(@DestinationVariable UUID id, Authentication authentication) {
        WebSocketPrincipal principal = (WebSocketPrincipal) authentication.getPrincipal();
        UserSession userSession = principal.getUserSession();
        lobbyService.join(id, userSession);
    }

    @PreAuthorize("@webSocketAuthorizationService.canJoinOrCreateLobby(authentication, '/lobby/quick-match')")
    @MessageMapping("/lobby/quick-match")
    public void joinQuickMatch(Authentication authentication) {
        WebSocketPrincipal principal = (WebSocketPrincipal) authentication.getPrincipal();
        UserSession userSession = principal.getUserSession();
        lobbyService.joinQuickMatch(userSession);
    }
}
