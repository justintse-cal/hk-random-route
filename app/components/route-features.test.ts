import { describe, expect, it } from "vitest";
import { buildRouteFeatures } from "./route-features";
import type { Route } from "@/lib/types";

function route(overrides: Partial<Route>): Route {
  return {
    type: "loop",
    geometry: {
      type: "LineString",
      coordinates: [
        [114.1694, 22.3027],
        [114.1705, 22.3031],
        [114.1716, 22.3036],
      ],
    },
    segmentIds: [1, 2],
    nodeIds: [1, 2, 1],
    distanceM: 2000,
    elevationGainM: 10,
    durationWalkS: 1600,
    durationRunS: 800,
    streetNames: [],
    segmentStreetNamesTc: [],
    segmentStreetNamesEn: [],
    elevations: [0, 1, 2],
    origin: { lat: 22.3027, lon: 114.1694, nodeId: 1 },
    ...overrides,
  };
}

describe("buildRouteFeatures", () => {
  it("splits the route into one feature per segment with endpoint coords", () => {
    const r = route({});
    const fc = buildRouteFeatures(r);
    expect(fc.features).toHaveLength(2);
    expect(fc.features[0].geometry.coordinates).toEqual([
      [114.1694, 22.3027],
      [114.1705, 22.3031],
    ]);
    expect(fc.features[1].geometry.coordinates).toEqual([
      [114.1705, 22.3031],
      [114.1716, 22.3036],
    ]);
  });

  it("maps covered flags onto features", () => {
    const r = route({ segmentCovered: [true, false] });
    const fc = buildRouteFeatures(r);
    expect(fc.features[0].properties.covered).toBe(true);
    expect(fc.features[1].properties.covered).toBe(false);
  });

  it("marks a segment steep when it is the reverse of the flat flag", () => {
    const r = route({ segmentFlat: [true, false] });
    const fc = buildRouteFeatures(r);
    expect(fc.features[0].properties.steep).toBe(false);
    expect(fc.features[1].properties.steep).toBe(true);
  });

  it("derives steep from elevations when the flat flag is absent", () => {
    const r = route({
      segmentFlat: undefined,
      segmentCovered: undefined,
      geometry: {
        type: "LineString",
        coordinates: [
          [114.1694, 22.3027],
          [114.16941, 22.3027],
          [114.16942, 22.3027],
        ],
      },
      elevations: [0, 0.35, 0.36],
    });
    const fc = buildRouteFeatures(r);
    expect(fc.features[0].properties.steep).toBe(true);
    expect(fc.features[1].properties.steep).toBe(false);
  });

  it("defaults to covered=false and steep=false when no flag data exists", () => {
    const r = route({ segmentCovered: undefined, segmentFlat: undefined, elevations: undefined });
    const fc = buildRouteFeatures(r);
    for (const f of fc.features) {
      expect(f.properties.covered).toBe(false);
      expect(f.properties.steep).toBe(false);
    }
  });

  it("returns an empty collection for degenerate geometry", () => {
    const r = route({
      geometry: { type: "LineString", coordinates: [[114.1694, 22.3027]] },
    });
    expect(buildRouteFeatures(r).features).toHaveLength(0);
  });
});
