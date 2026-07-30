import type { GameAction, GameState } from "../types";
import {
  calculateAimIntent,
  findProjectileSlotAtCanvasPoint,
  isFireButtonClickedAtCanvasPoint,
  isRelockCameraButtonClickedAtCanvasPoint,
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
};

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

const movementIntentProducer: IntentProducer = ({ state }) => {
  const left =
    state.pressedKeys.has("a") ||
    state.pressedKeys.has("A") ||
    state.pressedKeys.has("ArrowLeft");
  const right =
    state.pressedKeys.has("d") ||
    state.pressedKeys.has("D") ||
    state.pressedKeys.has("ArrowRight");

  return left !== right ? [{ type: "move", direction: left ? -1 : 1 }] : [];
};

const keyboardProjectileSlotIntentProducer: IntentProducer = ({
  state,
  context,
}) => {
  const activeTank = getActiveTank(context.gameState);
  if (state.pendingSlotNumber === null || !activeTank) return [];
  const slot = activeTank.loadout[state.pendingSlotNumber - 1];
  return slot
    ? [{ type: "selectProjectileSlot", projectileSlotId: slot.id }]
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
    activeTank.selectedProjectileSlotId ?? activeTank.loadout[0]?.id;
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
  const activeTank = getActiveTank(context.gameState);
  if (!activeTank) return intents;

  const pointerDown = state.pendingPointerDown;
  const pointerPoint = pointerDown
    ? domPointToGameViewportPoint({
        clientX: pointerDown.clientX,
        clientY: pointerDown.clientY,
        domCanvasRect: context.domCanvasRect,
        gameViewport: context.gameViewport,
      })
    : null;

  const isDraggingToAim = state.isPointerDown && !state.pressedKeys.has("Shift");
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

  if (pointerPoint) {
    const clickedSlotId = findProjectileSlotAtCanvasPoint(
      context.gameState,
      context.gameViewport.width,
      context.gameViewport.height,
      pointerPoint.x,
      pointerPoint.y,
      activeTank,
    );

    if (clickedSlotId) {
      intents.push({
        type: "selectProjectileSlot",
        projectileSlotId: clickedSlotId,
      });
    } else if (
      isRelockCameraButtonClickedAtCanvasPoint(
        context.gameState,
        context.gameViewport.width,
        context.gameViewport.height,
        pointerPoint.x,
        pointerPoint.y,
      )
    ) {
      intents.push({ type: "relockCamera" });
    } else if (
      isFireButtonClickedAtCanvasPoint(
        context.gameState,
        context.gameViewport.width,
        context.gameViewport.height,
        pointerPoint.x,
        pointerPoint.y,
        activeTank,
      )
    ) {
      const projectileSlotId =
        activeTank.selectedProjectileSlotId ?? activeTank.loadout[0]?.id;
      if (projectileSlotId) {
        intents.push({
          type: "fire",
          angle: activeTank.aimAngle,
          power: activeTank.power,
          projectileSlotId,
        });
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
      (entry) => entry.playerId === gameState.match.activePlayerId,
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

  private readonly onKeyDown = (event: KeyboardEvent) => {
    this.pressedKeys.add(event.key);
    if (/^[1-5]$/.test(event.key)) {
      this.pendingSlotNumber = Number(event.key);
    }
    if (event.key === " " || event.code === "Space") {
      event.preventDefault();
      this.pendingSpaceKey = true;
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.pressedKeys.delete(event.key);
  };

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
  };

  private readonly onPointerDown = (event: PointerEvent) => {
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
  };

  private readonly onPointerUp = () => {
    this.isPointerDown = false;
  };

  private readonly onWheel = (event: WheelEvent) => {
    if (event.shiftKey || Math.abs(event.deltaX) > 0 || Math.abs(event.deltaY) > 0) {
      this.pendingPanDelta += event.deltaX || event.deltaY;
    }
  };

  private readonly onTouchMove = (event: TouchEvent) => {
    if (event.touches.length === 2) {
      const currentX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      if (this.lastTouchX !== 0) {
        const dx = currentX - this.lastTouchX;
        this.pendingPanDelta -= dx;
      }
      this.lastTouchX = currentX;
    }
  };

  private readonly onTouchEnd = () => {
    this.lastTouchX = 0;
  };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    initialLayout: CanvasInputLayout = {
      gameViewport: { width: canvas.width, height: canvas.height },
      domCanvasRect: {
        left: 0,
        top: 0,
        width: canvas.width,
        height: canvas.height,
      },
    },
  ) {
    this.layout = initialLayout;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("mousemove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("touchmove", this.onTouchMove, { passive: false });
    canvas.addEventListener("touchend", this.onTouchEnd);
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
      },
      context: {
        gameState,
        cameraX,
        gameViewport: this.layout.gameViewport,
        domCanvasRect: this.layout.domCanvasRect,
      },
    });

    this.pendingPointerDown = null;
    this.pendingSlotNumber = null;
    this.pendingSpaceKey = false;
    this.pendingPanDelta = 0;

    return actions;
  }

  setActive(active: boolean): void {
    this.active = active;
  }

  setLayout(layout: CanvasInputLayout): void {
    this.layout = layout;
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("mousemove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("touchmove", this.onTouchMove);
    this.canvas.removeEventListener("touchend", this.onTouchEnd);
  }
}
