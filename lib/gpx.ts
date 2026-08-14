import type { Route } from "./types";

export function escapeXml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function routeToGpx(route: Route): string {
  const name =
    route.streetNames.length > 0 ? route.streetNames[0] : "HK route";
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="HK Random Route" xmlns="http://www.topografix.com/GPX/1/1">',
    "  <trk>",
    `    <name>${escapeXml(name)}</name>`,
    "    <trkseg>",
  ];
  route.geometry.coordinates.forEach(([lon, lat], i) => {
    const ele = route.elevations?.[i] ?? 0;
    lines.push(
      `      <trkpt lat="${lat}" lon="${lon}"><ele>${ele.toFixed(2)}</ele></trkpt>`,
    );
  });
  lines.push("    </trkseg>", "  </trk>", "</gpx>");
  return lines.join("\n");
}
