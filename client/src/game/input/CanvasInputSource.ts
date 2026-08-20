import type { GameAction, GameState } from "../types";
import {
  calculateAimIntent,
  findExpandedDrawerSlotAtCanvasPoint,
  isCompactWeaponSlotClickedAtCanvasPoint,
  isFireButtonClickedAtCanvasPoint,
  isRelockCameraButtonClickedAtCanvasPoint,
  getVirtualMovementIntentAtCanvasPoint,
  getExpandedWeaponDrawerLayout,
  getCompactWeaponSelectorLayout,
} from "./inputHelpers";
import type { DomCanvasRect, GameViewport } from "../world/worldSizing";
import { domPointToGameViewportPoint } from "../world/worldSizing";

export type CanvasInteractionState = {
  pressedKeys: ReadonlySet<string>;
  pendingPointerDown: { clientX: number; clientY: number } | null;
  pendingSlotNumber: number | null;
  pendingSpaceKey: boolean;
  pendingPanDelta: number;
  isPointerDown: boolean;
  pointer: { clientX: number; clientY: number };
  isWeaponDrawerOpen: boolean;
  virtualMoveDirection: -1 | 1 | null;
  virtualAim: Extract<GameAction, { type: "aim" }> | null;
};

export type CanvasHoverTarget =
  | { type: "slot"; slotId: string }
  | { type: "drawerSlot"; slotId: string }
  | { type: "weaponSlot" }
  | { type: "fire" }
  | { type: "relockCamera" }
  | { type: "dpadLeft" }
  | { type: "dpadRight" }
  | null;

export type CanvasInteractionContext = {
  gameState: GameState;
  cameraX: number;
  gameViewport: GameViewport;
  domCanvasRect: DomCanvasRect;
};

export type CanvasInputLayout = {
  gameViewport: GameViewport;
  domCanvasRect: DomCanvasRect;
};

export type IntentProducer = (context: {
  state: CanvasInteractionState;
  context: CanvasInteractionContext;
}) => GameAction[];

export function collectGameActions(input: {
  state: CanvasInteractionState;
  context: CanvasInteractionContext;
}): GameAction[] {
  const producers: IntentProducer[] = defaultIntentProducers;
  const actions: GameAction[] = [];
  for (const producer of producers) {
    actions.push(...producer(input));
  }
  return actions;
}

const movementIntentProducer: IntentProducer = ({ state, context }) => {
  const activeTank = getActiveTank(context.gameState);
  if (!activeTank) return [];

  const left =
    state.pressedKeys.has("a") ||
    state.pressedKeys.has("A") ||
    state.pressedKeys.has("KeyA") ||
    state.pressedKeys.has("ArrowLeft");
  const right =
    state.pressedKeys.has("d") ||
    state.pressedKeys.has("D") ||
    state.pressedKeys.has("KeyD") ||
    state.pressedKeys.has("ArrowRight");

  if (left !== right) {
    return [{ type: "move", direction: left ? -1 : 1 }];
  }

  if (state.virtualMoveDirection === -1 || state.virtualMoveDirection === 1) {
    return [{ type: "move", direction: state.virtualMoveDirection }];
  }

  return [];
};

const keyboardProjectileSlotIntentProducer: IntentProducer = ({
  state,
  context,
}) => {
  const activeTank = getActiveTank(context.gameState);
  if (state.pendingSlotNumber === null || !activeTank) return [];
  const slotId = activeTank.loadout[state.pendingSlotNumber - 1];
  return slotId
    ? [{ type: "selectProjectileSlot", projectileSlotId: slotId }]
    : [];
};

const spacebarFireIntentProducer: IntentProducer = ({
  state,
  context,
}) => {
  if (!state.pendingSpaceKey) return [];

  const activeTank = getActiveTank(context.gameState);
  if (!activeTank) return [];

  const projectileSlotId =
    activeTank.selectedProjectileSlotId ?? activeTank.loadout[0];
  if (!projectileSlotId) return [];

  return [
    {
      type: "fire",
      angle: activeTank.aimAngle,
      power: activeTank.power,
      projectileSlotId,
    },
  ];
};

