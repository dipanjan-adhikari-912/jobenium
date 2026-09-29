import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SourcesDirectory } from "./SourcesDirectory";
import { type Source } from "@/data/sources";

const greenhouse: Source = {
  id: "greenhouse",
  name: "Greenhouse",
  group: "ATS platforms",
  sites: ["greenhouse.io"],
};

function renderDirectory(onVisit = vi.fn()) {
  render(
    <SourcesDirectory
      sources={[greenhouse]}
      timeSpent="01h:00m"
      location="any"
      activeTab={0}
      focusedId={null}
      linkBehavior="new-tab"
      getUrl={() => "https://example.com/search"}
      isVisited={() => false}
      disabledSources={[]}
      onTabChange={vi.fn()}
      onLocationChange={vi.fn()}
      onVisit={onVisit}
      onToggleSource={vi.fn()}
    />,
  );
  return {
    onVisit,
    link: screen.getByLabelText("Open search on Greenhouse"),
  };
}

describe("SourceCard visit marking", () => {
  it("marks the source on a normal click", () => {
    const { onVisit, link } = renderDirectory();
    fireEvent.click(link);
    expect(onVisit).toHaveBeenCalledWith("greenhouse");
  });

  it("marks the source on a middle click (auxclick)", () => {
    const { onVisit, link } = renderDirectory();
    // fireEvent has no auxClick in this version; dispatch the native event.
    fireEvent(
      link,
      new MouseEvent("auxclick", { bubbles: true, cancelable: true, button: 1 }),
    );
    expect(onVisit).toHaveBeenCalledWith("greenhouse");
  });

  it("marks the source when the context menu opens (split view / new window)", () => {
    const { onVisit, link } = renderDirectory();
    fireEvent.contextMenu(link);
    expect(onVisit).toHaveBeenCalledWith("greenhouse");
  });
});
