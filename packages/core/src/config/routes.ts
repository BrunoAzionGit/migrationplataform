import type { ModuleName } from "../types";

/**
 * Mapa único de onde cada módulo (e o portal) mora — em desenvolvimento local
 * e em produção. Usado pelo portal (para linkar os módulos e resolver Job IDs)
 * e por cada módulo (para o link "← Voltar ao Portal", que sob subdomínio
 * próprio por módulo NÃO pode ser um href relativo "/" — isso levaria pro
 * próprio módulo, não pro portal). Ver docs/ARCHITECTURE.md seção 9.
 *
 * `devPort` casa com os scripts "dev" de cada app/package.json.
 * `prodHost` é o subdomínio sugerido — ajustar para o domínio real da
 * organização quando os DNS forem configurados (é só texto, não afeta nada
 * até o deploy apontar pra esses hosts de verdade).
 */
export interface RouteConfig {
  devPort: number;
  /** Host de produção, sem protocolo — ex: "bind.migracao.example.com" */
  prodHost: string;
}

export const MODULE_ROUTES: Record<ModuleName, RouteConfig> = {
  "bind-import": { devPort: 3001, prodHost: "bind.migracao.example.com" },
  "cf-dns-import": { devPort: 3002, prodHost: "dns.migracao.example.com" },
  "cf-acl-networklists": { devPort: 3003, prodHost: "acl.migracao.example.com" },
  "cf-proxy-migration": { devPort: 3004, prodHost: "proxy.migracao.example.com" },
};

export const PORTAL_ROUTE: RouteConfig = { devPort: 3000, prodHost: "portal.migracao.example.com" };

/**
 * Resolve a URL base de um módulo, nesta ordem de prioridade:
 * 1. `envOverride` — normalmente `process.env.NEXT_PUBLIC_<MODULO>_URL`, passado
 *    pelo app chamador (packages/core não assume nomes de variável do Next.js).
 *    É o que permite apontar pra staging ou qualquer domínio real sem tocar código.
 * 2. `NODE_ENV === "development"` — usa `http://localhost:<devPort>`.
 * 3. Caso contrário, o `prodHost` sugerido (troque para o domínio real da org).
 */
export function resolveModuleUrl(module: ModuleName, envOverride?: string): string {
  if (envOverride) return envOverride;
  const route = MODULE_ROUTES[module];
  return process.env.NODE_ENV === "development"
    ? `http://localhost:${route.devPort}`
    : `https://${route.prodHost}`;
}

/** Mesma lógica de resolveModuleUrl, mas para o portal (não é um ModuleName). */
export function resolvePortalUrl(envOverride?: string): string {
  if (envOverride) return envOverride;
  return process.env.NODE_ENV === "development"
    ? `http://localhost:${PORTAL_ROUTE.devPort}`
    : `https://${PORTAL_ROUTE.prodHost}`;
}
