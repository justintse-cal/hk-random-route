"use client";

import { useMemo } from "react";
import type { Lang } from "@/lib/i18n";
import { formatDistance, formatDuration, t } from "@/lib/i18n";
import type { Route } from "@/lib/types";
import {
  ChevronIcon,
  ElevationIcon,
  RunIcon,
  WalkIcon,
} from "./icons";

interface RouteSheetProps {
  lang: Lang;
  open: boolean;
  onToggle: () => void;
  route: Route | null;
  loading: boolean;
  error: string | null;
}

function badgeLabel(lang: Lang, type: Route["type"]): string {
  switch (type) {
    case "loop":
      return t(lang, "route.badge.loop");
    case "one-way":
      return t(lang, "route.badge.oneway");
    case "out-and-back":
      return t(lang, "route.badge.outAndBack");
  }
}

function displayStreetNames(lang: Lang, route: Route): string[] {
  const source = lang === "en" ? route.segmentStreetNamesEn : route.segmentStreetNamesTc;
  const names: string[] = [];
  const seen = new Set<string>();
  for (const name of source) {
    if (name && !seen.has(name)) {
      seen.add(name);
      names.push(name);
      if (names.length >= 6) break;
    }
  }
  return names;
}

export default function RouteSheet({
  lang,
  open,
  onToggle,
  route,
  loading,
  error,
}: RouteSheetProps) {
  const names = useMemo(
    () => (route ? displayStreetNames(lang, route) : []),
    [lang, route],
  );

  const distanceParts = route
    ? formatDistance(lang, route.distanceM).split(" ")
    : null;

  return (
    <section className="sign sign--route" data-open={open}>
      <button
        type="button"
        className="sign-head"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="sign-head-label">{t(lang, "panel.route")}</span>
        <ChevronIcon className="sign-chev" />
      </button>

      {open && (
        <div className="sign-body">
          {!loading && error && !route && (
            <div className="route-error" role="alert">
              {error}
            </div>
          )}

          {route && distanceParts && (
            <>
              <div className="route-badge">
                <span className="lamp lamp--amber" aria-hidden="true" />
                {badgeLabel(lang, route.type)}
              </div>

              <div className="route-hero">
                <div className="route-distance">
                  <b>{distanceParts[0]}</b>
                  <span>{distanceParts[1] ?? t(lang, "distance.unit")}</span>
                </div>

                {(route.coveredPct !== undefined ||
                  route.barrierFreePct !== undefined) && (
                  <div className="route-factors">
                    {route.coveredPct !== undefined && (
                      <div className="route-factor">
                        <span className="route-factor-label">
                          <span className="route-factor-icon" aria-hidden="true">
                            <span className="material-symbols-outlined route-factor-glyph route-factor-glyph--nudge-up">
                              wb_shade
                            </span>
                          </span>
                          {t(lang, "route.factor.covered")}
                        </span>
                        <b>{Math.round(route.coveredPct)}%</b>
                      </div>
                    )}
                    {route.barrierFreePct !== undefined && (
                      <div className="route-factor">
                        <span className="route-factor-label">
                          <span className="route-factor-icon" aria-hidden="true">
                            <span className="material-symbols-outlined route-factor-glyph route-factor-glyph--nudge-down">
                              accessible
                            </span>
                          </span>
                          {t(lang, "route.factor.barrierFree")}
                        </span>
                        <b>{Math.round(route.barrierFreePct)}%</b>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <dl className="route-stats">
                <div className="route-stat">
                  <dt>
                    <WalkIcon className="route-stat-icon" aria-hidden="true" />
                    <span>{t(lang, "route.duration.walk")}</span>
                  </dt>
                  <dd>{formatDuration(lang, route.durationWalkS)}</dd>
                </div>
                <div className="route-stat">
                  <dt>
                    <RunIcon className="route-stat-icon" aria-hidden="true" />
                    <span>{t(lang, "route.duration.run")}</span>
                  </dt>
                  <dd>{formatDuration(lang, route.durationRunS)}</dd>
                </div>
                <div className="route-stat">
                  <dt>
                    <ElevationIcon className="route-stat-icon" aria-hidden="true" />
                    <span>{t(lang, "route.gain")}</span>
                  </dt>
                  <dd>{formatDistance(lang, route.elevationGainM)}</dd>
                </div>
              </dl>

              {names.length > 0 && (
                <section
                  className="route-streets"
                  aria-label={t(lang, "route.streets")}
                >
                  <span className="route-via-label">{t(lang, "route.via")}</span>
                  <p className="route-via-text">{names.join(" → ")}</p>
                </section>
              )}
            </>
          )}

          {!route && !loading && !error && (
            <div className="route-empty">{t(lang, "route.empty")}</div>
          )}
        </div>
      )}
    </section>
  );
}
