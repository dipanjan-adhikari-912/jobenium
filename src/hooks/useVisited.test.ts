import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useVisited } from "./useVisited";
import { VISITED_LIMIT } from "@/lib/storage";

const KEY = "jobenium:visited";

function stored(): string[] {
  return JSON.parse(localStorage.getItem(KEY) ?? "[]");
}

describe("useVisited", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty when nothing is stored", () => {
    const { result } = renderHook(() => useVisited());
    expect(result.current.hasVisited).toBe(false);
    expect(result.current.isVisited("greenhouse")).toBe(false);
  });

  it("restores previously visited sources on mount", () => {
    localStorage.setItem(KEY, JSON.stringify(["greenhouse", "lever"]));
    const { result } = renderHook(() => useVisited());
    expect(result.current.hasVisited).toBe(true);
    expect(result.current.isVisited("greenhouse")).toBe(true);
    expect(result.current.isVisited("lever")).toBe(true);
    expect(result.current.isVisited("ashby")).toBe(false);
  });

  it("marks a source visited and persists it", () => {
    const { result } = renderHook(() => useVisited());
    act(() => result.current.markVisited("greenhouse"));
    expect(result.current.isVisited("greenhouse")).toBe(true);
    expect(stored()).toEqual(["greenhouse"]);
  });

  it("does not duplicate an already visited source", () => {
    const { result } = renderHook(() => useVisited());
    act(() => result.current.markVisited("greenhouse"));
    act(() => result.current.markVisited("greenhouse"));
    expect(stored()).toEqual(["greenhouse"]);
  });

  it("keeps the most recent marks when the cap is exceeded", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify(Array.from({ length: VISITED_LIMIT }, (_, i) => `old-${i}`)),
    );
    const { result } = renderHook(() => useVisited());
    act(() => result.current.markVisited("newest"));

    const ids = stored();
    expect(ids).toHaveLength(VISITED_LIMIT);
    expect(ids[ids.length - 1]).toBe("newest");
    expect(ids).not.toContain("old-0");
  });

  it("ignores malformed stored values", () => {
    for (const bad of ['{"a":1}', '"nope"', "[1,null,2,\"\"]"]) {
      localStorage.setItem(KEY, bad);
      const { result, unmount } = renderHook(() => useVisited());
      expect(result.current.hasVisited).toBe(false);
      unmount();
    }
  });

  it("clears state and storage on resetVisited", () => {
    localStorage.setItem(KEY, JSON.stringify(["greenhouse", "lever"]));
    const { result } = renderHook(() => useVisited());
    act(() => result.current.resetVisited());
    expect(result.current.hasVisited).toBe(false);
    expect(result.current.isVisited("greenhouse")).toBe(false);
    expect(stored()).toEqual([]);
  });
});
