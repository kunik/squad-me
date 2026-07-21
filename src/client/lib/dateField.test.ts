import { describe, expect, it } from "vitest";
import {
  buildMonthGrid,
  compareIsoDates,
  formatIsoDisplay,
  parseDisplayDate,
  parseIsoDate,
  shiftMonth,
  toIsoDate,
  todayIsoDate,
} from "../lib/dateField";

describe("dateField helpers", () => {
  it("parses and formats ISO dates", () => {
    expect(parseIsoDate("1990-05-15")).toEqual({ year: 1990, month: 5, day: 15 });
    expect(parseIsoDate("1990-13-01")).toBeNull();
    expect(toIsoDate(1990, 5, 15)).toBe("1990-05-15");
    expect(formatIsoDisplay("1990-05-15", "ua")).toMatch(/15/);
  });

  it("parses typed display dates", () => {
    expect(parseDisplayDate("15.05.1990")).toEqual({ year: 1990, month: 5, day: 15 });
    expect(parseDisplayDate("15/05/1990")).toEqual({ year: 1990, month: 5, day: 15 });
    expect(parseDisplayDate("5-5-1990")).toEqual({ year: 1990, month: 5, day: 5 });
    expect(parseDisplayDate("1990-05-15")).toEqual({ year: 1990, month: 5, day: 15 });
    expect(parseDisplayDate("31.02.1990")).toBeNull();
    expect(parseDisplayDate("not a date")).toBeNull();
  });

  it("builds a Monday-first month grid", () => {
    // 2024-01-01 was Monday → first cell is Jan 1
    const january = buildMonthGrid(2024, 1);
    expect(january).toHaveLength(42);
    expect(january[0]).toEqual({ iso: "2024-01-01", day: 1, outside: false });
    expect(january[31].outside).toBe(true);
  });

  it("compares ISO dates and shifts months", () => {
    expect(compareIsoDates("2024-01-01", "2024-01-02")).toBe(-1);
    expect(shiftMonth(2024, 1, -1)).toEqual({ year: 2023, month: 12 });
    expect(shiftMonth(2023, 12, 1)).toEqual({ year: 2024, month: 1 });
  });

  it("returns a local today ISO date", () => {
    const now = new Date(2024, 6, 21, 23, 30);
    expect(todayIsoDate(now)).toBe("2024-07-21");
  });
});
