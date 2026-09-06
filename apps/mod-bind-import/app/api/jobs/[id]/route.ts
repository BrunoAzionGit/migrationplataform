import { NextRequest, NextResponse } from "next/server";
import { getJobStore } from "../../../../lib/env";

/** GET /api/jobs/:id — status do job para a tela de consulta/execução. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const store = getJobStore();
  const job = await store.getJob(params.id);
  if (!job) {
    return NextResponse.json({ error: "Job não encontrado." }, { status: 404 });
  }
  return NextResponse.json({ job });
}
