import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { generateRoute } from "@/lib/generator";
import { serverGraph } from "@/lib/server-graph";
import type { GenerateRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: GenerateRequest;
  try {
    body = (await req.json()) as GenerateRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "no-route" }, { status: 400 });
  }
  const result = generateRoute(serverGraph(), body);
  return NextResponse.json(result);
}