const pointerIntentProducer: IntentProducer = ({ state, context }) => {
  const intents: GameAction[] = [];

  const pointerDown = state.pendingPointerDown;
  const pointerPoint = pointerDown
    ? domPointToGameViewportPoint({
        clientX: pointerDown.clientX,
        clientY: pointerDown.clientY,
        domCanvasRect: context.domCanvasRect,
        gameViewport: context.gameViewport,
      })
    : null;

  if (pointerPoint) {
    if (
      isRelockCameraButtonClickedAtCanvasPoint(
        context.gameState,
        context.gameViewport.width,
        context.gameViewport.height,
        pointerPoint.x,
        pointerPoint.y,
      )
    ) {
      return [{ type: "relockCamera" }];
    }
  }

  const activeTank = getActiveTank(context.gameState);
  if (!activeTank) return intents;

  let clickedHud = false;

  if (pointerPoint) {
    // 1. Expanded drawer slot click
    if (state.isWeaponDrawerOpen) {
      const drawerSlotId = findExpandedDrawerSlotAtCanvasPoint(
        context.gameState,
        context.gameViewport.width,
        context.gameViewport.height,
        pointerPoint.x,
        pointerPoint.y,
        activeTank,
        state.isWeaponDrawerOpen,
      );
      if (drawerSlotId) {
        clickedHud = true;
        intents.push({
          type: "selectProjectileSlot",
          projectileSlotId: drawerSlotId,
        });
      }
    }

    // 2. Compact active weapon slot click
    if (
      !clickedHud &&
      isCompactWeaponSlotClickedAtCanvasPoint(
        context.gameState,
        context.gameViewport.width,
        context.gameViewport.height,
        pointerPoint.x,
        pointerPoint.y,
        activeTank,
      )
    ) {
      clickedHud = true;
    }

    // 3. FIRE button click
    if (
      !clickedHud &&
      isFireButtonClickedAtCanvasPoint(
        context.gameState,
        context.gameViewport.width,
        context.gameViewport.height,
        pointerPoint.x,
        pointerPoint.y,
        activeTank,
      )
    ) {
      clickedHud = true;
      const projectileSlotId =
        activeTank.selectedProjectileSlotId ?? activeTank.loadout[0];
      if (projectileSlotId) {
        intents.push({
          type: "fire",
          angle: activeTank.aimAngle,
          power: activeTank.power,
          projectileSlotId,
        });
      }
    }

    // 4. Virtual D-pad touch
    if (!clickedHud) {
      const dpadMove = getVirtualMovementIntentAtCanvasPoint(
        context.gameViewport.width,
        context.gameViewport.height,
        pointerPoint.x,
        pointerPoint.y,
      );
      if (dpadMove !== null) {
        clickedHud = true;
      }
    }
  }

  // Virtual aim from persistent touch
  if (state.virtualAim) {
    intents.push(state.virtualAim);
  }

  if (!clickedHud && !state.virtualAim) {
    const currentPointerPoint = domPointToGameViewportPoint({
      clientX: state.pointer.clientX,
      clientY: state.pointer.clientY,
      domCanvasRect: context.domCanvasRect,
      gameViewport: context.gameViewport,
    });

    const isPointerOverHud =
      isFireButtonClickedAtCanvasPoint(
        context.gameState,
        context.gameViewport.width,
        context.gameViewport.height,
        currentPointerPoint.x,
        currentPointerPoint.y,
        activeTank,
      ) ||
      isCompactWeaponSlotClickedAtCanvasPoint(
        context.gameState,
        context.gameViewport.width,
        context.gameViewport.height,
        currentPointerPoint.x,
        currentPointerPoint.y,
        activeTank,
      ) ||
      (state.isWeaponDrawerOpen &&
        findExpandedDrawerSlotAtCanvasPoint(
          context.gameState,
          context.gameViewport.width,
          context.gameViewport.height,
          currentPointerPoint.x,
          currentPointerPoint.y,
          activeTank,
          state.isWeaponDrawerOpen,
        ) !== null) ||
      isRelockCameraButtonClickedAtCanvasPoint(
        context.gameState,
        context.gameViewport.width,
        context.gameViewport.height,
        currentPointerPoint.x,
        currentPointerPoint.y,
      ) ||
      getVirtualMovementIntentAtCanvasPoint(
        context.gameViewport.width,
        context.gameViewport.height,
        currentPointerPoint.x,
        currentPointerPoint.y,
      ) !== null;

    const isDraggingToAim =
      state.isPointerDown && !state.pressedKeys.has("Shift") && !isPointerOverHud;

    if (isDraggingToAim) {
      const aim = calculateAimIntent({
        ...state.pointer,
        domCanvasRect: context.domCanvasRect,
        gameViewport: context.gameViewport,
        cameraX: context.cameraX,
        gameState: context.gameState,
        activeTank,
      });

      if (aim) {
        intents.push(aim);
      }
    }
  }

  return intents;
};

