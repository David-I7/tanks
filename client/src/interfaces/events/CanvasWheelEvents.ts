import CanvasEvent from "./CanvasEvent";

export type CanvasWheelEventType = "wheel";

export default interface CanvasWheelEvent extends CanvasEvent {
  cameraX: number;
  cameraY: number;
  clientX: number;
  clientY: number;
  delta: number;
  type: CanvasWheelEventType;
}
