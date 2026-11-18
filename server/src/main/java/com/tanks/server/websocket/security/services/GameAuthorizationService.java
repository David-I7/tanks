package com.tanks.server.websocket.security.services;

import com.tanks.server.domain.Lobby;
import com.tanks.server.domain.LobbyState;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.security.entities.WebSocketPrincipal;
import com.tanks.server.websocket.services.GameSessionService;
import com.tanks.server.websocket.services.LobbyService;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.UUID;

@Service
public class GameAuthorizationService {

    private static final String GAME_PREFIX = "/topic/game/";

    private final LobbyService lobbyService;
    private final GameSessionService gameSessionService;

    public GameAuthorizationService(LobbyService lobbyService, @Lazy GameSessionService gameSessionService) {
        this.lobbyService = lobbyService;
        this.gameSessionService = gameSessionService;
    }

    public boolean canJoinTopic(Authentication authentication, String uri) {
        WebSocketPrincipal principal = getPrincipal(authentication);
        if (principal == null) {
            return false;
        }

        UUID gameId = parseGameId(uri);
        GameSession gameSession = gameSessionService.findById(gameId);

        if (!isParticipant(gameSession, principal)) {
            throw new ProblemDetailException(HttpStatus.UNAUTHORIZED, "Player is not in the provided game.", URI.create(uri));
        }

        principal.setGameSessionId(gameId);
        return true;
    }

    public boolean canCreateGame(Authentication authentication, String uri) {
        WebSocketPrincipal principal = getPrincipal(authentication);
        if (principal == null || principal.getLobbyId() == null) {
            throw new ProblemDetailException(HttpStatus.UNAUTHORIZED, "Player is not connected to a lobby.", URI.create(uri));
        }

        Lobby lobby = lobbyService.findById(principal.getLobbyId());

        if (lobby.getState() != LobbyState.READY_TO_START) {
            throw new ProblemDetailException(HttpStatus.UNAUTHORIZED, "Lobby is not ready to start.", URI.create(uri));
        }

        if (!lobby.getHost().id().equals(principal.getPlayerId())) {
            throw new ProblemDetailException(HttpStatus.UNAUTHORIZED, "Player is not the host of the lobby.", URI.create(uri));
        }

        return true;
    }

    public boolean canSendMessageToTopic(Authentication authentication, String uri) {
        WebSocketPrincipal principal = getPrincipal(authentication);
        if (principal == null) {
            return false;
        }

        UUID gameId = parseGameId(uri);
        GameSession gameSession = gameSessionService.findById(gameId);

        if (!isParticipant(gameSession, principal)) {
            throw new ProblemDetailException(HttpStatus.UNAUTHORIZED, "Player is not authorized for this game.", URI.create(uri));
        }

        return true;
    }

    private UUID parseGameId(String uri) {
        if (!uri.startsWith(GAME_PREFIX)) {
            throw new ProblemDetailException(HttpStatus.UNAUTHORIZED, "Invalid game destination.", URI.create(uri));
        }
        try {
            return UUID.fromString(uri.substring(GAME_PREFIX.length()));
        } catch (IllegalArgumentException e) {
            throw new ProblemDetailException(HttpStatus.UNAUTHORIZED, "Invalid game id.", URI.create(uri));
        }
    }

    private boolean isParticipant(GameSession gameSession, WebSocketPrincipal principal) {
        if (gameSession == null || principal.getPlayerId() == null) {
            return false;
        }
        UUID playerId = principal.getPlayerId();
        return (gameSession.getPlayerA() != null && playerId.equals(gameSession.getPlayerA().id()))
                || (gameSession.getPlayerB() != null && playerId.equals(gameSession.getPlayerB().id()));
    }

    private WebSocketPrincipal getPrincipal(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof WebSocketPrincipal principal)) {
            return null;
        }
        return principal;
    }
}
