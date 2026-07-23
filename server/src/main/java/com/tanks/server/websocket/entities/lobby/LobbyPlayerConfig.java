package com.tanks.server.websocket.entities.lobby;

import lombok.*;

@Builder
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class LobbyPlayerConfig {

    private Long id;

    private String username;

    private String tankDefinitionId;

    public LobbyPlayerConfig(LobbyPlayerConfig other) {
        if (other != null) {
            this.id = other.id;
            this.username = other.username;
            this.tankDefinitionId = other.tankDefinitionId;
        }
    }

}
