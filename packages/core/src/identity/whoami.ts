import { AzionClient } from "../azion/client.js";

/**
 * Resolve, de forma best-effort, a identidade (e-mail/conta) por trás de um
 * token Azion — só para preencher `jobs.created_by` na auditoria.
 *
 * Nunca lança: se a chamada falhar (endpoint errado, token inválido, etc.),
 * devolve null e quem chamou segue o fluxo normalmente com "não identificado".
 * Ver docs/ARCHITECTURE.md seção 6 (decisão de não ter login) e seção 10
 * (endpoint exato ainda a confirmar).
 */
export async function resolveIdentityBestEffort(azionToken: string): Promise<string | null> {
  try {
    const client = new AzionClient(azionToken);
    const me = await client.whoami();
    return me.email ?? me.account ?? null;
  } catch {
    return null;
  }
}
