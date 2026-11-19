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
  worldWidth: number;
  worldHeight: number;
}): CanvasSizing {
  const domWidth = Math.max(1, input.domCanvasRect.width);
  const domHeight = Math.max(1, input.domCanvasRect.height);
  const domAspect = domWidth / domHeight;

  const targetHeight = input.worldHeight;
  const computedWidth = targetHeight * domAspect;
  const maxViewportWidth = input.worldWidth * 0.75;

  let viewportWidth: number;
  let viewportHeight: number;

  if (computedWidth > maxViewportWidth) {
    viewportWidth = maxViewportWidth;
    viewportHeight = viewportWidth / domAspect;
  } else {
    viewportWidth = computedWidth;
    viewportHeight = targetHeight;
  }

  const gameViewport: GameViewport = {
    width: Math.round(viewportWidth),
    height: Math.round(viewportHeight),
  };

  return {
    gameViewport,
    dpiViewport: {
      width: Math.round(domWidth * input.devicePixelRatio),
      height: Math.round(domHeight * input.devicePixelRatio),
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
