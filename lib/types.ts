export type RouteType = "loop" | "one-way" | "out-and-back";

export interface Criteria {
  covered: boolean;
  barrierFree: boolean;
  flat: boolean;
  loop: boolean;
}

export interface Route {
  type: RouteType;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  segmentIds: number[];
  nodeIds: number[];
  distanceM: number;
  elevationGainM: number;
  durationWalkS: number;
  durationRunS: number;
  streetNames: string[];
  /** street name of the edge between coordinate i and i+1, Traditional Chinese */
  segmentStreetNamesTc: string[];
  /** street name of the edge between coordinate i and i+1, English */
  segmentStreetNamesEn: string[];
  /** cumulative elevation relative to the origin, parallel to coordinates */
  elevations: number[];
  /** percentage (0–100) of the route's distance under cover */
  coveredPct?: number;
  /** percentage (0–100) of the route's distance that is barrier-free */
  barrierFreePct?: number;
  /**
   * Under-cover flag for the segment between coordinate i and i+1,
   * parallel to `geometry.coordinates` (length = coordinates.length - 1).
   * Absent for routes restored from old share links.
   */
  segmentCovered?: boolean[];
  /**
   * Flat flag (gradient < 10%) for the segment between coordinate i and i+1,
   * parallel to `geometry.coordinates` (length = coordinates.length - 1).
   * Absent for routes restored from old share links.
   */
  segmentFlat?: boolean[];
  origin: { lat: number; lon: number; nodeId: number };
}

export interface GenerateRequest {
  origin: { lat: number; lon: number };
  targetDistanceM: number;
  criteria?: Partial<Criteria>;
  excludeSegmentIds?: number[];
  seed?: number;
}

export type GenerateError =
  | "unsupported-distance"
  | "no-compliant-segment"
  | "no-route";

export interface GenerateResponse {
  ok: boolean;
  route?: Route;
  error?: GenerateError;
  toleranceUsed?: number;
}

export interface FollowUiState {
  active: boolean;
  onRoute: boolean;
  lost: boolean;
  distanceM: number;
  street: string;
  position: { lat: number; lon: number };
  segmentIndex: number;
  remainingM: number;
}
