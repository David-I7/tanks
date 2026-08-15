import { LocalWorld } from "./LocalWorld";
import { LocalTerrainModel } from "../simulation/LocalTerrainModel";
import type { GameContent } from "../content/localGameContent";
import {
  type ControllerKind,
  type GameMode,
  type MatchSetup,
  type DecorType,
  type MapBiome,
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

export function createDefaultMatchSetup(
  mode: GameMode = "localTwoPlayer",
): MatchSetup {
  return {
    mode,
    players: [
      {
        id: 0,
        ...getPlayerMatchConfig(mode, 0),
        tankSelection: { tankDefinitionId: "vanguard-cyber" },
      },
      {
        id: 1,
        ...getPlayerMatchConfig(mode, 1),
        tankSelection: { tankDefinitionId: "specter" },
      },
    ],
  };
}


export function createLocalInitialWorld(
  setup: MatchSetup,
  content: GameContent,
  initialGameViewport: GameViewport,
  overrideBiome?: MapBiome,
): LocalInitialWorld {
  const terrainSize = deriveLocalTerrainSize(initialGameViewport);
  const terrain = new LocalTerrainModel(terrainSize.width, terrainSize.height);
  const initialWind = Math.round((Math.random() * 14 - 7) * 10) / 10;
  const biomes: MapBiome[] = ["forest", "desert", "ice"];
  const biome = overrideBiome ?? biomes[Math.floor(Math.random() * biomes.length)];

  const world = new LocalWorld({
    mode: setup.mode,
    phase: "thinking",
    activePlayerId: setup.players[0]?.id ?? 0,
    playerCount: setup.players.length,
    turnNumber: 1,
    turnTimeRemaining: MAX_TURN_SECONDS,
    matchTimeRemaining: 180,
    wind: initialWind,
    winnerPlayerId: null,
    biome,
    isCameraLocked: true,
    cameraX: 0,
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

  // Generate 22 procedurally placed terrain decor items
  const decorTypes: DecorType[] = ["tree", "rock", "bunker", "grass", "tree", "rock"];
  for (let i = 0; i < 22; i++) {
    const x = Math.floor(100 + (terrain.width - 200) * (i / 21) + (Math.random() * 40 - 20));
    const clampedX = Math.max(10, Math.min(terrain.width - 10, x));
    const y = terrain.getSurfaceY(clampedX);
    const rotation = terrain.getSlopeAngle(clampedX);
    const type = decorTypes[i % decorTypes.length];
    world.decors.push({
      id: `decor-${i}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      x: clampedX,
      y,
      scale: type === "tree" ? 0.8 + Math.random() * 0.4 : 0.6 + Math.random() * 0.4,
      rotation,
      destroyed: false,
    });
  }

  // Generate 10 moving clouds
  for (let i = 0; i < 10; i++) {
    world.clouds.push({
      x: (terrain.width / 10) * i + Math.random() * 80,
      y: 30 + Math.random() * 80,
      speed: 0.2 + Math.random() * 0.4,
      scale: 0.7 + Math.random() * 0.6,
      opacity: 0.3 + Math.random() * 0.4,
    });
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
