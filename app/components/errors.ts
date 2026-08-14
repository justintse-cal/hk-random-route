import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import type { GenerateError } from "@/lib/types";

export type AppError = GenerateError | "no-origin" | "network";

export function appErrorText(lang: Lang, error: AppError): string {
  switch (error) {
    case "no-compliant-segment":
      return t(lang, "error.noCompliantSegment");
    case "unsupported-distance":
      return t(lang, "error.unsupportedDistance");
    case "no-route":
      return t(lang, "error.noRoute");
    case "no-origin":
      return t(lang, "origin.pinHint");
    default:
      return t(lang, "error.generic");
  }
}
