"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { requestRoute, requestSnap, requestWeather } from "@/lib/api";
import {
  nearestOnPolyline,
  isOnRoute,
  streetAt,
} from "@/lib/follow";
import { routeToGpx } from "@/lib/gpx";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { buildShareUrl, decodeRoute, encodeRoute, payloadFromUrl } from "@/lib/share";
import {
  type Bookmark,
  type HistoryEntry,
  newId,
  loadBookmarks,
  loadHistory,
  removeBookmark,
  removeHistoryEntry,
  renameBookmark,
  renameHistoryEntry,
  saveBookmark,
  saveHistoryEntry,
} from "@/lib/storage";
import type { Criteria, FollowUiState, GenerateError, Route } from "@/lib/types";
import { appErrorText, type AppError } from "./components/errors";
import UtilityBar, { type AppView } from "./components/utility-bar";
import WeatherView, { type WeatherState } from "./components/weather-panel";
import CriteriaSheet from "./components/criteria-sheet";
import RouteSheet from "./components/route-sheet";
import GenerateBand from "./components/generate-band";
import AboutView from "./components/about-panel";
import SavedView from "./components/saved-panel";
import LegendView from "./components/legend-panel";
import { CheckIcon, ChevronIcon } from "./components/icons";

const MapView = dynamic(() => import("./components/map-view"), { ssr: false });

const DEFAULT_CRITERIA: Criteria = {
  covered: false,
  barrierFree: false,
  flat: false,
  loop: true,
};

const DEFAULT_ORIGIN: { lat: number; lon: number } = { lat: 22.3193, lon: 114.1694 };

function parseDistance(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  if (value < 0.5 || value > 50) return null;
  return Math.round(value * 1000);
}

function distanceErrorFor(lang: Lang, input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  if (!Number.isFinite(Number(trimmed))) return t(lang, "distance.error.number");
  const value = Number(trimmed);
  if (value < 0.5 || value > 50) return t(lang, "distance.error.range");
  return null;
}

