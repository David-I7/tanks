package com.tanks.server.websocket.entities.lobby;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;

import java.util.UUID;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Builder
@RedisHash(value = "lobby")
public class Lobby {

    @Id
    private UUID id;

    private LobbyType type;

    private LobbyStatus status;

    private long hostId;

    private Long opponentId;

}

