/**
 * Client fino para a API REST do Edge SQL da Azion.
 *
 * Formato confirmado (ver docs/ARCHITECTURE.md seção 10 — retirar este comentário
 * quando o item sair da lista de "a confirmar"):
 *   POST https://api.azion.com/v4/edge_sql/databases/{id}/query
 *   body: { "statements": ["SQL 1;", "SQL 2;", ...] }  <- strings prontas, sem
 *         placeholder nativo documentado (ver nota de segurança abaixo)
 *   resposta: { "state": "executed", "data": [{ "results": { "columns": [...], "rows": [...] } }] }
 *
 * IMPORTANTE (segurança): a API do Edge SQL, pelo que a documentação pública mostra,
 * não expõe um mecanismo de parâmetros preparados (tipo "?" + array de valores) —
 * só recebe a string SQL final. Para não reintroduzir SQL injection, `query()`
 * mantém a assinatura `(sql, params)` que o resto do código já usa, mas faz a
 * substituição dos "?" no lado do client, escapando string/number/boolean/null
 * antes de montar a string final. Se a Azion expuser bind de parâmetros de verdade
 * (perguntar ao suporte/checar o OpenAPI spec), trocar `substituteParams` por isso.
 *
 * Credenciais: usa um token da Azion com permissão de escrita no Edge SQL — este é
 * um token da CONTA/PROJETO (variável de ambiente do próprio módulo), não o token
 * que o usuário final digita na tela. O token do usuário (seção 6 do ARCHITECTURE.md)
 * só é usado para as chamadas à API v4 que efetivamente criam recursos na Azion.
 */

export interface EdgeSqlConfig {
  /** URL base da API do Edge SQL, ex: https://api.azion.com/v4/edge_sql/databases/<id>/query */
  baseUrl: string;
  /** Token de acesso à Edge SQL (variável de ambiente do módulo, nunca o token do usuário). */
  token: string;
}

export interface EdgeSqlQueryResult<TRow = Record<string, unknown>> {
  rows: TRow[];
  rowsAffected: number;
}

interface EdgeSqlApiResponse {
  state: string;
  data: Array<{ results?: { columns?: string[]; rows?: unknown[][] } }>;
}

export class EdgeSqlClient {
  constructor(private readonly config: EdgeSqlConfig) {}

  async query<TRow = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): Promise<EdgeSqlQueryResult<TRow>> {
    const finalSql = substituteParams(sql, params);

    const res = await fetch(this.config.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Token ${this.config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ statements: [finalSql] }),
    });

    if (!res.ok) {
      throw new Error(`Edge SQL query falhou (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as EdgeSqlApiResponse;
    const result = data.data?.[0]?.results;
    const columns = result?.columns ?? [];
    const rawRows = result?.rows ?? [];

    const rows = rawRows.map((row) =>
      Object.fromEntries(columns.map((col, i) => [col, row[i]]))
    ) as TRow[];

    return { rows, rowsAffected: rawRows.length };
  }
}

/**
 * Substitui "?" na ordem em que aparecem por valores escapados. Suficiente para
 * os usos atuais de packages/core (valores simples: string, number, boolean, null) —
 * não é um parser SQL de verdade, então não usar para construir queries dinâmicas
 * complexas sem revisar.
 */
function substituteParams(sql: string, params: unknown[]): string {
  let i = 0;
  return sql.replace(/\?/g, () => {
    if (i >= params.length) {
      throw new Error(`Edge SQL: menos parâmetros do que "?" na query: ${sql}`);
    }
    return escapeSqlValue(params[i++]);
  });
}

function escapeSqlValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  // string: escapa aspas simples dobrando-as (padrão SQL) e envolve em aspas simples.
  return `'${String(value).replace(/'/g, "''")}'`;
}
