package com.tanks.server.websocket.repositories;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.gameplay.content.GameContentCatalog;
import com.tanks.server.websocket.gameplay.world.InitialWorldFactory;

class InMemoryGameSessionRepositoryWorldIsolationTest {
    @Test void repositoryDeeplyIsolatesMutableWorldAndTerrain() {
        var content = new GameContentCatalog().current();
        var initial = new InitialWorldFactory().create(content, 42, "A", "B");
        var session = GameSession.builder().id(UUID.randomUUID()).gameContentVersion(content.version())
                .world(initial.world()).terrainModel(initial.terrainModel()).build();
        var repository = new InMemoryGameSessionRepository();
        repository.save(session);
        var first = repository.findById(session.getId()).orElseThrow();
        first.getWorld().requireTankByPlayer(1).fuel(1);
        first.getTerrainModel().deform(100, 400, content.requireProjectile("basicShell").terrainEffect());
        var second = repository.findById(session.getId()).orElseThrow();
        assertThat(second.getWorld().requireTankByPlayer(1).fuel()).isEqualTo(content.requireTank("vanguard").maxFuel());
        assertThat(second.getTerrainModel().surface()).isNotEqualTo(first.getTerrainModel().surface());
    }
}
