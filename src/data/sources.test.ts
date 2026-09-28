import { describe, it, expect } from "vitest";
import { parseSources, sources, SOURCE_GROUPS } from "./sources";
import { SOURCE_TABS } from "./sourceTabs";
import { COUNTRY_CODES } from "@/lib/locations";

describe("sources.csv", () => {
  it("parses every source row", () => {
    expect(sources.length).toBe(273);
  });

  it("has an ISO alpha-3 code for every country_ids token on Country rows", () => {
    const countryRows = sources.filter((s) => s.badge === "Country");
    expect(countryRows.length).toBeGreaterThan(0);
    for (const s of countryRows) {
      for (const id of s.countryIds ?? []) {
        expect(COUNTRY_CODES[id], `missing code for "${id}" (${s.id})`).toBeTypeOf("string");
      }
    }
  });

  it("only contains known groups", () => {
    for (const s of sources) {
      expect(SOURCE_GROUPS).toContain(s.group);
    }
  });

  it("splits semicolon-separated sites", () => {
    const recruitee = sources.find((s) => s.id === "recruitee");
    expect(recruitee?.sites).toEqual(["recruitee.com", "tellent.com"]);
  });

  it("round-trips suffixes containing quotes", () => {
    const linkedin = sources.find((s) => s.id === "linkedin-google");
    expect(linkedin?.suffix).toBe(
      '-"No longer accepting applications" "apply"',
    );
    expect(linkedin?.badge).toBe("Popular");
  });

  it("keeps career-page wildcards", () => {
    const career = sources.find((s) => s.id === "career-pages");
    expect(career?.sites).toContain("jobs.*");
    expect(career?.sites).toContain("*/careers/*");
    expect(career?.sites.length).toBe(12);
    expect(career?.group).toBe("Career Pages");
  });

  it("binds the linkedin-direct mode to its URL builder", () => {
    const direct = sources.find((s) => s.id === "linkedin-direct");
    expect(direct?.customUrl).toBeTypeOf("function");
    expect(direct?.customUrl?.({ title: "SDE", timeFilterId: "qdr:d" })).toContain(
      "linkedin.com",
    );
  });

  it("gives regular sources no customUrl", () => {
    const greenhouse = sources.find((s) => s.id === "greenhouse");
    expect(greenhouse?.customUrl).toBeUndefined();
  });

  it("parses normalized country ids (uk → united-kingdom)", () => {
    const wttj = sources.find((s) => s.id === "welcome-to-the-jungle");
    expect(wttj?.countryIds).toEqual([
      "france",
      "germany",
      "united-kingdom",
      "netherlands",
      "spain",
      "europe",
    ]);
    for (const s of sources) {
      expect(s.countryIds ?? []).not.toContain("uk");
    }
  });

  it("parses country rankings", () => {
    const indeed = sources.find((s) => s.id === "indeed");
    expect(indeed?.countryRankings).toEqual({ "united-states": 1 });
  });

  it("maps work_mode tokens and treats mixed/unknown as match-all", () => {
    const greenhouse = sources.find((s) => s.id === "greenhouse");
    expect(greenhouse?.workMode).toBeUndefined();
    const remote = sources.find((s) => s.id === "we-work-remotely");
    expect(remote?.workMode).toEqual(["remote"]);
    const wellfound = sources.find((s) => s.id === "wellfound");
    expect(wellfound?.workMode).toEqual(["remote", "hybrid", "in-office"]);
  });

  it("parses priority as a number", () => {
    expect(sources.find((s) => s.id === "greenhouse")?.priority).toBe(60);
    for (const s of sources) {
      expect(typeof s.priority).toBe("number");
    }
  });

  it("parses public-portal rows with direct source urls", () => {
    const portal = sources.find((s) => s.id === "arbeitsagentur");
    expect(portal?.sourceType).toBe("public_portal");
    expect(portal?.sourceUrl).toBe("https://www.arbeitsagentur.de/jobsuche/");
  });

  it("keeps rows without a source_type/url empty", () => {
    const greenhouse = sources.find((s) => s.id === "greenhouse");
    expect(greenhouse?.sourceType).toBeUndefined();
    expect(greenhouse?.sourceUrl).toBeUndefined();
  });

  it("covers every built-in group with a tab", () => {
    const tabbed = new Set(SOURCE_TABS.flatMap((t) => t.groups));
    for (const s of sources) {
      expect(tabbed).toContain(s.group);
    }
    for (const g of SOURCE_GROUPS) {
      if (g === "My boards") continue;
      expect(tabbed).toContain(g);
    }
  });

  it("rejects unknown groups", () => {
    expect(() =>
      parseSources("id,name,group,sites\nx,X,Not a group,a.com\n"),
    ).toThrow(/unknown group/);
  });

  it("rejects duplicate ids", () => {
    expect(() =>
      parseSources(
        "id,name,group,sites\nx,X,Job boards,a.com\nx,Y,Job boards,b.com\n",
      ),
    ).toThrow(/duplicate id/);
  });

  it("rejects unknown columns", () => {
    expect(() =>
      parseSources("id,name,group,sites,color\nx,X,Job boards,a.com,red\n"),
    ).toThrow(/unknown column/);
  });

  it("rejects query-mode rows without sites", () => {
    expect(() =>
      parseSources("id,name,group,sites\nx,X,Job boards,\n"),
    ).toThrow(/no sites/);
  });

  it("rejects unknown country_ids tokens", () => {
    expect(() =>
      parseSources(
        "id,name,group,sites,country_ids\nx,X,Job boards,a.com,atlantis\n",
      ),
    ).toThrow(/unknown country_ids token/);
  });

  it("rejects unknown work_mode tokens", () => {
    expect(() =>
      parseSources(
        "id,name,group,sites,work_mode\nx,X,Job boards,a.com,teleport\n",
      ),
    ).toThrow(/unknown work_mode token/);
  });

  it("rejects invalid priorities", () => {
    expect(() =>
      parseSources("id,name,group,sites,priority\nx,X,Job boards,a.com,high\n"),
    ).toThrow(/invalid priority/);
  });

  it("rejects unknown source_type values", () => {
    expect(() =>
      parseSources(
        "id,name,group,sites,source_type\nx,X,Job boards,a.com,rocket\n",
      ),
    ).toThrow(/unknown source_type/);
  });

  it("rejects malformed country_rankings entries", () => {
    expect(() =>
      parseSources(
        "id,name,group,sites,country_rankings\nx,X,Job boards,a.com,united-states\n",
      ),
    ).toThrow(/invalid country_rankings/);
  });

  it("rejects non-http source urls", () => {
    expect(() =>
      parseSources(
        "id,name,group,sites,source_url\nx,X,Job boards,a.com,ftp://example.com\n",
      ),
    ).toThrow(/source_url must start with http/);
  });
});
