import type { Lang } from "./i18n";
import type { Route } from "./types";

export interface NearestInfo {
  /** index of the segment (edge between coords[i] and coords[i+1]) */
  segmentIndex: number;
  /** distance in metres from the position to the nearest point on the polyline */
  distanceM: number;
  point: { lat: number; lon: number };
  /** cumulative distance along the polyline to the nearest point (metres) */
  progressM: number;
}

const R = 6371000;
const toRad = Math.PI / 180;

export function haversineM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Metres per degree of latitude, and of longitude at the given latitude. */
function metersPerDegree(lat: number): { latM: number; lonM: number } {
  const latM = 111320;
  const lonM = 111320 * Math.cos(lat * toRad);
  return { latM, lonM };
}

/**
 * Find the nearest point on a polyline to the given position. Coordinates are
 * [lon, lat] pairs as stored in a Route. Returns null for a degenerate polyline.
 */
export function nearestOnPolyline(
  p: { lat: number; lon: number },
  coords: [number, number][],
): NearestInfo | null {
  if (coords.length < 2) return null;
  const { latM, lonM } = metersPerDegree(p.lat);
  let best: NearestInfo | null = null;
  let bestDist = Infinity;
  let cumM = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const aLat = coords[i][1];
    const aLon = coords[i][0];
    const bLat = coords[i + 1][1];
    const bLon = coords[i + 1][0];
    const segLen = haversineM(aLat, aLon, bLat, bLon);
    // Work in local metres.
    const ax = (aLon - p.lon) * lonM;
    const ay = (aLat - p.lat) * latM;
    const bx = (bLon - p.lon) * lonM;
    const by = (bLat - p.lat) * latM;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    const d = Math.hypot(cx, cy);
    if (d < bestDist) {
      bestDist = d;
      best = {
        segmentIndex: i,
        distanceM: d,
        point: { lat: p.lat + cy / latM, lon: p.lon + cx / lonM },
        progressM: cumM + t * segLen,
      };
    }
    cumM += segLen;
  }
  return best;
}

export const OFF_ROUTE_TOLERANCE_M = 40;

export function isOnRoute(
  p: { lat: number; lon: number },
  coords: [number, number][],
  toleranceM = OFF_ROUTE_TOLERANCE_M,
): boolean {
  const nearest = nearestOnPolyline(p, coords);
  return nearest !== null && nearest.distanceM <= toleranceM;
}

export function streetAt(
  route: Route,
  segmentIndex: number,
  lang: Lang,
): string {
  const names = lang === "tc" ? route.segmentStreetNamesTc : route.segmentStreetNamesEn;
  const name = names[segmentIndex];
  if (name) return name;
  return (lang === "tc"
    ? route.segmentStreetNamesEn
    : route.segmentStreetNamesTc
  )[segmentIndex] ?? "";
}
