"use client";

import type { Lang } from "@/lib/i18n";
import { fmt, formatDistance, t } from "@/lib/i18n";
import type { FollowUiState, Route } from "@/lib/types";
import {
  AddLocationAltIcon,
  BookmarkIcon,
  CheckIcon,
  DownloadIcon,
  NavigationIcon,
  ShareIcon,
} from "./icons";

interface GenerateBandProps {
  lang: Lang;
  loading: boolean;
  hasRoute: boolean;
  originSet: boolean;
  route: Route | null;
  follow: FollowUiState | null;
  saved: boolean;
  shareCopied: boolean;
  originBookmarked: boolean;
  canBookmark: boolean;
  onGenerate: () => void;
  onRegenerate: () => void;
  onBookmark: () => void;
  onToggleFollow: () => void;
  onRetryFollow: () => void;
  onSave: () => void;
  onExport: () => void;
  onShare: () => void;
}

export default function GenerateBand({
  lang,
  loading,
  hasRoute,
  originSet,
  route,
  follow,
  saved,
  shareCopied,
  originBookmarked,
  canBookmark,
  onGenerate,
  onRegenerate,
  onBookmark,
  onToggleFollow,
  onRetryFollow,
  onSave,
  onExport,
  onShare,
}: GenerateBandProps) {
  const generateLabel = loading
    ? t(lang, "action.loading")
    : hasRoute
      ? t(lang, "action.regenerate")
      : t(lang, "action.generate");

  const primary = !hasRoute;

  const bookmarkButton = (
    <button
      type="button"
      className="icon-btn"
      aria-label={t(lang, "origin.bookmark")}
      title={t(lang, "origin.bookmark")}
      onClick={onBookmark}
      disabled={!canBookmark}
    >
      {originBookmarked ? (
        <CheckIcon aria-hidden="true" />
      ) : (
        <AddLocationAltIcon aria-hidden="true" />
      )}
    </button>
  );

  return (
    <div className={`generate-row${primary ? " generate-row--primary" : ""}`}>
      {follow?.active && follow.lost && (
        <div className="follow-strip follow-strip--lost" role="status">
          <span className="lamp follow-strip-lamp" aria-hidden="true" />
          <span className="follow-strip-main">
            <b>{t(lang, "follow.lost")}</b>
            <span className="follow-strip-street">{t(lang, "follow.lostDetail")}</span>
          </span>
          <button
            type="button"
            className="follow-strip-retry"
            onClick={onRetryFollow}
          >
            {t(lang, "follow.retry")}
          </button>
        </div>
      )}
      {follow?.active && !follow.lost && (
        <div
          className={`follow-strip follow-strip--${follow.onRoute ? "on" : "off"}`}
          role="status"
        >
          <span className="lamp follow-strip-lamp" aria-hidden="true" />
          <span className="follow-strip-main">
            <b>
              {follow.onRoute
                ? t(lang, "follow.onRoute")
                : fmt(lang, "follow.offRoute", { m: Math.round(follow.distanceM) })}
            </b>
            {follow.street ? (
              <span className="follow-strip-street">{follow.street}</span>
            ) : null}
          </span>
          <span className="follow-strip-remaining">
            {fmt(lang, "follow.remaining", {
              d: formatDistance(lang, follow.remainingM),
            })}
          </span>
        </div>
      )}
      {route && (
        <div className="band-actions">
          {bookmarkButton}
          <button
            type="button"
            className="icon-btn"
            aria-label={
              follow?.active ? t(lang, "follow.stop") : t(lang, "follow.start")
            }
            aria-pressed={follow?.active ?? false}
            title={follow?.active ? t(lang, "follow.stop") : t(lang, "follow.start")}
            onClick={onToggleFollow}
          >
            <NavigationIcon aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={saved ? t(lang, "route.saved") : t(lang, "route.save")}
            title={saved ? t(lang, "route.saved") : t(lang, "route.save")}
            onClick={onSave}
            disabled={saved}
          >
            {saved ? (
              <CheckIcon aria-hidden="true" />
            ) : (
              <BookmarkIcon aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={t(lang, "route.exportGpx")}
            title={t(lang, "route.exportGpx")}
            onClick={onExport}
          >
            <DownloadIcon aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={
              shareCopied ? t(lang, "route.shareCopied") : t(lang, "route.share")
            }
            title={shareCopied ? t(lang, "route.shareCopied") : t(lang, "route.share")}
            onClick={onShare}
          >
            {shareCopied ? (
              <CheckIcon aria-hidden="true" />
            ) : (
              <ShareIcon aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className={`generate generate--secondary${loading ? " generate--loading" : ""}`}
            disabled={loading || !originSet}
            aria-busy={loading}
            onClick={onRegenerate}
          >
            {loading ? (
              <span className="spinner" aria-hidden="true" />
            ) : null}
            {generateLabel}
          </button>
        </div>
      )}

      {!route && (
        <div className="generate-main">
          <button
            type="button"
            className={`generate${loading ? " generate--loading" : ""}`}
            disabled={loading || !originSet}
            aria-busy={loading}
            onClick={onGenerate}
          >
            {loading ? (
              <span className="spinner" aria-hidden="true" />
            ) : null}
            {generateLabel}
          </button>
        </div>
      )}
    </div>
  );
}
