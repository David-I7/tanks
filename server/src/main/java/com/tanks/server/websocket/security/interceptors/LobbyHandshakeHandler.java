package com.tanks.server.websocket.security.interceptors;

import com.tanks.server.dto.response.PlayerDto;
import com.tanks.server.websocket.security.entities.WebSocketAuthentication;
import com.tanks.server.websocket.security.entities.WebSocketPrincipal;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

@Component
public class LobbyHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected Principal determineUser(
            ServerHttpRequest request,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {
        PlayerDto playerDto = (PlayerDto) attributes.get(LobbyHandshakeInterceptor.ATTR_PLAYER_DTO);
        UUID lobbyId = (UUID) attributes.get(LobbyHandshakeInterceptor.ATTR_LOBBY_ID);

        if (playerDto != null && lobbyId != null) {
            return new WebSocketAuthentication(new WebSocketPrincipal(playerDto, lobbyId));
        }

        return null;
    }
}
