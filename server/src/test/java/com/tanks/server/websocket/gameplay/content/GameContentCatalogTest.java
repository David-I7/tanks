package com.tanks.server.websocket.gameplay.content;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class GameContentCatalogTest {

    @Test
    void shouldLoadGameContentV1CatalogSuccessfully() {
        ObjectMapper mapper = new ObjectMapper();
        GameContentCatalog catalog = new GameContentCatalog(mapper);
        catalog.init();

        GameContent content = catalog.current();
        assertNotNull(content);
        assertEquals("v1.0", content.version());

        assertNotNull(content.world());
        assertEquals(3, content.world().biomes().size());
        assertEquals("forest", content.world().biomes().get(0));

        assertNotNull(content.tankDefaults());
        assertEquals(240, content.tankDefaults().maxFuel());
        assertEquals(44, content.tankDefaults().width());
        assertEquals(28, content.tankDefaults().height());

        assertNotNull(content.tanks());
        assertEquals(4, content.tanks().size());

        var vanguard = content.requireTank("vanguard-cyber");
        assertEquals("vanguard-cyber", vanguard.id());
        assertEquals("Vanguard Cyber", vanguard.name());
        assertEquals(240, vanguard.maxFuel());
        assertEquals(44, vanguard.width());
        assertEquals(28, vanguard.height());

        assertNotNull(content.projectiles());
        var basicShell = content.requireProjectile("basicShell");
        assertEquals("basicShell", basicShell.id());
        assertEquals(true, basicShell.isDefault());

        var titanShell = content.requireProjectile("titanShell");
        assertEquals("titanShell", titanShell.id());
        assertEquals(false, titanShell.isDefault());
    }
}
