"use client";

import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

const AUTHOR_URL = "https://justintse-cal.github.io/";

interface AboutViewProps {
  lang: Lang;
}

export default function AboutView({ lang }: AboutViewProps) {
  return (
    <div className="about-view">
      <p className="about-created view-note">
        {t(lang, "about.created.prefix")}
        <a
          className="about-created-link"
          href={AUTHOR_URL}
          target="_blank"
          rel="noreferrer"
        >
          {t(lang, "about.created.author")}
        </a>
        {t(lang, "about.created.suffix")}
      </p>
      <h3 className="about-data-title">{t(lang, "about.howTo")}</h3>
      <p className="about-intro">{t(lang, "about.intro")}</p>
      <h3 className="about-data-title">{t(lang, "about.features.title")}</h3>
      <p className="about-feature">{t(lang, "about.features.bookmark")}</p>
      <p className="about-feature">{t(lang, "about.features.gpx")}</p>
      <p className="view-note view-note--rule">{t(lang, "about.data.body")}</p>
    </div>
  );
}
