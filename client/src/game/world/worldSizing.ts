export type ViewportSize = {
  width: number;
  height: number;
};

export type WorldSize = {
  width: number;
  height: number;
};

export type CanvasBackingSize = {
  width: number;
  height: number;
};

export type WorldSizing = {
  viewport: ViewportSize;
  world: WorldSize;
  backing: CanvasBackingSize;
};

export function createWorldSizingPolicy(input: {
  viewport: ViewportSize;
  devicePixelRatio: number;
}): WorldSizing {
  const viewport = {
    width: Math.max(320, Math.floor(input.viewport.width)),
    height: Math.max(240, Math.floor(input.viewport.height)),
  };
  const ratio = Math.max(1, input.devicePixelRatio || 1);

  return {
    viewport,
    world: {
      width: viewport.width,
      height: viewport.height,
    },
    backing: {
      width: Math.max(320, Math.floor(viewport.width * ratio)),
      height: Math.max(240, Math.floor(viewport.height * ratio)),
    },
  };
}

export function canvasPointToViewportPoint(input: {
  clientX: number;
  clientY: number;
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">;
  viewport: ViewportSize;
}): { x: number; y: number } {
  return {
    x:
      ((input.clientX - input.rect.left) / Math.max(1, input.rect.width)) *
      input.viewport.width,
    y:
      ((input.clientY - input.rect.top) / Math.max(1, input.rect.height)) *
      input.viewport.height,
  };
}
