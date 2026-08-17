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

    private long turnStartDiffSequence;

    private long lastDiffServerTick;

    private long matchEndsAtServerTick;

    private long pendingTurnTransitionAtServerTick;

    private String pendingTurnTransitionIntentId;

    private GameSessionState state;

    private String gameContentVersion;

    private World world;

    private TerrainModel terrainModel;

    private boolean crateSpawnedMinute1;

    private boolean crateSpawnedMinute2;

    private boolean crateSpawnedMinute3;

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
            this.turnStartDiffSequence = other.turnStartDiffSequence;
            this.lastDiffServerTick = other.lastDiffServerTick;
            this.matchEndsAtServerTick = other.matchEndsAtServerTick;
            this.pendingTurnTransitionAtServerTick = other.pendingTurnTransitionAtServerTick;
            this.pendingTurnTransitionIntentId = other.pendingTurnTransitionIntentId;
            this.state = other.state;
            this.gameContentVersion = other.gameContentVersion;
            this.world = other.world == null ? null : new World(other.world);
            this.terrainModel = other.terrainModel == null ? null : new TerrainModel(other.terrainModel);
            this.crateSpawnedMinute1 = other.crateSpawnedMinute1;
            this.crateSpawnedMinute2 = other.crateSpawnedMinute2;
            this.crateSpawnedMinute3 = other.crateSpawnedMinute3;
            this.connectedUserIds = ConcurrentHashMap.newKeySet();
            if (other.connectedUserIds != null) {
                this.connectedUserIds.addAll(other.connectedUserIds);
            }
        }
    }
}
