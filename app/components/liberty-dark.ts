import type { LayerSpecification, StyleSpecification } from "maplibre-gl";

export const LIGHT_STYLE = "https://tiles.openfreemap.org/styles/liberty";
export const DARK_FALLBACK_URL = "https://tiles.openfreemap.org/styles/dark";

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

const HEX_RE = /^#([0-9a-f]{3,8})$/i;
const RGB_RE =
  /^rgba?\(\s*([-+]?\d*\.?\d+%?)\s*[,\s]\s*([-+]?\d*\.?\d+%?)\s*[,\s]\s*([-+]?\d*\.?\d+%?)\s*(?:[,\s/]\s*([-+]?\d*\.?\d+%?))?\s*\)$/i;
const HSL_RE =
  /^hsla?\(\s*([-+]?\d*\.?\d+)(deg|grad|rad|turn)?\s*[,\s]\s*([-+]?\d*\.?\d+)%\s*[,\s]\s*([-+]?\d*\.?\d+)%\s*(?:[,\s/]\s*([-+]?\d*\.?\d+%?))?\s*\)$/i;
const COLOR_LIKE_RE = /^#([0-9a-f]{3,8})$|^(rgb|rgba|hsl|hsla)\(/i;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function alphaChannel(raw: string | undefined): number {
  if (raw === undefined) return 1;
  if (raw.endsWith("%")) return clamp(parseFloat(raw) / 100, 0, 1);
  return clamp(parseFloat(raw), 0, 1);
}

function channel(raw: string): number {
  if (raw.endsWith("%")) return clamp((parseFloat(raw) / 100) * 255, 0, 255);
  return clamp(parseFloat(raw), 0, 255);
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hh = h / 360;
  const ss = s / 100;
  const ll = l / 100;
  const k = (n: number) => (n + hh * 12) % 12;
  const a = ss * Math.min(ll, 1 - ll);
  const f = (n: number) => ll - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {
    r: Math.round(clamp(f(0) * 255, 0, 255)),
    g: Math.round(clamp(f(8) * 255, 0, 255)),
    b: Math.round(clamp(f(4) * 255, 0, 255)),
  };
}

function rgbToHsl({ r, g, b }: RGBA): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (d > 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function parseColor(color: string): RGBA | null {
  const hex = color.match(HEX_RE);
  if (hex) {
    const h = hex[1];
    if (h.length === 3 || h.length === 4) {
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      const a = h.length === 4 ? parseInt(h[3] + h[3], 16) / 255 : 1;
      return { r, g, b, a };
    }
    if (h.length === 6 || h.length === 8) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
    return null;
  }

  const rgb = color.match(RGB_RE);
  if (rgb) {
    return {
      r: channel(rgb[1]),
      g: channel(rgb[2]),
      b: channel(rgb[3]),
      a: alphaChannel(rgb[4]),
    };
  }

  const hsl = color.match(HSL_RE);
  if (hsl) {
    const unit = hsl[2] ?? "deg";
    let hue = parseFloat(hsl[1]);
    if (unit === "grad") hue = (hue * 360) / 400;
    else if (unit === "rad") hue = (hue * 180) / Math.PI;
    else if (unit === "turn") hue = hue * 360;
    hue = ((hue % 360) + 360) % 360;
    const s = clamp(parseFloat(hsl[3]), 0, 100);
    const l = clamp(parseFloat(hsl[4]), 0, 100);
    const a = alphaChannel(hsl[5]);
    const { r, g, b } = hslToRgb(hue, s, l);
    return { r, g, b, a };
  }

  return null;
}

export function darkenColor(color: string): string {
  const c = parseColor(color);
  if (!c) return color;
  const { h, s, l } = rgbToHsl(c);
  const { r, g, b } = hslToRgb(h, Math.min(s, 12), 100 - l);
  const a = Math.round(c.a * 100) / 100;
  if (c.a >= 1) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function isColorLike(value: string): boolean {
  return COLOR_LIKE_RE.test(value);
}

function transformColorValue(value: unknown): unknown {
  if (typeof value === "string") {
    return isColorLike(value) ? darkenColor(value) : value;
  }
  if (Array.isArray(value)) {
    return value.map(transformColorValue);
  }
  return value;
}

export function transformLayer(layer: LayerSpecification): LayerSpecification {
  const paint: Record<string, unknown> = {
    ...(layer.paint as Record<string, unknown> | undefined),
  };
  for (const key of Object.keys(paint)) {
    if (key.endsWith("-color")) {
      paint[key] = transformColorValue(paint[key]);
    }
  }
  if (layer.id === "natural_earth") {
    paint["raster-brightness-min"] = 0.04;
    paint["raster-brightness-max"] = 0.28;
  }
  return { ...layer, paint } as LayerSpecification;
}

export function transformToDark(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    layers: style.layers.map(transformLayer),
  };
}

let cachedDark: StyleSpecification | null = null;

export async function fetchDarkStyle(): Promise<StyleSpecification | string> {
  if (cachedDark) return cachedDark;
  try {
    const res = await fetch(LIGHT_STYLE);
    if (!res.ok) throw new Error(`fetch ${LIGHT_STYLE} -> ${res.status}`);
    const style = transformToDark((await res.json()) as StyleSpecification);
    cachedDark = style;
    return style;
  } catch {
    return DARK_FALLBACK_URL;
  }
}
