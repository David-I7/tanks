import { describe, expect, it } from "vitest";
import { IntentThrottler } from "../../../../src/game/online/IntentThrottler";

describe("IntentThrottler", () => {
  it("allows first AIM intent immediately and throttles within 80ms default interval", () => {
    const throttler = new IntentThrottler();
    const t0 = 1000;

    expect(throttler.shouldSendAim(t0)).toBe(true);
    expect(throttler.shouldSendAim(t0 + 10)).toBe(false);
    expect(throttler.shouldSendAim(t0 + 79)).toBe(false);
    expect(throttler.shouldSendAim(t0 + 80)).toBe(true);
    expect(throttler.shouldSendAim(t0 + 100)).toBe(false);
    expect(throttler.shouldSendAim(t0 + 160)).toBe(true);
  });

  it("allows first MOVE intent immediately and throttles within 180ms default interval", () => {
    const throttler = new IntentThrottler();
    const t0 = 1000;

    expect(throttler.shouldSendMove(t0)).toBe(true);
    expect(throttler.shouldSendMove(t0 + 50)).toBe(false);
    expect(throttler.shouldSendMove(t0 + 179)).toBe(false);
    expect(throttler.shouldSendMove(t0 + 180)).toBe(true);
    expect(throttler.shouldSendMove(t0 + 200)).toBe(false);
    expect(throttler.shouldSendMove(t0 + 360)).toBe(true);
  });

  it("supports custom intervals", () => {
    const throttler = new IntentThrottler({ aimIntervalMs: 50, moveIntervalMs: 100 });
    const t0 = 1000;

    expect(throttler.shouldSendAim(t0)).toBe(true);
    expect(throttler.shouldSendAim(t0 + 49)).toBe(false);
    expect(throttler.shouldSendAim(t0 + 50)).toBe(true);

    expect(throttler.shouldSendMove(t0)).toBe(true);
    expect(throttler.shouldSendMove(t0 + 99)).toBe(false);
    expect(throttler.shouldSendMove(t0 + 100)).toBe(true);
  });

  it("tracks AIM and MOVE independently", () => {
    const throttler = new IntentThrottler();
    const t0 = 1000;

    expect(throttler.shouldSendAim(t0)).toBe(true);
    expect(throttler.shouldSendMove(t0)).toBe(true);

    expect(throttler.shouldSendAim(t0 + 40)).toBe(false);
    expect(throttler.shouldSendMove(t0 + 40)).toBe(false);

    expect(throttler.shouldSendAim(t0 + 80)).toBe(true);
    expect(throttler.shouldSendMove(t0 + 80)).toBe(false);

    expect(throttler.shouldSendMove(t0 + 180)).toBe(true);
  });

  it("resets throttle timers when reset() is called", () => {
    const throttler = new IntentThrottler();
    const t0 = 1000;

    expect(throttler.shouldSendAim(t0)).toBe(true);
    expect(throttler.shouldSendMove(t0)).toBe(true);

    expect(throttler.shouldSendAim(t0 + 20)).toBe(false);
    expect(throttler.shouldSendMove(t0 + 20)).toBe(false);

    throttler.reset();

    expect(throttler.shouldSendAim(t0 + 20)).toBe(true);
    expect(throttler.shouldSendMove(t0 + 20)).toBe(true);
  });
});
