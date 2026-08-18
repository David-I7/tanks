// @ts-nocheck
import { describe, it, expect } from "vitest";
import { isFireButtonClickedAtCanvasPoint, getProjectileSelectorLayout } from "../../../../src/game/input/inputHelpers";
import { collectGameActions } from "../../../../src/game/input/CanvasInputSource";

describe("FIRE button click interaction", () => {
  const mockGameState = {
    match: {
      phase: "thinking",
      activePlayerId: 0,
      isCameraLocked: true,
    },
    tanks: [
      {
        playerId: 0,
        alive: true,
        position: { x: 200, y: 400 },
        aimAngle: -Math.PI / 4,
        power: 360,
        loadout: ["basicShell", "titanShell"],
        selectedProjectileSlotId: "basicShell",
        weaponAmmo: { basicShell: -1, titanShell: 1 },
      },
    ],
  };

  const canvasWidth = 1280;
  const canvasHeight = 720;

  it("should correctly detect click on the FIRE button", () => {
    const layout = getProjectileSelectorLayout(canvasWidth, canvasHeight, 2);
    const totalWidth = 2 * layout.slotSize + layout.gap;
    const fireX = layout.x + totalWidth + 12;
    const fireY = layout.y;

    const hit = isFireButtonClickedAtCanvasPoint(
      mockGameState,
      canvasWidth,
      canvasHeight,
      fireX + 10,
      fireY + 10,
      mockGameState.tanks[0],
    );

    expect(hit).toBe(true);
  });

  it("should produce a fire action when pointer clicks the FIRE button", () => {
    const layout = getProjectileSelectorLayout(canvasWidth, canvasHeight, 2);
    const totalWidth = 2 * layout.slotSize + layout.gap;
    const fireX = layout.x + totalWidth + 12;
    const fireY = layout.y;

    const actions = collectGameActions({
      state: {
        pressedKeys: new Set(),
        pointer: { clientX: fireX + 10, clientY: fireY + 10 },
        pendingPointerDown: { clientX: fireX + 10, clientY: fireY + 10 },
        pendingSlotNumber: null,
        pendingSpaceKey: false,
        pendingPanDelta: 0,
        isPointerDown: true,
      },
      context: {
        gameState: mockGameState,
        cameraX: 0,
        gameViewport: { width: canvasWidth, height: canvasHeight },
        domCanvasRect: { left: 0, top: 0, width: canvasWidth, height: canvasHeight },
      },
    });

    console.log("Actions generated:", actions);
    const fireAction = actions.find((a) => a.type === "fire");
    expect(fireAction).toBeDefined();
    expect(fireAction?.type).toBe("fire");
  });
});
