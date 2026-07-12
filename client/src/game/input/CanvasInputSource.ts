import type { GameAction, GameViewState } from "../types";
import { calculateAimIntent } from "./aimMath";
import { findProjectileSlotAtCanvasPoint } from "./projectileSelectorHitTest";
import type { DomCanvasRect, GameViewport } from "../world/worldSizing";
import { domPointToGameViewportPoint } from "../world/worldSizing";

export type CanvasInteractionState = {
  pressedKeys: ReadonlySet<string>;
  pendingPointerDown: { clientX: number; clientY: number } | null;
  pendingSlotNumber: number | null;
  pointer: { clientX: number; clientY: number };
};

export type CanvasInteractionContext = {
  gameViewState: GameViewState;
  cameraX: number;
  gameViewport: GameViewport;
  domCanvasRect: DomCanvasRect;
};

export type CanvasInputLayout = {
  gameViewport: GameViewport;
  domCanvasRect: DomCanvasRect;
};

export type IntentProducer = (input: {
  state: CanvasInteractionState;
  context: CanvasInteractionContext;
}) => GameAction[];

export function collectGameActions(input: {
  state: CanvasInteractionState;
  context: CanvasInteractionContext;
  producers?: IntentProducer[];
}): GameAction[] {
  return (input.producers ?? defaultIntentProducers).flatMap((producer) =>
    producer(input),
  );
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
  const activeTank = getActiveTank(context.gameViewState);
  if (state.pendingSlotNumber === null || !activeTank) return [];
  const slot = activeTank.loadout[state.pendingSlotNumber - 1];
  return slot
    ? [{ type: "selectProjectileSlot", projectileSlotId: slot.id }]
    : [];
};

const pointerIntentProducer: IntentProducer = ({ state, context }) => {
  const intents: GameAction[] = [];
  const activeTank = getActiveTank(context.gameViewState);
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
    const selectedSlotId = findProjectileSlotAtCanvasPoint(
      context.gameViewState,
      context.gameViewport.width,
      context.gameViewport.height,
      pointerPoint.x,
      pointerPoint.y,
    );
    if (selectedSlotId) {
      intents.push({
        type: "selectProjectileSlot",
        projectileSlotId: selectedSlotId,
      });
    }
  }

  const aim = calculateAimIntent({
    ...state.pointer,
    domCanvasRect: context.domCanvasRect,
    gameViewport: context.gameViewport,
    cameraX: context.cameraX,
    gameViewState: context.gameViewState,
  });

  if (!aim) return intents;
  intents.push(aim);

  if (pointerPoint) {
    const clickedSlotId = findProjectileSlotAtCanvasPoint(
      context.gameViewState,
      context.gameViewport.width,
      context.gameViewport.height,
      pointerPoint.x,
      pointerPoint.y,
    );
    const projectileSlotId =
      activeTank?.selectedProjectileSlotId ?? activeTank?.loadout[0]?.id;
    if (projectileSlotId && !clickedSlotId) {
      intents.push({
        type: "fire",
        angle: aim.angle,
        power: aim.power,
        projectileSlotId,
      });
    }
  }

  return intents;
};

const defaultIntentProducers: IntentProducer[] = [
  movementIntentProducer,
  keyboardProjectileSlotIntentProducer,
  pointerIntentProducer,
];

function getActiveTank(
  gameViewState: GameViewState,
): GameViewState["tanks"][number] | null {
  return (
    gameViewState.tanks.find(
      (entry) => entry.playerId === gameViewState.match.activePlayerId,
    ) ?? null
  );
}

export class CanvasInputSource {
  private readonly pressedKeys = new Set<string>();
  private pendingPointerDown: { clientX: number; clientY: number } | null =
    null;
  private pendingSlotNumber: number | null = null;
  private pointer = { clientX: 0, clientY: 0 };
  private active = true;
  private layout: CanvasInputLayout;

  private readonly onKeyDown = (event: KeyboardEvent) => {
    this.pressedKeys.add(event.key);
    if (/^[1-5]$/.test(event.key)) {
      this.pendingSlotNumber = Number(event.key);
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.pressedKeys.delete(event.key);
  };

  private readonly onPointerMove = (event: PointerEvent) => {
    this.pointer = {
      clientX: event.clientX,
      clientY: event.clientY,
    };
  };

  private readonly onPointerDown = (event: PointerEvent) => {
    this.pendingPointerDown = {
      clientX: event.clientX,
      clientY: event.clientY,
    };
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
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerdown", this.onPointerDown);
  }

  poll(cameraX: number, gameViewState: GameViewState): GameAction[] {
    if (!this.active) return [];

    const actions = collectGameActions({
      state: {
        pressedKeys: this.pressedKeys,
        pointer: this.pointer,
        pendingPointerDown: this.pendingPointerDown,
        pendingSlotNumber: this.pendingSlotNumber,
      },
      context: {
        gameViewState,
        cameraX,
        gameViewport: this.layout.gameViewport,
        domCanvasRect: this.layout.domCanvasRect,
      },
    });

    this.pendingPointerDown = null;
    this.pendingSlotNumber = null;

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
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
  }
}
