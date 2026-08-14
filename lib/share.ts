import type { Route } from "./types";

const PREFIX = "hkr1.";

const COORD_PRECISION = 1e6;

interface SlimRouteV3 {
  v: 3;
  type: Route["type"];
  poly: string;
  distanceM: number;
  elevationGainM: number;
  durationWalkS: number;
  durationRunS: number;
  streetNames: string[];
  segmentStreetsTc: string[];
  segmentStreetsEn: string[];
  elevations: number[];
  coveredPct?: number;
  barrierFreePct?: number;
  segmentCovered: boolean[];
  segmentFlat: boolean[];
  origin: Route["origin"];
}

interface SlimRoute {
  v: 2;
  type: Route["type"];
  poly: string;
  distanceM: number;
  elevationGainM: number;
  durationWalkS: number;
  durationRunS: number;
  streetNames: string[];
  segmentStreetsTc: string[];
  segmentStreetsEn: string[];
  elevations: number[];
  coveredPct?: number;
  barrierFreePct?: number;
  origin: Route["origin"];
}

interface SlimRouteV1 {
  v: 1;
  type: Route["type"];
  geometry: Route["geometry"];
  distanceM: number;
  elevationGainM: number;
  durationWalkS: number;
  durationRunS: number;
  streetNames: string[];
  segmentStreetsTc: string[];
  segmentStreetsEn: string[];
  elevations: number[];
  origin: Route["origin"];
}

function encodePoly(coords: readonly [number, number][]): string {
  const bytes: number[] = [];
  let prevLat = 0;
  let prevLon = 0;
  const pushVarint = (value: number) => {
    let v = value;
    while (v >= 0x80) {
      bytes.push((v & 0x7f) | 0x80);
      v = Math.floor(v / 128);
    }
    bytes.push(v);
  };
  for (const [lon, lat] of coords) {
    const dLat = Math.round(lat * COORD_PRECISION) - prevLat;
    const dLon = Math.round(lon * COORD_PRECISION) - prevLon;
    prevLat += dLat;
    prevLon += dLon;
    pushVarint(dLat >= 0 ? dLat * 2 : -dLat * 2 - 1);
    pushVarint(dLon >= 0 ? dLon * 2 : -dLon * 2 - 1);
  }
  let bin = "";
  const arr = new Uint8Array(bytes);
  const CHUNK = 0x8000;
  for (let i = 0; i < arr.length; i += CHUNK) {
    bin += String.fromCharCode(...arr.subarray(i, i + CHUNK));
  }
  return btoa(bin).replaceAll("=", "");
}

function decodePoly(s: string): [number, number][] {
  const bin = atob(s);
  const coords: [number, number][] = [];
  let lat = 0;
  let lon = 0;
  let i = 0;
  const readVarint = (): number => {
    let value = 0;
    let shift = 0;
    while (true) {
      const b = bin.charCodeAt(i++);
      value += (b & 0x7f) * 2 ** shift;
      if (b < 0x80) break;
      shift += 7;
    }
    return value;
  };
  const dezigzag = (z: number) => (z & 1 ? -(z + 1) / 2 : z / 2);
  while (i < bin.length) {
    lat += dezigzag(readVarint());
    lon += dezigzag(readVarint());
    coords.push([lon / COORD_PRECISION, lat / COORD_PRECISION]);
  }
  return coords;
}

