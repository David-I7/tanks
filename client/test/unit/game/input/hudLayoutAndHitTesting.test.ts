// @ts-nocheck
import { describe, it, expect } from "vitest";
import {
  getDualHeaderHealthLayout,
  getCentralTelemetryLayout,
  getCompactWeaponSelectorLayout,
  getFireButtonLayout,
  getExpandedWeaponDrawerLayout,
  getFuelGaugeLayout,
  getVirtualTouchControlsLayout,
  isCompactWeaponSlotClickedAtCanvasPoint,
  findExpandedDrawerSlotAtCanvasPoint,
  findProjectileSlotAtCanvasPoint,
  isFireButtonClickedAtCanvasPoint,
  getVirtualMovementIntentAtCanvasPoint,
} from "../../../../src/game/input/inputHelpers";
import { collectGameActions } from "../../../../src/game/input/CanvasInputSource";

describe("HUD Layout & Hit-Testing Helpers", () => {
  const mockTank = {
    playerId: 0,
    alive: true,
    position: { x: 200, y: 400 },
    aimAngle: -Math.PI / 4,
    power: 360,
    bodyAngle: 0,
    loadout: ["basicShell", "titanShell", "clusterBomb", "drillShell", "nukeShell"],
    selectedProjectileSlotId: "basicShell",
    weaponAmmo: {
      basicShell: -1,
      titanShell: 3,
      clusterBomb: 2,
      drillShell: 2,
      nukeShell: 1,
    },
  };

  const mockGameState = {
    match: {
      phase: "thinking",
      activePlayerId: 0,
      isCameraLocked: true,
    },
    tanks: [mockTank],
    projectileDefinitions: {
      basicShell: { label: "Basic" },
      titanShell: { label: "Titan" },
      clusterBomb: { label: "Cluster" },
      drillShell: { label: "Drill" },
      nukeShell: { label: "Nuke" },
    },
  };

  describe("Dual Header Health Bar Layout", () => {
    it("computes symmetric centered health bar layout on desktop (1280px)", () => {
      const layout = getDualHeaderHealthLayout(1280);
      expect(layout.width).toBeLessThanOrEqual(680);
      expect(layout.p1.x).toBe(layout.x);
      expect(layout.p1.width).toBe(layout.p2.width);
      expect(layout.vs.x + layout.vs.width / 2).toBeCloseTo(640, 0);
    });

    it("computes auto-scaling health bar layout on mobile (375px)", () => {
      const layout = getDualHeaderHealthLayout(375);
      expect(layout.width).toBeLessThanOrEqual(375);
      expect(layout.vs.x + layout.vs.width / 2).toBe(Math.floor(375 / 2));
    });
  });

  describe("Central Telemetry Layout", () => {
    it("centers the telemetry capsule below the VS badge", () => {
      const layout = getCentralTelemetryLayout(1280);
      expect(layout.x + layout.width / 2).toBe(640);
      expect(layout.y).toBe(52);
    });
  });

  describe("Compact Weapon Selector & FIRE Button Layout", () => {
    it("centers compact weapon slot and FIRE button on desktop (>= 768px)", () => {
      const weaponLayout = getCompactWeaponSelectorLayout(1280, 720);
      const fireLayout = getFireButtonLayout(1280, 720);

      expect(weaponLayout.isMobile).toBe(false);
      expect(fireLayout.isMobile).toBe(false);
      expect(fireLayout.x).toBe(weaponLayout.x + weaponLayout.width + 12);
      expect(fireLayout.y).toBe(weaponLayout.y);
    });

    it("aligns compact weapon slot and FIRE button to bottom-right on mobile (< 768px)", () => {
      const weaponLayout = getCompactWeaponSelectorLayout(400, 800);
      const fireLayout = getFireButtonLayout(400, 800);

      expect(weaponLayout.isMobile).toBe(true);
      expect(fireLayout.isMobile).toBe(true);
      expect(fireLayout.x + fireLayout.width).toBeLessThanOrEqual(400);
    });
  });

  describe("Expanded Weapon Drawer Layout & Hit Testing", () => {
    it("computes vertical stack layout positioned above compact slot", () => {
      const drawerLayout = getExpandedWeaponDrawerLayout(1280, 720, 5);
      expect(drawerLayout.items.length).toBe(5);
      expect(drawerLayout.y + drawerLayout.height).toBeLessThan(720 - 56 - 10);
    });

    it("detects clicks on drawer slots when drawer is open", () => {
      const drawerLayout = getExpandedWeaponDrawerLayout(1280, 720, 5);
      const thirdItem = drawerLayout.items[2];

      const hitSlotId = findExpandedDrawerSlotAtCanvasPoint(
        mockGameState,
        1280,
        720,
        thirdItem.x + 10,
        thirdItem.y + 10,
        mockTank,
        true,
      );

      expect(hitSlotId).toBe("clusterBomb");
    });

    it("returns null when clicking drawer items if drawer is closed", () => {
      const drawerLayout = getExpandedWeaponDrawerLayout(1280, 720, 5);
      const thirdItem = drawerLayout.items[2];

      const hitSlotId = findExpandedDrawerSlotAtCanvasPoint(
        mockGameState,
        1280,
        720,
        thirdItem.x + 10,
        thirdItem.y + 10,
        mockTank,
        false,
      );

      expect(hitSlotId).toBeNull();
    });
  });

  describe("Compact Slot & FIRE Button Hit Testing", () => {
    it("detects click on compact weapon slot", () => {
      const layout = getCompactWeaponSelectorLayout(1280, 720);
      const isClicked = isCompactWeaponSlotClickedAtCanvasPoint(
        mockGameState,
        1280,
        720,
        layout.x + 10,
        layout.y + 10,
        mockTank,
      );
      expect(isClicked).toBe(true);
    });

    it("does not emit selectProjectileSlot when clicking compact weapon slot so drawer stays open", () => {
      const layout = getCompactWeaponSelectorLayout(1280, 720);
      const actions = collectGameActions({
        state: {
          pressedKeys: new Set(),
          pointer: { clientX: layout.x + 10, clientY: layout.y + 10 },
          pendingPointerDown: { clientX: layout.x + 10, clientY: layout.y + 10 },
          pendingSlotNumber: null,
          pendingSpaceKey: false,
          pendingPanDelta: 0,
          isPointerDown: true,
          isWeaponDrawerOpen: false,
          virtualMoveDirection: null,
          virtualAim: null,
        },
        context: {
          gameState: mockGameState,
          cameraX: 0,
          gameViewport: { width: 1280, height: 720, scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 },
          domCanvasRect: { left: 0, top: 0, width: 1280, height: 720 },
        },
      });

      const hasSelectSlot = actions.some((a) => a.type === "selectProjectileSlot");
      expect(hasSelectSlot).toBe(false);
    });

    it("emits selectProjectileSlot when clicking an item in an open drawer", () => {
      const drawerLayout = getExpandedWeaponDrawerLayout(1280, 720, 5);
      const secondItem = drawerLayout.items[1];

      const actions = collectGameActions({
        state: {
          pressedKeys: new Set(),
          pointer: { clientX: secondItem.x + 10, clientY: secondItem.y + 10 },
          pendingPointerDown: { clientX: secondItem.x + 10, clientY: secondItem.y + 10 },
          pendingSlotNumber: null,
          pendingSpaceKey: false,
          pendingPanDelta: 0,
          isPointerDown: true,
          isWeaponDrawerOpen: true,
          virtualMoveDirection: null,
          virtualAim: null,
        },
        context: {
          gameState: mockGameState,
          cameraX: 0,
          gameViewport: { width: 1280, height: 720, scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 },
          domCanvasRect: { left: 0, top: 0, width: 1280, height: 720 },
        },
      });

      const selectAction = actions.find((a) => a.type === "selectProjectileSlot");
      expect(selectAction).toBeDefined();
      expect(selectAction?.projectileSlotId).toBe("titanShell");
    });

    it("detects click on compact FIRE button", () => {
      const fireLayout = getFireButtonLayout(1280, 720);
      const isClicked = isFireButtonClickedAtCanvasPoint(
        mockGameState,
        1280,
        720,
        fireLayout.x + 10,
        fireLayout.y + 10,
        mockTank,
      );
      expect(isClicked).toBe(true);
    });
  });

  describe("Fuel Gauge Layout", () => {
    it("positions fuel pill on bottom-left for desktop", () => {
      const layout = getFuelGaugeLayout(1280, 720);
      expect(layout.isMobile).toBe(false);
      expect(layout.x).toBe(24);
      expect(layout.y).toBe(720 - 56);
    });

    it("positions fuel pill above virtual D-pad on mobile", () => {
      const layout = getFuelGaugeLayout(400, 800);
      expect(layout.isMobile).toBe(true);
      expect(layout.x).toBe(18);
      expect(layout.y).toBe(800 - 150);
    });
  });

  describe("Virtual Touch Controls (D-pad)", () => {
    it("detects left and right movement intents on virtual D-pad", () => {
      const touchLayout = getVirtualTouchControlsLayout(400, 800);
      const dpad = touchLayout.dpad;

      const leftIntent = getVirtualMovementIntentAtCanvasPoint(
        400,
        800,
        dpad.centerX - 20,
        dpad.centerY,
      );
      expect(leftIntent).toBe(-1);

      const rightIntent = getVirtualMovementIntentAtCanvasPoint(
        400,
        800,
        dpad.centerX + 20,
        dpad.centerY,
      );
      expect(rightIntent).toBe(1);

      const outsideIntent = getVirtualMovementIntentAtCanvasPoint(
        400,
        800,
        dpad.centerX + 100,
        dpad.centerY,
      );
      expect(outsideIntent).toBeNull();
    });

    it("generates continuous movement actions when keys (KeyA, KeyD, arrows) or virtual move direction are held", () => {
      const actionsKeyA = collectGameActions({
        state: {
          pressedKeys: new Set(["KeyA"]),
          pointer: { clientX: 0, clientY: 0 },
          pendingPointerDown: null,
          pendingSlotNumber: null,
          pendingSpaceKey: false,
          pendingPanDelta: 0,
          isPointerDown: false,
          isWeaponDrawerOpen: false,
          virtualMoveDirection: null,
          virtualAim: null,
        },
        context: {
          gameState: mockGameState,
          cameraX: 0,
          gameViewport: { width: 800, height: 600 },
          domCanvasRect: { left: 0, top: 0, width: 800, height: 600 },
        },
      });
      expect(actionsKeyA).toEqual([{ type: "move", direction: -1 }]);

      const actionsKeyD = collectGameActions({
        state: {
          pressedKeys: new Set(["KeyD"]),
          pointer: { clientX: 0, clientY: 0 },
          pendingPointerDown: null,
          pendingSlotNumber: null,
          pendingSpaceKey: false,
          pendingPanDelta: 0,
          isPointerDown: false,
          isWeaponDrawerOpen: false,
          virtualMoveDirection: null,
          virtualAim: null,
        },
        context: {
          gameState: mockGameState,
          cameraX: 0,
          gameViewport: { width: 800, height: 600 },
          domCanvasRect: { left: 0, top: 0, width: 800, height: 600 },
        },
      });
      expect(actionsKeyD).toEqual([{ type: "move", direction: 1 }]);

      const touchLayout = getVirtualTouchControlsLayout(800, 600);
      const actionsVirtualMove = collectGameActions({
        state: {
          pressedKeys: new Set(),
          pointer: { clientX: touchLayout.dpad.centerX + 20, clientY: touchLayout.dpad.centerY },
          pendingPointerDown: null,
          pendingSlotNumber: null,
          pendingSpaceKey: false,
          pendingPanDelta: 0,
          isPointerDown: true,
          isWeaponDrawerOpen: false,
          virtualMoveDirection: 1,
          virtualAim: null,
        },
        context: {
          gameState: mockGameState,
          cameraX: 0,
          gameViewport: { width: 800, height: 600 },
          domCanvasRect: { left: 0, top: 0, width: 800, height: 600 },
        },
      });
      expect(actionsVirtualMove).toEqual([{ type: "move", direction: 1 }]);
    });
  });
});
