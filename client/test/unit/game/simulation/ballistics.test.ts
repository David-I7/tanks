import { describe, it, expect } from "vitest";
import {
  BARREL_LENGTH,
  TURRET_Y_OFFSET,
  clampAimAngle,
  getMuzzlePosition,
  simulateTrajectoryPreview,
} from "../../../../src/game/simulation/ballistics";
import { LocalWorld } from "../../../../src/game/world/LocalWorld";
import { LocalTerrainModel } from "../../../../src/game/simulation/LocalTerrainModel";
import { testGameContent } from "../online/mockOnlineTestState";
import { LocalSimulation } from "../../../../src/game/simulation/LocalSimulation";
import type { GameState } from "../../../../src/game/types";

describe("clampAimAngle", () => {
  it("should preserve valid radian angles in upper semicircle [-π, 0]", () => {
    expect(clampAimAngle(0)).toBe(0);
    expect(clampAimAngle(-Math.PI / 4)).toBe(-Math.PI / 4);
    expect(clampAimAngle(-Math.PI / 2)).toBe(-Math.PI / 2);
    expect(clampAimAngle(-Math.PI)).toBe(-Math.PI);
  });

  it("should clamp radian angles pointing into the ground (> 0)", () => {
    // Pointing down-right -> clamps to 0
    expect(clampAimAngle(Math.PI / 6)).toBe(0);
    // Pointing down-left -> clamps to -π
    expect(clampAimAngle((3 * Math.PI) / 4)).toBe(-Math.PI);
  });

  it("should clamp radian angles beyond 180 degrees left (< -π)", () => {
    expect(clampAimAngle(-1.2 * Math.PI)).toBe(-Math.PI);
  });

  it("should convert and clamp elevation degree inputs [0, 180]", () => {
    expect(clampAimAngle(0)).toBe(0);
    expect(clampAimAngle(45)).toBeCloseTo(-Math.PI / 4);
    expect(clampAimAngle(90)).toBeCloseTo(-Math.PI / 2);
    expect(clampAimAngle(180)).toBeCloseTo(-Math.PI);
    expect(clampAimAngle(210)).toBeCloseTo(-Math.PI); // clamped to 180deg
    expect(clampAimAngle(-45)).toBeCloseTo(-Math.PI / 4); // canvas -45deg
  });
});

describe("getMuzzlePosition", () => {
  it("should calculate exact muzzle position along aim angle from turret pivot", () => {
    const tankX = 200;
    const tankY = 400;

    // Aiming straight right (0 rad)
    const right = getMuzzlePosition(tankX, tankY, 0, 0, TURRET_Y_OFFSET, BARREL_LENGTH);
    expect(right.x).toBeCloseTo(tankX + BARREL_LENGTH);
    expect(right.y).toBeCloseTo(tankY + TURRET_Y_OFFSET);

    // Aiming straight up (-π/2 rad)
    const up = getMuzzlePosition(tankX, tankY, -Math.PI / 2, 0, TURRET_Y_OFFSET, BARREL_LENGTH);
    expect(up.x).toBeCloseTo(tankX);
    expect(up.y).toBeCloseTo(tankY + TURRET_Y_OFFSET - BARREL_LENGTH);

    // Aiming straight left (-π rad)
    const left = getMuzzlePosition(tankX, tankY, -Math.PI, 0, TURRET_Y_OFFSET, BARREL_LENGTH);
    expect(left.x).toBeCloseTo(tankX - BARREL_LENGTH);
    expect(left.y).toBeCloseTo(tankY + TURRET_Y_OFFSET);

    // Rotated tank on slope (bodyAngle = 45 deg = π/4)
    const slopeAngle = Math.PI / 4;
    const rotatedMuzzle = getMuzzlePosition(
      tankX,
      tankY,
      -Math.PI / 2,
      slopeAngle,
      TURRET_Y_OFFSET,
      BARREL_LENGTH,
    );
    const expectedPivotX = tankX - TURRET_Y_OFFSET * Math.sin(slopeAngle);
    const expectedPivotY = tankY + TURRET_Y_OFFSET * Math.cos(slopeAngle);
    expect(rotatedMuzzle.x).toBeCloseTo(expectedPivotX);
    expect(rotatedMuzzle.y).toBeCloseTo(expectedPivotY - BARREL_LENGTH);
  });
});