function bytesToBase64url(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64urlToBytes(s: string): Uint8Array {
  const b64 = s.replaceAll("-", "+").replaceAll("_", "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const stream = new Blob([copy])
    .stream()
    .pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const stream = new Blob([copy])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function toSlim(route: Route): SlimRouteV3 {
  return {
    v: 3,
    type: route.type,
    poly: encodePoly(route.geometry.coordinates),
    distanceM: route.distanceM,
    elevationGainM: route.elevationGainM,
    durationWalkS: route.durationWalkS,
    durationRunS: route.durationRunS,
    streetNames: route.streetNames,
    segmentStreetsTc: route.segmentStreetNamesTc,
    segmentStreetsEn: route.segmentStreetNamesEn,
    elevations: route.elevations,
    coveredPct: route.coveredPct,
    barrierFreePct: route.barrierFreePct,
    segmentCovered: route.segmentCovered ?? [],
    segmentFlat: route.segmentFlat ?? [],
    origin: route.origin,
  };
}

function fromSlimV3(slim: SlimRouteV3): Route {
  return {
    type: slim.type,
    geometry: { type: "LineString", coordinates: decodePoly(slim.poly) },
    segmentIds: [],
    nodeIds: [],
    distanceM: slim.distanceM,
    elevationGainM: slim.elevationGainM,
    durationWalkS: slim.durationWalkS,
    durationRunS: slim.durationRunS,
    streetNames: slim.streetNames,
    segmentStreetNamesTc: slim.segmentStreetsTc ?? [],
    segmentStreetNamesEn: slim.segmentStreetsEn ?? [],
    elevations: slim.elevations ?? [],
    coveredPct: slim.coveredPct,
    barrierFreePct: slim.barrierFreePct,
    segmentCovered: slim.segmentCovered,
    segmentFlat: slim.segmentFlat,
    origin: slim.origin,
  };
}

function fromSlim(slim: SlimRoute): Route {
  return {
    type: slim.type,
    geometry: { type: "LineString", coordinates: decodePoly(slim.poly) },
    segmentIds: [],
    nodeIds: [],
    distanceM: slim.distanceM,
    elevationGainM: slim.elevationGainM,
    durationWalkS: slim.durationWalkS,
    durationRunS: slim.durationRunS,
    streetNames: slim.streetNames,
    segmentStreetNamesTc: slim.segmentStreetsTc ?? [],
    segmentStreetNamesEn: slim.segmentStreetsEn ?? [],
    elevations: slim.elevations ?? [],
    coveredPct: slim.coveredPct,
    barrierFreePct: slim.barrierFreePct,
    origin: slim.origin,
  };
}

function fromSlimV1(slim: SlimRouteV1): Route {
  return {
    type: slim.type,
    geometry: slim.geometry,
    segmentIds: [],
    nodeIds: [],
    distanceM: slim.distanceM,
    elevationGainM: slim.elevationGainM,
    durationWalkS: slim.durationWalkS,
    durationRunS: slim.durationRunS,
    streetNames: slim.streetNames,
    segmentStreetNamesTc: slim.segmentStreetsTc ?? [],
    segmentStreetNamesEn: slim.segmentStreetsEn ?? [],
    elevations: slim.elevations ?? [],
    origin: slim.origin,
  };
}

export async function encodeRoute(route: Route): Promise<string> {
  const json = JSON.stringify(toSlim(route));
  const bytes = new TextEncoder().encode(json);
  const compressed = await deflate(bytes);
  return PREFIX + bytesToBase64url(compressed);
}

export async function decodeRoute(payload: string): Promise<Route> {
  if (!payload.startsWith(PREFIX)) {
    throw new Error("not a route payload");
  }
  const compressed = base64urlToBytes(payload.slice(PREFIX.length));
  const bytes = await inflate(compressed);
  const slim = JSON.parse(new TextDecoder().decode(bytes)) as
    | SlimRouteV3
    | SlimRoute
    | SlimRouteV1;
  if (slim.v === 3) {
    if (!slim.poly || !slim.type) {
      throw new Error("corrupt route payload");
    }
    return fromSlimV3(slim as SlimRouteV3);
  }
  if (slim.v === 2) {
    if (!slim.poly || !slim.type) {
      throw new Error("corrupt route payload");
    }
    return fromSlim(slim as SlimRoute);
  }
  if (slim.v === 1) {
    if (!slim.geometry || !slim.type) {
      throw new Error("corrupt route payload");
    }
    return fromSlimV1(slim as SlimRouteV1);
  }
  throw new Error("corrupt route payload");
}

export function buildShareUrl(payload: string, base: string): string {
  const url = new URL(base);
  url.hash = `route=${payload}`;
  return url.href;
}

export function payloadFromUrl(href: string): string | null {
  try {
    const url = new URL(href);
    const match = url.hash.match(/^#route=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}
