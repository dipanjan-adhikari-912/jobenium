import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useBackdrop } from "./useBackdrop";
import { BACKDROPS, BACKDROP_FADE_MS } from "@/data/backgrounds";

describe("useBackdrop", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts on the first backdrop when nothing is stored", () => {
    const { result } = renderHook(() => useBackdrop());
    expect(result.current.backdrop.image).toBe(BACKDROPS[0]);
    expect(result.current.backdrop.outgoing).toBeNull();
  });

  it("advances to the next backdrop on nextBackdrop", () => {
    const { result } = renderHook(() => useBackdrop());
    act(() => result.current.nextBackdrop());
    expect(result.current.backdrop.image).toBe(BACKDROPS[1]);
  });

  it("wraps from the last backdrop back to the first", () => {
    localStorage.setItem(
      "jobenium:backdrop",
      JSON.stringify(BACKDROPS.length - 1),
    );
    const { result } = renderHook(() => useBackdrop());
    expect(result.current.backdrop.image).toBe(BACKDROPS[BACKDROPS.length - 1]);
    act(() => result.current.nextBackdrop());
    expect(result.current.backdrop.image).toBe(BACKDROPS[0]);
  });

  it("keeps the previous image during the fade, then drops it", () => {
    const { result } = renderHook(() => useBackdrop());
    act(() => result.current.nextBackdrop());
    expect(result.current.backdrop.outgoing).toBe(BACKDROPS[0]);
    act(() => {
      vi.advanceTimersByTime(BACKDROP_FADE_MS + 80);
    });
    expect(result.current.backdrop.outgoing).toBeNull();
  });

  it("persists the selection and reads it back on mount", () => {
    const { result } = renderHook(() => useBackdrop());
    act(() => result.current.nextBackdrop());
    act(() => result.current.nextBackdrop());
    expect(localStorage.getItem("jobenium:backdrop")).toBe(
      JSON.stringify(2),
    );
    const remounted = renderHook(() => useBackdrop());
    expect(remounted.result.current.backdrop.image).toBe(BACKDROPS[2]);
  });

  it("falls back to the first backdrop for out-of-range stored values", () => {
    for (const bad of ["99", "-1", '"2"', "null"]) {
      localStorage.setItem("jobenium:backdrop", bad);
      const { result, unmount } = renderHook(() => useBackdrop());
      expect(result.current.backdrop.image).toBe(BACKDROPS[0]);
      unmount();
    }
  });
});
