// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Route } from "../lib/types";
import AboutView from "./components/about-panel";
import CriteriaSheet from "./components/criteria-sheet";
import LegendView from "./components/legend-panel";
import MapView from "./components/map-view";
import RouteSheet from "./components/route-sheet";

vi.mock("next/dynamic", () => {
  const ReactMod: typeof React = require("react");
  return {
    __esModule: true,
    default: (load: () => Promise<{ default: React.ComponentType }>) => {
      const compRef: { current: React.ComponentType | null } = { current: null };
      return function Dynamic(props: Record<string, unknown>) {
        const [ready, setReady] = ReactMod.useState(false);
        ReactMod.useEffect(() => {
          let alive = true;
          void load().then((mod) => {
            if (!alive) return;
            compRef.current = mod.default ?? mod;
            setReady(true);
          });
          return () => {
            alive = false;
          };
        }, []);
        return ready && compRef.current
          ? ReactMod.createElement(compRef.current, props)
          : null;
      };
    },
  };
});

// jsdom has no CompressionStream, so real route encoding would throw. The UI
// tests only care that sharing copies a link, not the compression format.
vi.mock("@/lib/share", () => ({
  buildShareUrl: (payload: string, base: string) => `${base}#route=${payload}`,
  decodeRoute: async () => {
    throw new Error("no shared route in ui tests");
  },
  encodeRoute: async () => "mock-route-payload",
  payloadFromUrl: () => null,
}));

const mapTestState = vi.hoisted(() => ({
  instances: [] as Array<{
    emit: (event: string) => void;
    setStyleLoaded: (loaded: boolean) => void;
    setStyle: () => void;
    getSource: (id: string) => { setDataCount: number } | undefined;
    addLayerCount: number;
    fitBoundsCalls: unknown[];
    easeToCalls: Array<{ center?: unknown; zoom?: number }>;
  }>,
}));

vi.mock("maplibre-gl", () => {
  class FakeSource {
    setDataCount = 0;
    setData() {
      this.setDataCount += 1;
      return undefined;
    }
  }
  class FakeMap {
    private _listeners = new Map<string, Set<() => void>>();
    private _styleLoaded = true;
    private _sources = new Map<string, FakeSource>();
    private _layers = new Set<string>();
    addLayerCount = 0;
    fitBoundsCalls: unknown[] = [];
    easeToCalls: Array<{ center?: unknown; zoom?: number }> = [];

    constructor(_opts: unknown) {
      mapTestState.instances.push(this);
    }

    addControl() {
      return undefined;
    }

    on(event: string, fn: () => void) {
      let set = this._listeners.get(event);
      if (!set) {
        set = new Set();
        this._listeners.set(event, set);
      }
      set.add(fn);
    }

    off(event: string, fn: () => void) {
      this._listeners.get(event)?.delete(fn);
    }

    once(event: string, fn: () => void) {
      const wrapped = () => {
        this.off(event, wrapped);
        fn();
      };
      this.on(event, wrapped);
    }

    emit(event: string) {
      for (const fn of [...(this._listeners.get(event) ?? [])]) fn();
    }

    setStyleLoaded(loaded: boolean) {
      this._styleLoaded = loaded;
    }

    getStyle() {
      return undefined;
    }

    addSource(opts: { id?: string } | string) {
      const id = typeof opts === "string" ? opts : opts.id;
      if (id) {
        if (!this._sources.has(id)) {
          this._sources.set(id, new FakeSource());
        }
        return this._sources.get(id)!;
      }
      return new FakeSource();
    }

    addLayer(opts: { id?: string }) {
      if (opts.id) this._layers.add(opts.id);
      this.addLayerCount += 1;
      return undefined;
    }

    getLayer(id: string) {
      return this._layers.has(id) ? {} : undefined;
    }

    getSource(id: string) {
      return this._sources.get(id);
    }

    setStyle() {
      this._sources.clear();
      this._layers.clear();
      return undefined;
    }

    getCenter() {
      return { lng: 114.1694, lat: 22.3027 };
    }

    getContainer() {
      return { querySelector: () => null };
    }

    getZoom() {
      return 13;
    }

    jumpTo() {
      return undefined;
    }

    easeTo(options: { center?: unknown; zoom?: number }) {
      this.easeToCalls.push(options);
      return undefined;
    }

    isStyleLoaded() {
      return this._styleLoaded;
    }

    fitBounds() {
      this.fitBoundsCalls.push(arguments);
      return undefined;
    }

    remove() {
      return undefined;
    }
  }
  return {
    Map: FakeMap,
    NavigationControl: class {},
    AttributionControl: class {},
    GeoJSONSource: FakeSource,
    LngLatBounds: class {
      extend() {
        return this;
      }
    },
  };
});