function downloadGpx(route: Route): void {
  const blob = new Blob([routeToGpx(route)], { type: "application/gpx+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "hk-route.gpx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // async clipboard unavailable — fall back to a temporary selection
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  return ok;
}

function readTheme(): boolean {
  try {
    return localStorage.getItem("hkr.theme") === "dark";
  } catch {
    return false;
  }
}

function scrollDockTop(el: HTMLDivElement | null, smooth: boolean): void {
  if (el && typeof el.scrollTo === "function") {
    el.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
  }
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("tc");
  const [dark, setDark] = useState(false);
  const [view, setView] = useState<AppView>("controls");
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [dockCollapsedH, setDockCollapsedH] = useState<number | null>(null);
  const [origin, setOrigin] = useState<{ lat: number; lon: number } | null>(null);
  const [pendingOrigin, setPendingOrigin] = useState<{ lat: number; lon: number } | null>(null);
  const [originPlaced, setOriginPlaced] = useState(false);
  const [snappedOrigin, setSnappedOrigin] = useState<Route["origin"] | null>(null);
  const [criteria, setCriteria] = useState<Criteria>(DEFAULT_CRITERIA);
  const [distanceInput, setDistanceInput] = useState("3");
  const [distanceError, setDistanceError] = useState<string | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [targetDistanceM, setTargetDistanceM] = useState<number | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [originError, setOriginError] = useState<AppError | null>(null);
  const [toast, setToast] = useState<{ message: string; undo: () => void } | null>(null);
  const [loading, setLoading] = useState(false);
  const [criteriaOpen, setCriteriaOpen] = useState(true);
  const [routeOpen, setRouteOpen] = useState(true);
  const [weather, setWeather] = useState<WeatherState>({
    ok: false,
    tc: "",
    en: "",
    loading: true,
  });
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [savedRoute, setSavedRoute] = useState<Route | null>(null);
  const [saveCopied, setSaveCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [originBookmarked, setOriginBookmarked] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [follow, setFollow] = useState<FollowUiState | null>(null);
  const [fitKey, setFitKey] = useState(0);
  const [fitOriginKey, setFitOriginKey] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const shareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookmarkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dockScrollRef = useRef<HTMLDivElement | null>(null);
  const dockRef = useRef<HTMLDivElement | null>(null);

  const storage = () => window.localStorage;

  const toggleDock = () => {
    const dock = dockRef.current;
    if (dock) {
      const scroll = dockScrollRef.current;
      setDockCollapsedH(
        scroll ? dock.offsetHeight - scroll.offsetHeight : dock.offsetHeight,
      );
    }
    setDockCollapsed((c) => !c);
  };

  useEffect(() => {
    if (!dockCollapsed) return;
    const dock = dockRef.current;
    const scroll = dockScrollRef.current;
    if (dock && scroll) {
      setDockCollapsedH(dock.offsetHeight - scroll.offsetHeight);
    }
  }, [view, dockCollapsed]);

  useEffect(() => {
    setBookmarks(loadBookmarks(storage()));
    setHistory(loadHistory(storage()));
    const payload = payloadFromUrl(window.location.href);
    if (payload) {
      decodeRoute(payload)
        .then((r) => {
          setRoute(r);
          setSnappedOrigin(r.origin);
          setFitKey((k) => k + 1);
        })
        .catch(() => {
          // invalid share payload — ignore
        });
    } else {
      setOrigin(DEFAULT_ORIGIN);
      setFitOriginKey((k) => k + 1);
    }
    requestWeather().then((w) => setWeather({ ...w, loading: false }));
    if (readTheme()) {
      document.documentElement.dataset.theme = "dark";
      setDark(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
      if (bookmarkTimerRef.current) clearTimeout(bookmarkTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!confirm) return;
    const id = setTimeout(() => setConfirm(null), 2000);
    return () => clearTimeout(id);
  }, [confirm]);

  useEffect(() => {
    if (!route) {
      setShareUrl(null);
      return;
    }
    let cancelled = false;
    encodeRoute(route)
      .then((payload) => {
        if (!cancelled) setShareUrl(buildShareUrl(payload, window.location.href));
      })
      .catch(() => {
        if (!cancelled) setShareUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [route]);

  useEffect(() => {
    scrollDockTop(dockScrollRef.current, false);
    if (view !== "controls") {
      dockScrollRef.current?.focus();
    }
  }, [view]);

  const toggleTheme = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.dataset.theme = "dark";
        document.documentElement.style.colorScheme = "dark";
      } else {
        delete document.documentElement.dataset.theme;
        document.documentElement.style.colorScheme = "light";
      }
      try {
        localStorage.setItem("hkr.theme", next ? "dark" : "light");
      } catch {
        // storage unavailable — theme still applies for this session
      }
      return next;
    });
  }, []);

  const stopFollow = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    setFollow(null);
  }, []);

  const applyOrigin = useCallback(
    (pick: { lat: number; lon: number }) => {
      setOrigin(pick);
      setSnappedOrigin(null);
      setRoute(null);
      setTargetDistanceM(null);
      setSavedRoute(null);
      setError(null);
      setOriginError(null);
      setOriginPlaced(true);
      setView("controls");
      stopFollow();
    },
    [stopFollow],
  );

  const requestOrigin = useCallback(
    (pick: { lat: number; lon: number }) => {
      if (route === null) {
        applyOrigin(pick);
      } else {
        setPendingOrigin(pick);
      }
    },
    [route, applyOrigin],
  );

  const confirmPendingOrigin = useCallback(() => {
    if (!pendingOrigin) return;
    applyOrigin(pendingOrigin);
    setPendingOrigin(null);
  }, [pendingOrigin, applyOrigin]);

  const cancelPendingOrigin = useCallback(() => setPendingOrigin(null), []);

  useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    requestSnap({ lat: origin.lat, lon: origin.lon, criteria })
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.origin) {
          setSnappedOrigin(res.origin);
          setOriginError(null);
          setError(null);
        } else {
          setOriginError("no-compliant-segment");
        }
      })
      .catch(() => {
        if (!cancelled) setOriginError("network");
      });
    return () => {
      cancelled = true;
    };
  }, [origin, criteria]);

  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setOriginError("network");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyOrigin({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setFitOriginKey((k) => k + 1);
      },
      (err: GeolocationPositionError) => {
        if (err.code === 1) {
          setOriginError("location-denied");
        } else {
          setOriginError("network");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [applyOrigin]);

  const bookmarkOrigin = useCallback(() => {
    if (!snappedOrigin) return;
    if (
      bookmarks.some(
        (b) =>
          b.origin.lat === snappedOrigin.lat && b.origin.lon === snappedOrigin.lon,
      )
    ) {
      return;
    }
    const bookmark: Bookmark = {
      id: newId(),
      name: `${snappedOrigin.lat.toFixed(4)}, ${snappedOrigin.lon.toFixed(4)}`,
      origin: { lat: snappedOrigin.lat, lon: snappedOrigin.lon },
    };
    setBookmarks(saveBookmark(storage(), bookmark));
    setOriginBookmarked(true);
    if (bookmarkTimerRef.current) clearTimeout(bookmarkTimerRef.current);
    bookmarkTimerRef.current = setTimeout(() => setOriginBookmarked(false), 2000);
    setConfirm(t(lang, "origin.bookmarked"));
  }, [snappedOrigin, lang, bookmarks]);

  const removeBookmarkById = useCallback(
    (id: string) => {
      const removed = bookmarks.find((b) => b.id === id);
      if (!removed) return;
      setBookmarks(removeBookmark(storage(), id));
      setToast({
        message: t(lang, "toast.bookmarkDeleted"),
        undo: () => setBookmarks(saveBookmark(storage(), removed)),
      });
    },
    [bookmarks, lang],
  );

  const renameBookmarkById = useCallback(
    (id: string, name: string) => {
      setBookmarks(renameBookmark(storage(), id, name));
    },
    [],
  );

  const generate = useCallback(
    async (exclude?: number[]) => {
      if (origin === null) {
        setError("no-origin");
        return;
      }
      const target = parseDistance(distanceInput);
      if (target === null) {
        setDistanceError(distanceErrorFor(lang, distanceInput));
        return;
      }
      setLoading(true);
      setError(null);
      const res = await requestRoute({
        origin,
        targetDistanceM: target,
        criteria,
        excludeSegmentIds: exclude,
      });
      setLoading(false);
      if (res.ok && res.route) {
        setRoute(res.route);
        setTargetDistanceM(target);
        setSnappedOrigin(res.route.origin);
        setSavedRoute(null);
        setView("controls");
        setRouteOpen(true);
        setCriteriaOpen(false);
        setOriginError(null);
        scrollDockTop(dockScrollRef.current, true);
        setFitKey((k) => k + 1);
        stopFollow();
      } else {
        setError(res.error ?? "no-route");
      }
    },
    [origin, distanceInput, lang, criteria, stopFollow],
  );

  const saveRoute = useCallback(() => {
    if (!route) return;
    if (savedRoute === route) return;
    const entry: HistoryEntry = {
      id: newId(),
      route,
      criteria,
      timestamp: Date.now(),
    };
    setHistory(saveHistoryEntry(storage(), entry));
    setSavedRoute(route);
    setSaveCopied(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveCopied(false), 2000);
    setConfirm(t(lang, "route.savedToast"));
  }, [route, criteria, lang, savedRoute]);

  const openHistoryEntry = useCallback((entry: HistoryEntry) => {
    setRoute(entry.route);
    setTargetDistanceM(null);
    setError(null);
    setOriginError(null);
    setSavedRoute(null);
    setSnappedOrigin(entry.route.origin);
    setRouteOpen(true);
    scrollDockTop(dockScrollRef.current, true);
    setFitKey((k) => k + 1);
    stopFollow();
  }, [stopFollow]);

  const deleteHistoryEntry = useCallback(
    (id: string) => {
      const removed = history.find((h) => h.id === id);
      if (!removed) return;
      setHistory(removeHistoryEntry(storage(), id));
      setToast({
        message: t(lang, "toast.historyDeleted"),
        undo: () => setHistory(saveHistoryEntry(storage(), removed)),
      });
    },
    [history, lang],
  );

  const renameHistoryById = useCallback(
    (id: string, name: string) => {
      setHistory(renameHistoryEntry(storage(), id, name));
    },
    [],
  );

  const shareRoute = useCallback(async () => {
    if (!route) return;
    const url =
      shareUrl ?? buildShareUrl(await encodeRoute(route), window.location.href);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: t(lang, "app.title"), url });
        return;
      } catch (err) {
        if ((err as DOMException).name === "AbortError") return;
      }
    }
    if (await copyText(url)) {
      setShareCopied(true);
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
      shareTimerRef.current = setTimeout(() => setShareCopied(false), 2000);
      setConfirm(t(lang, "route.shareCopied"));
    } else {
      setError("network");
    }
  }, [route, shareUrl, lang]);

  const startFollow = useCallback(() => {
    if (!route) return;
    if (!navigator.geolocation) {
      setError("network");
      return;
    }
    const coords = route.geometry.coordinates;
    const handle = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        const nearest = nearestOnPolyline(p, coords);
        const onRoute = nearest !== null && isOnRoute(p, coords);
        setFollow({
          active: true,
          onRoute,
          lost: false,
          distanceM: nearest ? nearest.distanceM : 0,
          street: nearest ? streetAt(route, nearest.segmentIndex, lang) : "",
          position: p,
          segmentIndex: nearest ? nearest.segmentIndex : -1,
          remainingM: nearest
            ? Math.max(0, Math.round(route.distanceM - nearest.progressM))
            : Math.round(route.distanceM),
        });
      },
      (err) => {
        if (err.code === 1) {
          setError("location-denied");
          stopFollow();
          return;
        }
        setFollow((prev) =>
          prev ? { ...prev, active: true, lost: true } : null,
        );
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
    );
    watchIdRef.current = handle;
  }, [route, lang, stopFollow]);

  const toggleFollow = useCallback(() => {
    if (follow?.active) {
      stopFollow();
      return;
    }
    startFollow();
  }, [follow, stopFollow, startFollow]);

  const retryFollow = useCallback(() => {
    stopFollow();
    startFollow();
  }, [stopFollow, startFollow]);

  const handleDistanceChange = useCallback(
    (value: string) => {
      setDistanceInput(value);
      setDistanceError(distanceErrorFor(lang, value));
    },
    [lang],
  );

  const errorText = error ? appErrorText(lang, error) : null;
  const originErrorText = originError ? appErrorText(lang, originError) : null;

  const dockStyle = dockCollapsedH
    ? ({ "--dock-collapsed-h": `${dockCollapsedH}px` } as CSSProperties)
    : undefined;

  return (
    <div
      className={`app${dockCollapsed ? " app--dock-collapsed" : ""}`}
      style={dockStyle}
    >
      <div className="map-layer">
        <MapView
          origin={snappedOrigin ?? origin}
          route={route}
          followPosition={follow?.position ?? null}
          follow={follow?.active ?? false}
          dark={dark}
          lang={lang}
          onPick={requestOrigin}
          onLocate={useCurrentLocation}
          onLang={() => setLang(lang === "tc" ? "en" : "tc")}
          onBookmark={bookmarkOrigin}
          canBookmark={snappedOrigin !== null}
          originBookmarked={originBookmarked}
          showOriginHint={!originPlaced && route === null}
          pendingOrigin={pendingOrigin}
          onConfirmOrigin={confirmPendingOrigin}
          onCancelOrigin={cancelPendingOrigin}
          fitKey={fitKey}
          fitOriginKey={fitOriginKey}
        />
      </div>

      <div className="dock" ref={dockRef}>
        <button
          type="button"
          className="dock-toggle"
          aria-expanded={!dockCollapsed}
          aria-label={t(lang, dockCollapsed ? "dock.expand" : "dock.collapse")}
          onClick={toggleDock}
        >
          <span className="dock-toggle-double">
            <ChevronIcon
              className={`dock-toggle-chev${dockCollapsed ? " dock-toggle-chev--up" : ""}`}
            />
            <ChevronIcon
              className={`dock-toggle-chev dock-toggle-chev--bottom${dockCollapsed ? " dock-toggle-chev--up" : ""}`}
            />
          </span>
        </button>
        <div className="dock-scroll" ref={dockScrollRef} tabIndex={-1}>
          <div className="dock-inner">
            {view === "controls" ? (
              <>
                <header className="brand-mark">
                  <span className="brand-title">{t(lang, "app.title")}</span>
                  <span className="brand-tagline">{t(lang, "app.tagline")}</span>
                </header>

                <CriteriaSheet
                  lang={lang}
                  open={criteriaOpen}
                  onToggle={() => setCriteriaOpen((o) => !o)}
                  distanceInput={distanceInput}
                  distanceError={distanceError}
                  originError={originErrorText}
                  criteria={criteria}
                  onDistanceChange={handleDistanceChange}
                  onCriteriaChange={setCriteria}
                />

                <RouteSheet
                  lang={lang}
                  open={routeOpen}
                  onToggle={() => setRouteOpen((o) => !o)}
                  route={route}
                  loading={loading}
                  error={errorText}
                />
              </>
            ) : view === "saved" ? (
              <SavedView
                lang={lang}
                bookmarks={bookmarks}
                history={history}
                onOpenBookmark={(origin) => {
                  applyOrigin(origin);
                  setView("controls");
                }}
                onRemoveBookmark={removeBookmarkById}
                onRenameBookmark={renameBookmarkById}
                onOpenHistory={(entry) => {
                  openHistoryEntry(entry);
                  setView("controls");
                }}
                onDeleteHistory={deleteHistoryEntry}
                onRenameHistory={renameHistoryById}
              />
            ) : view === "weather" ? (
              <WeatherView lang={lang} weather={weather} />
            ) : view === "legend" ? (
              <LegendView lang={lang} />
            ) : (
              <AboutView lang={lang} />
            )}
          </div>
        </div>

        {view === "controls" && (
          <GenerateBand
            lang={lang}
            loading={loading}
            hasRoute={route !== null}
            originSet={snappedOrigin !== null}
            route={route}
            follow={follow}
            saved={saveCopied}
            shareCopied={shareCopied}
            originBookmarked={originBookmarked}
            canBookmark={snappedOrigin !== null}
            onGenerate={() => generate()}
            onRegenerate={() => generate(route?.segmentIds)}
            onBookmark={bookmarkOrigin}
            onToggleFollow={toggleFollow}
            onRetryFollow={retryFollow}
            onSave={saveRoute}
            onExport={() => downloadGpx(route!)}
            onShare={shareRoute}
          />
        )}

        <UtilityBar
          lang={lang}
          view={view}
          dark={dark}
          weather={weather}
          onView={setView}
          onToggleTheme={toggleTheme}
        />

        {toast && (
          <div className="toast" role="status">
            <span>{toast.message}</span>
            <button
              type="button"
              className="toast-undo"
              onClick={() => {
                toast.undo();
                setToast(null);
              }}
            >
              {t(lang, "toast.undo")}
            </button>
          </div>
        )}

        {confirm && (
          <div className="confirm-top" role="status">
            <CheckIcon aria-hidden="true" />
            <span>{confirm}</span>
          </div>
        )}
      </div>
    </div>
  );
}
