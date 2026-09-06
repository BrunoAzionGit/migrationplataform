/**
 * Client fino para a API REST do Edge SQL da Azion.
 *
 * TODO (Fase 0): confirmar o formato exato de request/response da API do Edge SQL
 * (https://www.azion.com/en/documentation/runtime/api-reference/edge-sql/) e ajustar
 * `query()` conforme necessário — a essência (endpoint autenticado que recebe uma
 * string SQL e devolve linhas) deve se manter.
 *
 * Credenciais: usa um token da Azion com permissão de escrita no Edge SQL — este é
 * um token da CONTA/PROJETO (variável de ambiente do próprio módulo), não o token
 * que o usuário final digita na tela. O token do usuário (seção 6 do ARCHITECTURE.md)
 * só é usado para as chamadas à API v4 que efetivamente criam recursos na Azion.
 */

export interface EdgeSqlConfig {
  /** URL base da API do Edge SQL, ex: https://api.azion.com/v4/edge_sql/databases/<id>/sql */
  baseUrl: string;
  /** Token de acesso à Edge SQL (variável de ambiente do módulo, nunca o token do usuário). */
  token: string;
}

export interface EdgeSqlQueryResult<TRow = Record<string, unknown>> {
  rows: TRow[];
  rowsAffected: number;
}

export class EdgeSqlClient {
  constructor(private readonly config: EdgeSqlConfig) {}

  async query<TRow = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): Promise<EdgeSqlQueryResult<TRow>> {
    const res = await fetch(this.config.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Token ${this.config.token}`,
        "Content-Type": "application/json",
      },
      // TODO: confirmar o shape exato esperado pela API (statements/params) na Fase 0.
      body: JSON.stringify({ statements: [{ statement: sql, params }] }),
    });

    if (!res.ok) {
      throw new Error(`Edge SQL query falhou (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as { rows?: TRow[]; rows_affected?: number };
    return { rows: data.rows ?? [], rowsAffected: data.rows_affected ?? 0 };
  }
}
