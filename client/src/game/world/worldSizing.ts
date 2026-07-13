export type GameViewport = {
  width: number;
  height: number;
};

export type DpiViewport = {
  width: number;
  height: number;
};

export type DomCanvasRect = Pick<DOMRect, "left" | "top" | "width" | "height">;

export type CanvasSizing = {
  gameViewport: GameViewport;
  dpiViewport: DpiViewport;
  domCanvasRect: DomCanvasRect;
};

export function readDomCanvasRect(canvas: HTMLCanvasElement): DomCanvasRect {
  const rect = canvas.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function createCanvasSizing(input: {
  domCanvasRect: DomCanvasRect;
  devicePixelRatio: number;
}): CanvasSizing {
  const gameViewport = {
    width: Math.max(320, Math.floor(input.domCanvasRect.width)),
    height: Math.max(240, Math.floor(input.domCanvasRect.height)),
  };
  const ratio = Math.max(1, input.devicePixelRatio || 1);

  return {
    gameViewport,
    dpiViewport: {
      width: Math.max(320, Math.floor(gameViewport.width * ratio)),
      height: Math.max(240, Math.floor(gameViewport.height * ratio)),
    },
    domCanvasRect: input.domCanvasRect,
  };
}

export function domPointToGameViewportPoint(input: {
  clientX: number;
  clientY: number;
  domCanvasRect: DomCanvasRect;
  gameViewport: GameViewport;
}): { x: number; y: number } {
  return {
    x:
      ((input.clientX - input.domCanvasRect.left) /
        Math.max(1, input.domCanvasRect.width)) *
      input.gameViewport.width,
    y:
      ((input.clientY - input.domCanvasRect.top) /
        Math.max(1, input.domCanvasRect.height)) *
      input.gameViewport.height,
  };
}
