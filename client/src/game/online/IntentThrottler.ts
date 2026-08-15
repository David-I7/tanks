export type IntentThrottlerOptions = {
  aimIntervalMs?: number;
  moveIntervalMs?: number;
};

export class IntentThrottler {
  private readonly aimIntervalMs: number;
  private readonly moveIntervalMs: number;
  private lastAimTimeMs: number | null = null;
  private lastMoveTimeMs: number | null = null;

  constructor(options?: IntentThrottlerOptions) {
    this.aimIntervalMs = options?.aimIntervalMs ?? 80;
    this.moveIntervalMs = options?.moveIntervalMs ?? 180;
  }

  shouldSendAim(nowMs: number = performance.now()): boolean {
    if (this.shouldThrottle(this.lastAimTimeMs, this.aimIntervalMs, nowMs)) {
      this.lastAimTimeMs = nowMs;
      return true;
    }
    return false;
  }

  shouldSendMove(nowMs: number = performance.now()): boolean {
    if (this.shouldThrottle(this.lastMoveTimeMs, this.moveIntervalMs, nowMs)) {
      this.lastMoveTimeMs = nowMs;
      return true;
    }
    return false;
  }

  reset(): void {
    this.lastAimTimeMs = null;
    this.lastMoveTimeMs = null;
  }

  private shouldThrottle(lastTimeMs: number | null, intervalMs: number, nowMs: number): boolean {
    return lastTimeMs === null || nowMs - lastTimeMs >= intervalMs;
  }
}
