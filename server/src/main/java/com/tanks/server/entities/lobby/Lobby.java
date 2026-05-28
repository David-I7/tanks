package com.tanks.server.entities.lobby;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.TimeToLive;

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

    @TimeToLive
    private Long expirationSeconds;

    private LobbyStatus status;

    private long hostId;

    private LobbyPlayerState hostState;

    private Long opponentId;

    private LobbyPlayerState opponentState;

    private long opponentReservedAt;

}

