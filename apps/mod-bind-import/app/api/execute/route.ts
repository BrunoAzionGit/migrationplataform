import { NextRequest, NextResponse } from "next/server";
import { AzionClient, resolveIdentityBestEffort, runJobBatch } from "@azion-migration/core";
import { getJobStore } from "../../../lib/env";
import type { BindRecord } from "../../../lib/bindParser";

/**
 * Fase 2 (Executar). Recebe o token da Azion do usuário AQUI — não antes,
 * não é salvo em lugar nenhum, só passa pela memória desta requisição.
 * Processa um lote (ver runJobBatch) e devolve o job atualizado; o front
 * chama de novo enquanto status === "running" (ver app/jobs/[id]/page.tsx).
 */
export async function POST(req: NextRequest) {
  try {
    const { jobId, azionToken } = (await req.json()) as { jobId: string; azionToken: string };
    if (!jobId || !azionToken) {
      return NextResponse.json({ error: "jobId e azionToken são obrigatórios." }, { status: 400 });
    }

    const store = getJobStore();
    const job = await store.getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job não encontrado." }, { status: 404 });
    }

    // Best-effort: primeira execução deste job grava quem rodou (seção 6 do ARCHITECTURE.md).
    if (!job.createdBy) {
      const identity = await resolveIdentityBestEffort(azionToken);
      void identity; // TODO: persistir em jobs.created_by (pequeno UPDATE) quando confirmarmos o endpoint (Fase 0).
    }

    const azion = new AzionClient(azionToken);

    const { job: updatedJob, processedThisBatch } = await runJobBatch<
      { azionZoneId: string } & BindRecord
    >(store, jobId, async (payload) => {
      try {
        const response = await azion.createDnsRecord(payload.azionZoneId, {
          record_type: payload.type,
          entry: payload.name,
          answers_list: [payload.data],
          ttl: payload.ttl,
          ...(payload.priority !== undefined ? { policy: "weighted", weight: payload.priority } : {}),
        });
        return { ok: true, azionResponse: response };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    });

    return NextResponse.json({ job: updatedJob, processedThisBatch });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro inesperado ao executar." },
      { status: 500 }
    );
  }
}