function makeRoute(): Route {
  return {
    type: "loop",
    geometry: {
      type: "LineString",
      coordinates: [
        [114.1694, 22.3027],
        [114.1705, 22.3031],
        [114.1694, 22.3027],
      ],
    },
    segmentIds: [1, 2],
    nodeIds: [1, 2, 1],
    distanceM: 3000,
    elevationGainM: 42,
    durationWalkS: 2400,
    durationRunS: 1200,
    streetNames: ["軒尼詩道"],
    segmentStreetNamesTc: ["軒尼詩道"],
    segmentStreetNamesEn: ["Hennessy Road"],
    elevations: [0, 5, 0],
    coveredPct: 100,
    barrierFreePct: 25,
    segmentCovered: [true, true],
    segmentFlat: [true, false],
    origin: { lat: 22.3027, lon: 114.1694, nodeId: 1 },
  };
}

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  if (url.includes("/api/weather")) {
    return {
      ok: true,
      json: async () => ({ ok: true, tc: "", en: "" }),
    };
  }
  if (url.includes("/api/snap")) {
    return {
      ok: true,
      json: async () => ({
        ok: true,
        origin: { lat: body.lat, lon: body.lon, nodeId: 1 },
        distanceM: 20,
      }),
    };
  }
  if (url.includes("/api/generate")) {
    return { ok: true, json: async () => ({ ok: true, route: makeRoute(), toleranceUsed: 0.1 }) };
  }
  return { ok: false, json: async () => ({ ok: false }) };
});

