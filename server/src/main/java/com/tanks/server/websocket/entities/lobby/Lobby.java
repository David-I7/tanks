package com.tanks.server.websocket.entities.lobby;

import lombok.*;
import org.springframework.data.annotation.Id;

import java.util.UUID;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Builder
public class Lobby {

    @Id
    private UUID id;

    private LobbyType type;

    private LobbyStatus status;

    private LobbyPlayerConfig host;

    private LobbyPlayerConfig opponent;

    public Lobby(Lobby other) {
        if (other != null) {
            this.id = other.id;
            this.type = other.type;
            this.status = other.status;
            this.host = new LobbyPlayerConfig(other.host);
            this.opponent = new LobbyPlayerConfig(other.opponent);
        }
    }
}
