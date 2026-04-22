import CanvasDragEvent from "../interfaces/events/CanvasDragEvent";
import CanvasMouseEvent from "../interfaces/events/CanvasMouseEvent";
import CanvasWheelEvent from "../interfaces/events/CanvasWheelEvents";
import Camera from "../ui/Camera";
import Viewport from "../ui/Viewport";

export class MouseInput {
  private queue: (CanvasMouseEvent | CanvasWheelEvent)[] = [];

  private mouseDowns: CanvasMouseEvent[] = [];
  private mouseUps: CanvasMouseEvent[] = [];
  private mouseMoves: CanvasMouseEvent[] = [];
  private mouseLeaves: CanvasMouseEvent[] = [];
  private wheelMoves: CanvasWheelEvent[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    viewport: Viewport,
    camera: Camera,
  ) {
    const getPos = (e: MouseEvent) => ({
      clientX: e.clientX - viewport.rect.left,
      clientY: e.clientY - viewport.rect.top,
      cameraX: camera.x + (e.clientX - viewport.rect.left) / camera.zoom,
      cameraY: camera.y + (e.clientY - viewport.rect.top) / camera.zoom,
    });

    canvas.addEventListener("mousedown", (e) => {
      const p = getPos(e);
      this.queue.push({ type: "mouseDown", ...p, time: performance.now() });
    });

    canvas.addEventListener("mousemove", (e) => {
      const p = getPos(e);
      this.queue.push({ type: "mouseMove", ...p, time: performance.now() });
    });

    canvas.addEventListener("mouseleave", (e) => {
      const p = getPos(e);
      this.queue.push({ type: "mouseLeave", ...p, time: performance.now() });
    });

    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const p = getPos(e);
        this.queue.push({
          type: "wheel",
          ...p,
          time: performance.now(),
          delta: e.deltaY,
        });
      },
      { passive: false },
    );

    window.addEventListener("mouseup", (e) => {
      const p = getPos(e);
      this.queue.push({ type: "mouseUp", ...p, time: performance.now() });
    });
  }

  update() {
    this.mouseDowns.length = 0;
    this.mouseUps.length = 0;
    this.mouseMoves.length = 0;
    this.mouseLeaves.length = 0;
    this.wheelMoves.length = 0;

    for (const ev of this.queue) {
      if (ev.type === "mouseDown") {
        this.mouseDowns.push(ev);
      }

      if (ev.type === "mouseUp") {
        this.mouseUps.push(ev);
      }

      if (ev.type === "mouseMove") {
        this.mouseMoves.push(ev);
      }

      if (ev.type === "mouseLeave") {
        this.mouseLeaves.push(ev);
      }

      if (ev.type === "wheel") {
        this.wheelMoves.push(ev);
      }
    }

    this.queue.length = 0;
  }

  getMouseDowns() {
    return this.mouseDowns;
  }
  getMouseUps() {
    return this.mouseUps;
  }
  getMouseMoves() {
    return this.mouseMoves;
  }
  getMouseLeaves() {
    return this.mouseLeaves;
  }
  getWheelMoves() {
    return this.wheelMoves;
  }
}

// =========================
// Gesture layer
// =========================

export class MouseGestures {
  private lastMouseDownBeforeRelease: CanvasMouseEvent | null = null;
  private lastMouseReleaseBeforeDown: CanvasMouseEvent | null = null;
  private lastClickTime: number | null = null;

  private isDragging = false;
  private isMouseDown = false;
  private isMouseUp = false;
  private isMouseMoving = false;
  private isMouseLeave = false;

  private click: CanvasMouseEvent | null = null;
  private doubleClick: CanvasMouseEvent | null = null;

  private dragStart: CanvasDragEvent | null = null;
  private dragEnd: CanvasDragEvent | null = null;
  private dragMoves: CanvasDragEvent[] = [];
  private lastDragMoveBeforeDragEnd: CanvasDragEvent | null = null;

  private readonly MAX_CLICK_DURATION = 200;
  private readonly MAX_CLICK_DISTANCE_SQ = 1000;
  private readonly DOUBLE_CLICK_DELAY = 300;
  private readonly MIN_DRAG_START_DISTANCE_SQ = 50;

  constructor(private mouse: MouseInput) {}

