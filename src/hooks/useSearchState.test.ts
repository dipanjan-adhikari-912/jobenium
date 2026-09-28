import { describe, it, expect } from "vitest";
import { stateToQs } from "./useSearchState";

const base = { title: "Dev", keywords: "", excludes: "", timeFilter: "24h", location: "any" };

describe("stateToQs", () => {
  it("includes only the title by default", () => {
    expect(stateToQs(base)).toBe("title=Dev");
  });

  it("returns an empty string for empty state with defaults", () => {
    expect(stateToQs({ ...base, title: "" })).toBe("");
  });

  it("includes keywords and excludes when set", () => {
    expect(stateToQs({ ...base, keywords: "react", excludes: "junior" })).toBe(
      "title=Dev&keywords=react&excludes=junior",
    );
  });

  it("includes non-default timeFilter and location", () => {
    expect(stateToQs({ ...base, timeFilter: "week", location: "apac" })).toBe(
      "title=Dev&timeFilter=week&location=apac",
    );
  });

  it("encodes spaces", () => {
    expect(stateToQs({ ...base, title: "Product designer" })).toBe(
      "title=Product+designer",
    );
  });
});
