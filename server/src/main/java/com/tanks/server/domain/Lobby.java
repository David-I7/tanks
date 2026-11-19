package com.tanks.server.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Data
public class Lobby {

    private UUID id;

    private LobbyType type;

    private LobbyState state;

    private Player host;

    private Player opponent;

    private UUID gameSessionId;

    public boolean isFull() {
        return host != null && opponent != null;
    }

    public boolean hasPlayer(UUID playerId) {
        if (playerId == null) {
            return false;
        }
        return (host != null && playerId.equals(host.id()))
                || (opponent != null && playerId.equals(opponent.id()));
    }
}
