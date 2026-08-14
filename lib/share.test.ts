import { describe, expect, it } from "vitest";
import {
  buildShareUrl,
  decodeRoute,
  encodeRoute,
  payloadFromUrl,
} from "./share";
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
        [114.1727, 22.3041],
        [114.1738, 22.3046],
        [114.1694, 22.3027],
      ],
    },
    segmentIds: [1, 2, 3, 4, 5],
    nodeIds: [1, 2, 3, 4, 5, 1],
    distanceM: 5100,
    elevationGainM: 128,
    durationWalkS: 4080,
    durationRunS: 2040,
    streetNames: ["Hennessy Road", "Gloucester Road"],
    segmentStreetNamesTc: ["軒尼詩道", "告士打道"],
    segmentStreetNamesEn: ["Hennessy Road", "Gloucester Road"],
    elevations: [0, 3, 8, 12, 9, 0],
    coveredPct: 62,
    barrierFreePct: 81,
    segmentCovered: [true, false, true, false, true],
    segmentFlat: [false, true, true, true, false],
    origin: { lat: 22.3027, lon: 114.1694, nodeId: 1 },
  };
}

describe("share link payload", () => {
  it("round-trips the route losslessly", async () => {
    const route = sampleRoute();
    const payload = await encodeRoute(route);
    expect(payload.startsWith("hkr1.")).toBe(true);
    expect(payload.length).toBeLessThan(2000);

    const decoded = await decodeRoute(payload);
    expect(decoded.type).toBe(route.type);
    expect(decoded.geometry).toEqual(route.geometry);
    expect(decoded.distanceM).toBe(route.distanceM);
    expect(decoded.elevationGainM).toBe(route.elevationGainM);
    expect(decoded.durationWalkS).toBe(route.durationWalkS);
    expect(decoded.durationRunS).toBe(route.durationRunS);
    expect(decoded.streetNames).toEqual(route.streetNames);
    expect(decoded.segmentStreetNamesTc).toEqual(route.segmentStreetNamesTc);
    expect(decoded.segmentStreetNamesEn).toEqual(route.segmentStreetNamesEn);
    expect(decoded.elevations).toEqual(route.elevations);
    expect(decoded.coveredPct).toBe(route.coveredPct);
    expect(decoded.barrierFreePct).toBe(route.barrierFreePct);
    expect(decoded.segmentCovered).toEqual(route.segmentCovered);
    expect(decoded.segmentFlat).toEqual(route.segmentFlat);
    expect(decoded.origin).toEqual(route.origin);
  });

  it("builds and parses share URLs via the hash fragment", () => {
    const url = buildShareUrl("abc123/+/=", "https://example.com/route");
    expect(url).toMatch(/^https:\/\/example\.com\/route#route=/);
    expect(payloadFromUrl(url)).toBe("abc123/+/=");
    expect(payloadFromUrl("https://example.com/other")).toBeNull();
  });

  it("rejects foreign payloads", async () => {
    await expect(decodeRoute("nonsense")).rejects.toThrow();
  });
});