const cameraPanIntentProducer: IntentProducer = ({ state }) => {
  return state.pendingPanDelta && state.pendingPanDelta !== 0
    ? [{ type: "panCamera", deltaX: state.pendingPanDelta }]
    : [];
};

const defaultIntentProducers: IntentProducer[] = [
  movementIntentProducer,
  keyboardProjectileSlotIntentProducer,
  spacebarFireIntentProducer,
  pointerIntentProducer,
  cameraPanIntentProducer,
];

function getActiveTank(
  gameState: GameState,
): GameState["tanks"][number] | null {
  return (
    gameState.tanks.find(
      (entry) =>
        entry.playerId === gameState.match.activePlayerId &&
        entry.alive &&
        entry.controllerKind !== "remote",
    ) ?? null
  );
}

export class CanvasInputSource {
  private readonly pressedKeys = new Set<string>();
  private pendingPointerDown: { clientX: number; clientY: number } | null =
    null;
  private pendingSlotNumber: number | null = null;
  private pendingSpaceKey = false;
  private pendingPanDelta = 0;
  private isPointerDown = false;
  private lastPointerX = 0;
  private lastTouchX = 0;
  private pointer = { clientX: 0, clientY: 0 };
  private active = true;
  private layout: CanvasInputLayout;
  private isWeaponDrawerOpen = false;
  private virtualMoveDirection: -1 | 1 | null = null;
  private virtualAim: Extract<GameAction, { type: "aim" }> | null = null;

  private readonly onKeyDown = (event: KeyboardEvent) => {
    this.pressedKeys.add(event.key.toLowerCase());
    this.pressedKeys.add(event.key);
    this.pressedKeys.add(event.code);
    if (/^[1-5]$/.test(event.key)) {
      this.pendingSlotNumber = Number(event.key);
      this.isWeaponDrawerOpen = false;
    }
    if (event.key === " " || event.code === "Space") {
      event.preventDefault();
      this.pendingSpaceKey = true;
      this.isWeaponDrawerOpen = false;
    }
    if (event.key === "Escape") {
      this.isWeaponDrawerOpen = false;
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.pressedKeys.delete(event.key.toLowerCase());
    this.pressedKeys.delete(event.key.toUpperCase());
    this.pressedKeys.delete(event.key);
    this.pressedKeys.delete(event.code);
  };

  private readonly onWindowBlur = () => {
    this.pressedKeys.clear();
    this.isPointerDown = false;
    this.virtualMoveDirection = null;
    this.virtualAim = null;
    this.pendingPointerDown = null;
  };

  private checkActiveTouchDpad(touches: TouchList): -1 | 1 | null {
    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      if (!touch) continue;
      const vp = domPointToGameViewportPoint({
        clientX: touch.clientX,
        clientY: touch.clientY,
        domCanvasRect: this.layout.domCanvasRect,
        gameViewport: this.layout.gameViewport,
      });
      const dpadDir = getVirtualMovementIntentAtCanvasPoint(
        this.layout.gameViewport.width,
        this.layout.gameViewport.height,
        vp.x,
        vp.y,
      );
      if (dpadDir !== null) {
        return dpadDir;
      }
    }
    return null;
  }

