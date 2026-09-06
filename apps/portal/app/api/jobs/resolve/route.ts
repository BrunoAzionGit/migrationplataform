import { NextRequest, NextResponse } from "next/server";
import { jobStatusUrl } from "../../../../lib/moduleUrls";

/** GET /api/jobs/resolve?id=bnd-xxxx -> { url: "<módulo>/jobs/bnd-xxxx" } */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const url = jobStatusUrl(id);
  return NextResponse.json({ url });
}
