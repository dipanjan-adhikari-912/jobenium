import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import handler, {
  fetchActiveVisitors,
  resetActiveVisitorsCache,
} from "./active-visitors";

const NOW = new Date("2026-09-28T12:30:00.000Z");

function res() {
  const state: { code: number; body: unknown } = { code: 0, body: undefined };
  const api = {
    status(code: number) {
      state.code = code;
      return api;
    },
    json(body: unknown) {
      state.body = body;
    },
  };
  return { api, state };
}

function okFetch(payload: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => payload,
  });
}

const baseOpts = {
  token: "tok",
  projectId: "prj_1",
  teamId: "team_1",
  windowMinutes: 60,
  now: NOW,
};

describe("fetchActiveVisitors", () => {
  it("sums the visitor counts of the returned hourly buckets", async () => {
    const fetchImpl = okFetch({
      data: [
        { timestamp: "2026-09-28T11:00:00.000Z", visitors: 3 },
        { timestamp: "2026-09-28T12:00:00.000Z", visitors: 5 },
      ],
    });
    await expect(fetchActiveVisitors({ ...baseOpts, fetchImpl })).resolves.toBe(8);
  });

  it("queries the project (and team) with a one-hour window", async () => {
    const fetchImpl = okFetch({ data: [{ visitors: 1 }] });
    await fetchActiveVisitors({ ...baseOpts, fetchImpl });
    const url = new URL(fetchImpl.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/v1/query/web-analytics/visits/aggregate");
    expect(url.searchParams.get("projectId")).toBe("prj_1");
    expect(url.searchParams.get("teamId")).toBe("team_1");
    expect(url.searchParams.get("by")).toBe("hour");
    expect(url.searchParams.get("since")).toBe("2026-09-28T11:30:00.000Z");
    expect(url.searchParams.get("until")).toBe("2026-09-28T12:30:00.000Z");
    expect(fetchImpl.mock.calls[0][1]).toEqual({
      headers: { Authorization: "Bearer tok" },
    });
  });

  it("omits teamId for personal projects", async () => {
    const fetchImpl = okFetch({ data: [] });
    await fetchActiveVisitors({ ...baseOpts, teamId: undefined, fetchImpl });
    expect(new URL(fetchImpl.mock.calls[0][0] as string).searchParams.has("teamId")).toBe(false);
  });

  it("treats a missing data array as zero visitors", async () => {
    await expect(
      fetchActiveVisitors({ ...baseOpts, fetchImpl: okFetch({}) }),
    ).resolves.toBe(0);
  });

  it("throws with the upstream detail so the bad parameter is visible", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({}),
      text: async () => '{"error":"invalid value for by"}',
    });
    await expect(fetchActiveVisitors({ ...baseOpts, fetchImpl })).rejects.toThrow(
      /400.*invalid value for by/,
    );
  });
});

describe("active-visitors handler", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetActiveVisitorsCache();
    delete process.env.VERCEL_TOKEN;
    delete process.env.VERCEL_PROJECT_ID;
    delete process.env.VERCEL_TEAM_ID;
  });

  afterEach(() => {
    process.env.VERCEL_TOKEN = originalEnv.VERCEL_TOKEN;
    process.env.VERCEL_PROJECT_ID = originalEnv.VERCEL_PROJECT_ID;
    if (originalEnv.VERCEL_TEAM_ID) process.env.VERCEL_TEAM_ID = originalEnv.VERCEL_TEAM_ID;
    else delete process.env.VERCEL_TEAM_ID;
    vi.unstubAllGlobals();
  });

  it("answers 503 when the token is not configured", async () => {
    process.env.VERCEL_PROJECT_ID = "prj_1";
    const { api, state } = res();
    await handler({}, api);
    expect(state.code).toBe(503);
    expect(state.body).toEqual({ error: "not_configured" });
  });

  it("answers 503 when the project id is missing", async () => {
    process.env.VERCEL_TOKEN = "tok";
    const { api, state } = res();
    await handler({}, api);
    expect(state.code).toBe(503);
  });

  it("returns the visitor count when configured", async () => {
    process.env.VERCEL_TOKEN = "tok";
    process.env.VERCEL_PROJECT_ID = "prj_1";
    process.env.VERCEL_TEAM_ID = "team_1";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ visitors: 7 }] }),
      }),
    );

    const { api, state } = res();
    await handler({}, api);
    expect(state.code).toBe(200);
    expect(state.body).toMatchObject({ visitors: 7, windowMinutes: 60 });
  });

  it("serves a cached count for a minute instead of querying again", async () => {
    process.env.VERCEL_TOKEN = "tok";
    process.env.VERCEL_PROJECT_ID = "prj_1";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ visitors: 9 }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = res();
    await handler({}, first.api);
    const second = res();
    await handler({}, second.api);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second.state).toMatchObject({ code: 200 });
    expect(second.state.body).toMatchObject({ visitors: 9 });
  });

  it("answers 503 when the upstream is unavailable", async () => {
    process.env.VERCEL_TOKEN = "tok";
    process.env.VERCEL_PROJECT_ID = "prj_1";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}), text: async () => 'unauthorized' }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { api, state } = res();
    await handler({}, api);
    expect(state.code).toBe(503);
    expect(state.body).toEqual({ error: "upstream_unavailable" });
  });
});
