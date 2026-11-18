package com.tanks.server.websocket.controllers;

import com.tanks.server.domain.Lobby;
import com.tanks.server.websocket.dto.gameplay.diffResponse.enums.ResyncReason;
import com.tanks.server.websocket.dto.gameplay.playerIntent.OnlinePlayerIntentRequestDto;
import com.tanks.server.websocket.security.entities.WebSocketPrincipal;
import com.tanks.server.websocket.services.GameSessionService;
import com.tanks.server.websocket.services.LobbyService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

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
        WebSocketPrincipal wsPrincipal = (WebSocketPrincipal) authentication.getPrincipal();
        gameSessionService.acceptPlayerIntent(wsPrincipal.getPlayerId(), id, intent);
    }

    @MessageMapping("/game/{id}/resync")
    @PreAuthorize("@gameAuthorizationService.canSendMessageToTopic(authentication, '/topic/game/' + #id)")
    public void requestResyncState(
            @DestinationVariable UUID id,
            Authentication authentication) {
        WebSocketPrincipal wsPrincipal = (WebSocketPrincipal) authentication.getPrincipal();
        gameSessionService.sendResyncStateToPlayer(id, wsPrincipal.getPlayerId(), ResyncReason.MISSED_DIFF);
    }

    @MessageMapping("/game/{id}/forfeit")
    @PreAuthorize("@gameAuthorizationService.canSendMessageToTopic(authentication, '/topic/game/' + #id)")
    public void forfeitGame(
            @DestinationVariable UUID id,
            Authentication authentication) {
        WebSocketPrincipal wsPrincipal = (WebSocketPrincipal) authentication.getPrincipal();
        gameSessionService.forfeitGame(id, wsPrincipal.getPlayerId());
    }

    @MessageMapping("/game/create")
    @PreAuthorize("@gameAuthorizationService.canCreateGame(authentication, '/game/create')")
    public void createGame(Authentication authentication) {
        WebSocketPrincipal wsPrincipal = (WebSocketPrincipal) authentication.getPrincipal();
        Lobby lobby = lobbyService.findById(wsPrincipal.getLobbyId());
        gameSessionService.create(lobby);
    }
}
