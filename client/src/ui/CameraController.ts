import Camera from "./Camera.js";
import { InputManager } from "../../input/InputManager.js";
import Terrain from "./entities/Terrain.js";
import { GameSettings } from "../../config/gameConfig.js";

export default class CameraController {
  private isDragging: boolean = false;

  constructor(
    private camera: Camera,
    private input: InputManager,
    private terrain: Terrain,
    private settings: GameSettings,
  ) {}

  update(dt: number): void {
    const mouse = this.input.mouse;

    // --- DRAG CAMERA ---
    if (mouse.hasDragStarted()) {
      this.isDragging = true;
    }

    if (this.isDragging && mouse.hasDragMoved()) {
      for (const e of mouse.getDragMoves()) {
        this.camera.x -= e.deltaX / this.camera.zoom;
        this.camera.y -= e.deltaY / this.camera.zoom;
      }
    }

    if (!this.isDragging) {
      this.isDragging = false;
    }

    // --- ZOOM (example: wheel) ---
    if (mouse.hasWheelMoved()) {
      const wheels = mouse.getWheelMoves();
      const { x: mx, y: my, deltaY: delta } = wheels[wheels.length - 1];

      const beforeX = this.camera.x + mx / this.camera.zoom;
      const beforeY = this.camera.y + my / this.camera.zoom;

      this.camera.zoom *= 1 + -delta * 0.001;
      this.camera.zoom = Math.max(0.5, Math.min(2, this.camera.zoom));

      // keep cursor stable
      this.camera.x = beforeX - mx / this.camera.zoom;
      this.camera.y = beforeY - my / this.camera.zoom;
    }

    // --- CLAMP CAMERA ---
    this.camera.x = Math.max(
      0,
      Math.min(
        this.terrain.width - this.camera.viewportWidth / this.camera.zoom,
        this.camera.x,
      ),
    );

    this.camera.y = Math.max(
      0,
      Math.min(
        this.terrain.height - this.camera.viewportHeight / this.camera.zoom,
        this.camera.y,
      ),
    );
  }
}
