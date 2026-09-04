import type { Graph } from "./graph";
import { haversineM, snap, streetName } from "./graph";
import { dijkstraToOrigin } from "./dijkstra";
import { mulberry32, randomSeed, type Rng } from "./prng";
import type {
  GenerateRequest,
  GenerateResponse,
  Route,
} from "./types";

export const BIT_OUTDOOR = 0x01;
export const BIT_COVERED = 0x04;
export const BIT_BARRIER_FREE = 0x08;
export const BIT_FLAT = 0x10;

export const MIN_DISTANCE_M = 500;
export const MAX_DISTANCE_M = 50000;
export const SNAP_RADIUS_M = 500;

const TOLERANCES = [0.1, 0.15, 0.25];
const ATTEMPTS = 120;
const LEG_MAX_DISTANCE_M = 2000;
const WALK_PACE_MS = (4.5 * 1000) / 3600;
const RUN_PACE_MS = (9 * 1000) / 3600;

function homewardAttempts(target: number): number {
  return 60 + Math.floor(target / 500) * 20;
}

function scaledMaxSteps(target: number): number {
  return Math.min(16000, Math.max(4000, target * 3));
}

/**
 * Tuning for the random walks.
 * `penalize` marks edges (e.g. a previous route) that stay usable but are
 * strongly disfavoured, so regeneration can always succeed while reusing
 * as few old segments as possible.
 */
export interface WalkOpts {
  penalize?: (edgeId: number) => boolean;
  distToOrigin?: Float32Array;
}

const REUSE_PENALTY = 0.02;

export interface WalkResult {
  path: number[];
  nodes: number[];
  distance: number;
  gain: number;
}

export type MaskOk = (g: Graph, edgeId: number) => boolean;

export function makeMaskOk(criteria: GenerateRequest["criteria"]): MaskOk {
  const c = criteria ?? {};
  return (g: Graph, edgeId: number) => {
    const mask = g.mask[edgeId];
    if (c.outdoorOnly && !(mask & BIT_OUTDOOR)) return false;
    if (c.barrierFree && !(mask & BIT_BARRIER_FREE)) return false;
    if (c.flat && !(mask & BIT_FLAT)) return false;
    return true;
  };
}

function weightFactor(g: Graph, edge: number, opts: WalkOpts): number {
  let factor = 1;
  if (opts.penalize && opts.penalize(edge)) {
    factor *= REUSE_PENALTY;
  }
  return factor;
}

function maskDist(g: Graph, path: number[], bit: number): number {
  let s = 0;
  for (const e of path) {
    if (g.mask[e] & bit) s += g.length[e];
  }
  return s;
}

function pctOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function gainOf(g: Graph, edge: number, fromNode: number): number {
  const d = g.zDelta[edge];
  return g.from[edge] === fromNode ? Math.max(0, d) : Math.max(0, -d);
}

function gainOfPath(g: Graph, path: number[], nodes: number[]): number {
  let sum = 0;
  for (let i = 0; i < path.length; i++) sum += gainOf(g, path[i], nodes[i]);
  return sum;
}

function incidentCandidates(
  g: Graph,
  node: number,
  used: Set<number>,
  ok: MaskOk,
  avoidNeighbor: number | null = null,
): { edge: number; neighbor: number }[] {
  const res: { edge: number; neighbor: number }[] = [];
  for (let i = g.adjStart[node]; i < g.adjStart[node + 1]; i++) {
    const edge = g.adjEdge[i];
    const neighbor = g.adjNeighbor[i];
    if (used.has(edge) || !ok(g, edge)) continue;
    if (avoidNeighbor !== null && neighbor === avoidNeighbor) continue;
    res.push({ edge, neighbor });
  }
  return res;
}

function pickWeighted(
  cands: { edge: number; neighbor: number }[],
  weights: number[],
  rng: Rng,
): { edge: number; neighbor: number } {
  let total = 0;
  for (const w of weights) total += w;
  let r = rng() * total;
  for (let i = 0; i < cands.length; i++) {
    r -= weights[i];
    if (r <= 0) return cands[i];
  }
  return cands[cands.length - 1];
}

