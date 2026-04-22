import CanvasEvent from "./CanvasEvent";

export type CanvasDragEventType = "dragStart" | "dragEnd" | "dragMove";

export default interface CanvasDragEvent extends CanvasEvent {
  cameraX: number;
  cameraY: number;
  clientX: number;
  clientY: number;
  deltaX: number;
  deltaY: number;
  type: CanvasDragEventType;
}