  update() {
    this.click = null;
    this.doubleClick = null;
    this.dragStart = null;
    this.dragEnd = null;
    this.dragMoves.length = 0;

    this.isMouseDown = false;
    this.isMouseMoving = false;
    this.isMouseLeave = false;
    this.isMouseUp = false;

    const downs = this.mouse.getMouseDowns();
    const moves = this.mouse.getMouseMoves();
    const ups = this.mouse.getMouseUps();
    const leaves = this.mouse.getMouseLeaves();

    // Detects mouse downs
    if (downs.length) {
      this.lastMouseReleaseBeforeDown = null;
      const last = downs[downs.length - 1];
      this.lastMouseDownBeforeRelease = last;
      this.isDragging = false;
      this.isMouseDown = true;
    }

    if (moves.length) {
      this.isMouseMoving = true;
    }
    if (leaves.length) {
      this.isMouseLeave = true;
    }
    if (ups.length) {
      this.isMouseUp = true;
    }

    // Drag Detection

    for (const e of moves) {
      // Detects drag start
      if (this.lastMouseDownBeforeRelease && !this.isDragging) {
        // The user must move at least MIN_DRAG_START_DISTANCE_SQ before a drag start is considered
        const dx = e.clientX - this.lastMouseDownBeforeRelease.clientX;
        const dy = e.clientY - this.lastMouseDownBeforeRelease.clientY;
        const distSq = dx * dx + dy * dy;

        if (distSq >= this.MIN_DRAG_START_DISTANCE_SQ) {
          this.isDragging = true;
          this.dragStart = {
            ...this.lastMouseDownBeforeRelease,
            type: "dragStart",
            deltaX: 0,
            deltaY: 0,
          };
          this.lastDragMoveBeforeDragEnd = this.dragStart;
        }
      }

      // Detect drag moves
      // isDragging is true only if the user started dragging
      if (this.isDragging && e.time !== this.dragStart?.time) {
        const nextDragMove: CanvasDragEvent = {
          ...e,
          type: "dragMove",
          deltaX: e.clientX - this.lastDragMoveBeforeDragEnd!.clientX,
          deltaY: e.clientY - this.lastDragMoveBeforeDragEnd!.clientY,
        };
        this.dragMoves.push(nextDragMove);
        this.lastDragMoveBeforeDragEnd = nextDragMove;
      }
    }

    // Detects click, doubleClick and dragEnd events
    for (const e of ups) {
      this.lastMouseReleaseBeforeDown = e;

      // Detects drag end
      if (this.isDragging) {
        this.isDragging = false;
        this.dragEnd = {
          ...e,
          type: "dragEnd",
          deltaX: e.clientX - this.lastDragMoveBeforeDragEnd!.clientX,
          deltaY: e.clientY - this.lastDragMoveBeforeDragEnd!.clientY,
        };
        this.lastDragMoveBeforeDragEnd = null;
      }

      // Detects clicks and double clicks
      if (this.lastMouseDownBeforeRelease) {
        // For a click to be created, the user must press and release the mouse within MAX_CLICK_DURATION,
        // and must not move more than MAX_CLICK_DISTANCE_SQ
        const duration = e.time - this.lastMouseDownBeforeRelease.time;
        const dx = e.clientX - this.lastMouseDownBeforeRelease.clientX;
        const dy = e.clientY - this.lastMouseDownBeforeRelease.clientY;
        const distSq = dx * dx + dy * dy;

        if (
          duration <= this.MAX_CLICK_DURATION &&
          distSq <= this.MAX_CLICK_DISTANCE_SQ
        ) {
          this.click = { ...e, type: "click" };

          // The user must click 2 times within DOUBLE_CLICK_DELAY to trigger a double click event
          if (
            this.lastClickTime &&
            e.time - this.lastClickTime <= this.DOUBLE_CLICK_DELAY
          ) {
            this.doubleClick = { ...e, type: "doubleClick" };
          }
        }

        this.lastMouseDownBeforeRelease = null;
        this.lastClickTime = e.time;
      }
    }

    // Mouse left the canvas, we cleanup state
    if (this.isMouseLeave) {
      if (this.isDragging) {
        const e = leaves[leaves.length - 1];
        this.dragEnd = {
          ...e,
          deltaX: e.clientX - this.lastDragMoveBeforeDragEnd!.clientX,
          deltaY: (e.clientY = this.lastDragMoveBeforeDragEnd!.clientY),
          type: "dragEnd",
        };
        this.lastDragMoveBeforeDragEnd = null;
        this.isDragging = false;
      }
    }
  }

  wasPressed(): boolean {
    return this.isMouseDown;
  }

  getMousePress() {
    return this.lastMouseDownBeforeRelease;
  }

  wasReleased(): boolean {
    return this.isMouseUp;
  }

  getMouseRelease() {
    return this.lastMouseReleaseBeforeDown;
  }

  wasClicked(): boolean {
    return this.click !== null;
  }

  getClick() {
    return this.click;
  }

  wasDoubleClicked(): boolean {
    return this.doubleClick !== null;
  }

  getDoubleClick() {
    return this.doubleClick;
  }

  hasMouseLeft() {
    return this.isMouseLeave;
  }

  getMouseLeaves() {
    return this.mouse.getMouseLeaves();
  }

  hasMouseMoved() {
    return this.isMouseMoving;
  }

  getMouseMoves() {
    return this.mouse.getMouseMoves();
  }

  getDragStart() {
    return this.dragStart;
  }

  hasDragStarted() {
    return this.dragStart !== null;
  }

  getDragMoves() {
    return this.dragMoves;
  }

  hasDragMoved() {
    return this.isDragging && this.dragMoves.length > 0;
  }

  getDragEnd() {
    return this.dragEnd;
  }

  hasDragEnded() {
    return this.dragEnd !== null;
  }

  hasWheelMoved() {
    return this.mouse.getWheelMoves().length > 0;
  }

  getWheelMoves(): CanvasWheelEvent[] {
    return this.mouse.getWheelMoves();
  }
}