function walkWeights(
  g: Graph,
  cands: { edge: number; neighbor: number }[],
  node: number,
  lastDir: { lat: number; lon: number } | null,
  refLat: number,
  refLon: number,
  opts: WalkOpts,
): number[] {
  const outLat = g.lat[node] - refLat;
  const outLon = g.lon[node] - refLon;
  const outLen = Math.hypot(outLat, outLon) || 1e-9;
  const outUnit = { lat: outLat / outLen, lon: outLon / outLen };
  return cands.map((c) => {
    const dLat = g.lat[c.neighbor] - g.lat[node];
    const dLon = g.lon[c.neighbor] - g.lon[node];
    const len = Math.hypot(dLat, dLon) || 1e-9;
    const u = { lat: dLat / len, lon: dLon / len };
    const outward = Math.max(0, u.lat * outUnit.lat + u.lon * outUnit.lon);
    const persist = lastDir
      ? Math.max(0, u.lat * lastDir.lat + u.lon * lastDir.lon)
      : outward;
    const w = 0.05 + persist * persist * 3 + outward * 1.5;
    return w * weightFactor(g, c.edge, opts);
  });
}

function homeWeights(
  g: Graph,
  cands: { edge: number; neighbor: number }[],
  node: number,
  refLat: number,
  refLon: number,
  opts: WalkOpts,
): number[] {
  const dLat = refLat - g.lat[node];
  const dLon = refLon - g.lon[node];
  const len = Math.hypot(dLat, dLon) || 1e-9;
  const home = { lat: dLat / len, lon: dLon / len };
  const distMap = opts.distToOrigin;
  const dCurrent = distMap ? distMap[node] : Infinity;
  return cands.map((c) => {
    const eLat = g.lat[c.neighbor] - g.lat[node];
    const eLon = g.lon[c.neighbor] - g.lon[node];
    const el = Math.hypot(eLat, eLon) || 1e-9;
    const u = { lat: eLat / el, lon: eLon / el };
    const align = Math.max(0, u.lat * home.lat + u.lon * home.lon);
    let w = 0.1 + align * align * 4;
    if (distMap && dCurrent < Infinity) {
      const dNeighbor = distMap[c.neighbor];
      if (dNeighbor < dCurrent) w *= 1.5;
      else if (dNeighbor > dCurrent * 1.5) w *= 0.3;
    }
    return w * weightFactor(g, c.edge, opts);
  });
}

function recordBest(
  best: WalkResult | null,
  bestAbs: number,
  target: number,
  path: number[],
  nodes: number[],
  dist: number,
  g: Graph,
): { best: WalkResult | null; bestAbs: number } {
  const abs = Math.abs(dist - target);
  if (abs < bestAbs) {
    return {
      best: {
        path: [...path],
        nodes: [...nodes],
        distance: dist,
        gain: gainOfPath(g, path, nodes),
      },
      bestAbs: abs,
    };
  }
  return { best, bestAbs };
}

/**
 * Self-avoiding random walk with backtracking, biased away from the origin.
 * When the walk dead-ends or overshoots the target, it backtracks (popping
 * edges) and tries other branches — reaching far greater distances than a
 * one-shot persistent walk. The first route to land in the target band wins;
 * otherwise the closest effort across attempts is returned.
 */
function hasCandidate(
  g: Graph,
  node: number,
  used: Set<number>,
  ok: MaskOk,
): boolean {
  for (let i = g.adjStart[node]; i < g.adjStart[node + 1]; i++) {
    if (!used.has(g.adjEdge[i]) && ok(g, g.adjEdge[i])) return true;
  }
  return false;
}

/**
 * Pops trailing edges of a leg until its end node has a usable candidate
 * edge (so the next leg can continue). The popped edges are returned to
 * `used` and dropped from the route. Returns null when the leg is fully
 * trimmed away.
 */
