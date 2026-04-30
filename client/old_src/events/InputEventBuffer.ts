import CanvasEvent from "./canvas/CanvasEvent";

export class InputEventBuffer {
  private buffer: CanvasEvent[] = [];

  push(...events: CanvasEvent[]) {
    this.buffer.push(...events);
  }

  drain(): CanvasEvent[] {
    const events = this.buffer;
    this.buffer = [];
    return events;
  }
}
