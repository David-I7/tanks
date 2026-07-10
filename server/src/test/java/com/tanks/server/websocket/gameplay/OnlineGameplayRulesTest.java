package com.tanks.server.websocket.gameplay;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.tanks.server.websocket.dto.gameplay.OnlineIntentPayloads;
import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;

class OnlineGameplayRulesTest {

    private final OnlineGameplayRules rules = new OnlineGameplayRules(new OnlineGameplayDefinitionCatalog());

    @Test
    @DisplayName("Online tank snapshots derive stats and render IDs from server-owned definitions")
    void tankSnapshotsUseServerOwnedDefinitions() {
        var tank = rules.createTankSnapshot(10, 1, "Player 1", "vanguard", new OnlineVec2Dto(50, 120), 1);

        assertThat(tank.tankDefinitionId()).isEqualTo("vanguard");
        assertThat(tank.renderAssetId()).isEqualTo("tank.vanguard");
        assertThat(tank.health()).isEqualTo(110);
        assertThat(tank.maxHealth()).isEqualTo(110);
        assertThat(tank.fuel()).isEqualTo(100);
        assertThat(tank.selectedProjectileSlotId()).isEqualTo("standard");
    }

    @Test
    @DisplayName("Online projectile results derive render IDs, damage, and terrain effects from server-owned definitions")
    void projectileResultsUseServerOwnedDefinitions() {
        var resolution = rules.createProjectileResolution(
                "intent-fire",
                20,
                1,
                "basicShell",
                new OnlineVec2Dto(55, 110),
                new OnlineVec2Dto(120, 130));

        assertThat(resolution.intentId()).isEqualTo("intent-fire");
        assertThat(resolution.projectileDefinitionId()).isEqualTo("basicShell");
        assertThat(resolution.projectileRenderAssetId()).isEqualTo("projectile.basic-shell");
        assertThat(resolution.impactRenderAssetId()).isEqualTo("impact.orange-pop");
        assertThat(rules.damageEffect("basicShell")).isEqualTo(new OnlineDamageEffect.Radial(46, 48));
        assertThat(rules.terrainEffect("basicShell")).isEqualTo(new OnlineTerrainEffect.Crater(46));
    }

    @Test
    @DisplayName("Online validation uses server-owned bounds and loadouts")
    void validationUsesServerOwnedDefinitions() {
        assertThat(rules.acceptsFireIntent(new OnlineIntentPayloads.Fire(42, 0.75, "standard"))).isTrue();
        assertThat(rules.acceptsFireIntent(new OnlineIntentPayloads.Fire(42, 1.25, "standard"))).isFalse();
        assertThat(rules.acceptsFireIntent(new OnlineIntentPayloads.Fire(42, 0.75, "client-only-slot"))).isFalse();
    }

    @Test
    @DisplayName("Game Sessions cannot use client-owned gameplay definition IDs for online authority")
    void rejectsClientOwnedDefinitionIds() {
        assertThatThrownBy(() -> rules.createTankSnapshot(
                10,
                1,
                "Player 1",
                "client/assets/tank.png",
                new OnlineVec2Dto(50, 120),
                1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unknown online tank definition");

        assertThatThrownBy(() -> rules.createProjectileResolution(
                "intent-fire",
                20,
                1,
                "client-only-shell",
                new OnlineVec2Dto(55, 110),
                new OnlineVec2Dto(120, 130)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unknown online projectile definition");
    }
}
