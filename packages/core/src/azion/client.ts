/**
 * Client fino para a API v4 da Azion.
 *
 * IMPORTANTE: o token usado aqui é o token PESSOAL DA AZION que o usuário
 * informa na tela de "Executar Job" (ver ARCHITECTURE.md seção 6) — nunca é
 * persistido, só passa pela memória durante a execução da requisição.
 */

const AZION_API_BASE = "https://api.azion.com/v4";

export class AzionApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown
  ) {
    super(message);
  }
}

export class AzionClient {
  constructor(private readonly userToken: string) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${AZION_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Token ${this.userToken}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new AzionApiError(`Azion API ${path} retornou ${res.status}`, res.status, body);
    }
    return body as T;
  }

  // --- Edge DNS -------------------------------------------------------
  createDnsRecord(zoneId: string, record: Record<string, unknown>) {
    return this.request(`/workspace/dns/zones/${zoneId}/records`, {
      method: "POST",
      body: JSON.stringify(record),
    });
  }

  // --- Network Lists ----------------------------------------------------
  createNetworkList(networkList: Record<string, unknown>) {
    return this.request(`/workspace/network_lists`, {
      method: "POST",
      body: JSON.stringify(networkList),
    });
  }

  // --- Edge Application / Connector / Workload (mod-cf-proxy-migration) -
  // TODO (Fase 4): mapear os endpoints reais de clonagem de Edge Application,
  // criação de Connector e Workload conforme a API v4 documentada.
  cloneEdgeApplication(baseAppId: string, overrides: Record<string, unknown>) {
    throw new Error("TODO: implementar na Fase 4 (mod-cf-proxy-migration)");
  }

  // --- Identidade (best-effort, ver identity/whoami.ts) ------------------
  whoami() {
    // TODO (Fase 0): confirmar endpoint exato — ver docs/ARCHITECTURE.md seção 10.
    return this.request<{ email?: string; account?: string }>(`/iam/user`);
  }
}
