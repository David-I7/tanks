export const ONLINE_WORLD_SCALE_FACTOR = 3.0;

export type WorldCoordinateMapper = {
  scaleFactor: number;
  serverToClientX(serverX: number): number;
  clientToServerX(clientX: number): number;
  mapSurface(serverSurface: number[], scaleFactor?: number): { surface: number[]; width: number };
};

export const defaultWorldCoordinateMapper: WorldCoordinateMapper = {
  scaleFactor: ONLINE_WORLD_SCALE_FACTOR,
  serverToClientX(serverX: number): number {
    return Math.round(serverX * ONLINE_WORLD_SCALE_FACTOR);
  },
  clientToServerX(clientX: number): number {
    return Math.round(clientX / ONLINE_WORLD_SCALE_FACTOR);
  },
  mapSurface(serverSurface: number[], scaleFactor: number = ONLINE_WORLD_SCALE_FACTOR) {
    if (!serverSurface || serverSurface.length === 0) {
      return { surface: [], width: 0 };
    }
    const serverWidth = serverSurface.length;
    const targetWidth = Math.round(serverWidth * scaleFactor);
    const surface = new Array<number>(targetWidth);
    for (let x = 0; x < targetWidth; x++) {
      const serverX = Math.min(serverWidth - 1, x / scaleFactor);
      const indexLow = Math.floor(serverX);
      const indexHigh = Math.min(serverWidth - 1, Math.ceil(serverX));
      const frac = serverX - indexLow;
      const yLow = serverSurface[indexLow] ?? 0;
      const yHigh = serverSurface[indexHigh] ?? yLow;
      surface[x] = Math.round(yLow + (yHigh - yLow) * frac);
    }
    return { surface, width: targetWidth };
  },
};
