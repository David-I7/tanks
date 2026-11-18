package com.tanks.server.websocket.entities.gameSession;

import com.tanks.server.domain.Player;
import com.tanks.server.websocket.gameplay.world.TerrainModel;
import com.tanks.server.websocket.gameplay.world.World;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class GameSession {

    private UUID id;

    private UUID hostId;

    private Player playerA;

    private Player playerB;

    private OffsetDateTime startedAt;

    private OffsetDateTime endedAt;

    private OffsetDateTime createdAt;

    private long serverTick;

    private long nextDiffSequence;

    private long turnStartDiffSequence;

    private long lastDiffServerTick;

    private long matchEndsAtServerTick;

    private GameSessionState state;

    private String gameContentVersion;

    private World world;

    private TerrainModel terrainModel;

    @Builder.Default
    private Set<UUID> connectedPlayerIds = ConcurrentHashMap.newKeySet();

    public int getConnectedPlayerCount() {
        return connectedPlayerIds != null ? connectedPlayerIds.size() : 0;
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
            this.state = other.state;
            this.gameContentVersion = other.gameContentVersion;
            this.world = other.world == null ? null : new World(other.world);
            this.terrainModel = other.terrainModel == null ? null : new TerrainModel(other.terrainModel);
            this.connectedPlayerIds = ConcurrentHashMap.newKeySet();
            if (other.connectedPlayerIds != null) {
                this.connectedPlayerIds.addAll(other.connectedPlayerIds);
            }
        }
    }
}
