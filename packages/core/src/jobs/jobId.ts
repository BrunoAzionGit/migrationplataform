import { MODULE_PREFIX, type ModuleName } from "../types.js";

/**
 * Gera um Job ID global único, prefixado pelo módulo (ex: "bnd-8f3a1c2e91").
 * O prefixo deixa óbvio, só de olhar o ID, qual módulo é o dono do job —
 * importante porque cada módulo é uma Edge Application/subdomínio separado
 * (ver docs/ARCHITECTURE.md seção 9, subdomínio por módulo).
 */
export function generateJobId(module: ModuleName): string {
  const prefix = MODULE_PREFIX[module];
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  return `${prefix}-${random}`;
}

/** Extrai o módulo a partir do prefixo de um Job ID, se reconhecível. */
export function moduleFromJobId(jobId: string): ModuleName | null {
  const prefix = jobId.split("-")[0];
  const entry = Object.entries(MODULE_PREFIX).find(([, p]) => p === prefix);
  return (entry?.[0] as ModuleName) ?? null;
}
