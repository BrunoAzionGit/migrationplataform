"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, PageShell, PrimaryButton, StatusBadge, StatusBanner } from "@azion-migration/ui";
import type { Job } from "@azion-migration/core";

/**
 * Fase 2 (Executar) — ver ARCHITECTURE.md seção 5. Único lugar deste módulo
 * que pede o token da Azion. Enquanto o job estiver "running", o front chama
 * /api/execute repetidamente (com um pequeno intervalo) para dar a sensação
 * de progresso automático — mas nada impede o usuário de fechar a aba e
 * voltar depois com o mesmo Job ID para continuar de onde parou.
 */
export default function JobStatusPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;

  const [job, setJob] = useState<Job | null>(null);
  const [azionToken, setAzionToken] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJob = async () => {
    const res = await fetch(`/api/jobs/${jobId}`);
    const data = await res.json();
    if (res.ok) setJob(data.job);
  };

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  const runOneBatch = async () => {
    setError(null);
    const res = await fetch("/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, azionToken }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erro ao executar.");
      setRunning(false);
      return;
    }
    setJob(data.job);
    return data.job as Job;
  };

  const handleExecute = async () => {
    if (!azionToken) {
      setError("Informe o token da Azion.");
      return;
    }
    setRunning(true);
    let current = await runOneBatch();
    // Continua puxando lotes automaticamente enquanto a aba estiver aberta e
    // o job seguir "running" — sem isso, o usuário precisaria clicar de novo
    // manualmente a cada lote (ver trade-off aceito no ARCHITECTURE.md §5).
    while (current && current.status === "running") {
      current = await runOneBatch();
    }
    setRunning(false);
  };

  if (!job) {
    return (
      <PageShell>
        <Card>
          <p>Carregando job {jobId}...</p>
        </Card>
      </PageShell>
    );
  }

  const canExecute = job.status === "staged" || job.status === "running";

  return (
    <PageShell>
      <Card>
        <a href="/" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.85rem" }}>
          ← Portal do módulo
        </a>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
          <h1 style={{ fontSize: "1.3rem" }}>
            Job <code>{job.id}</code>
          </h1>
          <StatusBadge status={job.status} />
        </div>

        <div style={{ marginTop: 16, fontSize: "0.9rem", color: "#334155" }}>
          <p>
            {job.doneItems} de {job.totalItems} processados
            {job.errorItems > 0 ? ` — ${job.errorItems} com erro` : ""}.
          </p>
          <div style={{ background: "#e2e8f0", borderRadius: 999, height: 8, overflow: "hidden" }}>
            <div
              style={{
                width: `${job.totalItems ? (job.doneItems / job.totalItems) * 100 : 0}%`,
                background: "#f36523",
                height: "100%",
              }}
            />
          </div>
        </div>

        {canExecute && (
          <div style={{ marginTop: 24 }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.85rem", marginBottom: 6 }}>
              Token da Azion *
            </label>
            <input
              type="password"
              value={azionToken}
              onChange={(e) => setAzionToken(e.target.value)}
              placeholder="Necessário só para executar — nunca é salvo"
              style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", boxSizing: "border-box", marginBottom: 12 }}
            />
            <PrimaryButton onClick={handleExecute} disabled={running}>
              {running ? "Executando..." : "Executar Job"}
            </PrimaryButton>
          </div>
        )}

        {(job.status === "done" || job.status === "done_with_errors") && (
          <StatusBanner
            type={job.status === "done" ? "success" : "error"}
            message={
              job.status === "done"
                ? "Job concluído com sucesso."
                : `Job concluído com ${job.errorItems} erro(s) — reexecute para tentar de novo (só reprocessa o que falhou).`
            }
          />
        )}

        {error && <StatusBanner type="error" message={error} />}
      </Card>
    </PageShell>
  );
}
