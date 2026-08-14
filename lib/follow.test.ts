import { describe, expect, it } from "vitest";
import {
  haversineM,
  isOnRoute,
  nearestOnPolyline,
  OFF_ROUTE_TOLERANCE_M,
  streetAt,
} from "./follow";
import type { Route } from "./types";

const COORDS: [number, number][] = [
  [114.17, 22.3],
  [114.18, 22.3],
  [114.18, 22.31],
];

function makeRoute(): Route {
  return {
    type: "one-way",
    geometry: { type: "LineString", coordinates: COORDS },
    segmentIds: [1, 2],
    nodeIds: [0, 1, 2],
    distanceM: 2000,
    elevationGainM: 10,
    durationWalkS: 1600,
    durationRunS: 800,
    streetNames: ["East Road"],
    segmentStreetNamesTc: ["東路", ""],
    segmentStreetNamesEn: ["East Road", ""],
    elevations: [0, 2, 5],
    origin: { lat: 22.3, lon: 114.17, nodeId: 0 },
  };
}

describe("follow mode geometry", () => {
  it("finds the nearest segment for a position exactly on the polyline", () => {
    const info = nearestOnPolyline({ lat: 22.3, lon: 114.175 }, COORDS)!;
    expect(info.segmentIndex).toBe(0);
    expect(info.distanceM).toBeLessThan(1);
  });

  it("finds the nearest segment near a vertex", () => {
    const info = nearestOnPolyline({ lat: 22.305, lon: 114.18 }, COORDS)!;
    expect(info.segmentIndex).toBe(1);
    expect(info.distanceM).toBeLessThan(600);
  });

  it("reports on/off-route within the ~30-50m tolerance", () => {
    expect(isOnRoute({ lat: 22.3, lon: 114.175 }, COORDS)).toBe(true);
    const far = nearestOnPolyline(
      { lat: 22.3 + 0.001, lon: 114.175 },
      COORDS,
    )!;
    expect(far.distanceM).toBeGreaterThan(OFF_ROUTE_TOLERANCE_M);
    expect(isOnRoute({ lat: 22.3 + 0.001, lon: 114.175 }, COORDS)).toBe(false);
  });

  it("reports progress along the polyline to the nearest point", () => {
    const mid = nearestOnPolyline({ lat: 22.3, lon: 114.175 }, COORDS)!;
    const first = nearestOnPolyline({ lat: 22.3, lon: 114.17 }, COORDS)!;
    const vertex = nearestOnPolyline({ lat: 22.3, lon: 114.18 }, COORDS)!;
    const segLen = haversineM(22.3, 114.17, 22.3, 114.18);
    expect(mid.progressM).toBeCloseTo(segLen / 2, 0);
    expect(first.progressM).toBeCloseTo(0, 0);
    expect(vertex.progressM).toBeCloseTo(segLen, 0);
    expect(vertex.progressM).toBeLessThanOrEqual(
      haversineM(22.3, 114.17, 22.31, 114.18),
    );
  });

  it("returns the current street name in the chosen language with fallback", () => {
    const route = makeRoute();
    expect(streetAt(route, 0, "en")).toBe("East Road");
    expect(streetAt(route, 0, "tc")).toBe("東路");
    expect(streetAt(route, 1, "tc")).toBe("");
  });
});