  private readonly onPointerMove = (event: MouseEvent | PointerEvent) => {
    if (this.isPointerDown && event.shiftKey) {
      const dx = event.clientX - this.lastPointerX;
      this.pendingPanDelta -= dx;
    }
    this.lastPointerX = event.clientX;
    this.pointer = {
      clientX: event.clientX,
      clientY: event.clientY,
    };

    if (this.isPointerDown) {
      const vp = domPointToGameViewportPoint({
        clientX: event.clientX,
        clientY: event.clientY,
        domCanvasRect: this.layout.domCanvasRect,
        gameViewport: this.layout.gameViewport,
      });
      const dpadDir = getVirtualMovementIntentAtCanvasPoint(
        this.layout.gameViewport.width,
        this.layout.gameViewport.height,
        vp.x,
        vp.y,
      );
      this.virtualMoveDirection = dpadDir;
    }
  };

  private readonly onPointerDown = (event: PointerEvent) => {
    try {
      (event.currentTarget as HTMLElement)?.setPointerCapture?.(event.pointerId);
    } catch {
      // Ignore if not supported
    }
    this.isPointerDown = true;
    this.lastPointerX = event.clientX;
    this.pointer = {
      clientX: event.clientX,
      clientY: event.clientY,
    };
    this.pendingPointerDown = {
      clientX: event.clientX,
      clientY: event.clientY,
    };

    const vp = domPointToGameViewportPoint({
      clientX: event.clientX,
      clientY: event.clientY,
      domCanvasRect: this.layout.domCanvasRect,
      gameViewport: this.layout.gameViewport,
    });

    const dpadDir = getVirtualMovementIntentAtCanvasPoint(
      this.layout.gameViewport.width,
      this.layout.gameViewport.height,
      vp.x,
      vp.y,
    );
    if (dpadDir !== null) {
      this.virtualMoveDirection = dpadDir;
    }

    // Toggle drawer when clicking compact weapon slot
    const compactLayout = getCompactWeaponSelectorLayout(
      this.layout.gameViewport.width,
      this.layout.gameViewport.height,
    );
    const isOverCompactSlot =
      vp.x >= compactLayout.x - 6 &&
      vp.x <= compactLayout.x + compactLayout.size + 6 &&
      vp.y >= compactLayout.y - 6 &&
      vp.y <= compactLayout.y + compactLayout.size + 6;

    if (isOverCompactSlot) {
      this.isWeaponDrawerOpen = !this.isWeaponDrawerOpen;
    } else if (this.isWeaponDrawerOpen) {
      // Check if clicking inside drawer
      const drawerLayout = getExpandedWeaponDrawerLayout(
        this.layout.gameViewport.width,
        this.layout.gameViewport.height,
        5,
      );
      const isInsideDrawer =
        vp.x >= drawerLayout.x &&
        vp.x <= drawerLayout.x + drawerLayout.width &&
        vp.y >= drawerLayout.y &&
        vp.y <= drawerLayout.y + drawerLayout.height;

      if (!isInsideDrawer) {
        this.isWeaponDrawerOpen = false;
      }
    }
  };

  private readonly onPointerUp = () => {
    this.isPointerDown = false;
    this.virtualMoveDirection = null;
    this.virtualAim = null;
  };

  private readonly onPointerCancel = () => {
    this.isPointerDown = false;
    this.pendingPointerDown = null;
    this.virtualMoveDirection = null;
    this.virtualAim = null;
  };

  private readonly onWheel = (event: WheelEvent) => {
    event.preventDefault();
    if (event.shiftKey || Math.abs(event.deltaX) > 0 || Math.abs(event.deltaY) > 0) {
      this.pendingPanDelta += event.deltaX || event.deltaY;
    }
  };

  private readonly onTouchStart = (event: TouchEvent) => {
    this.virtualMoveDirection = this.checkActiveTouchDpad(event.touches);
    if (event.touches.length >= 2) {
      event.preventDefault();
      this.lastTouchX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
    } else if (event.touches.length === 1) {
      event.preventDefault();
      const touch = event.touches[0]!;
      this.isPointerDown = true;
      this.lastPointerX = touch.clientX;
      this.pointer = {
        clientX: touch.clientX,
        clientY: touch.clientY,
      };
      this.pendingPointerDown = {
        clientX: touch.clientX,
        clientY: touch.clientY,
      };
    }
  };

