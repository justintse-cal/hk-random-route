import type { GenerateRequest, GenerateResponse } from "./types";

export interface SnapResponse {
  ok: boolean;
  origin?: { lat: number; lon: number; nodeId: number };
  distanceM?: number;
  error?: GenerateResponse["error"];
}

export async function requestRoute(body: GenerateRequest): Promise<GenerateResponse> {
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as GenerateResponse;
  } catch {
    return { ok: false, error: "no-route" };
  }
}

export async function requestSnap(body: {
  lat: number;
  lon: number;
  criteria?: GenerateRequest["criteria"];
}): Promise<SnapResponse> {
  try {
    const res = await fetch("/api/snap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as SnapResponse;
  } catch {
    return { ok: false, error: "no-route" };
  }
}

export async function requestWeather(): Promise<{
  ok: boolean;
  tc: string;
  en: string;
}> {
  try {
    const res = await fetch("/api/weather");
    return (await res.json()) as { ok: boolean; tc: string; en: string };
  } catch {
    return { ok: false, tc: "", en: "" };
  }
}
