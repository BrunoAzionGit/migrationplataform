import { NextRequest, NextResponse } from "next/server";
import { getJobStore, getObjectStorage } from "../../../lib/env";
import { parseBindZone } from "../../../lib/bindParser";

/**
 * Fase 1 (Importar). Não recebe nenhum token — só o Zone ID (não é segredo)
 * e o arquivo. Ver ARCHITECTURE.md seção 5.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const azionZoneId = String(formData.get("azionZoneId") ?? "").trim();
    const file = formData.get("file") as File | null;

    if (!azionZoneId || !file) {
      return NextResponse.json({ error: "azionZoneId e file são obrigatórios." }, { status: 400 });
    }

    const content = await file.text();
    const records = parseBindZone(content);

    if (records.length === 0) {
      return NextResponse.json(
        { error: "Nenhum registro reconhecido no arquivo. Confira o formato (A, AAAA, CNAME, TXT, MX, SRV, NS)." },
        { status: 422 }
      );
    }

    const items = records.map((r) => ({ azionZoneId, ...r }));

    const store = getJobStore();
    const job = await store.createJob("bind-import", items);

    // Guarda o arquivo original para auditoria — best-effort, não bloqueia o import.
    try {
      const storage = getObjectStorage();
      const ref = await storage.putInput(job.id, file.name || "input.zone", content);
      // TODO: persistir `ref` em jobs.input_ref (pequeno UPDATE) quando o
      // client de Object Storage estiver implementado de verdade (Fase 0/1).
      void ref;
    } catch {
      // best-effort — não falha o import por causa disso.
    }

    return NextResponse.json({ jobId: job.id, totalItems: records.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro inesperado ao importar." },
      { status: 500 }
    );
  }
}
