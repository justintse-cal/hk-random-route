import { describe, expect, it } from "vitest";
import { routeToGpx } from "./gpx";
import type { Route } from "./types";

function sampleRoute(): Route {
  return {
    type: "loop",
    geometry: {
      type: "LineString",
      coordinates: [
        [114.1694, 22.3027],
        [114.1705, 22.3031],
        [114.1716, 22.3036],
        [114.1694, 22.3027],
      ],
    },
    segmentIds: [1, 2, 3],
    nodeIds: [1, 2, 3, 1],
    distanceM: 2100,
    elevationGainM: 30,
    durationWalkS: 1680,
    durationRunS: 840,
    streetNames: ["Hennessy Road"],
    segmentStreetNamesTc: ["軒尼詩道"],
    segmentStreetNamesEn: ["Hennessy Road"],
    elevations: [0, 3, 8, 0],
    origin: { lat: 22.3027, lon: 114.1694, nodeId: 1 },
  };
}

function extractPoints(gpx: string): { lat: number; lon: number; ele: number }[] {
  const re = /<trkpt lat="([-\d.]+)" lon="([-\d.]+)"><ele>([-\d.]+)<\/ele><\/trkpt>/g;
  const out: { lat: number; lon: number; ele: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(gpx)) !== null) {
    out.push({ lat: parseFloat(m[1]), lon: parseFloat(m[2]), ele: parseFloat(m[3]) });
  }
  return out;
}

describe("GPX export", () => {
  it("produces valid GPX with the full geometry", () => {
    const route = sampleRoute();
    const gpx = routeToGpx(route);
    expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(gpx).toContain('<gpx version="1.1"');
    expect(gpx).toContain("<trk>");
    expect(gpx).toContain("</gpx>");
    const points = extractPoints(gpx);
    expect(points.length).toBe(route.geometry.coordinates.length);
    route.geometry.coordinates.forEach(([lon, lat], i) => {
      expect(points[i].lat).toBeCloseTo(lat, 5);
      expect(points[i].lon).toBeCloseTo(lon, 5);
      expect(points[i].ele).toBeCloseTo(route.elevations[i], 2);
    });
  });

  it("escapes XML special characters in the track name", () => {
    const route = { ...sampleRoute(), streetNames: ["A & B <C>"] };
    const gpx = routeToGpx(route);
    expect(gpx).toContain("A &amp; B &lt;C&gt;");
    expect(gpx).not.toContain("A & B <C>");
  });
});
