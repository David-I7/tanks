import { World } from "../ecs/World";
import { TerrainModel } from "../terrain/TerrainModel";
import type { GameMode } from "../types";
import { MAX_TURN_SECONDS } from "./turnRules";

export type InitialWorld = {
  world: World;
  terrain: TerrainModel;
};

export function createInitialWorld(
  mode: GameMode,
  width: number,
  height: number,
): InitialWorld {
  const terrain = new TerrainModel(
    Math.max(800, Math.floor(width * 2.5)),
    Math.max(420, height),
  );
  const world = new World({
    mode,
    phase: "aiming",
    activePlayerId: 0,
    playerCount: 2,
    turnNumber: 1,
    turnTimeRemaining: MAX_TURN_SECONDS,
    winnerPlayerId: null,
  });

  const playerX = 140;
  const enemyX = Math.floor(terrain.width * 0.72);

  world.createTank(0, playerX, terrain.getSurfaceY(playerX));
  world.createTank(1, enemyX, terrain.getSurfaceY(enemyX));

  for (const [entityId, tank] of world.tanks) {
    const position = world.positions.get(entityId);
    if (position) {
      tank.bodyAngle = terrain.getSlopeAngle(position.x);
    }
  }

  return { world, terrain };
}
