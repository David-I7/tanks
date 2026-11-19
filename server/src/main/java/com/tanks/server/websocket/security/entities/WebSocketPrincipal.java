package com.tanks.server.websocket.security.entities;

import com.tanks.server.dto.response.PlayerDto;
import lombok.Getter;
import lombok.Setter;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Getter
public class WebSocketPrincipal implements Principal {

    private final PlayerDto playerDto;
    private final UUID lobbyId;

    @Setter
    private UUID gameSessionId;

    private final Map<String, String> topicSubscriptions = new ConcurrentHashMap<>();

    public WebSocketPrincipal(PlayerDto playerDto, UUID lobbyId) {
        this.playerDto = playerDto;
        this.lobbyId = lobbyId;
    }

    public UUID getPlayerId() {
        return playerDto.id();
    }

    public String getNickname() {
        return playerDto.nickname();
    }

    @Override
    public String getName() {
        return playerDto.id().toString();
    }
}
