"use client";

import { useState } from "react";
import { Card, PageShell, PrimaryButton, StatusBanner } from "@azion-migration/ui";
import { PORTAL_URL } from "../lib/portalUrl";

/**
 * Fase 1 do padrão Importar -> Executar (ver ARCHITECTURE.md seção 5).
 * Só pede o Zone ID (não é segredo) e o arquivo — SEM token da Azion aqui.
 * O token só é pedido depois, na tela /jobs/[id], na hora de Executar.
 */
export default function BindImportPage() {
  const [azionZoneId, setAzionZoneId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{ loading: boolean; message: string; type: "success" | "error" | "" }>({
    loading: false,
    message: "",
    type: "",
  });
  const [jobId, setJobId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setStatus({ loading: true, message: "", type: "" });
    setJobId(null);

    const formData = new FormData();
    formData.append("azionZoneId", azionZoneId);
    formData.append("file", file);

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Erro ${res.status}`);
      }

      setJobId(data.jobId);
      setStatus({
        loading: false,
        message: `Importação concluída: ${data.totalItems} registro(s) lido(s). Guarde o Job ID abaixo para executar.`,
        type: "success",
      });
    } catch (err) {
      setStatus({
        loading: false,
        message: err instanceof Error ? err.message : "Erro ao importar o arquivo.",
        type: "error",
      });
    }
  };

  return (
    <PageShell>
      <Card>
        <a href={PORTAL_URL} style={{ color: "#64748b", textDecoration: "none", fontSize: "0.85rem" }}>
          ← Portal
        </a>
        <h1 style={{ fontSize: "1.4rem", marginTop: 12 }}>Importar arquivo BIND</h1>
        <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
          Passo 1 de 2: os registros são lidos e ficam prontos na base. Nada é criado na Azion
          ainda — isso acontece no Passo 2, na tela do Job.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.85rem", marginBottom: 6 }}>
              Azion Zone ID (destino) *
            </label>
            <input
              value={azionZoneId}
              onChange={(e) => setAzionZoneId(e.target.value)}
              placeholder="Ex: 7204"
              required
              style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.85rem", marginBottom: 6 }}>
              Arquivo BIND (.txt / .zone) *
            </label>
            <input
              type="file"
              accept=".txt,.zone,.bind"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
              style={{ width: "100%" }}
            />
          </div>

          <PrimaryButton type="submit" disabled={status.loading}>
            {status.loading ? "Importando..." : "Importar registros"}
          </PrimaryButton>
        </form>

        {status.message && <StatusBanner type={status.type || "success"} message={status.message} />}

        {jobId && (
          <div style={{ marginTop: 16, padding: 16, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Job ID</div>
            <code style={{ fontSize: "1.1rem", fontWeight: 700 }}>{jobId}</code>
            <div style={{ marginTop: 12 }}>
              <a href={`/jobs/${jobId}`} style={{ color: "#f36523", fontWeight: 600, textDecoration: "none" }}>
                Ir para a tela de execução →
              </a>
            </div>
          </div>
        )}
      </Card>
    </PageShell>
  );
}
