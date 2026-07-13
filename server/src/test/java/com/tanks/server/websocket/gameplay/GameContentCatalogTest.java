package com.tanks.server.websocket.gameplay;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import com.tanks.server.websocket.gameplay.content.*;

class GameContentCatalogTest {
    private final GameContent content = new GameContentCatalog().current();

    @Test void contentOwnsEveryTunableGameplayRule() {
        assertThat(content.version()).isEqualTo("game-content.v1");
        assertThat(content.world().width()).isEqualTo(960);
        assertThat(content.world().bedrockY()).isEqualTo(520);
        assertThat(content.requireTank("vanguard").movementQuantum()).isPositive();
        assertThat(content.requireTank("vanguard").fuelRate()).isPositive();
        assertThat(content.requireProjectile("basicShell").baseVelocity()).isPositive();
    }
}
