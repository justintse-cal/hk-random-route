import { beforeAll, describe, expect, it } from "vitest";
import {
  BIT_BARRIER_FREE,
  BIT_COVERED,
  BIT_FLAT,
  generateRoute,
} from "./generator";
import type { Graph } from "./graph";
import { loadGraph } from "./graph";
import type { Criteria, GenerateResponse, Route } from "./types";

let graph: Graph;

beforeAll(() => {
  graph = loadGraph("public/graph.bin");
});

function originOnNode(nodeId: number): { lat: number; lon: number } {
  return { lat: graph.lat[nodeId], lon: graph.lon[nodeId] };
}

function originInGiantComponent(): { lat: number; lon: number; nodeId: number } {
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
      return { ...originOnNode(graph.from[i]), nodeId: graph.from[i] };
    }
  }
  throw new Error("no giant component edge");
}

function farthestFrom(start: number): { node: number; dist: number } {
  const visited = new Uint8Array(graph.nodeCount);
  const distArr = new Float64Array(graph.nodeCount);
  const queue: number[] = [start];
  visited[start] = 1;
  let bestNode = start;
  let bestDist = 0;
  let head = 0;
  while (head < queue.length) {
    const n = queue[head++];
    for (let i = graph.adjStart[n]; i < graph.adjStart[n + 1]; i++) {
      const e = graph.adjEdge[i];
      const nb = graph.adjNeighbor[i];
      if (visited[nb]) continue;
      visited[nb] = 1;
      distArr[nb] = distArr[n] + graph.length[e];
      queue.push(nb);
      if (distArr[nb] > bestDist) {
        bestDist = distArr[nb];
        bestNode = nb;
      }
    }
  }
  return { node: bestNode, dist: bestDist };
}

function findTreeComponentOrigin(): {
  origin: { lat: number; lon: number; nodeId: number };
  target: number;
} {
  const parent = new Int32Array(graph.nodeCount);
  for (let i = 0; i < graph.nodeCount; i++) parent[i] = i;
  const find = (a: number): number => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]];
      a = parent[a];
    }
    return a;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };
  for (let i = 0; i < graph.edgeCount; i++) {
    union(graph.from[i], graph.to[i]);
  }
  const nodeCounts = new Map<number, number>();
  const edgeCounts = new Map<number, number>();
  const edgeLen = new Map<number, number>();
  for (let n = 0; n < graph.nodeCount; n++) {
    const r = find(n);
    nodeCounts.set(r, (nodeCounts.get(r) ?? 0) + 1);
  }
  for (let i = 0; i < graph.edgeCount; i++) {
    const r = find(graph.from[i]);
    edgeCounts.set(r, (edgeCounts.get(r) ?? 0) + 1);
    edgeLen.set(r, (edgeLen.get(r) ?? 0) + graph.length[i]);
  }
  let treeRoot = -1;
  let bestLen = -1;
  for (const [r, nodes] of nodeCounts) {
    const edges = edgeCounts.get(r) ?? 0;
    const len = edgeLen.get(r) ?? 0;
    if (edges > 0 && edges === nodes - 1 && len > bestLen) {
      bestLen = len;
      treeRoot = r;
    }
  }
  if (treeRoot < 0) throw new Error("no tree component found");
  const start = (() => {
    for (let i = 0; i < graph.edgeCount; i++) {
      const n = graph.from[i];
      if (find(n) === treeRoot) return n;
    }
    throw new Error("no edge in tree");
  })();
  const far = farthestFrom(start);
  const far2 = farthestFrom(far.node);
  const reach = Math.max(far.dist, far2.dist);
  const target = Math.max(500, Math.min(0.8 * reach, 50000));
  return { origin: { ...originOnNode(start), nodeId: start }, target };
}

function maskCompliant(segmentId: number, criteria: Partial<Criteria>): boolean {
  const mask = graph.mask[segmentId];
  if (criteria.covered && !(mask & BIT_COVERED)) return false;
  if (criteria.barrierFree && !(mask & BIT_BARRIER_FREE)) return false;
  if (criteria.flat && !(mask & BIT_FLAT)) return false;
  return true;
}

