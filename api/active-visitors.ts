/**
 * Real "active in the last hour" counter for the results footer.
 *
 * Reads Vercel Web Analytics through the public query API. The Vercel access
 * token must be set as the VERCEL_TOKEN environment variable on the project —
 * it is never read from the repo. VERCEL_PROJECT_ID and VERCEL_TEAM_ID are
 * injected into functions by Vercel automatically.
 *
 * Any misconfiguration or upstream failure answers 503 on purpose: the client
 * hides the counter rather than showing an invented number.
 */

const API = "https://api.vercel.com/v1/query/web-analytics";
const WINDOW_MINUTES = 60;
const CACHE_TTL_MS = 60_000;

type FetchLike = (
  input: string,
  init?: { headers?: Record<string, string> },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}>;

interface QueryOptions {
  token: string;
  projectId: string;
  teamId: string | undefined;
  windowMinutes: number;
  now: Date;
  fetchImpl?: FetchLike;
}

interface AggregateRow {
  timestamp?: string;
  visitors?: number;
}

function buildUrl(
  endpoint: "visits/aggregate" | "visits/count",
  opts: QueryOptions,
  extra: Record<string, string>,
): string {
  const url = new URL(`${API}/${endpoint}`);
  url.searchParams.set("projectId", opts.projectId);
  if (opts.teamId) url.searchParams.set("teamId", opts.teamId);
  url.searchParams.set(
    "since",
    new Date(opts.now.getTime() - opts.windowMinutes * 60_000).toISOString(),
  );
  url.searchParams.set("until", opts.now.toISOString());
  for (const [key, value] of Object.entries(extra)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

/**
 * Unique visitors across the trailing window. Uses the hourly aggregate so the
 * number is always attributable to the window: if Vercel rejects the query the
 * caller gets an error instead of an all-time total.
 */
export async function fetchActiveVisitors(opts: QueryOptions): Promise<number> {
  const doFetch: FetchLike = opts.fetchImpl ?? (fetch as unknown as FetchLike);
  const url = buildUrl("visits/aggregate", opts, { by: "hour" });
  const res = await doFetch(url, {
    headers: { Authorization: `Bearer ${opts.token}` },
  });
  if (!res.ok) {
    // Log the upstream message (truncated) — it names the offending parameter.
    // The token travels in a header, so it can never appear in the body.
    const detail = await res.text().catch(() => "");
    throw new Error(
      `vercel analytics responded ${res.status}: ${detail.slice(0, 300)}`,
    );
  }
  const body = (await res.json()) as { data?: AggregateRow[] };
  const rows = (body.data ?? []).filter(
    (row): row is AggregateRow & { visitors: number } =>
      typeof row.visitors === "number",
  );
  return rows.reduce((sum, row) => sum + row.visitors, 0);
}

let cached: { at: number; visitors: number } | null = null;

/** Test seam: drops the in-memory cache between cases. */
export function resetActiveVisitorsCache(): void {
  cached = null;
}

interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

export default async function handler(_req: unknown, res: Res): Promise<void> {
  const env = process.env;
  const token = env.VERCEL_TOKEN;
  const projectId = env.VERCEL_PROJECT_ID;
  if (!token || !projectId) {
    res.status(503).json({ error: "not_configured" });
    return;
  }

  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    res.status(200).json({
      visitors: cached.visitors,
      windowMinutes: WINDOW_MINUTES,
      asOf: new Date(cached.at).toISOString(),
    });
    return;
  }

  try {
    const visitors = await fetchActiveVisitors({
      token,
      projectId,
      teamId: env.VERCEL_TEAM_ID,
      windowMinutes: WINDOW_MINUTES,
      now: new Date(),
    });
    cached = { at: Date.now(), visitors };
    res.status(200).json({
      visitors,
      windowMinutes: WINDOW_MINUTES,
      asOf: new Date().toISOString(),
    });
  } catch (error) {
    console.error("active-visitors failed", error);
    res.status(503).json({ error: "upstream_unavailable" });
  }
}
