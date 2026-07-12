import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const srcRoot = join(process.cwd(), "src", "game");
const testSupportRoot = join(process.cwd(), "tests", "support");

const publicGameApi = await import("../src/game/index.ts");
const publicGameApiSource = readFileSync(join(srcRoot, "index.ts"), "utf8");
const engineSource = readFileSync(join(srcRoot, "GameEngine.ts"), "utf8");
const gameAuthoritySource = readFileSync(
  join(srcRoot, "authority", "gameAuthority.ts"),
  "utf8",
);
const simulationAuthoritySource = readFileSync(
  join(srcRoot, "authority", "simulationAuthority.ts"),
  "utf8",
);

assert.equal("createMockRemoteTransport" in publicGameApi, false);
assert.equal("createRemoteGameAuthority" in publicGameApi, false);
assert.equal("RemoteGameTransport" in publicGameApi, false);
assert.equal(publicGameApiSource.includes("RemoteGameAction"), false);

assert.equal(engineSource.includes("remoteTransport"), false);
assert.equal(engineSource.includes("onlineTransport"), false);
assert.equal(engineSource.includes("localPlayerId"), false);
assert.equal(engineSource.includes("RemoteSimulationAuthority"), false);
assert.equal(engineSource.includes("createRemoteGameAuthority"), false);
assert.equal(gameAuthoritySource.includes("createRemoteGameAuthority"), false);
assert.equal(simulationAuthoritySource.includes("RemoteSimulationAuthority"), false);
assert.equal(simulationAuthoritySource.includes("createRemoteSimulationAuthority"), false);

assert.equal(
  existsSync(join(srcRoot, "authority", "createMockRemoteTransport.ts")),
  false,
);
assert.equal(
  existsSync(join(srcRoot, "authority", "RemoteSimulationAuthority.ts")),
  false,
);
assert.equal(
  existsSync(join(testSupportRoot, "snapshotRemoteAuthoritySupport.ts")),
  true,
);
