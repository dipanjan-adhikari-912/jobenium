import { describe, expect, it } from "vitest";

import { type Source, sources as allSources } from "@/data/sources";
import { applyLocation, filterSources, sortSources } from "@/lib/sourceMatch";

function src(partial: Partial<Source> & { id: string }): Source {
  return { name: partial.id, group: "Job boards", sites: ["x.com"], ...partial };
}

const fixtures: Source[] = [
  src({ id: "global", priority: 50 }),
  src({ id: "poland-ranked-2", countryIds: ["poland"], countryRankings: { poland: 2 }, priority: 90 }),
  src({ id: "poland-ranked-1", countryIds: ["poland"], countryRankings: { poland: 1 }, priority: 40 }),
  src({ id: "poland-unranked", countryIds: ["poland"], priority: 99 }),
  src({ id: "us-only", countryIds: ["united-states"], priority: 95 }),
  src({ id: "europe-token", countryIds: ["europe"], priority: 70 }),
  src({ id: "remote-only", workMode: ["remote"], priority: 60 }),
  src({ id: "hybrid-only", workMode: ["hybrid"], priority: 61 }),
  src({ id: "in-office-only", workMode: ["in-office"], priority: 62 }),
  src({ id: "match-all", workMode: undefined, priority: 55 }),
];

describe("filterSources", () => {
  it("passes everything for any/empty location", () => {
    expect(filterSources(fixtures, "any")).toHaveLength(fixtures.length);
    expect(filterSources(fixtures, "")).toHaveLength(fixtures.length);
  });

  it("keeps global sources (no countryIds) and drops other-country sources", () => {
    const ids = filterSources(fixtures, "poland").map((s) => s.id);
    expect(ids).toContain("global");
    expect(ids).toContain("match-all");
    expect(ids).not.toContain("us-only");
  });

  it("expands a selected region to its countries", () => {
    const ids = filterSources(fixtures, "europe").map((s) => s.id);
    expect(ids).toContain("poland-ranked-1");
    expect(ids).toContain("europe-token");
    expect(ids).not.toContain("us-only");
  });

  it("expands a region token stored on the source", () => {
    const ids = filterSources(fixtures, "france").map((s) => s.id);
    expect(ids).toContain("europe-token");
    expect(ids).not.toContain("poland-ranked-1");
  });

  it("matches any selected mode (remote OR hybrid)", () => {
    const ids = filterSources(fixtures, "remote,hybrid").map((s) => s.id);
    expect(ids).toContain("remote-only");
    expect(ids).toContain("hybrid-only");
    expect(ids).not.toContain("in-office-only");
  });

  it("lets match-all sources pass any mode selection", () => {
    const ids = filterSources(fixtures, "remote").map((s) => s.id);
    expect(ids).toContain("match-all");
    expect(ids).toContain("global");
    expect(ids).not.toContain("in-office-only");
  });

  it("ANDs country and mode filters", () => {
    const ids = filterSources(fixtures, "poland,remote").map((s) => s.id);
    expect(ids).toContain("match-all");
    expect(ids).toContain("remote-only");
    expect(ids).not.toContain("in-office-only");
    expect(ids).not.toContain("us-only");
  });
});

describe("sortSources", () => {
  it("orders by priority desc with ties kept in CSV order", () => {
    const ids = sortSources(fixtures, "any").map((s) => s.id);
    expect(ids.slice(0, 4)).toEqual([
      "poland-unranked",
      "us-only",
      "poland-ranked-2",
      "europe-token",
    ]);
    expect(ids.indexOf("global")).toBeGreaterThan(ids.indexOf("match-all"));
  });

  it("puts sources without priority (customs) last", () => {
    const customs = src({ id: "my-custom" });
    const ids = sortSources([...fixtures, customs], "any").map((s) => s.id);
    expect(ids[ids.length - 1]).toBe("my-custom");
  });

  it("ranks by best country_rankings first when countries are selected", () => {
    const ids = sortSources(fixtures, "poland").map((s) => s.id);
    expect(ids.slice(0, 2)).toEqual(["poland-ranked-1", "poland-ranked-2"]);
    // Unranked-but-matching sources sort after ranked ones (Infinity rank).
    expect(ids.indexOf("poland-unranked")).toBeGreaterThan(
      ids.indexOf("poland-ranked-2"),
    );
  });
});

describe("applyLocation with real data", () => {
  it("keeps every source for any", () => {
    expect(applyLocation(allSources, "any")).toHaveLength(allSources.length);
  });

  it("orders Polish boards pracuj → justjoinit → nofluffjobs → rocketjobs → theprotocol", () => {
    const ids = applyLocation(allSources, "poland")
      .slice(0, 5)
      .map((s) => s.id);
    expect(ids).toEqual([
      "pracuj",
      "justjoinit",
      "nofluffjobs",
      "rocketjobs",
      "theprotocol",
    ]);
  });

  it("never drops global boards under a country filter", () => {
    const ids = new Set(
      applyLocation(allSources, "poland,remote").map((s) => s.id),
    );
    expect(ids.has("greenhouse")).toBe(true);
    expect(ids.has("linkedin-direct")).toBe(true);
  });
});
