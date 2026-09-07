import { Card, PageShell } from "@azion-migration/ui";
import { PORTAL_URL } from "../lib/portalUrl";

/**
 * Fase 2 do roadmap (ver /docs/ARCHITECTURE.md) — ainda não construído.
 * O módulo mod-bind-import (Fase 1) é a referência de implementação: mesmo
 * padrão Importar -> Executar, mesmas peças de packages/core.
 */
export default function Placeholder() {
  return (
    <PageShell>
      <Card>
        <a href={PORTAL_URL} style={{ color: "#64748b", textDecoration: "none", fontSize: "0.85rem" }}>
          ← Portal
        </a>
        <h1 style={{ fontSize: "1.3rem", marginTop: 12 }}>Cloudflare DNS Import</h1>
        <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
          Fase 2 do roadmap — ainda não implementado. Ver docs/ARCHITECTURE.md e o
          módulo mod-bind-import como referência do padrão a seguir.
        </p>
      </Card>
    </PageShell>
  );
}
