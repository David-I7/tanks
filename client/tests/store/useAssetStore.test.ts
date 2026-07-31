import assert from "node:assert/strict";
import { useAssetStore } from "../../src/store/useAssetStore";
import { TANK_DEFINITIONS } from "../../src/game/rendering/ResourceManager";

async function testAssetStoreInitialState() {
  const state = useAssetStore.getState();
  assert.equal(state.selectedTankId, null);
  console.log("✓ testAssetStoreInitialState passed");
}

async function testResourceManagerDefinitions() {
  const definitions = Object.values(TANK_DEFINITIONS);
  assert.equal(definitions.length, 4);
  assert.equal(definitions[0].id, "heavy-armor");
  assert.equal(definitions[1].id, "desert-striker");
  assert.equal(definitions[2].id, "vanguard-cyber");
  assert.equal(definitions[3].id, "specter");
  console.log("✓ testResourceManagerDefinitions passed");
}

async function testTankProjectileDefinitions() {
  const definitions = Object.values(TANK_DEFINITIONS);
  for (const def of definitions) {
    assert.equal(def.projectiles.length, 5, `Tank ${def.id} should have 5 projectiles`);
    assert.ok(def.projectiles[0].name, `First projectile of ${def.id} should have a name`);
  }
  console.log("✓ testTankProjectileDefinitions passed");
}

async function testAssetStoreSelection() {
  useAssetStore.getState().setSelectedTank("vanguard-cyber");
  const selectedId = useAssetStore.getState().selectedTankId;
  assert.equal(selectedId, "vanguard-cyber");
  console.log("✓ testAssetStoreSelection passed");
}

async function run() {
  await testAssetStoreInitialState();
  await testResourceManagerDefinitions();
  await testTankProjectileDefinitions();
  await testAssetStoreSelection();
  console.log("All asset store tests passed!");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
