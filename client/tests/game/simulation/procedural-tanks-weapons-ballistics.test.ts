import assert from "node:assert/strict";
import { LocalSimulation } from "../../../src/game/simulation/LocalSimulation";
import { createLocalInitialWorld } from "../../../src/game/world/createInitialWorld";
import { localGameContent } from "../../../src/game/content/localGameContent";
import type { MatchSetup } from "../../../src/game/types";

function makeSimulation(tankId = "heavy-armor") {
  const setup: MatchSetup = {
    mode: "localTwoPlayer",
    players: [
      { id: 0, displayName: "P1", controllerKind: "human", tankSelection: { tankDefinitionId: tankId } },
      { id: 1, displayName: "P2", controllerKind: "human", tankSelection: { tankDefinitionId: "desert-striker" } },
    ],
  };
  const { world, terrain, content } = createLocalInitialWorld(setup, localGameContent, {
    width: 960,
    height: 560,
  });
  return new LocalSimulation(world, terrain, content);
}

// 1. Verify 4 Tank Configurations & Weapon Ammo Limits
{
  const tankIds = ["heavy-armor", "desert-striker", "vanguard-cyber", "specter"];
  for (const tankId of tankIds) {
    const sim = makeSimulation(tankId);
    const p1Tank = sim.getState().tanks[0]?.tank;
    assert.ok(p1Tank, `Tank ${tankId} should exist`);
    assert.equal(p1Tank.loadout.length, 5, `Tank ${tankId} should have 5 slots (1 default + 4 unique)`);

    // Standard shell slot should have -1 (infinite) ammo
    const defaultSlot = p1Tank.loadout.find((s) => s.id === "standard" || s.projectileDefinitionId === "basicShell");
    assert.ok(defaultSlot, `Tank ${tankId} should have a standard shell slot`);
    assert.equal(p1Tank.weaponAmmo[defaultSlot.id], -1, "Standard shell should have -1 infinite ammo");

    // Unique weapon slots should start at ammo 1
    const uniqueSlots = p1Tank.loadout.filter((s) => s !== defaultSlot);
    assert.equal(uniqueSlots.length, 4, `Tank ${tankId} should have 4 unique slots`);
    for (const slot of uniqueSlots) {
      assert.equal(p1Tank.weaponAmmo[slot.id], 1, `Unique slot ${slot.id} should start with 1 ammo`);
    }
  }
}

// 2. Firing Ammo Consumption and 0-Ammo Disabled Firing
{
  const sim = makeSimulation("heavy-armor");
  const p1Tank = sim.getState().tanks[0]?.tank;
  assert.ok(p1Tank);
  const uniqueSlot = p1Tank.loadout.find((s) => s.id !== "standard");
  assert.ok(uniqueSlot);

  // Fire unique weapon with 1 ammo
  assert.equal(sim.submitPlayerAction(0, { type: "selectProjectileSlot", projectileSlotId: uniqueSlot.id }), true);
  assert.equal(sim.submitPlayerAction(0, { type: "fire", angle: -0.5, power: 300, projectileSlotId: uniqueSlot.id }), true);

  const updatedP1 = sim.getState().tanks[0]?.tank;
  assert.equal(updatedP1?.weaponAmmo[uniqueSlot.id], 0, "Ammo should decrement from 1 to 0 after firing");

  // Advance turn back to P1
  sim.update(35); // finish ballistics and transition to P2
  // Advance P2 turn
  sim.update(35);

  // Now P1 tries to fire the depleted slot again
  const p1Again = sim.getState().tanks[0]?.tank;
  assert.equal(p1Again?.weaponAmmo[uniqueSlot.id], 0, "Ammo is still 0");
  assert.equal(
    sim.submitPlayerAction(0, { type: "fire", angle: -0.5, power: 300, projectileSlotId: uniqueSlot.id }),
    false,
    "Firing a 0-ammo slot must be rejected",
  );
}

// 3. Ricochet Bouncing Physics
{
  const sim = makeSimulation("heavy-armor");
  const p1Tank = sim.getState().tanks[0]?.tank;
  assert.ok(p1Tank);
  const bounceSlot = p1Tank.loadout.find((s) => {
    const def = localGameContent.projectiles[s.projectileDefinitionId];
    return def?.pattern?.kind === "bouncing";
  });
  assert.ok(bounceSlot, "heavy-armor should have a bouncing weapon slot");

  sim.submitPlayerAction(0, { type: "selectProjectileSlot", projectileSlotId: bounceSlot.id });
  sim.submitPlayerAction(0, { type: "fire", angle: 0.8, power: 250, projectileSlotId: bounceSlot.id });

  assert.equal(sim.getState().match.phase, "ballistics");
  // Update simulation ticks and ensure projectile bounces off terrain without immediate detonation
  let bounceOccurred = false;
  for (let i = 0; i < 150; i++) {
    const stateBefore = sim.getState();
    const projBefore = stateBefore.projectiles[0];
    sim.update(1 / 30);
    const stateAfter = sim.getState();
    const projAfter = stateAfter.projectiles[0];
    if (projBefore && projAfter && (projAfter.projectile as any).bouncesCount > (projBefore.projectile as any).bouncesCount) {
      bounceOccurred = true;
    }
  }
  assert.ok(bounceOccurred, "Bouncing projectile should reflect/bounce off terrain");
}

// 4. Damage Trail Hazard Zones
{
  const sim = makeSimulation("desert-striker");
  const p1Tank = sim.getState().tanks[0]?.tank;
  assert.ok(p1Tank);
  const trailSlot = p1Tank.loadout.find((s) => {
    const def = localGameContent.projectiles[s.projectileDefinitionId];
    return def?.pattern?.kind === "damageTrail";
  });
  assert.ok(trailSlot, "desert-striker should have a damageTrail weapon slot");

  sim.submitPlayerAction(0, { type: "selectProjectileSlot", projectileSlotId: trailSlot.id });
  sim.submitPlayerAction(0, { type: "fire", angle: 0.5, power: 300, projectileSlotId: trailSlot.id });

  // Update until projectile impacts terrain and creates hazard
  for (let i = 0; i < 60; i++) {
    sim.update(1 / 30);
  }

  // During damage trail (5s), turn should stay locked in ballistics phase and tank movement should be locked
  const state = sim.getState();
  assert.equal(state.match.phase, "ballistics", "Damage trail should hold turn phase in ballistics");
  assert.equal(sim.submitPlayerAction(0, { type: "move", direction: 1 }), false, "Movement must be locked during damage trail hazard");
}

console.log("All procedural tanks & weapons tests passed!");