  private readonly onTouchMove = (event: TouchEvent) => {
    this.virtualMoveDirection = this.checkActiveTouchDpad(event.touches);
    if (event.touches.length >= 2) {
      event.preventDefault();
      const currentX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      if (this.lastTouchX !== 0) {
        const dx = currentX - this.lastTouchX;
        this.pendingPanDelta -= dx;
      }
      this.lastTouchX = currentX;
    } else if (event.touches.length === 1) {
      event.preventDefault();
      const touch = event.touches[0]!;
      this.lastPointerX = touch.clientX;
      this.pointer = {
        clientX: touch.clientX,
        clientY: touch.clientY,
      };
    }
  };

  private readonly onTouchEnd = (event: TouchEvent) => {
    this.virtualMoveDirection = this.checkActiveTouchDpad(event.touches);
    if (event.touches.length === 0) {
      this.isPointerDown = false;
      this.lastTouchX = 0;
      this.virtualMoveDirection = null;
      this.virtualAim = null;
    } else if (event.touches.length === 1) {
      this.lastTouchX = 0;
      const touch = event.touches[0]!;
      this.pointer = {
        clientX: touch.clientX,
        clientY: touch.clientY,
      };
    }
  };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    initialLayout: CanvasInputLayout,
  ) {
    this.layout = initialLayout;
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", this.onKeyDown);
      window.addEventListener("keyup", this.onKeyUp);
      window.addEventListener("blur", this.onWindowBlur);
      window.addEventListener("pointermove", this.onPointerMove);
      window.addEventListener("mousemove", this.onPointerMove);
      window.addEventListener("pointerup", this.onPointerUp);
      window.addEventListener("pointercancel", this.onPointerCancel);
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.onWindowBlur);
    }
    if (canvas) {
      canvas.addEventListener("pointerdown", this.onPointerDown);
      canvas.addEventListener("pointercancel", this.onPointerCancel);
      canvas.addEventListener("wheel", this.onWheel, { passive: false });
      canvas.addEventListener("touchstart", this.onTouchStart, { passive: false });
      canvas.addEventListener("touchmove", this.onTouchMove, { passive: false });
      canvas.addEventListener("touchend", this.onTouchEnd);
    }
  }

  getIsWeaponDrawerOpen(): boolean {
    return this.isWeaponDrawerOpen;
  }

  setIsWeaponDrawerOpen(isOpen: boolean): void {
    this.isWeaponDrawerOpen = isOpen;
  }

  poll(cameraX: number, gameState: GameState): GameAction[] {
    if (!this.active) return [];

    const actions = collectGameActions({
      state: {
        pressedKeys: this.pressedKeys,
        pointer: this.pointer,
        pendingPointerDown: this.pendingPointerDown,
        pendingSlotNumber: this.pendingSlotNumber,
        pendingSpaceKey: this.pendingSpaceKey,
        pendingPanDelta: this.pendingPanDelta,
        isPointerDown: this.isPointerDown,
        isWeaponDrawerOpen: this.isWeaponDrawerOpen,
        virtualMoveDirection: this.virtualMoveDirection,
        virtualAim: this.virtualAim,
      },
      context: {
        gameState,
        cameraX,
        gameViewport: this.layout.gameViewport,
        domCanvasRect: this.layout.domCanvasRect,
      },
    });

    // Close drawer after slot selection or firing
    if (actions.some((a) => a.type === "selectProjectileSlot" || a.type === "fire")) {
      this.isWeaponDrawerOpen = false;
    }

    this.pendingPointerDown = null;
    this.pendingSlotNumber = null;
    this.pendingSpaceKey = false;
    this.pendingPanDelta = 0;

    return actions;
  }

  getHoverTarget(gameState: GameState): CanvasHoverTarget {
    if (!this.active) return null;
    const activeTank = getActiveTank(gameState);
    const pointerPoint = domPointToGameViewportPoint({
      clientX: this.pointer.clientX,
      clientY: this.pointer.clientY,
      domCanvasRect: this.layout.domCanvasRect,
      gameViewport: this.layout.gameViewport,
    });

    if (
      isRelockCameraButtonClickedAtCanvasPoint(
        gameState,
        this.layout.gameViewport.width,
        this.layout.gameViewport.height,
        pointerPoint.x,
        pointerPoint.y,
      )
    ) {
      if (this.canvas?.style && this.canvas.style.cursor !== "pointer") {
        this.canvas.style.cursor = "pointer";
      }
      return { type: "relockCamera" };
    }

    if (activeTank && gameState.match.phase === "thinking") {
      // 1. Expanded drawer slots
      if (this.isWeaponDrawerOpen) {
        const drawerSlotId = findExpandedDrawerSlotAtCanvasPoint(
          gameState,
          this.layout.gameViewport.width,
          this.layout.gameViewport.height,
          pointerPoint.x,
          pointerPoint.y,
          activeTank,
          this.isWeaponDrawerOpen,
        );
        if (drawerSlotId) {
          if (this.canvas?.style && this.canvas.style.cursor !== "pointer") {
            this.canvas.style.cursor = "pointer";
          }
          return { type: "drawerSlot", slotId: drawerSlotId };
        }
      }

      // 2. Compact weapon slot
      if (
        isCompactWeaponSlotClickedAtCanvasPoint(
          gameState,
          this.layout.gameViewport.width,
          this.layout.gameViewport.height,
          pointerPoint.x,
          pointerPoint.y,
          activeTank,
        )
      ) {
        if (this.canvas?.style && this.canvas.style.cursor !== "pointer") {
          this.canvas.style.cursor = "pointer";
        }
        return { type: "weaponSlot" };
      }

      // 3. Fire button
      if (
        isFireButtonClickedAtCanvasPoint(
          gameState,
          this.layout.gameViewport.width,
          this.layout.gameViewport.height,
          pointerPoint.x,
          pointerPoint.y,
          activeTank,
        )
      ) {
        if (this.canvas?.style && this.canvas.style.cursor !== "pointer") {
          this.canvas.style.cursor = "pointer";
        }
        return { type: "fire" };
      }

      // 4. Virtual D-pad
      const dpadMove = getVirtualMovementIntentAtCanvasPoint(
        this.layout.gameViewport.width,
        this.layout.gameViewport.height,
        pointerPoint.x,
        pointerPoint.y,
      );
      if (dpadMove !== null) {
        if (this.canvas?.style && this.canvas.style.cursor !== "pointer") {
          this.canvas.style.cursor = "pointer";
        }
        return dpadMove === -1 ? { type: "dpadLeft" } : { type: "dpadRight" };
      }
    }

    if (this.canvas?.style && this.canvas.style.cursor !== "crosshair") {
      this.canvas.style.cursor = "crosshair";
    }
    return null;
  }

  setActive(active: boolean): void {
    this.active = active;
  }

  setLayout(layout: CanvasInputLayout): void {
    this.layout = layout;
  }

  destroy(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", this.onKeyDown);
      window.removeEventListener("keyup", this.onKeyUp);
      window.removeEventListener("blur", this.onWindowBlur);
      window.removeEventListener("pointermove", this.onPointerMove);
      window.removeEventListener("mousemove", this.onPointerMove);
      window.removeEventListener("pointerup", this.onPointerUp);
      window.removeEventListener("pointercancel", this.onPointerCancel);
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.onWindowBlur);
    }
    if (this.canvas) {
      this.canvas.removeEventListener("pointerdown", this.onPointerDown);
      this.canvas.removeEventListener("pointercancel", this.onPointerCancel);
      this.canvas.removeEventListener("wheel", this.onWheel);
      this.canvas.removeEventListener("touchstart", this.onTouchStart);
      this.canvas.removeEventListener("touchmove", this.onTouchMove);
      this.canvas.removeEventListener("touchend", this.onTouchEnd);
    }
  }
}

