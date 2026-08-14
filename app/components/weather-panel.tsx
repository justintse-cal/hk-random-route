"use client";

import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export interface WeatherState {
  ok: boolean;
  tc: string;
  en: string;
  loading: boolean;
}

interface WeatherViewProps {
  lang: Lang;
  weather: WeatherState;
}

export default function WeatherView({ lang, weather }: WeatherViewProps) {
  const message = lang === "tc" ? weather.tc : weather.en;

  return (
    <div className="weather-view">
      <h3 className="about-data-title">{t(lang, "weather.title")}</h3>
      {weather.loading ? (
        <p className="empty" role="status">
          {t(lang, "weather.loading")}
        </p>
      ) : message ? (
        <p className="weather-message">{message}</p>
      ) : (
        <p className="empty">{t(lang, "weather.none")}</p>
      )}
      <p className="view-note view-note--rule">{t(lang, "weather.source")}</p>
    </div>
  );
}
