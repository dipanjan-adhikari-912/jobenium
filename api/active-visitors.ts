/**
 * Real "active in the last hour" counter for the results footer.
 *
 * Reads Vercel Web Analytics through the public query API. The Vercel access
 * token must be set as the VERCEL_TOKEN environment variable on the project —
 * it is never read from the repo. VERCEL_PROJECT_ID and VERCEL_TEAM_ID are
 * injected into functions by Vercel automatically.
 *
 * This endpoint is public, so it is deliberately cheap to abuse-proof: GET
 * only, a per-IP burst cap, and a CDN cache header so repeat polling never
 * reaches the function. Any misconfiguration or upstream failure answers 503 on
 * purpose: the client hides the counter rather than showing an invented number.
 *
 * Note: this file has **no imports on purpose**. Vercel type-checks everything
 * in /api with its own config (node16 resolution, no ambient node types), so it
 * must compile without them. Env is read through a cast instead of `process`.
 */

const API = "https://api.vercel.com/v1/query/web-analytics";
const WINDOW_MINUTES = 60;
const CACHE_TTL_MS = 60_000;

/** Requests allowed per IP per minute. The UI polls once a minute. */
const MAX_REQUESTS_PER_MINUTE = 30;
/** Buckets are swept once the map grows past this, so memory stays bounded. */
const MAX_TRACKED_IPS = 5000;

type FetchLike = (
  input: string,
  init?: { headers?: Record<string, string> },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}>;

interface AggregateRow {
  timestamp?: string;
  visitors?: number;
}

interface QueryOptions {
  token: string;
  projectId: string;
  teamId: string | undefined;
  windowMinutes: number;
  now: Date;
  fetchImpl?: FetchLike;
}

function buildUrl(
  endpoint: "visits/aggregate",
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

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

/** Test seam: drops the in-memory cache and rate buckets between cases. */
export function resetActiveVisitorsCache(): void {
  cached = null;
  rateBuckets.clear();
}

/** Minimal shapes of the Vercel request/response, declared locally on purpose. */
interface ApiRequest {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
}

function readEnv(): Record<string, string | undefined> {
  const holder = globalThis as unknown as {
    process?: { env?: Record<string, string | undefined> };
  };
  return holder.process?.env ?? {};
}

function clientIp(req: ApiRequest): string {
  const forwarded = req.headers?.["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return (first ?? "").split(",")[0].trim() || "unknown";
}

function overRateLimit(ip: string, now: number): boolean {
  const bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    if (rateBuckets.size >= MAX_TRACKED_IPS) {
      for (const [key, value] of rateBuckets) {
        if (now > value.resetAt) rateBuckets.delete(key);
      }
    }
    rateBuckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_REQUESTS_PER_MINUTE;
}

export default async function handler(
  req: ApiRequest,
  res: ApiResponse,
): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  if (overRateLimit(clientIp(req), Date.now())) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  const env = readEnv();
  const token = env.VERCEL_TOKEN;
  const projectId = env.VERCEL_PROJECT_ID;
  if (!token || !projectId) {
    res.status(503).json({ error: "not_configured" });
    return;
  }

  // The payload is a non-personal aggregate, so the CDN may serve it for a
  // minute — repeat polling then never reaches the function.
  const sendCount = (visitors: number, at: number) => {
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
    res.status(200).json({
      visitors,
      windowMinutes: WINDOW_MINUTES,
      asOf: new Date(at).toISOString(),
    });
  };

  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    sendCount(cached.visitors, cached.at);
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
    sendCount(visitors, cached.at);
  } catch (error) {
    console.error("active-visitors failed", error);
    res.status(503).json({ error: "upstream_unavailable" });
  }
}
