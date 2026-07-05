import type { PlayerIntent } from "../types";
import type { GameSnapshot } from "../types";
import { calculateAimIntent } from "./aimMath";

export class CanvasInputSource {
  private readonly pressedKeys = new Set<string>();
  private pendingFire = false;
  private pointer = { clientX: 0, clientY: 0 };
  private active = true;

  private readonly onKeyDown = (event: KeyboardEvent) => {
    this.pressedKeys.add(event.key);
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

  private readonly onPointerDown = () => {
    this.pendingFire = true;
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

    const aim = calculateAimIntent({
      ...this.pointer,
      rect: this.canvas.getBoundingClientRect(),
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      cameraX,
      snapshot,
    });

    if (aim) {
      intents.push(aim);

      if (this.pendingFire) {
        intents.push({ type: "fire", angle: aim.angle, power: aim.power });
      }
    }

    this.pendingFire = false;

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
