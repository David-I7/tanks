import { spawnSync } from "node:child_process";

const tests = [
  "tests\\game-authority-tests.ts",
  "tests\\game-engine-tests.ts",
  "tests\\canvas-sizing-tests.ts",
  "tests\\game-behavior-tests.ts",
  "tests\\online-gameplay-protocol-contract-tests.ts",
  "tests\\online-gameplay-transport-tests.ts",
  "tests\\online-gameplay-authority-tests.ts",
  "tests\\contract-old-snapshot-remote-authority-tests.ts",
  "tests\\online-initial-state-tests.ts",
  "tests\\online-client-state-projection-tests.ts",
  "tests\\online-golden-simulation-tests.ts",
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
