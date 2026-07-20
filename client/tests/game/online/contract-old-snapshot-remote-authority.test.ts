import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const srcRoot = join(process.cwd(), "src", "game");
const testSupportRoot = join(process.cwd(), "tests", "support");

const publicGameApi = await import("../../../src/game/index.ts");
const publicGameApiSource = readFileSync(join(srcRoot, "index.ts"), "utf8");
const engineSource = readFileSync(join(srcRoot, "GameEngine.ts"), "utf8");

assert.equal("createMockRemoteTransport" in publicGameApi, false);
assert.equal("createRemoteGameAuthority" in publicGameApi, false);
assert.equal("RemoteGameTransport" in publicGameApi, false);
assert.equal("createLocalGameAuthority" in publicGameApi, false);
assert.equal("GameAuthority" in publicGameApi, false);
assert.equal("GameViewState" in publicGameApi, false);
assert.equal("GameSnapshot" in publicGameApi, false);
assert.equal("SimulationAuthority" in publicGameApi, false);

assert.equal(publicGameApiSource.includes("GameAuthority"), false);
assert.equal(publicGameApiSource.includes("GameViewState"), false);
assert.equal(publicGameApiSource.includes("GameSnapshot"), false);
assert.equal(publicGameApiSource.includes("SimulationAuthority"), false);

assert.equal(engineSource.includes("GameAuthority"), false);
assert.equal(engineSource.includes("GameViewState"), false);
assert.equal(engineSource.includes("getViewState"), false);

assert.equal(
  existsSync(join(srcRoot, "authority", "gameAuthority.ts")),
  false,
);
assert.equal(
  existsSync(join(srcRoot, "authority", "simulationAuthority.ts")),
  false,
);
assert.equal(
  existsSync(join(srcRoot, "authority", "gameManager.ts")),
  true,
);
assert.equal(
  existsSync(join(srcRoot, "authority", "simulationManager.ts")),
  true,
);
assert.equal(
  existsSync(join(testSupportRoot, "snapshotRemoteAuthoritySupport.ts")),
  false,
);
assert.equal(
  existsSync(join(testSupportRoot, "remoteSimulationSupport.ts")),
  true,
);
