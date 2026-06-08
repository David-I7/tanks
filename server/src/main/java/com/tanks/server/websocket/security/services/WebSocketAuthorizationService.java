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

    private static final String Lobby_PREFIX = "/topic/lobby/";

    private static final String Game_PREFIX = "/topic/game/";

    private final UserSessionService userSessionService;

    public boolean isIdleUserSession(Authentication authentication, String uri) {
        if(authentication == null) return false;

        WebSocketPrincipal principal = (WebSocketPrincipal)authentication.getPrincipal();
        UserSession userSession = principal.getUserSession();

        if(userSessionService.isIdle(userSession)){
            return true;
        }else{
            throw new ProblemDetailException(
                    HttpStatus.UNAUTHORIZED,
                    "User is not idle.",
                    URI.create(uri)
            );
        }
    }

    public boolean canJoinLobby(Authentication authentication, String uri) {
        if(authentication == null) return false;

        WebSocketPrincipal principal = (WebSocketPrincipal)authentication.getPrincipal();
        UserSession userSession = principal.getUserSession();

        String lobbyId;

        if(!uri.startsWith(Lobby_PREFIX) || (lobbyId = uri.substring(Lobby_PREFIX.length())).isEmpty()){
            throw new ProblemDetailException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid lobby Id.",
                    URI.create(uri)
            );
        }

        if (userSessionService.isInLobby(userSession,lobbyId)){
            return true;
        }
        else {
            throw new ProblemDetailException(
                    HttpStatus.UNAUTHORIZED,
                    "User is not in a lobby.",
                    URI.create(uri)
            );
        }
    }

    public boolean isInGame(Authentication authentication, String uri) {
        if(authentication == null) return false;

        WebSocketPrincipal principal = (WebSocketPrincipal)authentication.getPrincipal();
        UserSession userSession = principal.getUserSession();

        String gameId;

        if(!uri.startsWith(Game_PREFIX) || (gameId = uri.substring(Game_PREFIX.length())).isEmpty()){
            throw new ProblemDetailException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid game Id.",
                    URI.create(uri)
            );
        }

        if (userSessionService.isInGame(userSession,gameId)){
            return true;
        }
        else {
            throw new ProblemDetailException(
                    HttpStatus.UNAUTHORIZED,
                    "User is not in a game.",
                    URI.create(uri)
            );
        }
    }
}
