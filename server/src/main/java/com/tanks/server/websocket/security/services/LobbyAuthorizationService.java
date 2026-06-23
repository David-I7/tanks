package com.tanks.server.websocket.security.services;

import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.security.entites.WebSocketPrincipal;
import com.tanks.server.websocket.services.LobbyService;
import com.tanks.server.websocket.services.UserSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.net.URI;

@Service
@RequiredArgsConstructor
public class LobbyAuthorizationService {

    private static final String Lobby_PREFIX = "/topic/lobby/";

    private final UserSessionService userSessionService;

    public boolean canJoinOrCreateLobby(Authentication authentication, String uri) {
        UserSession userSession = getUserSession(authentication);

        if(userSession == null) return false;

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

    public boolean canJoinTopic(Authentication authentication, String uri) {
        UserSession userSession = getUserSession(authentication);

        if(userSession == null) return false;

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
                    "User is not in the provided lobby.",
                    URI.create(uri)
            );
        }
    }

    public boolean canSendMessageToTopic(Authentication authentication, String uri){
        UserSession userSession = getUserSession(authentication);

        if(userSession == null) return false;

        if(!userSessionService.isConnectedToLobby(userSession)){
            throw new ProblemDetailException(
                    HttpStatus.UNAUTHORIZED,
                    "User is not connected to a lobby.",
                    URI.create(uri)
            );
        }

        return true;
    }

    private UserSession getUserSession(Authentication authentication){
        if(authentication == null) return null;

        WebSocketPrincipal principal = (WebSocketPrincipal)authentication.getPrincipal();
        return principal.getUserSession();
    }
}
