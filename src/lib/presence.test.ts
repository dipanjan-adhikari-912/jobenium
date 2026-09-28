import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePresence, readingAt } from "./presence";

describe("usePresence", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays within the audience band on mount and after a tick", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => usePresence());
    expect(result.current).toBeGreaterThanOrEqual(150);
    expect(result.current).toBeLessThanOrEqual(600);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current).toBeGreaterThanOrEqual(150);
    expect(result.current).toBeLessThanOrEqual(600);
  });

  it("reads the same for the same instant", () => {
    const t = new Date("2026-09-28T14:30:00");
    expect(readingAt(t)).toBe(readingAt(t));
  });

  it("stays in band across all hours of the day", () => {
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 15, 30, 45]) {
        const v = readingAt(new Date(2026, 8, 28, h, m));
        expect(v).toBeGreaterThanOrEqual(150);
        expect(v).toBeLessThanOrEqual(600);
      }
    }
  });
});