function findCompliantOrigin(criteria: Partial<Criteria>): {
  origin: { lat: number; lon: number };
} {
  for (let i = 0; i < graph.edgeCount; i++) {
    if (!maskCompliant(i, criteria)) continue;
    const n = graph.from[i];
    let cnt = 0;
    for (let e = graph.adjStart[n]; e < graph.adjStart[n + 1]; e++) {
      if (maskCompliant(graph.adjEdge[e], criteria)) cnt++;
    }
    if (cnt >= 3) {
      return { origin: originOnNode(n) };
    }
  }
  throw new Error("no compliant origin");
}

function expectInBand(res: GenerateResponse, target: number) {
  expect(res.ok).toBe(true);
  const tol = res.toleranceUsed!;
  expect([0.1, 0.15, 0.25]).toContain(tol);
  expect(res.route!.distanceM).toBeGreaterThanOrEqual(target - 0.1);
  expect(res.route!.distanceM).toBeLessThanOrEqual(target * (1 + tol) + 0.1);
}

function coveredFraction(route: Route): number {
  let covered = 0;
  let total = 0;
  for (const s of route.segmentIds) {
    if (graph.mask[s] & BIT_COVERED) covered += graph.length[s];
    total += graph.length[s];
  }
  return total > 0 ? covered / total : 0;
}

