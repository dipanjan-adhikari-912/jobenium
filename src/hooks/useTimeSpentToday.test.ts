import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTimeSpentToday } from "./useTimeSpentToday";
import { todayKey } from "@/lib/timeSpent";

function stubVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
}

function restoreVisibility() {
  delete (document as { visibilityState?: DocumentVisibilityState }).visibilityState;
}

describe("useTimeSpentToday", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 28, 10, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
    restoreVisibility();
  });

  it("starts from today's persisted record", () => {
    localStorage.setItem(
      "jobenium:timeSpent",
      JSON.stringify({ d: todayKey(), s: 5400 }),
    );
    const { result } = renderHook(() => useTimeSpentToday());
    expect(result.current).toBe("01h:30m");
  });

  it("counts visible seconds, displayed with minute precision", () => {
    const { result } = renderHook(() => useTimeSpentToday());
    expect(result.current).toBe("00h:00m");

    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current).toBe("00h:01m");

    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current).toBe("00h:02m");
  });

  it("does not count while the tab is hidden", () => {
    stubVisibility("hidden");
    const { result } = renderHook(() => useTimeSpentToday());

    act(() => vi.advanceTimersByTime(120_000));
    expect(result.current).toBe("00h:00m");
  });

  it("resets the counter when the day rolls over", () => {
    vi.setSystemTime(new Date(2026, 8, 28, 23, 59, 59));
    localStorage.setItem(
      "jobenium:timeSpent",
      JSON.stringify({ d: "2026-09-28", s: 3600 }),
    );
    const { result } = renderHook(() => useTimeSpentToday());
    expect(result.current).toBe("01h:00m");

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current).toBe("00h:00m");
    expect(JSON.parse(localStorage.getItem("jobenium:timeSpent") ?? "{}")).toEqual({
      d: "2026-09-29",
      s: 2,
    });
  });

  it("persists each tick", () => {
    renderHook(() => useTimeSpentToday());
    act(() => vi.advanceTimersByTime(60_000));
    expect(JSON.parse(localStorage.getItem("jobenium:timeSpent") ?? "{}")).toEqual({
      d: todayKey(),
      s: 60,
    });
  });
});
