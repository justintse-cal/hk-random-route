import { beforeAll, describe, expect, it } from "vitest";
import { generateRoute } from "./generator";
import type { Graph } from "./graph";
import { loadGraph } from "./graph";
import { buildShareUrl, decodeRoute, encodeRoute } from "./share";

let graph: Graph;

beforeAll(() => {
  graph = loadGraph("public/graph.bin");
});

function giantComponentOrigin(): { lat: number; lon: number } {
  const counts = new Map<number, number>();
  for (let i = 0; i < graph.edgeCount; i++) {
    const c = graph.compId[i];
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  let bestComp = -1;
  let bestCount = -1;
  for (const [c, n] of counts) {
    if (n > bestCount) {
      bestCount = n;
      bestComp = c;
    }
  }
  for (let i = 0; i < graph.edgeCount; i++) {
    if (graph.compId[i] === bestComp) {
      return { lat: graph.lat[graph.from[i]], lon: graph.lon[graph.from[i]] };
    }
  }
  throw new Error("no giant component");
}

describe("share payload over the real graph", () => {
  it("stays within a reasonable URL length for a long route", async () => {
    const results: string[] = [];
    for (const targetDistanceM of [20000, 30000, 40000, 50000]) {
      const res = generateRoute(graph, {
        origin: giantComponentOrigin(),
        targetDistanceM,
        criteria: { loop: false },
        seed: 7,
      });
      results.push(
        `${targetDistanceM}:${res.ok ? "ok" : res.error}${
          res.route ? `/${Math.round(res.route.distanceM)}` : ""
        }`,
      );
    }
    if (!results.every((r) => r.includes(":ok"))) {
      throw new Error(`results: ${results.join(" ")}`);
    }
    const last = generateRoute(graph, {
      origin: giantComponentOrigin(),
      targetDistanceM: 20000,
      criteria: { loop: false },
      seed: 7,
    });
    expect(last.ok).toBe(true);
    const route = last.route!;
    const payload = await encodeRoute(route);
    expect(payload.length).toBeLessThan(20000);
    expect(payload.length).toBeGreaterThan(0);

    const decoded = await decodeRoute(payload);
    expect(decoded.geometry.type).toBe("LineString");
    expect(decoded.geometry.coordinates).toHaveLength(
      route.geometry.coordinates.length,
    );
    decoded.geometry.coordinates.forEach((coord, i) => {
      expect(coord[0]).toBeCloseTo(route.geometry.coordinates[i][0], 5);
      expect(coord[1]).toBeCloseTo(route.geometry.coordinates[i][1], 5);
    });
    expect(decoded.distanceM).toBe(route.distanceM);
    expect(decoded.elevationGainM).toBe(route.elevationGainM);

    const url = buildShareUrl(payload, "https://hkr.app/");
    expect(url.startsWith("https://hkr.app/#route=")).toBe(true);
  });
});
