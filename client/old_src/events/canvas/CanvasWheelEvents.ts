import CanvasEvent from "./CanvasEvent";

export type CanvasWheelEventType = "wheel";

export default interface CanvasWheelEvent extends CanvasEvent {
  clientX: number;
  clientY: number;
  delta: number;
  type: CanvasWheelEventType;
}
