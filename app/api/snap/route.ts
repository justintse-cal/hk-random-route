import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { makeMaskOk, SNAP_RADIUS_M } from "@/lib/generator";
import { snap } from "@/lib/graph";
import { serverGraph } from "@/lib/server-graph";
import type { Criteria } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: { lat?: number; lon?: number; criteria?: Partial<Criteria> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "no-route" }, { status: 400 });
  }
  if (
    typeof body.lat !== "number" ||
    !Number.isFinite(body.lat) ||
    typeof body.lon !== "number" ||
    !Number.isFinite(body.lon)
  ) {
    return NextResponse.json({ ok: false, error: "no-route" }, { status: 400 });
  }
  const g = serverGraph();
  const ok = makeMaskOk(body.criteria);
  const result = snap(g, body.lat, body.lon, (e) => ok(g, e), SNAP_RADIUS_M);
  if (!result) {
    return NextResponse.json({ ok: false, error: "no-compliant-segment" });
  }
  return NextResponse.json({
    ok: true,
    origin: {
      lat: g.lat[result.nodeId],
      lon: g.lon[result.nodeId],
      nodeId: result.nodeId,
    },
    distanceM: Math.round(result.distanceM),
  });
}