function trimLegToExtendable(
  g: Graph,
  leg: WalkResult,
  used: Set<number>,
  ok: MaskOk,
  maxTrim: number,
): WalkResult | null {
  const path = [...leg.path];
  const nodes = [...leg.nodes];
  let distance = leg.distance;
  for (let t = 0; t < maxTrim && path.length > 0; t++) {
    const end = nodes[nodes.length - 1];
    if (hasCandidate(g, end, used, ok)) break;
    const e = path.pop()!;
    nodes.pop();
    used.delete(e);
    distance -= g.length[e];
  }
  if (path.length === 0) return null;
  return { path, nodes, distance, gain: gainOfPath(g, path, nodes) };
}

function oneWayLeg(
  g: Graph,
  start: number,
  target: number,
  tol: number,
  ok: MaskOk,
  excluded: Set<number>,
  rng: Rng,
  requireExtension = false,
  ref: { lat: number; lon: number } | null = null,
  opts: WalkOpts = {},
  lowFrac = 1,
  highFrac = 1 + tol,
  requireBand = false,
): WalkResult | null {
  const low = target * lowFrac;
  const high = target * highFrac;
  const lat0 = ref ? ref.lat : g.lat[start];
  const lon0 = ref ? ref.lon : g.lon[start];
  const maxStepsVal = scaledMaxSteps(target);
  const attempts = Math.max(3, Math.round((ATTEMPTS * 4000) / maxStepsVal));
  let best: WalkResult | null = null;
  let bestAbs = Infinity;
  let bandDone = false;
  for (let attempt = 0; attempt < attempts && !bandDone; attempt++) {
    const path: number[] = [];
    const nodes: number[] = [start];
    const used = new Set<number>(excluded);
    let node = start;
    let dist = 0;
    let lastDir: { lat: number; lon: number } | null = null;
    for (let step = 0; step < maxStepsVal; step++) {
      if (dist >= low && dist <= high) {
        if (!requireExtension) {
          return {
            path,
            nodes,
            distance: dist,
            gain: gainOfPath(g, path, nodes),
          };
        } else if (hasCandidate(g, node, used, ok)) {
          return {
            path,
            nodes,
            distance: dist,
            gain: gainOfPath(g, path, nodes),
          };
        }
      }
      if (dist > high) {
        ({ best, bestAbs } = recordBest(best, bestAbs, target, path, nodes, dist, g));
        break;
      }
      const cands = incidentCandidates(g, node, used, ok);
      if (cands.length === 0) {
        ({ best, bestAbs } = recordBest(best, bestAbs, target, path, nodes, dist, g));
        break;
      }
      const weights = walkWeights(g, cands, node, lastDir, lat0, lon0, opts);
      const pick = pickWeighted(cands, weights, rng);
      const nLat = g.lat[pick.neighbor] - g.lat[node];
      const nLon = g.lon[pick.neighbor] - g.lon[node];
      const nl = Math.hypot(nLat, nLon) || 1e-9;
      lastDir = { lat: nLat / nl, lon: nLon / nl };
      path.push(pick.edge);
      nodes.push(pick.neighbor);
      used.add(pick.edge);
      dist += g.length[pick.edge];
      node = pick.neighbor;
    }
  }
  return requireExtension || requireBand ? null : best;
}

/**
 * One-way route generator. Short targets are grown in a single walk; longer
 * targets are built from consecutive self-avoiding legs, each inheriting the
 * edges of every earlier leg as excluded, so the final path is still one
 * continuous walk with no repeated edge.
 */
function oneWayWalk(
  g: Graph,
  start: number,
  target: number,
  tol: number,
  ok: MaskOk,
  excluded: Set<number>,
  rng: Rng,
  opts: WalkOpts = {},
): WalkResult | null {
  if (target <= LEG_MAX_DISTANCE_M) {
    return oneWayLeg(g, start, target, tol, ok, excluded, rng, false, null, opts);
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = buildOneWayChain(g, start, target, tol, ok, excluded, rng, opts);
    if (res) return res;
    rng();
  }
  return null;
}

