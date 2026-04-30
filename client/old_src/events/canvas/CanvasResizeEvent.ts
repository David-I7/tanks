import CanvasEvent from "./CanvasEvent";

type CanvasResizeEventType = "viewportResize";

export default interface CanvasResizeEvent extends CanvasEvent {
  type: CanvasResizeEventType;
  width: number;
  height: number;
}
