import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BackdropImage } from "./BackdropImage";

function layers(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>("div")];
}

function images(container: HTMLElement): string[] {
  return layers(container)
    .map((el) => el.style.backgroundImage)
    .filter((v) => v.length > 0);
}

describe("BackdropImage", () => {
  it("renders the base gradient plus a single opaque photo layer", () => {
    const { container } = render(<BackdropImage image="/a.jpg" outgoing={null} />);
    const els = layers(container);
    expect(els).toHaveLength(2);
    expect(els[0].className).toContain("bg-gradient-to-br");
    expect(images(container)).toHaveLength(1);
    expect(images(container)[0]).toContain("a.jpg");
    // No fade on first paint — the photo is fully visible immediately.
    expect(els[1].className).not.toContain("animate-");
  });

  it("stacks the outgoing image underneath and fades the new one in", () => {
    const { container } = render(
      <BackdropImage image="/b.jpg" outgoing="/a.jpg" />,
    );
    expect(images(container)).toEqual([
      expect.stringContaining("a.jpg"),
      expect.stringContaining("b.jpg"),
    ]);
    const incoming = layers(container)[2];
    expect(incoming.className).toContain("backdrop-fade-in");
    expect(incoming.className).toContain("motion-reduce:animate-none");
  });
});
