import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useActiveVisitors } from "./useActiveVisitors";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

/** Lets the in-flight fetch promise settle and its state update apply. */
async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("useActiveVisitors", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("starts hidden while the first request is in flight", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { visitors: 12 })),
    );
    const { result } = renderHook(() => useActiveVisitors());
    expect(result.current).toBeNull();
    await flush();
  });

  it("resolves to the visitor count", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { visitors: 12 })),
    );
    const { result } = renderHook(() => useActiveVisitors());
    await flush();
    expect(result.current).toBe(12);
  });

  it("stays null when the endpoint is unconfigured", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(503, { error: "not_configured" })),
    );
    const { result } = renderHook(() => useActiveVisitors());
    await flush();
    expect(result.current).toBeNull();
  });

  it("stays null when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { result } = renderHook(() => useActiveVisitors());
    await flush();
    expect(result.current).toBeNull();
  });

  it("ignores a malformed payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { visitors: "many" })),
    );
    const { result } = renderHook(() => useActiveVisitors());
    await flush();
    expect(result.current).toBeNull();
  });

  it("polls every minute and stops on unmount", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { visitors: 4 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result, unmount } = renderHook(() => useActiveVisitors());

    await flush();
    expect(result.current).toBe(4);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await flush(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    unmount();
    await flush(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