describe("app light end-to-end flow", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.localStorage.clear();
    mapTestState.instances.length = 0;
  });

  it("generate -> route renders -> save works", async () => {
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (cb: (pos: unknown) => void) =>
          cb({ coords: { latitude: 22.3027, longitude: 114.1694 } }),
        watchPosition: () => 1,
        clearWatch: () => undefined,
      },
      configurable: true,
    });

    const { default: Home } = await import("./page");
    render(React.createElement(Home));

    fireEvent.click(await screen.findByRole("button", { name: "使用當前位置" }));

    await waitFor(() => {
      expect(
        (screen.getByText("生成路線") as HTMLButtonElement).disabled,
      ).toBe(false);
    });

    expect(screen.getAllByRole("button", { name: "儲存起點" }).length).toBe(1);
    expect(screen.queryByText(/在地圖上點一下/)).toBeNull();

    fireEvent.click(screen.getByText("生成路線"));

    expect(await screen.findByText("環形")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "儲存起點" }).length).toBeGreaterThan(0);
    const routeSign = screen
      .getByText("環形")
      .closest(".sign--route") as HTMLElement;
    expect(within(routeSign).getByText("3")).toBeTruthy();
    expect(within(routeSign).getByText("公里")).toBeTruthy();
    expect(within(routeSign).getByText("有蓋")).toBeTruthy();
    expect(within(routeSign).getByText("100%")).toBeTruthy();
    expect(within(routeSign).getByText("無障礙")).toBeTruthy();
    expect(within(routeSign).getByText("25%")).toBeTruthy();
    expect(screen.getByText("軒尼詩道")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "儲存路線" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "已儲存" })).toBeTruthy();
    });
    expect(screen.getByText("路線已儲存")).toBeTruthy();

    const stored = JSON.parse(
      window.localStorage.getItem("hkr.history.v1") ?? "[]",
    );
    expect(stored).toHaveLength(1);
    expect(stored[0].route.distanceM).toBe(3000);
  });

  it("renames a saved origin and a saved route from the saved dock", async () => {
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (cb: (pos: unknown) => void) =>
          cb({ coords: { latitude: 22.3027, longitude: 114.1694 } }),
        watchPosition: () => 1,
        clearWatch: () => undefined,
      },
      configurable: true,
    });

    const { default: Home } = await import("./page");
    render(React.createElement(Home));

    fireEvent.click(await screen.findByRole("button", { name: "使用當前位置" }));
    await waitFor(() => {
      expect(
        (screen.getByText("生成路線") as HTMLButtonElement).disabled,
      ).toBe(false);
    });
    fireEvent.click(screen.getByText("生成路線"));
    expect(await screen.findByText("環形")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "儲存路線" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "已儲存" })).toBeTruthy();
    });
    fireEvent.click(screen.getAllByRole("button", { name: "儲存起點" })[0]);

    fireEvent.click(screen.getByRole("button", { name: "收藏" }));
    await waitFor(() => {
      expect(screen.getAllByText("已儲存起點").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByRole("button", { name: "改名" })).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: "改名" })[0]);
    const originInput = screen.getByRole("textbox", { name: "改名" });
    fireEvent.change(originInput, { target: { value: "晨跑起點" } });
    fireEvent.keyDown(originInput, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      const bookmarks = JSON.parse(
        window.localStorage.getItem("hkr.bookmarks.v1") ?? "[]",
      );
      expect(bookmarks[0].name).toBe("晨跑起點");
    });
    expect(screen.getByText("晨跑起點")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "改名" })[1]);
    const routeInput = screen.getByRole("textbox", { name: "改名" });
    fireEvent.change(routeInput, { target: { value: "維園晨跑" } });
    fireEvent.keyDown(routeInput, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      const history = JSON.parse(
        window.localStorage.getItem("hkr.history.v1") ?? "[]",
      );
      expect(history[0].name).toBe("維園晨跑");
    });
    expect(screen.getByText(/維園晨跑/)).toBeTruthy();
  });

  it("shows a tick confirmation for a bookmarked origin and a copied share link", async () => {
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (cb: (pos: unknown) => void) =>
          cb({ coords: { latitude: 22.3027, longitude: 114.1694 } }),
        watchPosition: () => 1,
        clearWatch: () => undefined,
      },
      configurable: true,
    });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });

    const { default: Home } = await import("./page");
    render(React.createElement(Home));

    const bookmarkBtn = await screen.findByRole("button", { name: "儲存起點" });
    await waitFor(() => {
      expect((bookmarkBtn as HTMLButtonElement).disabled).toBe(false);
    });
    fireEvent.click(bookmarkBtn);
    expect(screen.getByText("已儲存起點")).toBeTruthy();
    await waitFor(
      () => expect(screen.queryByText("已儲存起點")).toBeNull(),
      { timeout: 3000 },
    );

    fireEvent.click(screen.getByText("生成路線"));
    expect(await screen.findByText("環形")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "分享連結" }));
    expect(await screen.findByText("連結已複製")).toBeTruthy();
    await waitFor(
      () => expect(screen.queryByText("連結已複製")).toBeNull(),
      { timeout: 3000 },
    );
  });

  it("uses the native share sheet when available instead of the clipboard", async () => {
    vi.stubGlobal("fetch", fetchMock);
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: shareMock,
      configurable: true,
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (cb: (pos: unknown) => void) =>
          cb({ coords: { latitude: 22.3027, longitude: 114.1694 } }),
        watchPosition: () => 1,
        clearWatch: () => undefined,
      },
      configurable: true,
    });

    const { default: Home } = await import("./page");
    render(React.createElement(Home));

    fireEvent.click(await screen.findByRole("button", { name: "使用當前位置" }));
    await waitFor(() => {
      expect(
        (screen.getByText("生成路線") as HTMLButtonElement).disabled,
      ).toBe(false);
    });
    fireEvent.click(screen.getByText("生成路線"));
    expect(await screen.findByText("環形")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "分享連結" }));
    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
    expect(writeText).not.toHaveBeenCalled();
  });

  it("shows a location-permission message when geolocation is denied", async () => {
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (cb: (pos: unknown) => void) =>
          cb({ coords: { latitude: 22.3027, longitude: 114.1694 } }),
        watchPosition: (_ok: unknown, onErr: (err: { code: number }) => void) => {
          onErr({ code: 1 });
          return 1;
        },
        clearWatch: () => undefined,
      },
      configurable: true,
    });

    const { default: Home } = await import("./page");
    render(React.createElement(Home));

    fireEvent.click(await screen.findByRole("button", { name: "使用當前位置" }));
    await waitFor(() => {
      expect(
        (screen.getByText("生成路線") as HTMLButtonElement).disabled,
      ).toBe(false);
    });
    fireEvent.click(screen.getByText("生成路線"));
    expect(await screen.findByText("環形")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "開始跟進" }));
    expect(await screen.findByText(/允許取用位置/)).toBeTruthy();
  });

  it("re-applies overlay layers and data after a theme-style swap", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("offline");
    });

    const props = {
      origin: { lat: 22.3027, lon: 114.1694 },
      route: makeRoute(),
      followPosition: null,

      follow: false,
      dark: false,
      lang: "tc" as const,
      onPick: () => undefined,
      onLocate: () => undefined,
      onLang: () => undefined,
      pendingOrigin: null,
      onConfirmOrigin: () => undefined,
      onCancelOrigin: () => undefined,
      onBookmark: () => undefined,
      canBookmark: false,
      originBookmarked: false,
      showOriginHint: false,
      fitKey: 0,
      fitOriginKey: 0,
    };

    render(React.createElement(MapView, props));
    const map = mapTestState.instances[0] as {
      emit: (event: string) => void;
      setStyleLoaded: (loaded: boolean) => void;
      setStyle: () => void;
      getSource: (id: string) => { setDataCount: number } | undefined;
      addLayerCount: number;
    };

    const routeDataAfterInitial = map.getSource("route")?.setDataCount ?? 0;
    const originDataAfterInitial = map.getSource("origin")?.setDataCount ?? 0;
    const layersAfterInitial = map.addLayerCount;
    expect(routeDataAfterInitial).toBeGreaterThan(0);
    expect(originDataAfterInitial).toBeGreaterThan(0);
    expect(layersAfterInitial).toBeGreaterThan(0);

    // styledata with no style swap: nothing is re-applied (no churn)
    map.emit("styledata");
    expect(map.getSource("route")?.setDataCount ?? 0).toBe(routeDataAfterInitial);
    expect(map.getSource("origin")?.setDataCount ?? 0).toBe(originDataAfterInitial);
    expect(map.addLayerCount).toBe(layersAfterInitial);

    // A theme swap wipes sources + layers; the next styledata rebuilds them
    // and re-applies each dataset exactly once onto the fresh sources.
    map.setStyle();
    map.setStyleLoaded(false);
    map.emit("styledata");
    const routeAfterSwap = map.getSource("route")?.setDataCount ?? 0;
    const originAfterSwap = map.getSource("origin")?.setDataCount ?? 0;
    expect(routeAfterSwap).toBe(1);
    expect(originAfterSwap).toBe(1);
    expect(map.addLayerCount).toBeGreaterThan(layersAfterInitial);

    // Once restored, further styledata/idle must not churn the fresh sources.
    map.emit("styledata");
    map.setStyleLoaded(true);
    map.emit("idle");
    expect(map.getSource("route")?.setDataCount ?? 0).toBe(routeAfterSwap);
    expect(map.getSource("origin")?.setDataCount ?? 0).toBe(originAfterSwap);
  });

  it("fits the map to the route on generate instead of re-centering on origin", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("offline");
    });

    const baseProps = {
      origin: null as { lat: number; lon: number } | null,
      route: null as Route | null,
      followPosition: null,

      follow: false,
      dark: false,
      lang: "tc" as const,
      onPick: () => undefined,
      onLocate: () => undefined,
      onLang: () => undefined,
      pendingOrigin: null,
      onConfirmOrigin: () => undefined,
      onCancelOrigin: () => undefined,
      onBookmark: () => undefined,
      canBookmark: false,
      originBookmarked: false,
      showOriginHint: false,
      fitKey: 0,
      fitOriginKey: 0,
    };

    const { rerender } = render(React.createElement(MapView, baseProps));
    const map = mapTestState.instances[0] as {
      emit: (event: string) => void;
      fitBoundsCalls: unknown[];
      easeToCalls: Array<{ center?: unknown; zoom?: number }>;
    };

    rerender(
      React.createElement(MapView, {
        ...baseProps,
        origin: { lat: 22.3193, lon: 114.1694 },
        fitOriginKey: 1,
      }),
    );
    expect(map.easeToCalls).toHaveLength(1);
    expect(map.fitBoundsCalls).toHaveLength(0);

    rerender(
      React.createElement(MapView, {
        ...baseProps,
        origin: { lat: 22.3027, lon: 114.1694 },
        route: makeRoute(),
        fitKey: 1,
        fitOriginKey: 1,
      }),
    );
    expect(map.fitBoundsCalls).toHaveLength(1);
    expect(map.easeToCalls).toHaveLength(1);

    map.emit("styledata");
    map.emit("idle");
    expect(map.fitBoundsCalls).toHaveLength(1);
    expect(map.easeToCalls).toHaveLength(1);

    rerender(
      React.createElement(MapView, {
        ...baseProps,
        origin: { lat: 22.31, lon: 114.17 },
        route: null,
        fitKey: 1,
        fitOriginKey: 1,
      }),
    );
    expect(map.easeToCalls).toHaveLength(2);
    expect(map.fitBoundsCalls).toHaveLength(1);
  });

  it("fires the camera fit even when the style is not ready", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("offline");
    });

    const baseProps = {
      origin: null as { lat: number; lon: number } | null,
      route: null as Route | null,
      followPosition: null,

      follow: false,
      dark: false,
      lang: "tc" as const,
      onPick: () => undefined,
      onLocate: () => undefined,
      onLang: () => undefined,
      pendingOrigin: null,
      onConfirmOrigin: () => undefined,
      onCancelOrigin: () => undefined,
      onBookmark: () => undefined,
      canBookmark: false,
      originBookmarked: false,
      showOriginHint: false,
      fitKey: 0,
      fitOriginKey: 0,
    };

    const { rerender } = render(React.createElement(MapView, baseProps));
    const map = mapTestState.instances[0] as {
      setStyleLoaded: (loaded: boolean) => void;
      emit: (event: string) => void;
      fitBoundsCalls: unknown[];
      easeToCalls: Array<{ center?: unknown; zoom?: number }>;
    };

    map.setStyleLoaded(false);
    rerender(
      React.createElement(MapView, {
        ...baseProps,
        origin: { lat: 22.3027, lon: 114.1694 },
        route: makeRoute(),
        fitKey: 1,
      }),
    );
    expect(map.fitBoundsCalls).toHaveLength(1);
    expect(map.easeToCalls).toHaveLength(0);

    map.emit("styledata");
    map.emit("idle");
    expect(map.fitBoundsCalls).toHaveLength(1);
    expect(map.easeToCalls).toHaveLength(0);
  });

  it("renders error messages without the red lamp", () => {
    render(
      React.createElement(RouteSheet, {
        lang: "tc",
        open: true,
        onToggle: () => undefined,
        route: null,
        loading: false,
        error: "生成失敗",
      }),
    );
    render(
      React.createElement(CriteriaSheet, {
        lang: "tc",
        open: true,
        onToggle: () => undefined,
        distanceInput: "3",
        distanceError: null,
        originError: "起點無效",
        criteria: { outdoorOnly: false, barrierFree: false, flat: false, loop: true },
        onDistanceChange: () => undefined,
        onCriteriaChange: () => undefined,
      }),
    );
    expect(screen.getByText("生成失敗")).toBeTruthy();
    expect(screen.getByText("起點無效")).toBeTruthy();
    expect(document.querySelector(".route-error .lamp")).toBeNull();
  });

  it("toggles language from the map floating language button", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("offline");
    });

    const props = {
      origin: null,
      route: null,
      followPosition: null,

      follow: false,
      dark: false,
      lang: "tc" as const,
      onPick: () => undefined,
      onLocate: () => undefined,
      onLang: vi.fn(),
      pendingOrigin: null,
      onConfirmOrigin: () => undefined,
      onCancelOrigin: () => undefined,
      onBookmark: () => undefined,
      canBookmark: false,
      originBookmarked: false,
      showOriginHint: false,
      fitKey: 0,
      fitOriginKey: 0,
    };

    const { container } = render(React.createElement(MapView, props));

    const langButton = within(container).getByRole("button", {
      name: "切換至英文",
    });
    expect(within(langButton).getByText("EN")).toBeTruthy();

    fireEvent.click(langButton);
    expect(props.onLang).toHaveBeenCalledTimes(1);
  });

  it("renders the legend view in the control panel", () => {
    const { rerender } = render(React.createElement(LegendView, { lang: "tc" }));
    expect(screen.getByText("圖例")).toBeTruthy();
    expect(screen.getByText("路線")).toBeTruthy();
    expect(screen.getByText("有蓋路段")).toBeTruthy();
    expect(screen.getByText("陡峭路段")).toBeTruthy();
    expect(screen.getByText("起點")).toBeTruthy();
    expect(screen.getByText("目前位置")).toBeTruthy();

    rerender(React.createElement(LegendView, { lang: "en" }));
    expect(screen.getByText("Legend")).toBeTruthy();
    expect(screen.getByText("Route")).toBeTruthy();
    expect(screen.getByText("Covered")).toBeTruthy();
    expect(screen.getByText("Steep")).toBeTruthy();
    expect(screen.getByText("Origin")).toBeTruthy();
    expect(screen.getByText("Current location")).toBeTruthy();
  });

  it("opens the legend view from the utility bar", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("offline");
    });

    const { default: Home } = await import("./page");
    render(React.createElement(Home));

    const legendButton = await screen.findByRole("button", { name: "圖例" });
    expect(screen.queryByText("有蓋路段")).toBeNull();

    fireEvent.click(legendButton);
    expect(screen.getByText("有蓋路段")).toBeTruthy();
    expect(screen.getByText("陡峭路段")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "圖例" }));
    expect(screen.queryByText("有蓋路段")).toBeNull();
  });

  it("shows a how-to heading in the about view and no credits line", () => {
    const { rerender } = render(React.createElement(AboutView, { lang: "tc" }));
    expect(screen.getByText("如何使用？")).toBeTruthy();
    expect(screen.getByText(/在地圖上選擇起點/)).toBeTruthy();
    expect(screen.queryByText(/OpenFreeMap/)).toBeNull();

    rerender(React.createElement(AboutView, { lang: "en" }));
    expect(screen.getByText("How to use?")).toBeTruthy();
    expect(screen.getByText(/Tap the map to set your origin/)).toBeTruthy();
    expect(screen.queryByText(/OpenFreeMap/)).toBeNull();
  });

  it("collapses the dock with the toggle", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("offline");
    });

    const { default: Home } = await import("./page");
    const { container } = render(React.createElement(Home));

    const toggle = await screen.findByRole("button", { name: "收合控制面板" });
    expect(container.querySelectorAll(".dock-toggle-chev")).toHaveLength(2);
    expect(container.querySelector(".app")?.classList.contains("app--dock-collapsed")).toBe(false);

    fireEvent.click(toggle);
    expect(container.querySelector(".app")?.classList.contains("app--dock-collapsed")).toBe(true);
    expect(screen.getByRole("button", { name: "展開控制面板" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "展開控制面板" }));
    expect(container.querySelector(".app")?.classList.contains("app--dock-collapsed")).toBe(false);
  });
});