describe("LocalSimulation angle range enforcement", () => {
  it("should prevent aim angles outside 0-180 degrees range", () => {
    const world = new LocalWorld({
      mode: "localTwoPlayer",
      phase: "thinking",
      activePlayerId: 0,
      playerCount: 2,
      turnNumber: 1,
      turnTimeRemaining: 30,
      matchTimeRemaining: 180,
      wind: 0,
      winnerPlayerId: null,
      biome: "forest",
      isCameraLocked: true,
      cameraX: 0,
    });

    const terrain = new LocalTerrainModel(1280, 720);
    const tankId = world.createTank(
      { id: 0, displayName: "P1", controllerKind: "human", tankSelection: { tankDefinitionId: "heavy-armor" } },
      testGameContent.tanks["heavy-armor"]!,
      200,
      400,
    );

    const sim = new LocalSimulation(world, terrain, testGameContent);

    // Aiming into ground on right side (+0.5 rad)
    sim.submitPlayerAction(0, { type: "aim", angle: 0.5, power: 300 });
    expect(world.tanks.get(tankId)!.aimAngle).toBe(0);

    // Aiming past 180 deg (-1.5 * π rad)
    sim.submitPlayerAction(0, { type: "aim", angle: -1.5 * Math.PI, power: 300 });
    expect(world.tanks.get(tankId)!.aimAngle).toBe(-Math.PI);

    // Aiming with elevation degrees (135 degrees)
    sim.submitPlayerAction(0, { type: "aim", angle: 135, power: 300 });
    expect(world.tanks.get(tankId)!.aimAngle).toBeCloseTo((-135 * Math.PI) / 180);
  });
});

describe("simulateTrajectoryPreview", () => {
  it("should calculate trajectory points starting at muzzle and moving according to aim angle", () => {
    const mockState: Partial<GameState> = {
      match: {
        mode: "online",
        phase: "thinking",
        activePlayerId: 1,
        wind: 0,
        playerCount: 2,
        turnNumber: 1,
        turnTimeRemaining: 30,
        matchTimeRemaining: 180,
        winnerPlayerId: null,
        biome: "forest",
        isCameraLocked: true,
        cameraX: 0,
      },
      terrain: { kind: "heightmap", width: 2400, height: 720, surface: new Array(2400).fill(600) },
      projectileDefinitions: {
        basicShell: {
          id: "basicShell",
          name: "Basic Shell",
          label: "BS",
          baseVelocity: 1.0,
          gravityScale: 1,
          drag: 0,
          radius: 4,
          terrainRadius: 20,
          terrainDepth: 10,
          damageRadius: 30,
          damage: 50,
          terrainEffectType: "CRATER",
          damageEffectType: "RADIAL",
        },
      },
      tanks: [
        {
          entityId: 1,
          playerId: 1,
          displayName: "P1",
          controllerKind: "human",
          tankDefinitionId: "vanguard-cyber",
          tankName: "Vanguard Cyber",
          alive: true,
          position: { x: 500, y: 400 },
          facing: -1,
          bodyAngle: 0,
          aimAngle: -Math.PI / 4, // aiming UP-RIGHT (-45 deg)
          power: 300,
          selectedProjectileSlotId: "basicShell",
          loadout: ["basicShell"],
          weaponAmmo: { basicShell: -1 },
          maxHealth: 100,
          health: 100,
          maxFuel: 200,
          fuel: 200,
          width: 24,
          height: 24,
          visual: { fill: "#000", stroke: "#000", accent: "#000", label: "T" },
        },
      ],
      projectiles: [],
      impactEvents: [],
      particles: [],
      floatingTexts: [],
      clouds: [],
      decors: [],
    };

    const points = simulateTrajectoryPreview(mockState as GameState, 1, 10);
    expect(points.length).toBeGreaterThan(1);

    // Trajectory must start at muzzle position
    const muzzle = getMuzzlePosition(500, 400, -Math.PI / 4, 0, TURRET_Y_OFFSET, BARREL_LENGTH);
    expect(points[0].x).toBeCloseTo(muzzle.x);
    expect(points[0].y).toBeCloseTo(muzzle.y);

    // When aiming UP-RIGHT (-45 deg), x coordinate must INCREASE
    expect(points[1].x).toBeGreaterThan(points[0].x);
    // y coordinate must DECREASE (upward)
    expect(points[1].y).toBeLessThan(points[0].y);
  });
});


