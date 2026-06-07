package com.tanks.server.websocket.security.services;

import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.entities.userSession.UserSessionState;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.security.entites.WebSocketPrincipal;
import com.tanks.server.websocket.services.UserSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.net.URI;

@Slf4j
@Component("webSocketAuthorizationService")
@RequiredArgsConstructor
public class WebSocketAuthorizationService {

    private final UserSessionService userSessionService;

    public boolean isIdle(Authentication authentication, String uri) {
        if(authentication == null) return false;

        WebSocketPrincipal principal = (WebSocketPrincipal)authentication.getPrincipal();
        UserSession userSession = principal.getUserSession();

        if (userSession.getState() != UserSessionState.IDLE) {
            throw new ProblemDetailException(
                    HttpStatus.UNAUTHORIZED,
                    "User is not idle.",
                    URI.create(uri)
            );
        }

        return true;
    }

    public boolean canJoinLobby(Authentication authentication, String uri) {
        if(authentication == null) return false;

        WebSocketPrincipal principal = (WebSocketPrincipal)authentication.getPrincipal();
        UserSession userSession = principal.getUserSession();

        String prefix = "/topic/lobby/";

        String lobbyId;

        if(!uri.startsWith(prefix) || (lobbyId = uri.substring(prefix.length())) == null){
            throw new ProblemDetailException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid lobby Id.",
                    URI.create(uri)
            );
        }

        if (userSession.getState() != UserSessionState.IN_LOBBY || !userSession.getLobbyId().toString().equals(lobbyId)) {
            throw new ProblemDetailException(
                    HttpStatus.UNAUTHORIZED,
                    "User is not in a lobby.",
                    URI.create(uri)
            );
        }

        return true;
    }

    public boolean isInGame(Authentication authentication, String uri) {
        WebSocketPrincipal principal = (WebSocketPrincipal)( authentication).getPrincipal();
        UserSession userSession = principal.getUserSession();

        if (userSession.getState() != UserSessionState.IN_GAME) {
            throw new ProblemDetailException(
                    HttpStatus.UNAUTHORIZED,
                    "User is not in a game.",
                    URI.create(uri)
            );
        }

        return true;
    }
}
