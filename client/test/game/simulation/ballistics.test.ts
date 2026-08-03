// @ts-nocheck
import { describe, it, expect } from "vitest";
import { clampAimAngle } from "../../../src/game/simulation/ballistics";
import { LocalWorld } from "../../../src/game/world/LocalWorld";
import { LocalTerrainModel } from "../../../src/game/simulation/LocalTerrainModel";
import { localGameContent } from "../../../src/game/rendering/ResourceManager";
import { LocalSimulation } from "../../../src/game/simulation/LocalSimulation";

describe("clampAimAngle", () => {
  it("should preserve valid radian angles in upper semicircle [-\u03c0, 0]", () => {
    expect(clampAimAngle(0)).toBe(0);
    expect(clampAimAngle(-Math.PI / 4)).toBe(-Math.PI / 4);
    expect(clampAimAngle(-Math.PI / 2)).toBe(-Math.PI / 2);
    expect(clampAimAngle(-Math.PI)).toBe(-Math.PI);
  });

  it("should clamp radian angles pointing into the ground (> 0)", () => {
    // Pointing down-right -> clamps to 0
    expect(clampAimAngle(Math.PI / 6)).toBe(0);
    // Pointing down-left -> clamps to -\u03c0
    expect(clampAimAngle((3 * Math.PI) / 4)).toBe(-Math.PI);
  });

  it("should clamp radian angles beyond 180 degrees left (< -\u03c0)", () => {
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
      localGameContent.tanks["heavy-armor"]!,
      200,
      400,
    );

    const sim = new LocalSimulation(world, terrain, localGameContent);

    // Aiming into ground on right side (+0.5 rad)
    sim.submitPlayerAction(0, { type: "aim", angle: 0.5, power: 300 });
    expect(world.tanks.get(tankId)!.aimAngle).toBe(0);

    // Aiming past 180 deg (-1.5 * \u03c0 rad)
    sim.submitPlayerAction(0, { type: "aim", angle: -1.5 * Math.PI, power: 300 });
    expect(world.tanks.get(tankId)!.aimAngle).toBe(-Math.PI);

    // Aiming with elevation degrees (135 degrees)
    sim.submitPlayerAction(0, { type: "aim", angle: 135, power: 300 });
    expect(world.tanks.get(tankId)!.aimAngle).toBeCloseTo((-135 * Math.PI) / 180);
  });
});
