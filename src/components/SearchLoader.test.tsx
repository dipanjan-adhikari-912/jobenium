import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchLoader, SEARCH_TRANSITION_MS } from "./SearchLoader";

describe("SearchLoader", () => {
  it("renders the headline and first status line", () => {
    render(<SearchLoader />);
    expect(screen.getByText("Searching 50+ job boards…")).toBeInTheDocument();
    expect(screen.getByText("Querying Greenhouse…")).toBeInTheDocument();
  });

  it("exposes a status region for screen readers", () => {
    render(<SearchLoader />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("matches one full loop of the animated logo", () => {
    expect(SEARCH_TRANSITION_MS).toBe(5000);
  });
});
