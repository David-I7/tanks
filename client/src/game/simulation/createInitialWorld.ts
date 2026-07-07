import { World } from "../ecs/World";
import { TerrainModel } from "../terrain/TerrainModel";
import { mockGameContent, type GameContent } from "../content/mockGameContent";
import type { GameMode, MatchSetup } from "../types";
import { MAX_TURN_SECONDS } from "./turnRules";

export type InitialWorld = {
  world: World;
  terrain: TerrainModel;
  content: GameContent;
};

export function createInitialWorld(
  setup: MatchSetup,
  content: GameContent,
  width: number,
  height: number,
): InitialWorld {
  validateMatchSetup(setup, content);
  const terrain = new TerrainModel(
    Math.max(800, Math.floor(width * 2.5)),
    Math.max(420, height),
  );
  const world = new World({
    mode: setup.mode,
    phase: "aiming",
    activePlayerId: setup.players[0]?.id ?? 0,
    playerCount: setup.players.length,
    turnNumber: 1,
    turnTimeRemaining: MAX_TURN_SECONDS,
    winnerPlayerId: null,
  });

  setup.players.forEach((player, index) => {
    const tankDefinition = content.tanks[player.tankSelection.tankDefinitionId];
    if (!tankDefinition) {
      throw new Error(`Missing tank definition "${player.tankSelection.tankDefinitionId}"`);
    }
    const x =
      setup.players.length === 1
        ? Math.floor(terrain.width * 0.25)
        : Math.floor(140 + (terrain.width * 0.62 * index) / (setup.players.length - 1));
    world.createTank(player, tankDefinition, x, terrain.getSurfaceY(x));
  });

  for (const [entityId, tank] of world.tanks) {
    const position = world.positions.get(entityId);
    if (position) {
      tank.bodyAngle = terrain.getSlopeAngle(position.x);
    }
  }

  return { world, terrain, content };
}

export function createDefaultMatchSetup(mode: GameMode): MatchSetup {
  return {
    mode,
    players: [
      {
        id: 0,
        displayName: "Player 1",
        controllerKind: "human",
        tankSelection: { tankDefinitionId: "vanguard" },
      },
      {
        id: 1,
        displayName: mode === "ai" ? "CPU" : "Player 2",
        controllerKind: mode === "ai" ? "ai" : mode === "online" ? "remote" : "human",
        tankSelection: { tankDefinitionId: "specter" },
      },
    ],
  };
}

export function createDefaultInitialWorld(
  mode: GameMode,
  width: number,
  height: number,
): InitialWorld {
  return createInitialWorld(
    createDefaultMatchSetup(mode),
    mockGameContent,
    width,
    height,
  );
}

function validateMatchSetup(setup: MatchSetup, content: GameContent): void {
  const playerIds = new Set<number>();
  for (const player of setup.players) {
    if (playerIds.has(player.id)) {
      throw new Error(`Duplicate player id "${player.id}" in Match Setup`);
    }
    playerIds.add(player.id);

    const tankDefinition = content.tanks[player.tankSelection.tankDefinitionId];
    if (!tankDefinition) {
      throw new Error(`Missing tank definition "${player.tankSelection.tankDefinitionId}"`);
    }

    if (tankDefinition.loadout.length !== 5) {
      throw new Error(
        `Tank definition "${tankDefinition.id}" must have exactly five projectile slots`,
      );
    }

    const slotIds = new Set<string>();
    for (const slot of tankDefinition.loadout) {
      if (slotIds.has(slot.id)) {
        throw new Error(`Tank definition "${tankDefinition.id}" has duplicate projectile slot "${slot.id}"`);
      }
      slotIds.add(slot.id);
      if (!content.projectiles[slot.projectileDefinitionId]) {
        throw new Error(
          `Missing projectile definition "${slot.projectileDefinitionId}" referenced by tank "${tankDefinition.id}"`,
        );
      }
    }
  }
}
