package com.tanks.server.websocket.game;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class Lobby {
    private String hostId;
    private String participantId;
    private String lobbyId;
}
