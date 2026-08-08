// @ts-nocheck
import { describe, it, expect, beforeEach } from "vitest";
import {
  ClientVisualSimulation,
  type ActiveProjectileFlight,
} from "../../../../src/game/simulation/ClientVisualSimulation";
import type { LootCrate } from "../../../../src/game/types";

describe("ClientVisualSimulation", () => {
  let simulation: ClientVisualSimulation;

  beforeEach(() => {
    simulation = new ClientVisualSimulation(0, 2400);
  });

  describe("Camera Tracking & Viewport Controls", () => {
    it("should start with default camera state locked", () => {
      const state = simulation.getState();
      expect(state.cameraX).toBe(0);
      expect(state.isCameraLocked).toBe(true);
    });

    it("should unlock camera and adjust offset when panCamera is called", () => {
      simulation.panCamera(100, 960, 2400);
      const state = simulation.getState();
      expect(state.isCameraLocked).toBe(false);
      expect(state.cameraX).toBe(100);
    });

    it("should clamp camera position within terrain bounds during panning", () => {
      simulation.panCamera(-50, 960, 2400);
      expect(simulation.getState().cameraX).toBe(0);

      simulation.panCamera(3000, 960, 2400);
      expect(simulation.getState().cameraX).toBe(1440); // 2400 - 960
    });

    it("should relock camera when relockCamera is called", () => {
      simulation.panCamera(100, 960, 2400);
      expect(simulation.getState().isCameraLocked).toBe(false);

      simulation.relockCamera();
      expect(simulation.getState().isCameraLocked).toBe(true);
    });

    it("should smoothly interpolate camera position towards focus target when locked", () => {
      const targetFocusX = 1000;
      // Target camera X should be 1000 - 960 * 0.5 = 520
      simulation.updateCamera(0.1, targetFocusX, 960, 2400);
      const state = simulation.getState();
      expect(state.cameraX).toBeGreaterThan(0);
      expect(state.cameraX).toBeLessThanOrEqual(520);
    });
  });

  describe("Supply Crate Visual Descent", () => {
    it("should descend landing crates over time", () => {
      const crate: LootCrate = {
        crateId: "crate-1",
        crateType: "hp",
        x: 500,
        y: 0,
        targetY: 300,
        isLanding: true,
        collected: false,
        value: 35,
      };

      simulation.updateLootCrates(0.5, [crate]);
      // Speed is 150 * 0.5 = 75
      expect(crate.y).toBe(75);
      expect(crate.isLanding).toBe(true);
    });

    it("should clamp crate y position to targetY - 14 and clear isLanding when reached", () => {
      const crate: LootCrate = {
        crateId: "crate-1",
        crateType: "hp",
        x: 500,
        y: 280,
        targetY: 300,
        isLanding: true,
        collected: false,
        value: 35,
      };

      simulation.updateLootCrates(0.5, [crate]);
      // targetY - 14 = 286
      expect(crate.y).toBe(286);
      expect(crate.isLanding).toBe(false);
    });
  });

  describe("Projectile Trajectory Flight Animation", () => {
    it("should interpolate projectile flight along trajectory points", () => {
      const flight: ActiveProjectileFlight = {
        projectileEntityId: 1,
        ownerPlayerId: 0,
        projectileDefinitionId: "basicShell",
        trajectory: [
          { x: 0, y: 0 },
          { x: 100, y: -50 },
          { x: 200, y: 0 },
        ],
        durationSeconds: 1.0,
        elapsedSeconds: 0,
      };

      simulation.startTrajectoryFlight(flight);
      expect(simulation.getState().activeFlight).not.toBeNull();

      // Midway (t = 0.5)
      const sampled = simulation.updateProjectileFlight(0.5);
      expect(sampled).not.toBeNull();
      expect(sampled!.position.x).toBe(100);
      expect(sampled!.position.y).toBe(-50);
    });

    it("should complete active flight when duration expires", () => {
      const flight: ActiveProjectileFlight = {
        projectileEntityId: 1,
        ownerPlayerId: 0,
        projectileDefinitionId: "basicShell",
        trajectory: [
          { x: 0, y: 0 },
          { x: 200, y: 0 },
        ],
        durationSeconds: 0.5,
        elapsedSeconds: 0,
      };

      simulation.startTrajectoryFlight(flight);
      simulation.updateProjectileFlight(0.6);
      expect(simulation.getState().activeFlight).toBeNull();
    });
  });

  describe("Cosmetic Effects Engine", () => {
    it("should spawn particles and update them over time", () => {
      simulation.spawnExplosionParticles(100, 100, ["#ff0000"]);
      expect(simulation.getState().particles.length).toBeGreaterThan(0);

      simulation.updateEffects(0.5, 2400);
      const particles = simulation.getState().particles;
      for (const p of particles) {
        expect(p.life).toBeLessThan(1.0);
      }
    });

    it("should spawn floating texts and remove them after lifespan expires", () => {
      simulation.spawnFloatingText("-35 HP", "#ef4444", 100, 100);
      expect(simulation.getState().floatingTexts.length).toBe(1);

      simulation.updateEffects(1.1, 2400);
      expect(simulation.getState().floatingTexts.length).toBe(0);
    });

    it("should drift parallax clouds horizontally", () => {
      const initialClouds = simulation.getState().clouds;
      expect(initialClouds.length).toBeGreaterThan(0);
      const initialX = initialClouds[0]!.x;

      simulation.updateEffects(1.0, 2400);
      expect(simulation.getState().clouds[0]!.x).toBeGreaterThan(initialX);
    });
  });
});
