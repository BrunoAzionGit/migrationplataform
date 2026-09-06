/**
 * Client fino para a API da Cloudflare — usado só na fase de Importar.
 * O token da Cloudflare passa pela memória apenas durante essa chamada e
 * nunca é persistido em Edge SQL/Object Storage (ver ARCHITECTURE.md seção 6).
 */

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

export class CloudflareClient {
  constructor(private readonly token: string) {}

  private async request<T>(path: string): Promise<T> {
    const res = await fetch(`${CLOUDFLARE_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) {
      throw new Error(`Cloudflare API ${path} retornou ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as { result: T };
    return data.result;
  }

  listDnsRecords(zoneId: string) {
    return this.request<Array<Record<string, unknown>>>(`/zones/${zoneId}/dns_records`);
  }

  listIpLists(accountId: string) {
    // TODO (Fase 3, mod-cf-acl-networklists): confirmar endpoint exato de listas
    // de IP/ACL na API da Cloudflare (rulesets / lists) e ajustar aqui.
    return this.request<Array<Record<string, unknown>>>(`/accounts/${accountId}/rules/lists`);
  }

  listProxiedRecords(zoneId: string) {
    // TODO (Fase 4, mod-cf-proxy-migration): usado para detectar domínios em
    // modo proxy (registro DNS com proxied=true).
    return this.listDnsRecords(zoneId);
  }
}
