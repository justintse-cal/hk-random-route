import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const HKO_URL =
  "https://data.weather.gov.hk/weatherAPI/hko_data/csdi/dataset/current_weather_report_hong_kong.json";

interface WeatherPayload {
  ok: boolean;
  tc: string;
  en: string;
  updateTime: string | null;
}

function asWarning(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === "string" && v.length > 0)
      .join(" ");
  }
  return "";
}

export async function GET(): Promise<NextResponse<WeatherPayload>> {
  try {
    const res = await fetch(HKO_URL, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, tc: "", en: "", updateTime: null },
        { status: 502 },
      );
    }
    const data: Record<string, unknown> = await res.json();
    return NextResponse.json({
      ok: true,
      tc: asWarning(data.Warning_Message_Tc),
      en: asWarning(data.Warning_Message_En),
      updateTime:
        typeof data.update_time === "string"
          ? data.update_time
          : typeof data.Update_Time === "string"
            ? data.Update_Time
            : null,
    });
  } catch {
    return NextResponse.json(
      { ok: false, tc: "", en: "", updateTime: null },
      { status: 502 },
    );
  }
}
