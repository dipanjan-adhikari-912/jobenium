import { describe, it, expect, beforeEach } from "vitest";
import {
  formatTimeSpent,
  todayKey,
  loadTimeSpent,
  saveTimeSpent,
} from "./timeSpent";

describe("formatTimeSpent", () => {
  it("formats zero-padded hours and minutes", () => {
    expect(formatTimeSpent(0)).toBe("00h:00m");
    expect(formatTimeSpent(60)).toBe("00h:01m");
    expect(formatTimeSpent(65)).toBe("00h:01m");
    expect(formatTimeSpent(3600)).toBe("01h:00m");
    expect(formatTimeSpent(3671)).toBe("01h:01m");
    expect(formatTimeSpent(90061)).toBe("25h:01m");
  });

  it("drops sub-minute precision", () => {
    expect(formatTimeSpent(59)).toBe("00h:00m");
    expect(formatTimeSpent(119)).toBe("00h:01m");
  });

  it("clamps negative and non-finite values to 00h:00m", () => {
    expect(formatTimeSpent(-5)).toBe("00h:00m");
    expect(formatTimeSpent(Number.NaN)).toBe("00h:00m");
    expect(formatTimeSpent(Number.POSITIVE_INFINITY)).toBe("00h:00m");
  });
});

describe("todayKey", () => {
  it("formats the local calendar day as YYYY-MM-DD", () => {
    expect(todayKey(new Date(2026, 0, 5, 23, 59, 59))).toBe("2026-01-05");
    expect(todayKey(new Date(2026, 11, 31, 0, 0, 0))).toBe("2026-12-31");
  });
});

describe("loadTimeSpent / saveTimeSpent", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns a fresh zero record when storage is empty", () => {
    expect(loadTimeSpent()).toEqual({ d: todayKey(), s: 0 });
  });

  it("round-trips a valid record", () => {
    saveTimeSpent({ d: todayKey(), s: 125 });
    expect(loadTimeSpent()).toEqual({ d: todayKey(), s: 125 });
  });

  it("resets a record stored for a previous day", () => {
    localStorage.setItem(
      "jobenium:timeSpent",
      JSON.stringify({ d: "2020-01-01", s: 9999 }),
    );
    expect(loadTimeSpent()).toEqual({ d: todayKey(), s: 0 });
  });

  it("falls back to zero on malformed JSON", () => {
    localStorage.setItem("jobenium:timeSpent", "{not json");
    expect(loadTimeSpent()).toEqual({ d: todayKey(), s: 0 });
  });

  it("falls back to zero on invalid field types", () => {
    localStorage.setItem(
      "jobenium:timeSpent",
      JSON.stringify({ d: todayKey(), s: "soon" }),
    );
    expect(loadTimeSpent()).toEqual({ d: todayKey(), s: 0 });
  });

  it("clamps negative seconds on load", () => {
    localStorage.setItem(
      "jobenium:timeSpent",
      JSON.stringify({ d: todayKey(), s: -10 }),
    );
    expect(loadTimeSpent()).toEqual({ d: todayKey(), s: 0 });
  });
});
