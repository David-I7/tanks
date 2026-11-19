package com.tanks.server.websocket.security.interceptors;

import com.tanks.server.domain.Lobby;
import com.tanks.server.domain.LobbyState;
import com.tanks.server.domain.LobbyType;
import com.tanks.server.domain.Player;
import com.tanks.server.dto.response.PlayerDto;
import com.tanks.server.utils.ProblemDetailWriter;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.services.ClaimService;
import com.tanks.server.websocket.services.LobbyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class LobbyHandshakeInterceptor implements HandshakeInterceptor {

    public static final String ATTR_PLAYER_DTO = "playerDto";
    public static final String ATTR_LOBBY_ID = "lobbyId";

    private final LobbyService lobbyService;
    private final ClaimService claimService;
    private final ProblemDetailWriter problemDetailWriter;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {
        URI uri = request.getURI();
        var queryParams = UriComponentsBuilder.fromUri(uri).build().getQueryParams();

        String lobbyIdParam = queryParams.getFirst("lobbyId");
        String playerIdParam = queryParams.getFirst("playerId");

        if (lobbyIdParam == null || playerIdParam == null) {
            log.warn("Handshake rejected: missing lobbyId or playerId query parameter");
            problemDetailWriter.writeProblemDetail(
                    request,
                    response,
                    HttpStatus.BAD_REQUEST, "Missing required query parameters: lobbyId and playerId");
            return false;
        }

        UUID lobbyId;
        UUID playerId;
        try {
            lobbyId = UUID.fromString(lobbyIdParam.trim());
            playerId = UUID.fromString(playerIdParam.trim());
        } catch (IllegalArgumentException e) {
            log.warn("Handshake rejected: invalid UUID in parameters lobbyId={} playerId={}", lobbyIdParam, playerIdParam);
            problemDetailWriter.writeProblemDetail(
                    request,
                    response,
                    HttpStatus.BAD_REQUEST, "Invalid UUID format for lobbyId or playerId");
            return false;
        }

        if (claimService.isPlayerConnected(playerId)) {
            log.warn("Handshake rejected: player {} is already connected", playerId);
            problemDetailWriter.writeProblemDetail(
                    request,
                    response,
                    HttpStatus.BAD_REQUEST, "Player is already connected");
            return false;
        }

        Optional<Lobby> lobbyOpt = lobbyService.findActiveOrPendingLobby(lobbyId);
        if (lobbyOpt.isEmpty()) {
            log.warn("Handshake rejected: lobby {} not found", lobbyId);
            problemDetailWriter.writeProblemDetail(
                    request,
                    response,
                    HttpStatus.NOT_FOUND, "Lobby not found");
            return false;
        }

        Lobby lobby = lobbyOpt.get();
        Player matchedPlayer = null;

        try {
            if (lobby.getHost() != null && lobby.getHost().id().equals(playerId)) {
                matchedPlayer = lobby.getHost();
                if (lobby.getState() == LobbyState.CREATED) {
                    lobbyService.confirmLobbyCreation(lobbyId, playerId);
                }
            } else if (lobby.getOpponent() != null && lobby.getOpponent().id().equals(playerId)) {
                matchedPlayer = lobby.getOpponent();
            } else if (lobby.getOpponent() == null) {
                lobby = lobbyService.confirmPlayerJoin(lobbyId, playerId);
                matchedPlayer = lobby.getOpponent();
            }
        }catch (ProblemDetailException e) {
            log.warn("Handshake rejected: {}", e.getDetail());
            problemDetailWriter.writeProblemDetail(
                    request,
                    response,
                    e.getStatus(), e.getDetail());
            return false;
        }

        if (matchedPlayer == null) {
            log.warn("Handshake rejected: player {} is not a participant in lobby {}", playerId, lobbyId);
            problemDetailWriter.writeProblemDetail(
                    request,
                    response,
                    HttpStatus.BAD_REQUEST, "Player is not a participant in the lobby");
            return false;
        }

        attributes.put(ATTR_PLAYER_DTO, new PlayerDto(matchedPlayer.id(), matchedPlayer.nickname()));
        attributes.put(ATTR_LOBBY_ID, lobbyId);

        log.debug("Handshake accepted for player {} ({}) in lobby {}", matchedPlayer.nickname(), playerId, lobbyId);
        return true;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception) {
    }
}
