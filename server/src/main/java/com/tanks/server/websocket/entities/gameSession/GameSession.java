package com.tanks.server.websocket.entities.gameSession;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;

import java.time.OffsetDateTime;
import java.util.UUID;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class GameSession {

    @Id
    private UUID id;

    private String playerA;

    private String playerB;

    private OffsetDateTime startedAt;

    private OffsetDateTime endedAt;

    private OffsetDateTime createdAt;

    private long playerTurnExpiresAt;

    private String playerTurn;

    private long serverTick;

    private long nextDiffSequence;

    private long lastDiffServerTick;

    private int turnNumber;

    private String playerAUnresolvedIntentId;

    private String playerBUnresolvedIntentId;

    private Double playerATankX;

    private Double playerATankY;

    private Double playerATankFuel;

    private Double playerATankHealth;

    private Double playerBTankX;

    private Double playerBTankY;

    private Double playerBTankFuel;

    private Double playerBTankHealth;

    private GameSessionState state;

    private String gameplayDefinitionVersion;

    private int connectedPlayerCount = 0;

    public GameSession(GameSession other) {
        if (other != null) {
            this.id = other.id;
            this.playerA = other.playerA;
            this.playerB = other.playerB;
            this.startedAt = other.startedAt;
            this.endedAt = other.endedAt;
            this.createdAt = other.createdAt;
            this.playerTurnExpiresAt = other.playerTurnExpiresAt;
            this.playerTurn = other.playerTurn;
            this.serverTick = other.serverTick;
            this.nextDiffSequence = other.nextDiffSequence;
            this.lastDiffServerTick = other.lastDiffServerTick;
            this.turnNumber = other.turnNumber;
            this.playerAUnresolvedIntentId = other.playerAUnresolvedIntentId;
            this.playerBUnresolvedIntentId = other.playerBUnresolvedIntentId;
            this.playerATankX = other.playerATankX;
            this.playerATankY = other.playerATankY;
            this.playerATankFuel = other.playerATankFuel;
            this.playerATankHealth = other.playerATankHealth;
            this.playerBTankX = other.playerBTankX;
            this.playerBTankY = other.playerBTankY;
            this.playerBTankFuel = other.playerBTankFuel;
            this.playerBTankHealth = other.playerBTankHealth;
            this.state = other.state;
            this.gameplayDefinitionVersion = other.gameplayDefinitionVersion;
            this.connectedPlayerCount = other.connectedPlayerCount;
        }
    }
}
