package com.tanks.server.websocket.gameplay;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import com.tanks.server.websocket.gameplay.content.GameContentCatalog;
import com.tanks.server.websocket.gameplay.world.InitialWorldFactory;

class InitialWorldFactoryTest {
    @Test @DisplayName("golden seeded initialization reproduces exact terrain and spawns")
    void sameSeedReproducesTerrainAndSpawns() {
        var content = new GameContentCatalog().current();
        var factory = new InitialWorldFactory();
        var first = factory.create(content, 42, "A", "B");
        var second = factory.create(content, 42, "A", "B");
        assertThat(first.terrainModel().surface()).isEqualTo(second.terrainModel().surface()).hasSize(960);
        assertThat(first.world().requireTankByPlayer(1).position()).isEqualTo(second.world().requireTankByPlayer(1).position());
        assertThat(first.world().requireTankByPlayer(2).position()).isEqualTo(second.world().requireTankByPlayer(2).position());
        assertThat(first.world().requireTankByPlayer(1).position().x()).isBetween(96d, 320d);
        assertThat(first.world().requireTankByPlayer(2).position().x()).isBetween(640d, 864d);
    }
}
