import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchToolbar } from "./SearchToolbar";

const base = {
  title: "",
  keywords: "",
  excludes: "",
  timeFilter: "24h",
  location: "any",
};

function setup(overrides: Partial<typeof base> = {}) {
  const onChange = vi.fn();
  const onSubmit = vi.fn();
  render(
    <SearchToolbar {...base} {...overrides} onChange={onChange} onSubmit={onSubmit} />,
  );
  return { onChange, onSubmit };
}

describe("SearchToolbar", () => {
  it("renders the three trigger pills", () => {
    setup();
    expect(screen.getByRole("button", { name: /Past 24 hrs/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Any location/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /More filters/ })).toBeInTheDocument();
  });

  it("selects a time option from the dropdown", () => {
    const { onChange } = setup();
    fireEvent.pointerDown(screen.getByRole("button", { name: /Past 24 hrs/ }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Past Week/ }));
    expect(onChange).toHaveBeenCalledWith({ timeFilter: "week" });
  });

  it("expands a region and selects a country inside it", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Any location/ }));
    fireEvent.click(screen.getByRole("button", { name: "Expand Asia-Pacific" }));
    expect(screen.getByRole("button", { name: "India" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "India" }));
    expect(onChange).toHaveBeenCalledWith({ location: "india" });
  });

  it("selects a whole region", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Any location/ }));
    fireEvent.click(screen.getByRole("button", { name: "Europe" }));
    expect(onChange).toHaveBeenCalledWith({ location: "europe" });
  });

  it("shows a combined trigger label and keeps ticks on multiple values", () => {
    setup({ location: "remote,germany" });
    expect(
      screen.getByRole("button", { name: "Remote, Germany" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remote, Germany" }));
    const remoteRow = screen.getByRole("button", { name: "Remote" });
    const hybridRow = screen.getByRole("button", { name: "Hybrid" });
    expect(remoteRow.querySelector("svg")).toBeInTheDocument();
    expect(hybridRow.querySelector("svg")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expand Europe" }));
    const germanyRow = screen.getByRole("button", { name: "Germany" });
    expect(germanyRow.querySelector("svg")).toBeInTheDocument();
  });

  it("clears countries but keeps modes when Any location is clicked", () => {
    const { onChange } = setup({ location: "hybrid,germany" });
    fireEvent.click(screen.getByRole("button", { name: "Hybrid, Germany" }));
    fireEvent.click(screen.getByRole("button", { name: "Any location" }));
    expect(onChange).toHaveBeenCalledWith({ location: "hybrid" });
  });

  it("shows keywords and excludes fields in More filters", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /More filters/ }));
    expect(screen.getByLabelText("Extra keywords")).toBeInTheDocument();
    expect(screen.getByLabelText("Exclude words")).toBeInTheDocument();
  });

  it("does not submit when title is empty", () => {
    const { onSubmit } = setup({ title: "" });
    const form = screen
      .getByRole("button", { name: "Start search" })
      .closest("form") as HTMLFormElement;
    fireEvent.submit(form);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits when title is non-empty", () => {
    const { onSubmit } = setup({ title: "Designer" });
    const form = screen
      .getByRole("button", { name: "Start search" })
      .closest("form") as HTMLFormElement;
    fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalled();
  });
});
