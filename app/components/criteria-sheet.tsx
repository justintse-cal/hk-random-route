"use client";

import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import type { Criteria } from "@/lib/types";
import { ChevronIcon } from "./icons";

interface CriteriaSheetProps {
  lang: Lang;
  open: boolean;
  onToggle: () => void;
  distanceInput: string;
  distanceError: string | null;
  originError: string | null;
  criteria: Criteria;
  onDistanceChange: (value: string) => void;
  onCriteriaChange: (next: Criteria) => void;
}

export default function CriteriaSheet({
  lang,
  open,
  onToggle,
  distanceInput,
  distanceError,
  originError,
  criteria,
  onDistanceChange,
  onCriteriaChange,
}: CriteriaSheetProps) {
  const setBool = (key: keyof Criteria) => (checked: boolean) =>
    onCriteriaChange({ ...criteria, [key]: checked });

  const presets = [3, 5, 10];

  const rows: { key: keyof Criteria; label: string }[] = [
    { key: "covered", label: t(lang, "criteria.covered") },
    { key: "barrierFree", label: t(lang, "criteria.barrierFree") },
    { key: "flat", label: t(lang, "criteria.flat") },
    { key: "loop", label: t(lang, "criteria.loop") },
  ];

  return (
    <section className="sign" data-open={open}>
      <button
        type="button"
        className="sign-head"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="sign-head-label">{t(lang, "panel.criteria")}</span>
        <ChevronIcon className="sign-chev" />
      </button>

      {open && (
        <div className="sign-body">
          {originError && (
            <div className="route-error" role="alert">
              {originError}
            </div>
          )}

          <label className="sign-section-label" htmlFor="distance-input">
            {t(lang, "distance.label")}
          </label>

          <div className="field field--plate">
            <input
              id="distance-input"
              type="number"
              inputMode="decimal"
              min={0.5}
              max={50}
              step={0.5}
              value={distanceInput}
              onChange={(e) => onDistanceChange(e.target.value)}
            />
            <span className="field-unit">{t(lang, "distance.unit")}</span>
          </div>

          <div className="presets" role="group" aria-label={t(lang, "distance.presets")}>
            {presets.map((d) => {
              const active = distanceInput === String(d);
              return (
                <button
                  key={d}
                  type="button"
                  className="preset"
                  aria-pressed={active}
                  aria-label={`${d} ${t(lang, "distance.unit")}`}
                  onClick={() => onDistanceChange(String(d))}
                >
                  {d}
                </button>
              );
            })}
          </div>
          {distanceError && <p className="field-error">{distanceError}</p>}

          <div className="sign-rule" aria-hidden="true" />

          <div className="criteria-grid">
            {rows.map(({ key, label }) => (
              <label key={key} className="check">
                <input
                  type="checkbox"
                  checked={criteria[key]}
                  onChange={(e) => setBool(key)(e.target.checked)}
                />
                <span className="check-label">{label}</span>
                <span className="check-mark" aria-hidden="true" />
              </label>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
