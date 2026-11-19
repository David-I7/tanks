package com.tanks.server.websocket.security.services;

import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.security.entities.WebSocketPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.UUID;

@Service
public class LobbyAuthorizationService {

    private static final String LOBBY_PREFIX = "/topic/lobby/";

    public boolean canJoinTopic(Authentication authentication, String uri) {
        WebSocketPrincipal principal = getPrincipal(authentication);
        if (principal == null) {
            return false;
        }

        if (!uri.startsWith(LOBBY_PREFIX)) {
            throw new ProblemDetailException(HttpStatus.UNAUTHORIZED, "Invalid lobby destination.", URI.create(uri));
        }

        String lobbyIdStr = uri.substring(LOBBY_PREFIX.length());
        try {
            UUID topicLobbyId = UUID.fromString(lobbyIdStr);
            if (!topicLobbyId.equals(principal.getLobbyId())) {
                throw new ProblemDetailException(HttpStatus.UNAUTHORIZED, "Player is not authorized for this lobby.", URI.create(uri));
            }
        } catch (IllegalArgumentException e) {
            throw new ProblemDetailException(HttpStatus.UNAUTHORIZED, "Invalid lobby id.", URI.create(uri));
        }

        return true;
    }

    public boolean canSendMessageToTopic(Authentication authentication, String uri) {
        return canJoinTopic(authentication, uri);
    }

    private WebSocketPrincipal getPrincipal(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof WebSocketPrincipal principal)) {
            return null;
        }
        return principal;
    }
}
