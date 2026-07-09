package com.tanks.server.websocket.entities.gameSession;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.index.Indexed;

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

    private String playerA;

    private String playerB;

    private OffsetDateTime startedAt;

    private OffsetDateTime createdAt;

    private long playerTurnExpiresAt;

    private String playerTurn;

    private long serverTick;

    private long nextDiffSequence;

    private int turnNumber;

    @Indexed
    private GameSessionState state;

    private String gameplayDefinitionVersion;

    private int connectedPlayerCount = 0;
}
