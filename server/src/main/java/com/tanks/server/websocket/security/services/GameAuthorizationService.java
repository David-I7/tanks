package com.tanks.server.websocket.security.services;

import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.lobby.LobbyStatus;
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
public class GameAuthorizationService {

    private static final String Game_PREFIX = "/topic/game/";

    private final LobbyService lobbyService;

    private final UserSessionService userSessionService;

    public boolean canJoinTopic(Authentication authentication, String uri) {
        UserSession userSession = getUserSession(authentication);

        if(userSession == null) return false;

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
                    "User is not in the provided game.",
                    URI.create(uri)
            );
        }
    }

    public boolean canCreateGame(Authentication authentication, String uri){
        UserSession userSession = getUserSession(authentication);

        if(userSession == null) return false;

        if(!userSessionService.isConnectedToLobby(userSession)){
            throw new ProblemDetailException(
                    HttpStatus.UNAUTHORIZED,
                    "User is not connected to a lobby.",
                    URI.create(uri)
            );
        }

        Lobby lobby = lobbyService.findById(userSession.getLobbyId());

        if(lobby.getStatus() != LobbyStatus.READY){
            throw new ProblemDetailException(
                    HttpStatus.UNAUTHORIZED,
                    "Lobby only has one player.",
                    URI.create(uri)
            );
        }

        if(!lobby.getHost().getId().equals(userSession.getId())){
            throw new ProblemDetailException(
                    HttpStatus.UNAUTHORIZED,
                    "Player is not the host of the lobby.",
                    URI.create(uri)
            );
        }

        return true;
    }

    public boolean canSendMessageToTopic(Authentication authentication, String uri){
        UserSession userSession = getUserSession(authentication);

        if(userSession == null) return false;

        String gameId;

        if(!uri.startsWith(Game_PREFIX) || (gameId = uri.substring(Game_PREFIX.length())).isEmpty()){
            throw new ProblemDetailException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid game Id.",
                    URI.create(uri)
            );
        }

        if(!userSessionService.isConnectedToGame(userSession)){
            throw new ProblemDetailException(
                    HttpStatus.UNAUTHORIZED,
                    "User is not connected to a game.",
                    URI.create(uri)
            );
        }

        if(!userSessionService.isInGame(userSession, gameId)){
            throw new ProblemDetailException(
                    HttpStatus.UNAUTHORIZED,
                    "User is not in the provided game.",
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
