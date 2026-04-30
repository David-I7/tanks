import CanvasEvent from "./CanvasEvent";

export type CanvasMouseEventType =
  | "mouseDown"
  | "mouseUp"
  | "mouseMove"
  | "mouseLeave"
  | "click"
  | "doubleClick";

export default interface CanvasMouseEvent extends CanvasEvent {
  clientX: number;
  clientY: number;
  type: CanvasMouseEventType;
}
