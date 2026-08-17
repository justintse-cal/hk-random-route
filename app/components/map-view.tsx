"use client";

import { useEffect, useRef } from "react";
import {
  AJAXError,
  AttributionControl,
  GeoJSONSource,
  LngLatBounds,
  Map as MapLibreMap,
  type MapMouseEvent,
  NavigationControl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { t, type Lang } from "@/lib/i18n";
import type { Route } from "@/lib/types";
import { buildRouteFeatures, type RouteFeatureCollection } from "./route-features";
import { DARK_FALLBACK_URL, fetchDarkStyle, LIGHT_STYLE } from "./liberty-dark";
import { LocateIcon, AddLocationAltIcon, CheckIcon } from "./icons";

export interface MapPick {
  lat: number;
  lon: number;
}

interface MapViewProps {
  origin: MapPick | null;
  route: Route | null;
  followPosition: MapPick | null;
  follow: boolean;
  dark: boolean;
  lang: Lang;
  onPick: (pick: MapPick) => void;
  onLocate: () => void;
  onLang: () => void;
  onBookmark: () => void;
  canBookmark: boolean;
  originBookmarked: boolean;
  showOriginHint: boolean;
  pendingOrigin: MapPick | null;
  onConfirmOrigin: () => void;
  onCancelOrigin: () => void;
  fitKey: number;
  fitOriginKey: number;
}

const SIGNAL_BLUE = "#2f6fed";
const COVERED_GREEN = "#16a34a";
const STEEP_MAGENTA = "#d81b60";
const ROUTE_COLOR: unknown[] = [
  "case",
  ["get", "steep"],
  STEEP_MAGENTA,
  ["get", "covered"],
  COVERED_GREEN,
  SIGNAL_BLUE,
];

const ROUTE_SOURCE = "route";
const ROUTE_CASING_LAYER = "route-casing";
const ROUTE_GLOW_LAYER = "route-glow";
const ROUTE_LAYER = "route-line";
const ORIGIN_SOURCE = "origin";
const ORIGIN_LAYER = "origin-pin";
const USER_SOURCE = "user";
const USER_GLOW_LAYER = "user-glow";
const USER_LAYER = "user-dot";

interface OverlayData {
  origin: MapPick | null;
  route: Route | null;
  followPosition: MapPick | null;
}

/**
 * Tracks the last source instance + data applied to each overlay source so
 * that `applyOverlays` can skip redundant `setData` calls. Sources reload on
 * every `setData`, which keeps `isStyleLoaded()` false and churns the map;
 * skipping identical data keeps the style settled. Keying on the source
 * instance means a recreated source (e.g. after a `setStyle` theme swap)
 * is always re-fed its data.
 */
interface CachedOverlayData {
  source: object;
  data: unknown;
}

interface OverlayCache {
  route?: CachedOverlayData;
  origin?: CachedOverlayData;
  followPosition?: CachedOverlayData;
}

/**
 * MapLibre aborts in-flight resource fetches (sprites, tiles) whenever a style
 * is swapped before the previous one finished loading. Those aborts surface as
 * `AJAXError` with status 0 and an "aborted" message, and MapLibre prints them
 * to the console when no `error` listener is attached. They are expected and
 * harmless (e.g. the initial light->dark theme swap), so filter them out while
 * still surfacing genuine request failures.
 */
function isAbortedRequestError(error: unknown): boolean {
  return (
    error instanceof AJAXError &&
    error.status === 0 &&
    /aborted/i.test(error.message)
  );
}

function ensureSource(map: MapLibreMap, id: string): void {
  if (!map.getSource(id)) {
    map.addSource(id, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
}

function sourceNeedsData(
  map: MapLibreMap,
  id: string,
  data: unknown,
  prev: CachedOverlayData | undefined,
): boolean {
  const src = map.getSource(id);
  if (!src || data === undefined || data === null) return false;
  return !prev || prev.source !== src || prev.data !== data;
}

function setRouteData(
  map: MapLibreMap,
  data: RouteFeatureCollection,
): GeoJSONSource | undefined {
  const src = map.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined;
  if (!src) return undefined;
  src.setData(data);
  return src;
}

function setPointData(
  map: MapLibreMap,
  id: string,
  coords: [number, number],
): GeoJSONSource | undefined {
  const src = map.getSource(id) as GeoJSONSource | undefined;
  if (!src) return undefined;
  src.setData({
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: coords },
  });
  return src;
}

const STYLE_READY_EVENTS = ["load", "styledata", "idle"] as const;

function collapseAttribution(map: MapLibreMap): void {
  const attrib = map.getContainer().querySelector<HTMLElement>(
    ".maplibregl-ctrl-attrib",
  );
  attrib?.classList.remove("maplibregl-compact-show");
  attrib?.removeAttribute("open");
}

function whenStyleReady(map: MapLibreMap, fn: () => void): void {
  if (map.isStyleLoaded()) {
    fn();
    return;
  }
  let done = false;
  const tryRun = () => {
    if (done) return;
    if (!map.isStyleLoaded()) return;
    done = true;
    for (const event of STYLE_READY_EVENTS) {
      map.off(event, tryRun);
    }
    fn();
  };
  for (const event of STYLE_READY_EVENTS) {
    map.on(event, tryRun);
  }
}

const ORIGIN_PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><g transform="translate(1.4066 1.4066) scale(2.81 2.81)"><path d="M 45 0 c 15.103 0 27.389 12.287 27.389 27.389 C 72.389 46.616 46.147 66.607 45 90 c -1.147 -23.393 -27.389 -43.384 -27.389 -62.611 C 17.611 12.287 29.897 0 45 0 z" fill="rgb(255,80,80)"/><circle cx="45.005" cy="26.575" r="9.205" fill="rgb(191,0,3)"/></g></svg>`;

function addSvgImage(map: MapLibreMap, name: string, svg: string, px: number): Promise<void> {
  const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = px;
      canvas.height = px;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, px, px);
      map.addImage(name, ctx.getImageData(0, 0, px, px));
      resolve();
    };
    img.onerror = () => resolve();
    img.src = dataUrl;
  });
}

function applyOverlays(map: MapLibreMap, data: OverlayData, cache?: OverlayCache): void {
  for (const id of [ROUTE_SOURCE, ORIGIN_SOURCE, USER_SOURCE]) {
    ensureSource(map, id);
  }

  if (!map.getLayer(ROUTE_CASING_LAYER)) {
    map.addLayer({
      id: ROUTE_CASING_LAYER,
      type: "line",
      source: ROUTE_SOURCE,
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#ffffff",
        "line-width": 10,
        "line-opacity": 0.95,
      },
    });
  }

  if (!map.getLayer(ROUTE_GLOW_LAYER)) {
    map.addLayer({
      id: ROUTE_GLOW_LAYER,
      type: "line",
      source: ROUTE_SOURCE,
      paint: {
        "line-color": ROUTE_COLOR as unknown as string,
        "line-width": 14,
        "line-blur": 6,
        "line-opacity": 0.25,
      },
    });
  }

  if (!map.getLayer(ROUTE_LAYER)) {
    map.addLayer({
      id: ROUTE_LAYER,
      type: "line",
      source: ROUTE_SOURCE,
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": ROUTE_COLOR as unknown as string,
        "line-width": 6,
        "line-opacity": 1,
      },
    });
  }

  if (!map.getLayer(ORIGIN_LAYER)) {
    map.addLayer({
      id: ORIGIN_LAYER,
      type: "symbol",
      source: ORIGIN_SOURCE,
      layout: {
        "icon-image": "origin-pin",
        "icon-size": 0.35,
        "icon-anchor": "bottom",
        "icon-allow-overlap": true,
      },
    });
  }

  if (!map.getLayer(USER_GLOW_LAYER)) {
    map.addLayer({
      id: USER_GLOW_LAYER,
      type: "circle",
      source: USER_SOURCE,
      paint: {
        "circle-radius": 24,
        "circle-color": "#4285F4",
        "circle-opacity": 0.28,
        "circle-blur": 1.2,
      },
    });
  }
  if (!map.getLayer(USER_LAYER)) {
    map.addLayer({
      id: USER_LAYER,
      type: "circle",
      source: USER_SOURCE,
      paint: {
        "circle-radius": 8,
        "circle-color": "#4285F4",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2.5,
        "circle-blur": 0.15,
      },
    });
  }

  if (data.route && sourceNeedsData(map, ROUTE_SOURCE, data.route, cache?.route)) {
    const src = setRouteData(map, buildRouteFeatures(data.route));
    if (cache && src) cache.route = { source: src, data: data.route };
  }
  if (data.origin && sourceNeedsData(map, ORIGIN_SOURCE, data.origin, cache?.origin)) {
    const src = setPointData(map, ORIGIN_SOURCE, [data.origin.lon, data.origin.lat]);
    if (cache && src) cache.origin = { source: src, data: data.origin };
  }
  if (
    data.followPosition &&
    sourceNeedsData(map, USER_SOURCE, data.followPosition, cache?.followPosition)
  ) {
    const src = setPointData(map, USER_SOURCE, [data.followPosition.lon, data.followPosition.lat]);
    if (cache && src) cache.followPosition = { source: src, data: data.followPosition };
  }
}

export default function MapView({
  origin,
  route,
  followPosition,
  follow,
  dark,
  lang,
  onPick,
  onLocate,
  onLang,
  onBookmark,
  canBookmark,
  originBookmarked,
  showOriginHint,
  pendingOrigin,
  onConfirmOrigin,
  onCancelOrigin,
  fitKey,
  fitOriginKey,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const floatRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const onConfirmOriginRef = useRef(onConfirmOrigin);
  onConfirmOriginRef.current = onConfirmOrigin;
  const onCancelOriginRef = useRef(onCancelOrigin);
  onCancelOriginRef.current = onCancelOrigin;
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const didInit = useRef(false);
  const dataRef = useRef<OverlayData>({ origin, route, followPosition });
  dataRef.current = { origin, route, followPosition };
  const pendingRef = useRef<MapPick | null>(null);
  pendingRef.current = pendingOrigin;
  const overlayCacheRef = useRef<OverlayCache>({});
  const appliedDarkRef = useRef(dark);
  const pendingCameraRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const lastFitKey = useRef(0);
  const lastFitOriginKey = useRef(0);
  const lastOrigin = useRef<MapPick | null>(null);

  const positionFloating = () => {
    const el = floatRef.current;
    const mapEl = containerRef.current;
    if (!el || !mapEl) return;
    const nav = mapEl.querySelector<HTMLElement>(".maplibregl-ctrl-top-right");
    if (!nav) return;
    const mapRect = mapEl.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    el.style.top = `${navRect.bottom - mapRect.top + 10}px`;
  };

  useEffect(() => {
    if (didInit.current || !containerRef.current) return;
    didInit.current = true;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: appliedDarkRef.current ? DARK_FALLBACK_URL : LIGHT_STYLE,
      center: [114.1694, 22.3027],
      zoom: 13,
      attributionControl: false,
    });

    mapRef.current = map;
    map.on("error", (e) => {
      if (!isAbortedRequestError(e.error)) console.error(e.error);
    });
    map.addControl(new AttributionControl({ compact: true }), "bottom-left");
    map.addControl(new NavigationControl(), "top-right");
    requestAnimationFrame(() => positionFloating());
    map.on("click", (e: MapMouseEvent) => {
      onPickRef.current({ lat: e.lngLat.lat, lon: e.lngLat.lng });
    });
    map.on("movestart", () => {
      if (pendingRef.current) onCancelOriginRef.current();
    });

    map.on("styleimagemissing", (e) => {
      if (map.hasImage(e.id)) return;
      if (e.id === "origin-pin") {
        addSvgImage(map, "origin-pin", ORIGIN_PIN_SVG, 128);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      map.addImage(e.id, ctx.getImageData(0, 0, 16, 16));
    });

    map.on("load", async () => {
      const m = mapRef.current;
      if (!m) return;
      await addSvgImage(m, "origin-pin", ORIGIN_PIN_SVG, 128);
      if (mapRef.current !== m) return;
      collapseAttribution(m);
      applyOverlays(m, dataRef.current, overlayCacheRef.current);
      positionFloating();
      if (pendingCameraRef.current) {
        m.jumpTo(pendingCameraRef.current);
        pendingCameraRef.current = null;
      }
    });

    map.on("styledata", () => {
      const m = mapRef.current;
      if (!m) return;
      collapseAttribution(m);
      applyOverlays(m, dataRef.current, overlayCacheRef.current);
    });

    map.on("idle", () => {
      const m = mapRef.current;
      if (!m || !m.isStyleLoaded()) return;
      applyOverlays(m, dataRef.current, overlayCacheRef.current);
    });

    const onResize = () => positionFloating();
    window.addEventListener("resize", onResize);

    if (appliedDarkRef.current) {
      fetchDarkStyle().then((style) => {
        const m = mapRef.current;
        if (!m || !appliedDarkRef.current) return;
        const center = m.getCenter();
        pendingCameraRef.current = {
          center: [center.lng, center.lat],
          zoom: m.getZoom(),
        };
        m.setStyle(style, { diff: false });
      });
    }

    return () => {
      window.removeEventListener("resize", onResize);
      map.remove();
      mapRef.current = null;
      didInit.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedDarkRef.current === dark) return;
    appliedDarkRef.current = dark;
    const center = map.getCenter();
    pendingCameraRef.current = {
      center: [center.lng, center.lat],
      zoom: map.getZoom(),
    };
    if (dark) {
      fetchDarkStyle().then((style) => {
        const m = mapRef.current;
        if (m && appliedDarkRef.current) m.setStyle(style, { diff: false });
      });
    } else {
      map.setStyle(LIGHT_STYLE, { diff: false });
    }
  }, [dark]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (route || origin) {
      whenStyleReady(map, () =>
        applyOverlays(map, dataRef.current, overlayCacheRef.current),
      );
    }
  }, [route, origin, followPosition]);

  useEffect(() => {
    const map = mapRef.current;
    const coords = route?.geometry?.coordinates;
    const fitKeyChanged = fitKey !== lastFitKey.current;
    const fitOriginKeyChanged = fitOriginKey !== lastFitOriginKey.current;
    lastFitKey.current = fitKey;
    lastFitOriginKey.current = fitOriginKey;

    if (!map) return;

    // Camera moves don't need the style, so call them directly rather than
    // deferring on `whenStyleReady` (which can be starved while sources are
    // mid-reload). A route fit wins over any origin ease.
    if (coords && coords.length >= 2 && fitKeyChanged) {
      const bounds = coords.reduce(
        (b, [lon, lat]) => b.extend([lon, lat]),
        new LngLatBounds(),
      );
      map.fitBounds(bounds, { padding: 48, maxZoom: 16, duration: 500 });
      lastOrigin.current = origin;
      return;
    }

    const originChanged = origin !== null && origin !== lastOrigin.current;
    lastOrigin.current = origin;

    if (origin && (fitOriginKeyChanged || (route === null && originChanged))) {
      map.easeTo({
        center: [origin.lon, origin.lat],
        zoom: 15,
        duration: 600,
      });
    }
  }, [fitKey, fitOriginKey, route, origin]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !followPosition) return;
    if (follow) map.easeTo({ center: [followPosition.lon, followPosition.lat] });
  }, [followPosition, follow]);

  useEffect(() => {
    if (!pendingOrigin) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancelOriginRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingOrigin]);

  useEffect(() => {
    if (pendingOrigin) confirmRef.current?.focus();
  }, [pendingOrigin]);

  return (
    <div ref={containerRef} className="map-root">
      <div ref={floatRef} className="map-floating">
        <div className="map-floating-actions">
          <button
            type="button"
            className="icon-btn"
            aria-label={t(lang, "origin.bookmark")}
            title={t(lang, "origin.bookmark")}
            onClick={onBookmark}
            disabled={!canBookmark}
          >
            {originBookmarked ? (
              <CheckIcon />
            ) : (
              <AddLocationAltIcon />
            )}
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={t(lang, "origin.currentLocation")}
            title={t(lang, "origin.currentLocation")}
            onClick={onLocate}
          >
            <LocateIcon />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={t(lang, lang === "tc" ? "nav.langToEn" : "nav.langToTc")}
            title={t(lang, lang === "tc" ? "nav.langToEn" : "nav.langToTc")}
            onClick={onLang}
          >
            <span className="lang-chip" aria-hidden="true">
              {lang === "tc" ? "EN" : "繁"}
            </span>
          </button>
        </div>
      </div>

      {showOriginHint && (
        <p className="origin-hint" role="note">
          <span className="origin-hint-mark" aria-hidden="true">
            <AddLocationAltIcon />
          </span>
          {t(lang, "origin.pinHint")}
        </p>
      )}

      {pendingOrigin && (
        <div className="origin-confirm" role="dialog" aria-label={t(lang, "origin.place")}>
          <span className="origin-confirm-label">
            {t(lang, "origin.place")}
            {lang === "tc" ? "？" : "?"}
          </span>
          <button
            ref={confirmRef}
            type="button"
            className="origin-confirm-btn origin-confirm-btn--primary"
            onClick={onConfirmOrigin}
          >
            {t(lang, "origin.place")}
          </button>
          <button
            type="button"
            className="origin-confirm-btn"
            onClick={onCancelOrigin}
          >
            {t(lang, "origin.cancel")}
          </button>
        </div>
      )}
    </div>
  );
}
