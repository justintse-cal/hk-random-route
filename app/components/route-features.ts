import type { Route } from "@/lib/types";

export interface RouteFeatureProps {
  covered: boolean;
  steep: boolean;
}

export type RouteFeature = {
  type: "Feature";
  properties: RouteFeatureProps;
  geometry: { type: "LineString"; coordinates: [number, number][] };
};

export type RouteFeatureCollection = {
  type: "FeatureCollection";
  features: RouteFeature[];
};

const STEEP_THRESHOLD = 0.1;

function havDist(
  a: [number, number],
  b: [number, number],
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function steepFromElevations(
  coords: [number, number][],
  elevations: number[] | undefined,
  i: number,
): boolean {
  if (!elevations || elevations.length < coords.length) return false;
  const dz = Math.abs(elevations[i + 1] - elevations[i]);
  const d = havDist(coords[i], coords[i + 1]);
  if (d <= 0) return false;
  return dz / d >= STEEP_THRESHOLD;
}

export function buildRouteFeatures(route: Route): RouteFeatureCollection {
  const coords = route.geometry?.coordinates;
  if (!coords || coords.length < 2) {
    return { type: "FeatureCollection", features: [] };
  }
  const features: RouteFeature[] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const covered = route.segmentCovered?.[i] ?? false;
    const flat = route.segmentFlat?.[i];
    const steep =
      flat !== undefined ? !flat : steepFromElevations(coords, route.elevations, i);
    features.push({
      type: "Feature",
      properties: { covered, steep },
      geometry: {
        type: "LineString",
        coordinates: [coords[i], coords[i + 1]],
      },
    });
  }
  return { type: "FeatureCollection", features };
}
