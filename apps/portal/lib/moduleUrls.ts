import { MODULE_PREFIX, resolveModuleUrl, type ModuleName } from "@azion-migration/core";

/**
 * Onde cada módulo mora publicamente — resolvido por `resolveModuleUrl` em
 * packages/core (localhost:<porta> em dev, subdomínio em produção). As
 * variáveis NEXT_PUBLIC_* abaixo são o jeito de sobrescrever isso pra
 * staging ou pro domínio real, sem tocar código.
 */
export const MODULE_BASE_URL: Record<ModuleName, string> = {
  "bind-import": resolveModuleUrl("bind-import", process.env.NEXT_PUBLIC_BIND_IMPORT_URL),
  "cf-dns-import": resolveModuleUrl("cf-dns-import", process.env.NEXT_PUBLIC_CF_DNS_IMPORT_URL),
  "cf-acl-networklists": resolveModuleUrl("cf-acl-networklists", process.env.NEXT_PUBLIC_CF_ACL_URL),
  "cf-proxy-migration": resolveModuleUrl("cf-proxy-migration", process.env.NEXT_PUBLIC_CF_PROXY_URL),
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
