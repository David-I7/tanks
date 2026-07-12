import { World } from "./World";
import { TerrainModel } from "../terrain/TerrainModel";
import { mockGameContent, type GameContent } from "../content/mockGameContent";
import type { GameMode, MatchSetup } from "../types";
import type { GameViewport } from "./worldSizing";
import { MAX_TURN_SECONDS } from "../simulation/turnRules";
import { getPlayerMatchConfig } from "../modes";

export type InitialWorld = {
  world: World;
  terrain: TerrainModel;
  content: GameContent;
};

export function createInitialWorld(
  setup: MatchSetup,
  content: GameContent,
  initialGameViewport: GameViewport,
): InitialWorld {
  validateMatchSetup(setup, content);
  const terrainSize = deriveLocalTerrainSize(initialGameViewport);
  const terrain = new TerrainModel(
    terrainSize.width,
    terrainSize.height,
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

export function deriveLocalTerrainSize(initialGameViewport: GameViewport): {
  width: number;
  height: number;
} {
  return {
    width: Math.max(800, Math.floor(initialGameViewport.width * 2.5)),
    height: Math.max(420, initialGameViewport.height),
  };
}

export function createDefaultMatchSetup(mode: GameMode): MatchSetup {
  const p0 = getPlayerMatchConfig(mode, 0);
  const p1 = getPlayerMatchConfig(mode, 1);
  return {
    mode,
    players: [
      {
        id: 0,
        displayName: p0.displayName,
        controllerKind: p0.controllerKind,
        tankSelection: { tankDefinitionId: "vanguard" },
      },
      {
        id: 1,
        displayName: p1.displayName,
        controllerKind: p1.controllerKind,
        tankSelection: { tankDefinitionId: "specter" },
      },
    ],
  };
}

export function createDefaultInitialWorld(
  mode: GameMode,
  initialGameViewport: GameViewport,
): InitialWorld {
  return createInitialWorld(
    createDefaultMatchSetup(mode),
    mockGameContent,
    initialGameViewport,
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