function buildOneWayChain(
  g: Graph,
  start: number,
  target: number,
  tol: number,
  ok: MaskOk,
  excluded: Set<number>,
  rng: Rng,
  opts: WalkOpts = {},
): WalkResult | null {
  const legs = Math.ceil(target / LEG_MAX_DISTANCE_M);
  const legTarget = target / legs;
  const ref = { lat: g.lat[start], lon: g.lon[start] };
  const segments: WalkResult[] = [];
  const excluded2 = new Set<number>(excluded);
  let node = start;

  const placedSoFar = () => segments.reduce((s, seg) => s + seg.distance, 0);

  const placeLeg = (needExt: boolean): boolean => {
    // The one-sided band applies to the route as a whole, not to the internal
    // legs. Non-final legs use a two-sided band (easier to place in a network
    // that is progressively exhausted) and always target the nominal leg
    // length; the chain simply keeps placing legs until a single final leg can
    // cover the remainder. The final leg targets only the distance still
    // needed to reach `target` with a one-sided band — if the chain already
    // covers the target it is accepted as-is, so the chain can never finish
    // short of the target and never overshoots it needlessly.
    if (!needExt) {
      const remaining = target - placedSoFar();
      if (remaining <= 0) return true;
      // The final leg must only reach the remaining distance, but may land
      // anywhere up to the widest tolerance overshoot so a tight shortfall
      // band never makes an otherwise-finished chain fail.
      const highFrac = (remaining + MAX_TOLERANCE * target) / remaining;
      return placeLegOf(remaining, 1, false, highFrac, true);
    }
    return placeLegOf(legTarget, 1 - tol, true);
  };

  const placeLegOf = (
    legTargetForLeg: number,
    lowFrac: number,
    needExt: boolean,
    highFrac = 1 + tol,
    requireBand = false,
  ): boolean => {
    for (let t = 0; t < 20; t++) {
      const cand = oneWayLeg(
        g,
        node,
        legTargetForLeg,
        tol,
        ok,
        excluded2,
        rng,
        needExt,
        ref,
        opts,
        lowFrac,
        highFrac,
        requireBand,
      );
      if (!cand) continue;
      let leg: WalkResult;
      if (needExt) {
        const junctionUsed = new Set<number>([...excluded2, ...cand.path]);
        const trimmed = trimLegToExtendable(g, cand, junctionUsed, ok, 40);
        // A leg that trims back to a fraction of its nominal length is a sign
        // the walk dead-ended into already-used road; accept it and the chain
        // creeps forward by tiny increments while the network gets exhausted.
        if (!trimmed || trimmed.distance < legTarget * 0.7) continue;
        for (const e of cand.path) excluded2.delete(e);
        for (const e of trimmed.path) excluded2.add(e);
        leg = trimmed;
      } else {
        leg = cand;
      }
      segments.push(leg);
      for (const e of leg.path) excluded2.add(e);
      node = leg.nodes[leg.nodes.length - 1];
      return true;
    }
    return false;
  };

  const backtrackLeg = (needExt: boolean): boolean => {
    let placed = false;
    while (segments.length > 0) {
      const prev = segments[segments.length - 1];
      segments.pop();
      for (const e of prev.path) excluded2.delete(e);
      const prevUsed = new Set<number>([...excluded2, ...prev.path]);
      const trimmed = trimLegToExtendable(g, prev, prevUsed, ok, 120);
      if (trimmed && trimmed.distance > 0) {
        for (const e of trimmed.path) excluded2.add(e);
        segments.push(trimmed);
        node = trimmed.nodes[trimmed.nodes.length - 1];
        if (placeLeg(needExt)) {
          placed = true;
          break;
        }
        segments.pop();
        for (const e of trimmed.path) excluded2.delete(e);
      }
    }
    return placed;
  };

  // Keep placing extendable legs until a single final leg can cover the
  // remainder. A failed leg is recovered by trimming the previous leg back to
  // an extendable junction and retrying from there. The leg count is capped:
  // with legs landing at the low edge of their band the chain needs only a few
  // more than `legs`, and beyond that it is stuck, not progressing.
  const maxLegs = legs + 4;
  let legCount = 0;
  while (
    placedSoFar() < target - legTarget * (1 + tol) &&
    legCount < maxLegs
  ) {
    legCount++;
    if (!placeLeg(true) && !backtrackLeg(true)) return null;
  }
  // The remainder is at most one leg long; top it off with the final leg.
  if (!placeLeg(false) && !backtrackLeg(false)) return null;

  const path: number[] = [];
  const nodes: number[] = [start];
  let distance = 0;
  for (const seg of segments) {
    path.push(...seg.path);
    nodes.push(...seg.nodes.slice(1));
    distance += seg.distance;
  }
  return { path, nodes, distance, gain: gainOfPath(g, path, nodes) };
}

