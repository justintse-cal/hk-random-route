import { describe, expect, it } from "vitest";
import { dict, formatDistance, formatDuration, t } from "./i18n";

describe("i18n dictionary", () => {
  it("defines every key in both languages", () => {
    const tcKeys = Object.keys(dict.tc).sort();
    const enKeys = Object.keys(dict.en).sort();
    expect(tcKeys).toEqual(enKeys);
  });

  it("has no empty strings or stray placeholder braces", () => {
    for (const lang of ["tc", "en"] as const) {
      for (const [key, value] of Object.entries(dict[lang])) {
        expect(value.length, `${lang}.${key}`).toBeGreaterThan(0);
        if (!value.includes("{")) {
          expect(value, `${lang}.${key}`).not.toContain("}");
        }
      }
    }
  });

  it("formats distances in the requested language", () => {
    expect(formatDistance("en", 3200)).toBe("3.2 km");
    expect(formatDistance("en", 800)).toBe("800 m");
    expect(formatDistance("tc", 12000)).toBe("12 公里");
  });

  it("formats durations", () => {
    expect(formatDuration("en", 42 * 60)).toBe("42 min");
    expect(formatDuration("en", 90 * 60)).toBe("1 h 30 min");
    expect(t("tc", "app.title")).toBe("HK 隨機路線");
  });
});
