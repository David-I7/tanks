type MouseEventType =
  | "mouseDown"
  | "mouseUp"
  | "mouseMove"
  | "mouseLeave"
  | "click"
  | "doubleClick";

type DragEventType = "dragStart" | "dragEnd" | "dragMove";

interface CanvasMouseEvent {
  type: MouseEventType;
  x: number;
  y: number;
  time: number;
}

interface CanvasDragEvent {
  type: DragEventType;
  deltaX: number;
  deltaY: number;
  x: number;
  y: number;
  time: number;
}

export class MouseInput {
  private queue: CanvasMouseEvent[] = [];

  private mouseDowns: CanvasMouseEvent[] = [];
  private mouseUps: CanvasMouseEvent[] = [];
  private mouseMoves: CanvasMouseEvent[] = [];
  private mouseLeaves: CanvasMouseEvent[] = [];

  private rect!: DOMRect;

  constructor(private canvas: HTMLCanvasElement) {
    const updateRect = () => {
      this.rect = canvas.getBoundingClientRect();
    };

    const observer = new ResizeObserver(updateRect);

    observer.observe(canvas);

    window.addEventListener("scroll", updateRect, true);

    const getPos = (e: MouseEvent) => ({
      x: e.clientX - this.rect.left,
      y: e.clientY - this.rect.top,
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
}

// =========================
// Gesture layer
// =========================

export class MouseGestures {
  private lastMouseDownBeforeRelease: CanvasMouseEvent | null = null;
  private lastClickTime: number | null = null;

  private dragging = false;
  private mouseDown = false;
  private mouseUp = false;
  private mouseMoving = false;
  private mouseLeave = false;

  private click: CanvasMouseEvent | null = null;
  private doubleClick: CanvasMouseEvent | null = null;

  private dragStart: CanvasDragEvent | null = null;
  private dragEnd: CanvasDragEvent | null = null;
  private dragMoves: CanvasDragEvent[] = [];
  private lastDragMoveBeforeDragEnd: CanvasDragEvent | null = null;

  private readonly MAX_CLICK_DURATION = 200;
  private readonly MAX_CLICK_DISTANCE_SQ = 25;
  private readonly DOUBLE_CLICK_DELAY = 300;
  private readonly MIN_DRAG_START_DISTANCE_SQ = 25;

  constructor(private mouse: MouseInput) {}

  update() {
    this.click = null;
    this.doubleClick = null;
    this.dragStart = null;
    this.dragEnd = null;
    this.dragMoves.length = 0;

    this.mouseDown = false;
    this.mouseMoving = false;
    this.mouseLeave = false;
    this.mouseUp = false;

    const downs = this.mouse.getMouseDowns();
    const moves = this.mouse.getMouseMoves();
    const ups = this.mouse.getMouseUps();
    const leaves = this.mouse.getMouseLeaves();

    // DOWN
    if (downs.length) {
      const last = downs[downs.length - 1];
      this.lastMouseDownBeforeRelease = last;
      this.dragging = false;
      this.mouseDown = true;
    }

    if (moves.length) {
      this.mouseMoving = true;
    }
    if (leaves.length) {
      this.mouseLeave = true;
    }
    if (ups.length) {
      this.mouseUp = true;
    }

    // Drag Detection

    for (const e of moves) {
      if (this.lastMouseDownBeforeRelease && !this.dragging) {
        const dx = e.x - this.lastMouseDownBeforeRelease.x;
        const dy = e.y - this.lastMouseDownBeforeRelease.y;
        const distSq = dx * dx + dy * dy;

        if (distSq >= this.MIN_DRAG_START_DISTANCE_SQ) {
          this.dragging = true;
          this.dragStart = {
            ...this.lastMouseDownBeforeRelease,
            type: "dragStart",
            deltaX: 0,
            deltaY: 0,
          };
          this.lastDragMoveBeforeDragEnd = this.dragStart;
        }
      }

      if (this.dragging && e.time !== this.dragStart?.time) {
        const nextDragMove: CanvasDragEvent = {
          ...e,
          type: "dragMove",
          deltaX: e.x - this.lastDragMoveBeforeDragEnd!.x,
          deltaY: e.y - this.lastDragMoveBeforeDragEnd!.y,
        };
        this.dragMoves.push(nextDragMove);
        this.lastDragMoveBeforeDragEnd = nextDragMove;
      }
    }

    // Click, doubleClick, dragEnds
    for (const e of ups) {
      if (this.dragging) {
        this.dragging = false;
        this.dragEnd = {
          ...e,
          type: "dragEnd",
          deltaX: e.x - this.lastDragMoveBeforeDragEnd!.x,
          deltaY: e.y - this.lastDragMoveBeforeDragEnd!.y,
        };
        this.lastDragMoveBeforeDragEnd = null;
      }

      if (this.lastMouseDownBeforeRelease) {
        const duration = e.time - this.lastMouseDownBeforeRelease.time;

        const dx = e.x - this.lastMouseDownBeforeRelease.x;
        const dy = e.y - this.lastMouseDownBeforeRelease.y;
        const distSq = dx * dx + dy * dy;

        if (
          duration <= this.MAX_CLICK_DURATION &&
          distSq <= this.MAX_CLICK_DISTANCE_SQ
        ) {
          this.click = { ...e, type: "click" };

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

    if (this.mouseLeave && this.dragging) {
      this.dragging = false;
      this.dragEnd = null;
      this.lastMouseDownBeforeRelease = null;
      this.lastDragMoveBeforeDragEnd = null;
    }
  }

  // ===== PUBLIC API =====

  wasPressed(): boolean {
    return this.mouseDown;
  }

  wasReleased(): boolean {
    return this.mouseUp;
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

  isMouseLeaving() {
    return this.mouseLeave;
  }

  getMouseLeaves() {
    return this.mouse.getMouseLeaves();
  }

  isMouseMoving() {
    return this.mouseMoving;
  }

  getMouseMoves() {
    return this.mouse.getMouseMoves();
  }

  isDragging(): boolean {
    return this.dragging;
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
    return this.dragging && this.dragMoves.length > 0;
  }

  getDragEnd() {
    return this.dragEnd;
  }

  hasDragEnded() {
    return this.dragEnd !== null;
  }
}
