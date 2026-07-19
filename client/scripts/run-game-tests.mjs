import { spawnSync } from "node:child_process";

const tests = [
  "tests/store/useAssetStore.test.ts",
  "tests/pages/lobby/lobby-stomp-contract.test.ts",
  "tests/pages/home/offline-menu-config.test.ts",
  "tests/game/authority/local-game-manager.test.ts",
  "tests/game/engine/game-engine.test.ts",
  "tests/game/world/canvas-sizing.test.ts",
  "tests/game/simulation/game-behavior.test.ts",
  "tests/api/ws/dto/gameplay/online-gameplay-protocol-contract.test.ts",
  "tests/game/online/online-gameplay-transport.test.ts",
  "tests/game/authority/online-game-manager.test.ts",
  "tests/game/online/contract-old-snapshot-remote-authority.test.ts",
  "tests/game/online/online-initial-state.test.ts",
  "tests/game/online/online-client-state-projection.test.ts",
  "tests/game/online/authoritative-online-gameplay.test.ts",
];

for (const test of tests) {
  const result = spawnSync("node_modules\\.bin\\jiti.cmd", [test], {
    shell: true,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
