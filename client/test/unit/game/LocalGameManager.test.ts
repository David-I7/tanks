import { describe, it, expect, vi } from "vitest";
import { createLocalGameManager } from "../../../src/game/authority/LocalGameManager";
import { testGameContent } from "./online/mockOnlineTestState";

describe("LocalGameManager", () => {
  it("submits panCamera and relockCamera actions even when no active human turn is present", () => {
    const manager = createLocalGameManager({
      mode: "localTwoPlayer",
      setup: {
        mode: "localTwoPlayer",
        players: [
          {
            id: 0,
            displayName: "P1",
            controllerKind: "human",
            tankSelection: { tankDefinitionId: "vanguard-cyber" },
          },
          {
            id: 1,
            displayName: "P2",
            controllerKind: "human",
            tankSelection: { tankDefinitionId: "specter" },
          },
        ],
      },
      content: testGameContent,
    });

    const acceptedPan = manager.submitAction({ type: "panCamera", deltaX: 100 });
    expect(acceptedPan).toBe(true);

    const acceptedRelock = manager.submitAction({ type: "relockCamera" });
    expect(acceptedRelock).toBe(true);
  });

  it("spawns players strictly within server authoritative playerASpawnRegion and playerBSpawnRegion", () => {
    const manager = createLocalGameManager({
      mode: "localTwoPlayer",
      setup: {
        mode: "localTwoPlayer",
        players: [
          {
            id: 0,
            displayName: "P1",
            controllerKind: "human",
            tankSelection: { tankDefinitionId: "vanguard-cyber" },
          },
          {
            id: 1,
            displayName: "P2",
            controllerKind: "human",
            tankSelection: { tankDefinitionId: "specter" },
          },
        ],
      },
      content: testGameContent,
    });

    const state = manager.getState();
    const tankP1 = state.tanks.find((t) => t.playerId === 0);
    const tankP2 = state.tanks.find((t) => t.playerId === 1);

    expect(tankP1).toBeDefined();
    expect(tankP2).toBeDefined();

    expect(tankP1!.position.x).toBeGreaterThanOrEqual(testGameContent.world.playerASpawnRegion.minX);
    expect(tankP1!.position.x).toBeLessThanOrEqual(testGameContent.world.playerASpawnRegion.maxX);

    expect(tankP2!.position.x).toBeGreaterThanOrEqual(testGameContent.world.playerBSpawnRegion.minX);
    expect(tankP2!.position.x).toBeLessThanOrEqual(testGameContent.world.playerBSpawnRegion.maxX);

    // Initial camera starts tracking active player (P1)
    expect(state.match.cameraX).toBe(tankP1!.position.x);
  });
});
