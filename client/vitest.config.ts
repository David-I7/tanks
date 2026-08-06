import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 10000,
    reporters: ["verbose"],
    silent: process.env.VITE_DEBUG_TESTS !== "true",
  },
});
