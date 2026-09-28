import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import handler, {
  fetchActiveVisitors,
  resetActiveVisitorsCache,
} from "../../api/active-visitors";

/**
 * The function lives in /api and is type-checked by Vercel with its own config,
 * so its test lives here rather than beside it (Vercel would compile anything
 * in /api as a route). Env is mutated through the same cast the function uses,
 * which keeps `process` out of the browser type program.
 */
const env = (
  globalThis as unknown as { process: { env: Record<string, string | undefined> } }
).process.env;

function res() {
  const state: {
    code: number;
    body: unknown;
    headers: Record<string, string>;
  } = { code: 0, body: undefined, headers: {} };
  const api = {
    status(code: number) {
      state.code = code;
      return api;
    },
    json(body: unknown) {
      state.body = body;
    },
    setHeader(name: string, value: string) {
      state.headers[name] = value;
    },
  };
  return { api, state };
}

function req(ip = "203.0.113.7", method = "GET") {
  return { method, headers: { "x-forwarded-for": ip } };
}

function okFetch(payload: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => payload,
  });
}

const NOW = new Date("2026-09-28T12:30:00.000Z");

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
    expect(
      new URL(fetchImpl.mock.calls[0][0] as string).searchParams.has("teamId"),
    ).toBe(false);
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
  const original = {
    token: env.VERCEL_TOKEN,
    projectId: env.VERCEL_PROJECT_ID,
    teamId: env.VERCEL_TEAM_ID,
  };

  beforeEach(() => {
    resetActiveVisitorsCache();
    delete env.VERCEL_TOKEN;
    delete env.VERCEL_PROJECT_ID;
    delete env.VERCEL_TEAM_ID;
  });

  afterEach(() => {
    resetActiveVisitorsCache();
    if (original.token === undefined) delete env.VERCEL_TOKEN;
    else env.VERCEL_TOKEN = original.token;
    if (original.projectId === undefined) delete env.VERCEL_PROJECT_ID;
    else env.VERCEL_PROJECT_ID = original.projectId;
    if (original.teamId === undefined) delete env.VERCEL_TEAM_ID;
    else env.VERCEL_TEAM_ID = original.teamId;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("answers 503 when the token is not configured", async () => {
    env.VERCEL_PROJECT_ID = "prj_1";
    const { api, state } = res();
    await handler(req(), api);
    expect(state.code).toBe(503);
    expect(state.body).toEqual({ error: "not_configured" });
  });

  it("answers 503 when the project id is missing", async () => {
    env.VERCEL_TOKEN = "tok";
    const { api, state } = res();
    await handler(req(), api);
    expect(state.code).toBe(503);
  });

  it("returns the visitor count when configured", async () => {
    env.VERCEL_TOKEN = "tok";
    env.VERCEL_PROJECT_ID = "prj_1";
    env.VERCEL_TEAM_ID = "team_1";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ visitors: 7 }] }),
      }),
    );

    const { api, state } = res();
    await handler(req(), api);
    expect(state.code).toBe(200);
    expect(state.body).toMatchObject({ visitors: 7, windowMinutes: 60 });
  });

  it("lets the CDN cache the aggregate", async () => {
    env.VERCEL_TOKEN = "tok";
    env.VERCEL_PROJECT_ID = "prj_1";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ visitors: 3 }] }),
      }),
    );

    const { api, state } = res();
    await handler(req(), api);
    expect(state.code).toBe(200);
    expect(state.headers["Cache-Control"]).toBe(
      "public, max-age=60, s-maxage=60",
    );
  });

  it("serves a cached count for a minute instead of querying again", async () => {
    env.VERCEL_TOKEN = "tok";
    env.VERCEL_PROJECT_ID = "prj_1";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ visitors: 9 }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = res();
    await handler(req(), first.api);
    const second = res();
    await handler(req(), second.api);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second.state.body).toMatchObject({ visitors: 9 });
  });

  it("rejects non-GET methods", async () => {
    const { api, state } = res();
    await handler(req("198.51.100.1", "POST"), api);
    expect(state.code).toBe(405);
    expect(state.headers.Allow).toBe("GET");
  });

  it("rate limits one IP and still serves another", async () => {
    env.VERCEL_TOKEN = "tok";
    env.VERCEL_PROJECT_ID = "prj_1";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ visitors: 1 }] }),
      }),
    );

    const codes: number[] = [];
    for (let i = 0; i < 32; i++) {
      const { api, state } = res();
      await handler(req("198.51.100.9"), api);
      codes.push(state.code);
    }
    expect(codes[0]).toBe(200);
    expect(codes.filter((c) => c === 429)).toHaveLength(2);

    const other = res();
    await handler(req("198.51.100.10"), other.api);
    expect(other.state.code).toBe(200);
  });

  it("answers 503 when the upstream is unavailable", async () => {
    env.VERCEL_TOKEN = "tok";
    env.VERCEL_PROJECT_ID = "prj_1";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
        text: async () => "unauthorized",
      }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { api, state } = res();
    await handler(req(), api);
    expect(state.code).toBe(503);
    expect(state.body).toEqual({ error: "upstream_unavailable" });
  });
});
