"use client";

import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import type { WeatherState } from "./weather-panel";
import {
  BookmarkIcon,
  InfoIcon,
  LegendIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  WeatherIcon,
} from "./icons";

export type AppView = "controls" | "saved" | "about" | "weather" | "legend";

interface UtilityBarProps {
  lang: Lang;
  view: AppView;
  dark: boolean;
  weather: WeatherState;
  onView: (view: AppView) => void;
  onToggleTheme: () => void;
}

export default function UtilityBar({
  lang,
  view,
  dark,
  weather,
  onView,
  onToggleTheme,
}: UtilityBarProps) {
  const hasAlert = weather.tc !== "" || weather.en !== "";

  return (
    <nav className="utility" aria-label={t(lang, "app.title")}>
      <button
        type="button"
        className="util-cell"
        aria-pressed={view === "controls"}
        onClick={() => onView("controls")}
      >
        <SettingsIcon aria-hidden="true" />
        <span className="util-label">{t(lang, "nav.controlsShort")}</span>
      </button>

      <button
        type="button"
        className="util-cell"
        aria-pressed={view === "legend"}
        onClick={() => onView(view === "legend" ? "controls" : "legend")}
      >
        <LegendIcon aria-hidden="true" />
        <span className="util-label">{t(lang, "nav.legendShort")}</span>
      </button>

      <button
        type="button"
        className="util-cell"
        onClick={onToggleTheme}
      >
        {dark ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
        <span className="util-label">{t(lang, "nav.themeShort")}</span>
      </button>

      <button
        type="button"
        className="util-cell"
        aria-pressed={view === "saved"}
        onClick={() => onView(view === "saved" ? "controls" : "saved")}
      >
        <BookmarkIcon aria-hidden="true" />
        <span className="util-label">{t(lang, "nav.favouritesShort")}</span>
      </button>

      <button
        type="button"
        className="util-cell utility-weather"
        aria-pressed={view === "weather"}
        onClick={() => onView(view === "weather" ? "controls" : "weather")}
      >
        {hasAlert && <span className="lamp lamp--amber" aria-hidden="true" />}
        <WeatherIcon aria-hidden="true" />
        <span className="util-label">{t(lang, "nav.weatherShort")}</span>
      </button>

      <button
        type="button"
        className="util-cell"
        aria-pressed={view === "about"}
        onClick={() => onView(view === "about" ? "controls" : "about")}
      >
        <InfoIcon aria-hidden="true" />
        <span className="util-label">{t(lang, "nav.aboutShort")}</span>
      </button>
    </nav>
  );
}
