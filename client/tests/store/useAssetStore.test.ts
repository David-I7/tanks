import assert from "node:assert/strict";
import { useAssetStore, TANK_DEFINITIONS } from "../../src/store/useAssetStore";
import ResourceManager from "../../src/game/rendering/ResourceManager";

async function testAssetStoreInitialState() {
  const state = useAssetStore.getState();
  assert.equal(state.isLoaded, false);
  assert.equal(state.isLoading, false);
  assert.equal(state.selectedTankId, "heavy-armor");
  assert.equal(state.tanks.length, 0);
  console.log("✓ testAssetStoreInitialState passed");
}

async function testResourceManagerDefinitions() {
  const resourceManager = ResourceManager.getInstance();
  const definitions = resourceManager.getTankDefinitions();
  assert.equal(definitions.length, 3);
  assert.equal(definitions[0].id, "heavy-armor");
  assert.equal(definitions[1].id, "desert-striker");
  assert.equal(definitions[2].id, "vanguard-cyber");
  console.log("✓ testResourceManagerDefinitions passed");
}

async function testTankProjectileDefinitions() {
  const resourceManager = ResourceManager.getInstance();
  const definitions = resourceManager.getTankDefinitions();
  for (const def of definitions) {
    assert.equal(def.projectiles.length, 5, `Tank ${def.id} should have 5 projectiles`);
    assert.ok(def.projectiles[0].name, `First projectile of ${def.id} should have a name`);
  }
  console.log("✓ testTankProjectileDefinitions passed");
}

async function testAssetStoreSelection() {
  useAssetStore.getState().setSelectedTankId("vanguard-cyber");
  assert.equal(useAssetStore.getState().selectedTankId, "vanguard-cyber");
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
