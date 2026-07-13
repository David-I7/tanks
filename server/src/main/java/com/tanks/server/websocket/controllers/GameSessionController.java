package com.tanks.server.websocket.controllers;

import com.tanks.server.websocket.dto.gameplay.OnlineDiffResponsePayloads;
import com.tanks.server.websocket.dto.gameplay.OnlinePlayerIntentRequestDto;
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
import org.springframework.messaging.handler.annotation.Payload;
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

    @MessageMapping("/game/{id}/intent")
    @PreAuthorize("@gameAuthorizationService.canSendMessageToTopic(authentication, '/topic/game/' + #id)")
    public void acceptPlayerIntent(
            @DestinationVariable UUID id,
            @Payload OnlinePlayerIntentRequestDto<?> intent,
            Authentication authentication) {
        gameSessionService.acceptPlayerIntent(authentication.getName(), id, intent);
    }

    @MessageMapping("/game/{id}/resync")
    @PreAuthorize("@gameAuthorizationService.canSendMessageToTopic(authentication, '/topic/game/' + #id)")
    public void requestResyncState(
            @DestinationVariable UUID id,
            Authentication authentication) {
        gameSessionService.sendResyncStateToPlayer(id, authentication.getName(), OnlineDiffResponsePayloads.ResyncReason.MISSED_DIFF);
    }

    @MessageMapping("/game/create")
    @PreAuthorize("@gameAuthorizationService.canCreateGame(authentication, '/game/create')")
    public void createGame(Authentication authentication){
        WebSocketPrincipal wsPrincipal = (WebSocketPrincipal) authentication.getPrincipal();
        UserSession host = wsPrincipal.getUserSession();

        Lobby lobby = lobbyService.findById(host.getLobbyId());
        gameSessionService.create(lobby);
    }

}
