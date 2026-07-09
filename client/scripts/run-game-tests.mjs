import { spawnSync } from "node:child_process";

const tests = [
  "tests\\game-behavior-tests.ts",
  "tests\\online-gameplay-protocol-contract-tests.ts",
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
