import { describe, expect, it, vi } from "vitest";
import { cameraError, stopTracks } from "./camera";
import { dominant, overlayPoint, percent, retain, scoreMap, smooth } from "./metrics";
import { retryable } from "./model";

describe("expression analytics", () => {
  it("selects the strongest model score and formats it", () => {
    const scores = scoreMap(key => key === "neutral" ? 0.855 : 0.02);
    expect(dominant(scores)).toBe("neutral");
    expect(percent(scores.neutral)).toBe("86%");
  });
  it("smooths readings and drops stale predictions", () => {
    expect(smooth(scoreMap(() => 0), scoreMap(() => 1))?.happy).toBe(0.4);
    expect(smooth(scoreMap(() => 1), null)).toBeNull();
    expect(smooth(null, scoreMap(() => 1))?.happy).toBe(1);
  });
  it("retains only the rolling window with a finite capacity", () => {
    expect(retain([{ time: 9, scores: null }, { time: 10, scores: null }], { time: 70, scores: null }).map(sample => sample.time)).toEqual([10, 70]);
    expect(retain(Array.from({ length: 900 }, () => ({ time: 2, scores: null })), { time: 3, scores: null })).toHaveLength(610);
  });
  it("scales and mirrors overlay coordinates", () => {
    expect(overlayPoint(20, 40, 2, 240, true)).toEqual({ x: 200, y: 80 });
    expect(overlayPoint(20, 40, 2, 240, false)).toEqual({ x: 40, y: 80 });
  });
});

describe("device and model failures", () => {
  it("stops every media track and explains denied permission", () => {
    const first = vi.fn();
    const second = vi.fn();
    stopTracks({ getTracks: () => [{ stop: first }, { stop: second }] } as unknown as MediaStream);
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
    expect(cameraError(new DOMException("", "NotAllowedError"))).toMatch(/permission denied/);
  });
  it("allows retry after failed initialization and shares successful work", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("failed")).mockResolvedValueOnce("ready");
    const retry = retryable(load);
    await expect(retry()).rejects.toThrow("failed");
    expect(retry()).toBe(retry());
    await expect(retry()).resolves.toBe("ready");
    expect(load).toHaveBeenCalledTimes(2);
  });
});
