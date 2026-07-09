package com.tanks.server.websocket.gameplay;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class OnlineGameplayDefinitionCatalogTest {

    private final OnlineGameplayDefinitionCatalog catalog = new OnlineGameplayDefinitionCatalog();

    @Test
    @DisplayName("Server-owned Gameplay Definitions include authoritative rules and render-safe IDs")
    void serverOwnedDefinitionsIncludeAuthoritativeRulesAndRenderIds() {
        OnlineGameplayDefinitions definitions = catalog.current();

        assertThat(definitions.version()).isEqualTo("online-gameplay-definitions.v1");
        assertThat(definitions.validation().maxMoveIntentDistance()).isEqualTo(120);
        assertThat(definitions.validation().minFirePower()).isEqualTo(0);
        assertThat(definitions.validation().maxFirePower()).isEqualTo(1);

        OnlineTankDefinition tank = definitions.tank("vanguard").orElseThrow();
        assertThat(tank.renderAssetId()).isEqualTo("tank.vanguard");
        assertThat(tank.maxHealth()).isEqualTo(110);
        assertThat(tank.maxFuel()).isEqualTo(100);
        assertThat(tank.loadout())
                .extracting(OnlineProjectileSlotDefinition::projectileDefinitionId)
                .containsExactly("basicShell", "mortar", "heavyShell", "cluster", "needle");

        OnlineProjectileDefinition projectile = definitions.projectile("basicShell").orElseThrow();
        assertThat(projectile.renderAssetId()).isEqualTo("projectile.basic-shell");
        assertThat(projectile.damageEffect()).isEqualTo(new OnlineDamageEffect.Radial(46, 48));
        assertThat(projectile.terrainEffect()).isEqualTo(new OnlineTerrainEffect.Crater(46));
        assertThat(projectile.physics().muzzleVelocityScale()).isEqualTo(1);
    }

    @Test
    @DisplayName("Server-owned render asset IDs are stable identifiers, not client asset paths")
    void renderAssetIdsAreNotClientAssetPaths() {
        OnlineGameplayDefinitions definitions = catalog.current();

        assertThat(definitions.tanks().values())
                .extracting(OnlineTankDefinition::renderAssetId)
                .allSatisfy(OnlineGameplayDefinitionCatalogTest::assertRenderAssetId);

        assertThat(definitions.projectiles().values())
                .extracting(OnlineProjectileDefinition::renderAssetId)
                .allSatisfy(OnlineGameplayDefinitionCatalogTest::assertRenderAssetId);
    }

    private static void assertRenderAssetId(String renderAssetId) {
        assertThat(renderAssetId).matches("[a-z]+(\\.[a-z0-9-]+)+");
        assertThat(renderAssetId).doesNotContain("/", "\\");
        assertThat(renderAssetId).doesNotMatch(".*\\.(png|jpg|jpeg|webp|gif|svg|css)$");
    }
}
