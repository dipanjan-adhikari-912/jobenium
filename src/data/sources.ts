import { buildLinkedInDirectUrl } from "@/lib/buildQuery";
import { parseCsvRows } from "@/lib/csv";
import { REGION_GROUPS } from "@/lib/locations";
import rawSources from "./sources.csv?raw";

export interface Source {
  id: string;
  name: string;
  group: SourceGroup;
  sites: string[];
  suffix?: string;
  badge?: string;
  customUrl?: (ctx: { title: string; timeFilterId: string }) => string;
  custom?: boolean;
  countries?: string;
  countryIds?: string[];
  countryRankings?: Record<string, number>;
  regions?: string;
  /** Empty array or absent = matches any work mode (CSV "mixed"/"unknown"). */
  workMode?: string[];
  roles?: string;
  companyStage?: string;
  priority?: number;
  description?: string;
  sourceType?: string;
  focus?: string;
  sourceUrl?: string;
}

export type SourceGroup =
  | "ATS platforms"
  | "Other ATS"
  | "Job boards"
  | "Country"
  | "Specialist"
  | "Startup / VC"
  | "Communities"
  | "Career Pages"
  | "My boards";

export const SOURCE_GROUPS: readonly SourceGroup[] = [
  "ATS platforms",
  "Other ATS",
  "Job boards",
  "Country",
  "Specialist",
  "Startup / VC",
  "Communities",
  "Career Pages",
  "My boards",
] as const;

export const SOURCE_TYPES = [
  "job_board",
  "specialist",
  "public_portal",
  "professional",
  "community",
] as const;

const WORK_MODE_TOKENS = ["remote", "hybrid", "onsite", "mixed", "unknown"] as const;
/** "onsite" in the CSV is the app's "in-office". */
const WORK_MODE_MAP: Record<string, string> = {
  remote: "remote",
  hybrid: "hybrid",
  onsite: "in-office",
};

const LOCATION_IDS = new Set<string>([
  ...REGION_GROUPS.map((r) => r.id),
  ...REGION_GROUPS.flatMap((r) => r.countries.map((c) => c.id)),
]);

const OPTIONAL_COLUMNS = [
  "suffix",
  "badge",
  "mode",
  "countries",
  "country_ids",
  "country_rankings",
  "regions",
  "work_mode",
  "roles",
  "company_stage",
  "priority",
  "description",
  "source_type",
  "focus",
  "source_url",
] as const;
const REQUIRED_COLUMNS = ["id", "name", "group", "sites"] as const;
const KNOWN_COLUMNS: readonly string[] = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

export function parseSources(csv: string): readonly Source[] {
  const rows = parseCsvRows(csv);
  if (rows.length === 0) {
    throw new Error("sources.csv: file is empty");
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const unknown = header.filter((h) => !KNOWN_COLUMNS.includes(h));
  if (unknown.length > 0) {
    throw new Error(
      `sources.csv: unknown column(s) ${unknown.join(", ")} — allowed: ${KNOWN_COLUMNS.join(", ")}`,
    );
  }
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    throw new Error(
      `sources.csv: missing required column(s) ${missing.join(", ")}`,
    );
  }

  const at = (name: string) => header.indexOf(name);
  const seenIds = new Set<string>();

  return rows.slice(1).map((cells, idx) => {
    const line = idx + 2;
    const cell = (name: string): string => {
      const col = at(name);
      return col === -1 ? "" : (cells[col] ?? "").trim();
    };
    const fail = (message: string): never => {
      throw new Error(`sources.csv line ${line}: ${message}`);
    };
    const optional = (name: string, assign: (value: string) => void) => {
      const value = cell(name);
      if (value) assign(value);
    };

    const id = cell("id");
    if (!id) fail("missing id");
    if (seenIds.has(id)) fail(`duplicate id "${id}"`);
    seenIds.add(id);

    const name = cell("name");
    if (!name) fail("missing name");

    const group = cell("group");
    if (!SOURCE_GROUPS.includes(group as SourceGroup)) {
      fail(`unknown group "${group}"`);
    }

    const sites = cell("sites")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    const mode = cell("mode") || "query";
    if (mode !== "query" && mode !== "linkedin-direct") {
      fail(`unknown mode "${mode}" (expected "query" or "linkedin-direct")`);
    }
    if (mode === "query" && sites.length === 0) fail("no sites listed");

    const source: Source = {
      id,
      name,
      group: group as SourceGroup,
      sites,
    };

    const suffix = cell("suffix");
    if (suffix) source.suffix = suffix;
    const badge = cell("badge");
    if (badge) source.badge = badge;

    optional("countries", (v) => (source.countries = v));
    optional("regions", (v) => (source.regions = v));
    optional("roles", (v) => (source.roles = v));
    optional("company_stage", (v) => (source.companyStage = v));
    optional("description", (v) => (source.description = v));
    optional("focus", (v) => (source.focus = v));

    const countryIds = cell("country_ids")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const cid of countryIds) {
      if (!LOCATION_IDS.has(cid)) fail(`unknown country_ids token "${cid}"`);
    }
    if (countryIds.length > 0) source.countryIds = countryIds;

    const rankingsRaw = cell("country_rankings");
    if (rankingsRaw) {
      const rankings: Record<string, number> = {};
      for (const pair of rankingsRaw.split(";")) {
        const entry = pair.trim();
        if (!entry) continue;
        const parts = entry.split(":");
        if (parts.length !== 2 || !parts[0] || !/^\d+$/.test(parts[1])) {
          fail(`invalid country_rankings entry "${entry}"`);
        }
        if (!LOCATION_IDS.has(parts[0])) {
          fail(`unknown country_rankings country "${parts[0]}"`);
        }
        rankings[parts[0]] = Number(parts[1]);
      }
      source.countryRankings = rankings;
    }

    const workModeRaw = cell("work_mode");
    if (workModeRaw) {
      const mapped: string[] = [];
      for (const rawToken of workModeRaw.split("|")) {
        const token = rawToken.trim();
        if (!token) continue;
        if (!(WORK_MODE_TOKENS as readonly string[]).includes(token)) {
          fail(`unknown work_mode token "${token}"`);
        }
        if (token === "mixed" || token === "unknown") continue;
        mapped.push(WORK_MODE_MAP[token]);
      }
      if (mapped.length > 0) source.workMode = mapped;
    }

    const priorityRaw = cell("priority");
    if (priorityRaw) {
      if (!/^\d+$/.test(priorityRaw)) fail(`invalid priority "${priorityRaw}"`);
      source.priority = Number(priorityRaw);
    }

    const sourceType = cell("source_type");
    if (sourceType) {
      if (!(SOURCE_TYPES as readonly string[]).includes(sourceType)) {
        fail(`unknown source_type "${sourceType}"`);
      }
      source.sourceType = sourceType;
    }

    const sourceUrl = cell("source_url");
    if (sourceUrl) {
      if (!/^https?:\/\//.test(sourceUrl)) {
        fail(`source_url must start with http(s): "${sourceUrl}"`);
      }
      source.sourceUrl = sourceUrl;
    }

    if (mode === "linkedin-direct") {
      source.customUrl = (ctx) =>
        buildLinkedInDirectUrl(ctx.title, ctx.timeFilterId);
    }
    return source;
  });
}

export const sources: readonly Source[] = parseSources(rawSources);