export interface HomewardResult {
  path: number[];
  nodes: number[];
  closeEdge: number; // -1 when the walk reaches the start node itself
  distance: number;
}

/**
 * Fresh random walks biased back toward the origin. Terminates when the walk
 * reaches `start`, or reaches a node with an unused compliant edge directly to
 * `start` and the total route length lands in the band. Returns the best
 * closure found, or null.
 */
function homewardWalk(
  g: Graph,
  fromNode: number,
  start: number,
  ok: MaskOk,
  excluded: Set<number>,
  rng: Rng,
  pDistance: number,
  low: number,
  high: number,
  target: number,
  opts: WalkOpts = {},
): HomewardResult | null {
  const lat0 = g.lat[start];
  const lon0 = g.lon[start];
  const midTarget = (low + high) / 2;
  let best: HomewardResult | null = null;
  let bestAbs = Infinity;
  for (let attempt = 0; attempt < homewardAttempts(target); attempt++) {
    const path: number[] = [];
    const nodes: number[] = [fromNode];
    const used = new Set<number>(excluded);
    let node = fromNode;
    let dist = 0;
    for (let step = 0; step < scaledMaxSteps(target / 2); step++) {
      if (node === start) {
        const total = pDistance + dist;
        if (total >= low && total <= high) {
          return { path: [...path], nodes: [...nodes], closeEdge: -1, distance: dist };
        }
        const abs = Math.abs(total - midTarget);
        if (abs < bestAbs) {
          bestAbs = abs;
          best = { path: [...path], nodes: [...nodes], closeEdge: -1, distance: dist };
        }
        break;
      }
      for (let i = g.adjStart[node]; i < g.adjStart[node + 1]; i++) {
        const edge = g.adjEdge[i];
        if (g.adjNeighbor[i] !== start) continue;
        if (used.has(edge) || !ok(g, edge)) continue;
        const total = pDistance + dist + g.length[edge];
        if (total >= low && total <= high) {
          return {
            path: [...path],
            nodes: [...nodes],
            closeEdge: edge,
            distance: dist,
          };
        }
        const abs = Math.abs(total - midTarget);
        if (abs < bestAbs) {
          bestAbs = abs;
          best = {
            path: [...path],
            nodes: [...nodes],
            closeEdge: edge,
            distance: dist,
          };
        }
      }
      const cands = incidentCandidates(g, node, used, ok, start);
      if (cands.length === 0) break;
      const weights = homeWeights(g, cands, node, lat0, lon0, opts);
      const pick = pickWeighted(cands, weights, rng);
      path.push(pick.edge);
      nodes.push(pick.neighbor);
      used.add(pick.edge);
      dist += g.length[pick.edge];
      node = pick.neighbor;
    }
  }
  return best;
}

/**
 * Two-phase loop: grow outward to ~target/2, then return home along a
 * different, unused route and close the loop. Returns the best loop found, or
 * null.
 */
