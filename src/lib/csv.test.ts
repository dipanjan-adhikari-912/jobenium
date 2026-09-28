import { describe, it, expect } from "vitest";
import { parseCsvRows } from "./csv";

describe("parseCsvRows", () => {
  it("parses plain rows and fields", () => {
    expect(parseCsvRows("a,b,c\n1,2,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("keeps quoted commas inside one field", () => {
    expect(parseCsvRows('a,"x,y",z\n')).toEqual([["a", "x,y", "z"]]);
  });

  it("unescapes doubled quotes", () => {
    expect(parseCsvRows('"-""No longer accepting applications"" ""apply"""\n')).toEqual([
      ['-"No longer accepting applications" "apply"'],
    ]);
  });

  it("skips blank lines", () => {
    expect(parseCsvRows("a,b\n\nc,d\n\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsvRows("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("parses a final line without a trailing newline", () => {
    expect(parseCsvRows("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("strips a leading BOM", () => {
    expect(parseCsvRows("\uFEFFa,b\n")).toEqual([["a", "b"]]);
  });

  it("keeps newlines inside quoted fields", () => {
    expect(parseCsvRows('"line1\nline2",b\n')).toEqual([
      ["line1\nline2", "b"],
    ]);
  });
});
