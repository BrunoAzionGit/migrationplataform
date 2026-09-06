import { MODULE_PREFIX, type ModuleName } from "@azion-migration/core";

/**
 * Onde cada módulo mora publicamente — subdomínio próprio por módulo
 * (decisão registrada em docs/ARCHITECTURE.md seção 9). Ajustar para os
 * domínios reais quando cada módulo tiver Edge Application/DNS configurados.
 */
export const MODULE_BASE_URL: Record<ModuleName, string> = {
  "bind-import": process.env.NEXT_PUBLIC_BIND_IMPORT_URL ?? "https://bind.migracao.example.com",
  "cf-dns-import": process.env.NEXT_PUBLIC_CF_DNS_IMPORT_URL ?? "https://dns.migracao.example.com",
  "cf-acl-networklists": process.env.NEXT_PUBLIC_CF_ACL_URL ?? "https://acl.migracao.example.com",
  "cf-proxy-migration": process.env.NEXT_PUBLIC_CF_PROXY_URL ?? "https://proxy.migracao.example.com",
};

const PREFIX_TO_MODULE = Object.fromEntries(
  Object.entries(MODULE_PREFIX).map(([mod, prefix]) => [prefix, mod as ModuleName])
) as Record<string, ModuleName>;

/** Dado um Job ID (ex: "bnd-8f3a1c2e"), devolve a URL da tela de status desse job no módulo dono. */
export function jobStatusUrl(jobId: string): string | null {
  const prefix = jobId.split("-")[0];
  const module = PREFIX_TO_MODULE[prefix];
  if (!module) return null;
  return `${MODULE_BASE_URL[module]}/jobs/${jobId}`;
}