function loopWalk(
  g: Graph,
  start: number,
  target: number,
  tol: number,
  ok: MaskOk,
  excluded: Set<number>,
  rng: Rng,
  opts: WalkOpts = {},
): WalkResult | null {
  const low = target;
  const high = target * (1 + tol);
  let best: WalkResult | null = null;
  let bestAbs = Infinity;
  for (let attempt = 0; attempt < Math.max(4, Math.floor(target / 1000) * 4); attempt++) {
    const p = oneWayWalk(g, start, target / 2, tol, ok, excluded, rng, opts);
    if (!p) continue;
    const excluded2 = new Set<number>([...excluded, ...p.path]);
    const q = homewardWalk(
      g,
      p.nodes[p.nodes.length - 1],
      start,
      ok,
      excluded2,
      rng,
      p.distance,
      low,
      high,
      target,
      opts,
    );
    if (!q) continue;
    const closeLen = q.closeEdge >= 0 ? g.length[q.closeEdge] : 0;
    const total = p.distance + q.distance + closeLen;
    const full =
      q.closeEdge >= 0
        ? [...p.path, ...q.path, q.closeEdge]
        : [...p.path, ...q.path];
    const fnodes =
      q.closeEdge >= 0
        ? [...p.nodes, ...q.nodes.slice(1), start]
        : [...p.nodes, ...q.nodes.slice(1)];
    const abs = Math.abs(total - target);
    if (total >= low && total <= high) {
      return {
        path: full,
        nodes: fnodes,
        distance: total,
        gain: gainOfPath(g, full, fnodes),
      };
    }
    if (abs < bestAbs) {
      bestAbs = abs;
      best = {
        path: full,
        nodes: fnodes,
        distance: total,
        gain: gainOfPath(g, full, fnodes),
      };
    }
  }
  return best;
}

function inBand(dist: number, target: number, tol: number): boolean {
  return dist >= target && dist <= target * (1 + tol);
}

const MAX_TOLERANCE = TOLERANCES[TOLERANCES.length - 1];

function toleranceFor(dist: number, target: number): number {
  for (const tol of TOLERANCES) {
    if (inBand(dist, target, tol)) return tol;
  }
  return -1;
}

interface Found {
  walk: WalkResult;
  tolerance: number;
}

function findBest(
  g: Graph,
  start: number,
  target: number,
  ok: MaskOk,
  excluded: Set<number>,
  rng: Rng,
  kind: "loop" | "one-way",
  opts: WalkOpts = {},
): Found | null {
  let best: Found | null = null;
  let bestAbs = Infinity;
  for (const tol of TOLERANCES) {
    const walk =
      kind === "loop"
        ? loopWalk(g, start, target, tol, ok, excluded, rng, opts)
        : oneWayWalk(g, start, target, tol, ok, excluded, rng, opts);
    if (walk && inBand(walk.distance, target, tol)) {
      return { walk, tolerance: tol };
    }
    if (walk) {
      const abs = Math.abs(walk.distance - target);
      if (abs < bestAbs) {
        bestAbs = abs;
        best = { walk, tolerance: tol };
      }
    }
  }
  if (best) {
    const tol = toleranceFor(best.walk.distance, target);
    if (tol < 0) return null;
    best.tolerance = tol;
  }
  return best;
}

function collectStreetNames(g: Graph, path: number[]): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const e of path) {
    const name = streetName(g, e, "tc") || streetName(g, e, "en");
    if (name && !seen.has(name)) {
      seen.add(name);
      names.push(name);
      if (names.length >= 6) break;
    }
  }
  return names;
}

function elevationProfile(g: Graph, path: number[], nodes: number[]): number[] {
  const z: number[] = [0];
  for (let i = 0; i < path.length; i++) {
    const edge = path[i];
    const d = g.zDelta[edge];
    z.push(z[z.length - 1] + (g.from[edge] === nodes[i] ? d : -d));
  }
  return z;
}

function toRoute(
  g: Graph,
  walk: WalkResult,
  type: Route["type"],
  tolerance: number,
  origin: Route["origin"],
): Route {
  const segmentIds =
    type === "out-and-back"
      ? walk.path.filter((e, i) => walk.path.indexOf(e) === i)
      : walk.path;
  return {
    type,
    geometry: {
      type: "LineString",
      coordinates: walk.nodes.map((n): [number, number] => [g.lon[n], g.lat[n]]),
    },
    segmentIds,
    nodeIds: walk.nodes,
    distanceM: Math.round(walk.distance * 10) / 10,
    elevationGainM: Math.round(walk.gain * 10) / 10,
    durationWalkS: Math.round(walk.distance / WALK_PACE_MS),
    durationRunS: Math.round(walk.distance / RUN_PACE_MS),
    streetNames: collectStreetNames(g, walk.path),
    segmentStreetNamesTc: walk.path.map((e) => streetName(g, e, "tc")),
    segmentStreetNamesEn: walk.path.map((e) => streetName(g, e, "en")),
    coveredPct: pctOf(maskDist(g, walk.path, BIT_COVERED), walk.distance),
    barrierFreePct: pctOf(maskDist(g, walk.path, BIT_BARRIER_FREE), walk.distance),
    segmentCovered: walk.path.map((e) => !!(g.mask[e] & BIT_COVERED)),
    segmentFlat: walk.path.map((e) => !!(g.mask[e] & BIT_FLAT)),
    elevations: elevationProfile(g, walk.path, walk.nodes),
    origin,
  };
}

