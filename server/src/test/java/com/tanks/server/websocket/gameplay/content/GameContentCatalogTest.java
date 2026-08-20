package com.tanks.server.websocket.gameplay.content;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import com.tanks.server.websocket.gameplay.content.definitions.HazardType;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

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

        // Assert 4 elemental tanks and their 5-weapon loadouts
        var ignis = content.requireTank("ignis");
        assertEquals("ignis", ignis.id());
        assertEquals("Ignis", ignis.name());
        assertEquals(5, ignis.loadout().size());
        assertEquals("standardKaboom", ignis.loadout().get(0));
        assertEquals("dragonsBreath", ignis.loadout().get(1));
        assertEquals("magmaSalvo", ignis.loadout().get(2));
        assertEquals("blazeCluster", ignis.loadout().get(3));
        assertEquals("lavaHopper", ignis.loadout().get(4));

        var glacies = content.requireTank("glacies");
        assertEquals("glacies", glacies.id());
        assertEquals("Glacies", glacies.name());
        assertEquals(5, glacies.loadout().size());
        assertEquals("standardKaboom", glacies.loadout().get(0));
        assertEquals("frostbiteZone", glacies.loadout().get(1));
        assertEquals("blizzardSalvo", glacies.loadout().get(2));
        assertEquals("apexAvalanche", glacies.loadout().get(3));
        assertEquals("cryoNeedle", glacies.loadout().get(4));

        var terra = content.requireTank("terra");
        assertEquals("terra", terra.id());
        assertEquals("Terra", terra.name());
        assertEquals(5, terra.loadout().size());
        assertEquals("standardKaboom", terra.loadout().get(0));
        assertEquals("quakeFissure", terra.loadout().get(1));
        assertEquals("gravelGatling", terra.loadout().get(2));
        assertEquals("graniteCluster", terra.loadout().get(3));
        assertEquals("tectonicThumper", terra.loadout().get(4));

        var volt = content.requireTank("volt");
        assertEquals("volt", volt.id());
        assertEquals("Volt", volt.name());
        assertEquals(5, volt.loadout().size());
        assertEquals("standardKaboom", volt.loadout().get(0));
        assertEquals("teslaGrid", volt.loadout().get(1));
        assertEquals("arcSalvo", volt.loadout().get(2));
        assertEquals("staticApexStar", volt.loadout().get(3));
        assertEquals("thunderstrikeCore", volt.loadout().get(4));

        // Assert 17 projectiles catalog
        assertNotNull(content.projectiles());
        assertEquals(17, content.projectiles().size());

        var standardKaboom = content.requireProjectile("standardKaboom");
        assertEquals("standardKaboom", standardKaboom.id());
        assertTrue(standardKaboom.isDefault());

        // Assert Ignis arsenal
        var dragonsBreath = content.requireProjectile("dragonsBreath");
        assertNotNull(dragonsBreath.damageTrail());
        assertEquals(HazardType.FIRE, dragonsBreath.damageTrail().hazardType());

        var magmaSalvo = content.requireProjectile("magmaSalvo");
        assertNotNull(magmaSalvo.salvo());
        assertEquals(3, magmaSalvo.salvo().shotCount());

        var blazeCluster = content.requireProjectile("blazeCluster");
        assertNotNull(blazeCluster.apexSplit());
        assertEquals(5, blazeCluster.apexSplit().splitCount());

        var lavaHopper = content.requireProjectile("lavaHopper");
        assertNotNull(lavaHopper.bouncer());
        assertEquals(4, lavaHopper.bouncer().bounceCount());

        // Assert Glacies arsenal
        var frostbiteZone = content.requireProjectile("frostbiteZone");
        assertNotNull(frostbiteZone.damageTrail());
        assertEquals(HazardType.FROST, frostbiteZone.damageTrail().hazardType());

        var blizzardSalvo = content.requireProjectile("blizzardSalvo");
        assertNotNull(blizzardSalvo.salvo());
        assertEquals(4, blizzardSalvo.salvo().shotCount());

        var apexAvalanche = content.requireProjectile("apexAvalanche");
        assertNotNull(apexAvalanche.apexSplit());
        assertEquals(6, apexAvalanche.apexSplit().splitCount());

        var cryoNeedle = content.requireProjectile("cryoNeedle");
        assertEquals("DRILL", cryoNeedle.terrainEffect().getClass().getSimpleName().toUpperCase());

        // Assert Terra arsenal
        var quakeFissure = content.requireProjectile("quakeFissure");
        assertNotNull(quakeFissure.damageTrail());
        assertEquals(HazardType.QUAKE, quakeFissure.damageTrail().hazardType());

        var gravelGatling = content.requireProjectile("gravelGatling");
        assertNotNull(gravelGatling.salvo());
        assertEquals(3, gravelGatling.salvo().shotCount());

        var graniteCluster = content.requireProjectile("graniteCluster");
        assertNotNull(graniteCluster.apexSplit());
        assertEquals(4, graniteCluster.apexSplit().splitCount());

        var tectonicThumper = content.requireProjectile("tectonicThumper");
        assertNotNull(tectonicThumper.bouncer());
        assertEquals(4, tectonicThumper.bouncer().bounceCount());

        // Assert Volt arsenal
        var teslaGrid = content.requireProjectile("teslaGrid");
        assertNotNull(teslaGrid.damageTrail());
        assertEquals(HazardType.ELECTRIC, teslaGrid.damageTrail().hazardType());

        var arcSalvo = content.requireProjectile("arcSalvo");
        assertNotNull(arcSalvo.salvo());
        assertEquals(3, arcSalvo.salvo().shotCount());

        var staticApexStar = content.requireProjectile("staticApexStar");
        assertNotNull(staticApexStar.apexSplit());
        assertEquals(6, staticApexStar.apexSplit().splitCount());

        var thunderstrikeCore = content.requireProjectile("thunderstrikeCore");
        assertNotNull(thunderstrikeCore);
    }
}
