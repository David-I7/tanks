package com.tanks.server.websocket.entities.gameSession;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;

import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import com.tanks.server.websocket.gameplay.world.TerrainModel;
import com.tanks.server.websocket.gameplay.world.World;

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

    private long serverTick;

    private long nextDiffSequence;

    private long lastDiffServerTick;

    private long matchEndsAtServerTick;

    private String playerAUnresolvedIntentId;

    private String playerBUnresolvedIntentId;

    private GameSessionState state;

    private String gameContentVersion;

    private long generationSeed;

    private World world;

    private TerrainModel terrainModel;

    @Builder.Default
    private Set<Long> connectedUserIds = ConcurrentHashMap.newKeySet();

    public int getConnectedPlayerCount() {
        return connectedUserIds != null ? connectedUserIds.size() : 0;
    }

    public GameSession(GameSession other) {
        if (other != null) {
            this.id = other.id;
            this.hostId = other.hostId;
            this.playerA = other.playerA;
            this.playerB = other.playerB;
            this.startedAt = other.startedAt;
            this.endedAt = other.endedAt;
            this.createdAt = other.createdAt;
            this.serverTick = other.serverTick;
            this.nextDiffSequence = other.nextDiffSequence;
            this.lastDiffServerTick = other.lastDiffServerTick;
            this.matchEndsAtServerTick = other.matchEndsAtServerTick;
            this.playerAUnresolvedIntentId = other.playerAUnresolvedIntentId;
            this.playerBUnresolvedIntentId = other.playerBUnresolvedIntentId;
            this.state = other.state;
            this.gameContentVersion = other.gameContentVersion;
            this.generationSeed = other.generationSeed;
            this.world = other.world == null ? null : new World(other.world);
            this.terrainModel = other.terrainModel == null ? null : new TerrainModel(other.terrainModel);
            this.connectedUserIds = ConcurrentHashMap.newKeySet();
            if (other.connectedUserIds != null) {
                this.connectedUserIds.addAll(other.connectedUserIds);
            }
        }
    }
}