/**
 * Loop generation. Tries, in order:
 *  1. strict — no segment of `excludeSegmentIds` may be reused;
 *  2. reuse — previous segments stay usable but are heavily penalised, so
 *     regeneration still succeeds when a fully-disjoint loop is impossible;
 *  3. fresh — no exclusion at all.
 * Returns null only when a loop genuinely cannot be formed.
 */
function findLoop(
  g: Graph,
  start: number,
  target: number,
  ok: MaskOk,
  excluded: Set<number>,
  rng: Rng,
  opts: WalkOpts = {},
): Found | null {
  const strict = findBest(g, start, target, ok, excluded, rng, "loop", opts);
  if (strict) return strict;
  if (excluded.size > 0) {
    const reuse = findBest(g, start, target, ok, new Set(), rng, "loop", {
      ...opts,
      penalize: (edge) => excluded.has(edge),
    });
    if (reuse) return reuse;
  }
  return freshLoop(g, start, target, ok, rng, opts);
}

/** Repeated fresh loop attempts across advancing seeds, as a final guarantee. */
function freshLoop(
  g: Graph,
  start: number,
  target: number,
  ok: MaskOk,
  rng: Rng,
  opts: WalkOpts = {},
): Found | null {
  for (let i = 0; i < 8 + Math.floor(target / 2000) * 4; i++) {
    const found = findBest(g, start, target, ok, new Set(), rng, "loop", opts);
    if (found) return found;
    rng();
  }
  return null;
}

export function generateRoute(
  g: Graph,
  req: GenerateRequest,
): GenerateResponse {
  const target = req.targetDistanceM;
  if (
    !Number.isFinite(target) ||
    target < MIN_DISTANCE_M ||
    target > MAX_DISTANCE_M
  ) {
    return { ok: false, error: "unsupported-distance" };
  }
  const ok = makeMaskOk(req.criteria);
  const snapped = snap(
    g,
    req.origin.lat,
    req.origin.lon,
    (e) => ok(g, e),
    SNAP_RADIUS_M,
  );
  if (!snapped) return { ok: false, error: "no-compliant-segment" };

  const excluded = new Set<number>(req.excludeSegmentIds ?? []);
  const rng: Rng = mulberry32(req.seed ?? randomSeed());
  const start = snapped.nodeId;
  const origin: Route["origin"] = {
    lat: g.lat[start],
    lon: g.lon[start],
    nodeId: start,
  };
  const loop = req.criteria?.loop ?? true;
  const distToOrigin = dijkstraToOrigin(g, start, (e) => ok(g, e), target);
  const walkOpts: WalkOpts = { distToOrigin };

  if (loop) {
    const found = findLoop(g, start, target, ok, excluded, rng, walkOpts);
    if (found) {
      return {
        ok: true,
        route: toRoute(g, found.walk, "loop", found.tolerance, origin),
        toleranceUsed: found.tolerance,
      };
    }
    return { ok: false, error: "no-route" };
  }

  let found = findBest(g, start, target, ok, excluded, rng, "one-way", walkOpts);
  if (!found && excluded.size > 0) {
    found = findBest(g, start, target, ok, new Set(), rng, "one-way", {
      ...walkOpts,
      penalize: (edge) => excluded.has(edge),
    });
  }
  if (found) {
    return {
      ok: true,
      route: toRoute(g, found.walk, "one-way", found.tolerance, origin),
      toleranceUsed: found.tolerance,
    };
  }
  return { ok: false, error: "no-route" };
}
