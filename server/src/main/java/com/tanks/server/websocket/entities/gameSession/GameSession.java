package com.tanks.server.websocket.entities.gameSession;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;

import java.time.OffsetDateTime;
import java.util.UUID;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@RedisHash(value = "gameSession")
public class GameSession {

    @Id
    private UUID id;

    private long playerAId;

    private long playerBId;

    private OffsetDateTime gameStartedAt;

    private long playerTurnExpiresAt;

    private long playerTurnId;
}
