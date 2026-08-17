"use client";

import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

interface LegendViewProps {
  lang: Lang;
}

export default function LegendView({ lang }: LegendViewProps) {
  return (
    <div className="legend-view">
      <h3 className="about-data-title">{t(lang, "legend.title")}</h3>
      <div className="legend-row">
        <span className="map-legend-line map-legend-line--route" aria-hidden="true" />
        <span>{t(lang, "legend.route")}</span>
      </div>
      <div className="legend-row">
        <span className="map-legend-line map-legend-line--covered" aria-hidden="true" />
        <span>{t(lang, "legend.covered")}</span>
      </div>
      <div className="legend-row">
        <span className="map-legend-line map-legend-line--steep" aria-hidden="true" />
        <span>{t(lang, "legend.steep")}</span>
      </div>
      <div className="legend-row">
        <img
          className="map-legend-img"
          src="/drop-pin-10077.svg"
          alt=""
          aria-hidden="true"
        />
        <span>{t(lang, "legend.origin")}</span>
      </div>
      <div className="legend-row">
        <span className="map-legend-dot map-legend-dot--position" aria-hidden="true" />
        <span>{t(lang, "legend.position")}</span>
      </div>
    </div>
  );
}
