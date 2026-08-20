import { describe, it, expect } from "vitest";
import { calculateAimIntent } from "../../../../src/game/input/inputHelpers";
import { TURRET_Y_OFFSET } from "../../../../src/game/simulation/ballistics";
import type { GameState } from "../../../../src/game/types";

describe("calculateAimIntent", () => {
  const mockGameState: Partial<GameState> = {
    match: {
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
    },
    tanks: [
      {
        entityId: 1,
        playerId: 0,
        displayName: "P1",
        controllerKind: "human",
        tankDefinitionId: "ignis",
        tankName: "Ignis",
        alive: true,
        position: { x: 200, y: 400 },
        facing: 1,
        bodyAngle: 0,
        aimAngle: -Math.PI / 4,
        power: 360,
        selectedProjectileSlotId: "standardKaboom",
        loadout: ["standardKaboom"],
        weaponAmmo: { standardKaboom: -1 },
        maxHealth: 100,
        health: 100,
        maxFuel: 200,
        fuel: 200,
        width: 24,
        height: 24,
        visual: { fill: "#000", stroke: "#000", accent: "#000", label: "T" },
      },
    ],
  };

  const canvasWidth = 1280;
  const canvasHeight = 720;
  const domCanvasRect = { left: 0, top: 0, width: canvasWidth, height: canvasHeight };
  const gameViewport = { width: canvasWidth, height: canvasHeight };

  it("calculates exact aim angle from tank turret to target point", () => {
    const originX = 200;
    const originY = 400 + TURRET_Y_OFFSET; // 386

    // Target is directly to the right
    const targetRight = calculateAimIntent({
      clientX: originX + 100,
      clientY: originY,
      domCanvasRect,
      gameViewport,
      cameraX: 0,
      gameState: mockGameState as GameState,
      activeTank: mockGameState.tanks![0] as GameState["tanks"][number],
    });

    expect(targetRight).toBeDefined();
    expect(targetRight?.angle).toBe(0);

    // Target is up and to the right at 45 degrees
    const targetUpRight = calculateAimIntent({
      clientX: originX + 100,
      clientY: originY - 100,
      domCanvasRect,
      gameViewport,
      cameraX: 0,
      gameState: mockGameState as GameState,
      activeTank: mockGameState.tanks![0] as GameState["tanks"][number],
    });

    expect(targetUpRight).toBeDefined();
    expect(targetUpRight?.angle).toBeCloseTo(-Math.PI / 4);

    // Target is straight up
    const targetUp = calculateAimIntent({
      clientX: originX,
      clientY: originY - 100,
      domCanvasRect,
      gameViewport,
      cameraX: 0,
      gameState: mockGameState as GameState,
      activeTank: mockGameState.tanks![0] as GameState["tanks"][number],
    });

    expect(targetUp).toBeDefined();
    expect(targetUp?.angle).toBeCloseTo(-Math.PI / 2);
  });

  it("clamps aim angle to horizontal right when aiming down-right into the ground", () => {
    const originX = 200;
    const originY = 400 + TURRET_Y_OFFSET;

    const targetDownRight = calculateAimIntent({
      clientX: originX + 100,
      clientY: originY + 100,
      domCanvasRect,
      gameViewport,
      cameraX: 0,
      gameState: mockGameState as GameState,
      activeTank: mockGameState.tanks![0] as GameState["tanks"][number],
    });

    expect(targetDownRight).toBeDefined();
    expect(targetDownRight?.angle).toBe(0);
  });

  it("clamps power within allowed bounds [120, 680]", () => {
    const originX = 200;
    const originY = 400 + TURRET_Y_OFFSET;

    // Very close point
    const minIntent = calculateAimIntent({
      clientX: originX + 10,
      clientY: originY - 10,
      domCanvasRect,
      gameViewport,
      cameraX: 0,
      gameState: mockGameState as GameState,
      activeTank: mockGameState.tanks![0] as GameState["tanks"][number],
    });
    expect(minIntent?.power).toBe(120);

    // Far point
    const maxIntent = calculateAimIntent({
      clientX: originX + 1000,
      clientY: originY - 1000,
      domCanvasRect,
      gameViewport,
      cameraX: 0,
      gameState: mockGameState as GameState,
      activeTank: mockGameState.tanks![0] as GameState["tanks"][number],
    });
    expect(maxIntent?.power).toBe(680);
  });

  it("calculates aim angle relative to sloped tank bodyAngle", () => {
    const slopeAngle = Math.PI / 6; // 30 degrees tilt
    const slopedTank: GameState["tanks"][number] = {
      ...(mockGameState.tanks![0] as GameState["tanks"][number]),
      bodyAngle: slopeAngle,
    };

    const originX = slopedTank.position.x - TURRET_Y_OFFSET * Math.sin(slopeAngle);
    const originY = slopedTank.position.y + TURRET_Y_OFFSET * Math.cos(slopeAngle);

    // Aim perpendicular to sloped hull (world angle = slopeAngle - PI/2 = -PI/3 = -60 deg)
    const aimPerpendicular = calculateAimIntent({
      clientX: originX + 100 * Math.cos(slopeAngle - Math.PI / 2),
      clientY: originY + 100 * Math.sin(slopeAngle - Math.PI / 2),
      domCanvasRect,
      gameViewport,
      cameraX: 0,
      gameState: mockGameState as GameState,
      activeTank: slopedTank,
    });

    expect(aimPerpendicular).toBeDefined();
    // Relative angle to tank hull is straight up (-PI/2 = -90 deg)
    expect(aimPerpendicular?.angle).toBeCloseTo(-Math.PI / 2);

    // Aim along forward sloped deck (world angle = slopeAngle = 30 deg)
    const aimAlongDeck = calculateAimIntent({
      clientX: originX + 100 * Math.cos(slopeAngle),
      clientY: originY + 100 * Math.sin(slopeAngle),
      domCanvasRect,
      gameViewport,
      cameraX: 0,
      gameState: mockGameState as GameState,
      activeTank: slopedTank,
    });

    expect(aimAlongDeck).toBeDefined();
    // Relative angle to tank hull is 0 (deck forward)
    expect(aimAlongDeck?.angle).toBeCloseTo(0);
  });
});