describe("route generation contract", () => {
  it("rejects distances outside 0.5-50 km", () => {
    const origin = originInGiantComponent();
    for (const target of [100, 250, 60000, 120000]) {
      const res = generateRoute(graph, { origin, targetDistanceM: target });
      expect(res.ok).toBe(false);
      expect(res.error).toBe("unsupported-distance");
    }
  });

  it("reports no compliant segment for an origin far from the network", () => {
    const res = generateRoute(graph, {
      origin: { lat: 21.5, lon: 114.9 },
      targetDistanceM: 3000,
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("no-compliant-segment");
  });

  it("snaps onto the nearest node and reports the snapped origin", () => {
    const o = originInGiantComponent();
    const res = generateRoute(graph, {
      origin: { lat: o.lat + 0.0002, lon: o.lon },
      targetDistanceM: 3000,
      criteria: { loop: false },
    });
    expect(res.ok).toBe(true);
    const snapped = res.route!.origin;
    expect(snapped.nodeId).toBeGreaterThanOrEqual(0);
    expect(snapped.nodeId).toBeLessThan(graph.nodeCount);
    expect(snapped.lat).not.toBe(o.lat);
  });

  it("generates a one-way route within the tolerance band, segments compliant", () => {
    const { origin: o } = findCompliantOrigin({ flat: true });
    const criteria: Partial<Criteria> = {
      flat: true,
      loop: false,
    };
    let okCount = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const res = generateRoute(graph, {
        origin: o,
        targetDistanceM: 2000,
        criteria,
        seed,
      });
      if (!res.ok) continue;
      okCount++;
      const route = res.route!;
      expect(route.type).toBe("one-way");
      expectInBand(res, 2000);
      for (const s of route.segmentIds) {
        expect(maskCompliant(s, criteria)).toBe(true);
      }
      expect(route.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
      expect(route.durationWalkS).toBeGreaterThan(0);
      expect(route.durationRunS).toBeGreaterThan(0);
    }
    expect(okCount).toBeGreaterThanOrEqual(2);
  });

  it("generates a loop that returns to the origin and repeats no segment", () => {
    const o = originInGiantComponent();
    let okCount = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const res = generateRoute(graph, {
        origin: o,
        targetDistanceM: 3000,
        criteria: { loop: true },
        seed,
      });
      if (!res.ok) continue;
      okCount++;
      expectInBand(res, 3000);
      const route = res.route!;
      expect(route.type).toBe("loop");
      expect(route.nodeIds[0]).toBe(route.nodeIds[route.nodeIds.length - 1]);
      expect(new Set(route.segmentIds).size).toBe(route.segmentIds.length);
    }
    expect(okCount).toBeGreaterThanOrEqual(7);
  });

  it("returns no-route for a loop request in an acyclic (tree) component", () => {
    const { origin, target } = findTreeComponentOrigin();
    const res = generateRoute(graph, {
      origin,
      targetDistanceM: target,
      criteria: { loop: true },
      seed: 42,
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("no-route");
  });

  it("regenerates a loop from the same origin without error", () => {
    const o = originInGiantComponent();
    let okCount = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const first = generateRoute(graph, {
        origin: o,
        targetDistanceM: 3000,
        criteria: { loop: true },
        seed: seed + 100,
      });
      if (!first.ok) continue;
      const res = generateRoute(graph, {
        origin: o,
        targetDistanceM: 3000,
        criteria: { loop: true },
        seed: seed + 200,
        excludeSegmentIds: first.route!.segmentIds,
      });
      if (!res.ok) continue;
      okCount++;
      expect(res.route!.type).toBe("loop");
      expect(res.route!.nodeIds[0]).toBe(
        res.route!.nodeIds[res.route!.nodeIds.length - 1],
      );
    }
    expect(okCount).toBeGreaterThanOrEqual(7);
  });

  it("covered preference never fails and maximises covered distance", () => {
    const o = originInGiantComponent();
    let diff = 0;
    let count = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const plain = generateRoute(graph, {
        origin: o,
        targetDistanceM: 3000,
        criteria: { loop: true },
        seed,
      });
      const covered = generateRoute(graph, {
        origin: o,
        targetDistanceM: 3000,
        criteria: { loop: true, covered: true },
        seed,
      });
      expect(plain.ok).toBe(true);
      expect(covered.ok).toBe(true);
      const route = covered.route!;
      expect(route.type).toBe("loop");
      diff += coveredFraction(route) - coveredFraction(plain.route!);
      count++;
    }
    expect(count).toBe(12);
    // With the one-sided band both runs now reach the target (plain loops are
    // no longer short), so the covered advantage shrinks — it must still add
    // measurable covered fraction on average.
    expect(diff / count).toBeGreaterThan(0.01);
  });

  it("honours the no-immediate-repeat rule across consecutive calls", () => {
    const o = originInGiantComponent();
    const criteria = { loop: false };
    const first = generateRoute(graph, {
      origin: o,
      targetDistanceM: 3000,
      criteria,
      seed: 5,
    });
    expect(first.ok).toBe(true);
    const second = generateRoute(graph, {
      origin: o,
      targetDistanceM: 3000,
      criteria,
      seed: 6,
      excludeSegmentIds: first.route!.segmentIds,
    });
    expect(second.ok).toBe(true);
    const firstSet = new Set(first.route!.segmentIds);
    for (const s of second.route!.segmentIds) {
      expect(firstSet.has(s)).toBe(false);
    }
  });

  it("honours restrictive criteria (barrier-free only)", () => {
    const { origin: o } = findCompliantOrigin({ barrierFree: true });
    const criteria: Partial<Criteria> = { barrierFree: true, loop: true };
    let okCount = 0;
    for (let seed = 11; seed <= 16; seed++) {
      const res = generateRoute(graph, {
        origin: o,
        targetDistanceM: 2000,
        criteria,
        seed,
      });
      if (!res.ok) continue;
      okCount++;
      expectInBand(res, 2000);
      for (const s of res.route!.segmentIds) {
        expect(maskCompliant(s, criteria)).toBe(true);
      }
    }
    expect(okCount).toBeGreaterThanOrEqual(4);
  });

  it("exposes metadata: street names and elevation gain", () => {
    const o = originInGiantComponent();
    const res = generateRoute(graph, {
      origin: o,
      targetDistanceM: 4000,
      criteria: { loop: false },
      seed: 3,
    });
    expect(res.ok).toBe(true);
    const route = res.route!;
    expect(route.elevationGainM).toBeGreaterThanOrEqual(0);
    expect(route.distanceM).toBeGreaterThan(0);
    expect(Array.isArray(route.streetNames)).toBe(true);
    expect(route.segmentStreetNamesTc.length).toBe(route.geometry.coordinates.length - 1);
    expect(route.segmentStreetNamesEn.length).toBe(route.geometry.coordinates.length - 1);
    expect(route.elevations.length).toBe(route.geometry.coordinates.length);
    expect(route.elevations[0]).toBe(0);
    expect(route.segmentCovered).toBeDefined();
    expect(route.segmentCovered!.length).toBe(route.geometry.coordinates.length - 1);
    expect(route.segmentFlat).toBeDefined();
    expect(route.segmentFlat!.length).toBe(route.geometry.coordinates.length - 1);
    expect(route.coveredPct).toBeGreaterThanOrEqual(0);
    expect(route.coveredPct).toBeLessThanOrEqual(100);
    expect(route.barrierFreePct).toBeGreaterThanOrEqual(0);
    expect(route.barrierFreePct).toBeLessThanOrEqual(100);
    const flat = route.segmentFlat!.filter((f) => f).length;
    expect(flat).toBeGreaterThan(0);
  });
});
