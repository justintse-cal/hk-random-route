import { describe, expect, it } from "vitest";
import {
  HISTORY_CAP,
  HISTORY_WINDOW_MS,
  type HistoryEntry,
  type StorageLike,
  loadBookmarks,
  loadHistory,
  pruneHistory,
  removeBookmark,
  removeHistoryEntry,
  saveBookmark,
  saveHistoryEntry,
} from "./storage";
import type { Route } from "./types";

function makeStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function makeRoute(): Route {
  return {
    type: "loop",
    geometry: {
      type: "LineString",
      coordinates: [
        [114.17, 22.3],
        [114.18, 22.31],
      ],
    },
    segmentIds: [1, 2],
    nodeIds: [1, 2, 1],
    distanceM: 3000,
    elevationGainM: 42,
    durationWalkS: 2400,
    durationRunS: 1200,
    streetNames: ["路"],
    segmentStreetNamesTc: ["路"],
    segmentStreetNamesEn: ["Road"],
    elevations: [0, 5, 0],
    origin: { lat: 22.3, lon: 114.17, nodeId: 1 },
  };
}

describe("bookmarks", () => {
  it("persists bookmarks across reads", () => {
    const s = makeStorage();
    const b = { id: "a", name: "Home", origin: { lat: 22.3, lon: 114.17 } };
    saveBookmark(s, b);
    expect(loadBookmarks(s)).toEqual([b]);
  });

  it("replaces a bookmark with the same id instead of duplicating", () => {
    const s = makeStorage();
    const b1 = { id: "a", name: "Home", origin: { lat: 22.3, lon: 114.17 } };
    const b2 = { id: "a", name: "Office", origin: { lat: 22.28, lon: 114.16 } };
    saveBookmark(s, b1);
    saveBookmark(s, b2);
    expect(loadBookmarks(s)).toEqual([b2]);
  });

  it("removes a bookmark", () => {
    const s = makeStorage();
    saveBookmark(s, { id: "a", name: "Home", origin: { lat: 22.3, lon: 114.17 } });
    expect(removeBookmark(s, "a")).toEqual([]);
  });

  it("recovers from corrupt JSON", () => {
    const s = makeStorage();
    s.setItem("hkr.bookmarks.v1", "not-json");
    expect(loadBookmarks(s)).toEqual([]);
  });
});

describe("history", () => {
  const now = Date.now();
  const route = makeRoute();

  function entry(id: string, ageMs: number): HistoryEntry {
    return {
      id,
      route,
      criteria: { outdoorOnly: false, barrierFree: false, flat: false, loop: true },
      timestamp: now - ageMs,
    };
  }

  it("drops entries older than 30 days", () => {
    const entries = [entry("old", HISTORY_WINDOW_MS + 1000), entry("new", 1000)];
    expect(pruneHistory(entries, now).map((e) => e.id)).toEqual(["new"]);
  });

  it("caps history at ~50 entries keeping the newest", () => {
    const entries = Array.from({ length: 60 }, (_, i) => entry(`e${i}`, i * 1000));
    const pruned = pruneHistory(entries, now);
    expect(pruned.length).toBeLessThanOrEqual(HISTORY_CAP);
    expect(pruned[0].id).toBe("e0");
  });

  it("saves newest-first and dedupes by id", () => {
    const s = makeStorage();
    const a = entry("a", 1000);
    const b = entry("b", 500);
    saveHistoryEntry(s, a, now);
    saveHistoryEntry(s, b, now);
    const dup = { ...a, timestamp: now - 10 };
    saveHistoryEntry(s, dup, now);
    const all = loadHistory(s);
    expect(all.map((e) => e.id)).toEqual(["a", "b"]);
    expect(all[0].timestamp).toBe(now - 10);
  });

  it("removes a history entry", () => {
    const s = makeStorage();
    saveHistoryEntry(s, entry("a", 1000), now);
    saveHistoryEntry(s, entry("b", 500), now);
    expect(removeHistoryEntry(s, "a").map((e) => e.id)).toEqual(["b"]);
  });
});
