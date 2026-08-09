import type {
  OnlineDiffResponseDto,
  OnlineGameStateSnapshotResponse,
} from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import { localGameContent } from "../../../../src/game/content/localGameContent";

export function createTestSnapshot(): OnlineGameStateSnapshotResponse {
  return {
    gameContentVersion: "v1.0",
    gameContent: {
      ...localGameContent,
      world: { ...localGameContent.world, width: 2400 },
    } as any,
    match: {
      phase: "AIMING",
      activePlayerId: 1,
      playerCount: 2,
      turnNumber: 1,
      turnTimeRemainingTicks: 900,
      winnerPlayerId: null,
      matchTimeRemainingTicks: 5400,
      wind: 0,
      biome: "forest",
    },
    terrain: {
      kind: "HEIGHTMAP",
      width: 2400,
      height: 768,
      surface: new Array(2400).fill(400),
    },
    tanks: [
      {
        entityId: 10,
        playerId: 1,
        displayName: "Player 1",
        tankDefinitionId: "vanguard-cyber",
        width: 32,
        height: 16,
        visual: { fillStyle: "#3b82f6", strokeStyle: "#1d4ed8", accentColor: "#60a5fa", label: "P1" },
        position: { x: 200, y: 392 },
        facing: 1,
        aimAngle: -Math.PI / 4,
        power: 300,
        selectedProjectileSlotId: "basicShell",
        loadout: ["basicShell"],
        health: 100,
        maxHealth: 100,
        fuel: 240,
        alive: true,
      },
      {
        entityId: 20,
        playerId: 2,
        displayName: "Player 2",
        tankDefinitionId: "vanguard-cyber",
        width: 32,
        height: 16,
        visual: { fillStyle: "#ef4444", strokeStyle: "#b91c1c", accentColor: "#f87171", label: "P2" },
        position: { x: 1800, y: 392 },
        facing: -1,
        aimAngle: -Math.PI / 4,
        power: 300,
        selectedProjectileSlotId: "basicShell",
        loadout: ["basicShell"],
        health: 100,
        maxHealth: 100,
        fuel: 240,
        alive: true,
      },
    ],
    projectiles: [],
    lootCrates: [],
    damageTrails: [],
  };
}

export function createInitialDiff(sequence = 1): OnlineDiffResponseDto {
  return {
    gameSessionId: "test-session-123",
    sequence,
    serverTick: sequence * 10,
    type: "INITIAL_STATE",
    intentId: null,
    payload: {
      expectedNextDiffSequence: sequence + 1,
      localPlayerId: 1,
      state: createTestSnapshot(),
    },
  };
}
