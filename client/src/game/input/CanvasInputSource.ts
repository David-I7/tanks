import type { PlayerIntent } from "../types";
import type { GameSnapshot } from "../types";
import { calculateAimIntent } from "./aimMath";
import { findProjectileSlotAtCanvasPoint } from "./projectileSelectorHitTest";

export class CanvasInputSource {
  private readonly pressedKeys = new Set<string>();
  private pendingPointerDown: { clientX: number; clientY: number } | null = null;
  private pendingSlotNumber: number | null = null;
  private pointer = { clientX: 0, clientY: 0 };
  private active = true;

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

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerdown", this.onPointerDown);
  }

  poll(cameraX: number, snapshot: GameSnapshot): PlayerIntent[] {
    if (!this.active) return [];

    const intents: PlayerIntent[] = [];
    const left =
      this.pressedKeys.has("a") ||
      this.pressedKeys.has("A") ||
      this.pressedKeys.has("ArrowLeft");
    const right =
      this.pressedKeys.has("d") ||
      this.pressedKeys.has("D") ||
      this.pressedKeys.has("ArrowRight");

    if (left !== right) {
      intents.push({ type: "move", direction: left ? -1 : 1 });
    }

    const activeTank = snapshot.tanks.find(
      (entry) => entry.tank.playerId === snapshot.match.activePlayerId,
    );
    if (this.pendingSlotNumber !== null && activeTank) {
      const slot = activeTank.tank.loadout[this.pendingSlotNumber - 1];
      if (slot) {
        intents.push({
          type: "selectProjectileSlot",
          projectileSlotId: slot.id,
        });
      }
    }

    const rect = this.canvas.getBoundingClientRect();
    if (this.pendingPointerDown) {
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const selectedSlotId = findProjectileSlotAtCanvasPoint(
        snapshot,
        this.canvas.width,
        this.canvas.height,
        (this.pendingPointerDown.clientX - rect.left) * scaleX,
        (this.pendingPointerDown.clientY - rect.top) * scaleY,
      );
      if (selectedSlotId) {
        intents.push({
          type: "selectProjectileSlot",
          projectileSlotId: selectedSlotId,
        });
      }
    }

    const aim = calculateAimIntent({
      ...this.pointer,
      rect,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      cameraX,
      snapshot,
    });

    if (aim) {
      intents.push(aim);

      if (this.pendingPointerDown) {
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const clickedSlotId = findProjectileSlotAtCanvasPoint(
          snapshot,
          this.canvas.width,
          this.canvas.height,
          (this.pendingPointerDown.clientX - rect.left) * scaleX,
          (this.pendingPointerDown.clientY - rect.top) * scaleY,
        );
        const projectileSlotId =
          activeTank?.tank.selectedProjectileSlotId ??
          activeTank?.tank.loadout[0]?.id;
        if (projectileSlotId && !clickedSlotId) {
          intents.push({
            type: "fire",
            angle: aim.angle,
            power: aim.power,
            projectileSlotId,
          });
        }
      }
    }

    this.pendingPointerDown = null;
    this.pendingSlotNumber = null;

    return intents;
  }

  setActive(active: boolean): void {
    this.active = active;
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
  }
}
