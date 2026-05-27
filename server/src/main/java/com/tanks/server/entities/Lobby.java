package com.tanks.server.entities;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;

import java.util.UUID;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Builder
@RedisHash(value = "lobby", timeToLive = 10000)
public class Lobby {

    @Id
    private UUID id;

    private Type type;

    private Status status;

    private Long hostId;

    private Long opponentId;

    public static enum Type{
        PRIVATE, QUICK_MATCH
    }

    public static enum Status{
        WAITING,READY,IN_GAME
    }
}

