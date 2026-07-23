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

    private Long hostId;

    private String playerA;

    private String playerB;

    private OffsetDateTime startedAt;

    private OffsetDateTime endedAt;

    private OffsetDateTime createdAt;

    private GameSessionState state;

    private int connectedPlayerCount = 0;

    public GameSession(GameSession other) {
        if (other != null) {
            this.id = other.id;
            this.hostId = other.hostId;
            this.playerA = other.playerA;
            this.playerB = other.playerB;
            this.startedAt = other.startedAt;
            this.endedAt = other.endedAt;
            this.createdAt = other.createdAt;
            this.state = other.state;
            this.connectedPlayerCount = other.connectedPlayerCount;
        }
    }
}
