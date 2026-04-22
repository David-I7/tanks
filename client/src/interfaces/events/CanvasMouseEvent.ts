import CanvasEvent from "./CanvasEvent";

export type CanvasMouseEventType =
  | "mouseDown"
  | "mouseUp"
  | "mouseMove"
  | "mouseLeave"
  | "click"
  | "doubleClick";

export default interface CanvasMouseEvent extends CanvasEvent {
  cameraX: number;
  cameraY: number;
  clientX: number;
  clientY: number;
  type: CanvasMouseEventType;
}
