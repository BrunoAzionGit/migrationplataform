"use client";

import { useState } from "react";

/**
 * Tela de consulta unificada: o usuário digita o Job ID (global, prefixado
 * por módulo — ver ARCHITECTURE.md seção 5) e é redirecionado para a tela de
 * status/execução no módulo dono daquele job. O portal não guarda nem chama
 * Edge SQL diretamente aqui — só sabe interpretar o prefixo do ID.
 *
 * TODO (Fase 5): trocar o redirect por um dashboard embutido de fato, lendo
 * o job via API do próprio módulo (cada módulo expõe GET /api/jobs/:id).
 */
export default function JobsLookup() {
  const [jobId, setJobId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const res = await fetch(`/api/jobs/resolve?id=${encodeURIComponent(jobId.trim())}`);
    const data = await res.json();

    if (!data.url) {
      setError("Job ID não reconhecido. Confira se copiou certo.");
      return;
    }
    window.location.href = data.url;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        padding: 20,
      }}
    >
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 40, width: "100%", maxWidth: 480 }}>
        <a href="/" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.85rem" }}>
          ← Voltar ao Portal
        </a>
        <h1 style={{ fontSize: "1.5rem", marginTop: 16 }}>Consultar Job</h1>
        <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
          Informe o Job ID recebido ao importar (ex: <code>bnd-8f3a1c2e91</code>).
        </p>
        <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
          <input
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            placeholder="Ex: bnd-8f3a1c2e91"
            required
            style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.95rem", boxSizing: "border-box" }}
          />
          <button
            type="submit"
            style={{ width: "100%", marginTop: 16, padding: 14, backgroundColor: "#f36523", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
          >
            Buscar Job
          </button>
        </form>
        {error && (
          <div style={{ marginTop: 16, padding: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
