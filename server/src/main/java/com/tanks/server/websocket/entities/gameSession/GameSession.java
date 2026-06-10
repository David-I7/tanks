package com.tanks.server.websocket.entities.gameSession;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;

import java.time.OffsetDateTime;
import java.util.UUID;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@RedisHash(value = "gameSession")
public class GameSession {

    @Id
    private UUID id;

    private long playerAId;

    private long playerBId;

    private OffsetDateTime startedAt;

    private OffsetDateTime createdAt;

    private long playerTurnExpiresAt;

    private long playerTurnId;

    private GameSessionState state;
}
