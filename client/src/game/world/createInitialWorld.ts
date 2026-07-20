import { LocalWorld } from "./LocalWorld";
import { LocalTerrainModel } from "../simulation/LocalTerrainModel";
import {
  localGameContent,
  type GameContent,
} from "../content/localGameContent";
import {
  type ControllerKind,
  type GameMode,
  type MatchSetup,
  MAX_TURN_SECONDS,
} from "../types";
import type { GameViewport } from "./worldSizing";

export type LocalInitialWorld = {
  world: LocalWorld;
  terrain: LocalTerrainModel;
  content: GameContent;
};

export function getPlayerMatchConfig(
  mode: GameMode,
  playerId: number,
): {
  displayName: string;
  controllerKind: ControllerKind;
} {
  if (mode === "playerVsAi") {
    return {
      displayName: playerId === 0 ? "Player 1" : "CPU",
      controllerKind: playerId === 0 ? "human" : "ai",
    };
  }
  if (mode === "online") {
    return {
      displayName: playerId === 0 ? "Player 1" : "Player 2",
      controllerKind: playerId === 0 ? "human" : "remote",
    };
  }
  return {
    displayName: playerId === 0 ? "Player 1" : "Player 2",
    controllerKind: "human",
  };
}

export function createLocalInitialWorld(
  setup: MatchSetup,
  content: GameContent,
  initialGameViewport: GameViewport,
): LocalInitialWorld {
  const terrainSize = deriveLocalTerrainSize(initialGameViewport);
  const terrain = new LocalTerrainModel(terrainSize.width, terrainSize.height);
  const world = new LocalWorld({
    mode: setup.mode,
    phase: "thinking",
    activePlayerId: setup.players[0]?.id ?? 0,
    playerCount: setup.players.length,
    turnNumber: 1,
    turnTimeRemaining: MAX_TURN_SECONDS,
    winnerPlayerId: null,
  });

  setup.players.forEach((player, index) => {
    const tankDefinition = content.tanks[player.tankSelection.tankDefinitionId];
    if (!tankDefinition) {
      throw new Error(
        `Missing tank definition "${player.tankSelection.tankDefinitionId}"`,
      );
    }
    const x =
      setup.players.length === 1
        ? Math.floor(terrain.width * 0.25)
        : Math.floor(
            140 + (terrain.width * 0.62 * index) / (setup.players.length - 1),
          );
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
