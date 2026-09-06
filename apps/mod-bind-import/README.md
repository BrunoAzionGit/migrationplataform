# mod-bind-import

Primeiro módulo construído (Fase 1 do roadmap — ver `/docs/ARCHITECTURE.md`). Importa um
arquivo de zona BIND e cria os registros no Azion Edge DNS, seguindo o padrão
**Importar → Executar** por Job ID (sem cron, sem N8N).

## Fluxo

1. `/` — usuário informa o Zone ID da Azion e sobe o arquivo BIND. Sem token nenhum aqui.
2. `POST /api/import` — parseia o arquivo (`lib/bindParser.ts`), grava cada registro em
   `job_items` associado a um Job ID novo (`bnd-...`). Devolve o Job ID.
3. `/jobs/[id]` — usuário informa o token da Azion (só usado aqui, nunca salvo) e clica em
   Executar.
4. `POST /api/execute` — processa um lote de itens pendentes chamando a API v4 da Azion
   (`AzionClient.createDnsRecord`), atualiza o status de cada item. O front chama de novo
   automaticamente enquanto o job estiver `running`.

## Deploy na Azion (Import from GitHub)

- **Root Directory:** `apps/mod-bind-import`
- **Preset:** `Next` / `Next.js`
- **Build Command:** `npm install && npm run build` (a partir da raiz do monorepo, ou
  configurar o build para rodar `npm install` na raiz antes — ver nota abaixo)
- **Domínio sugerido:** subdomínio próprio (ex.: `bind.migracao.suaempresa.com`) — ver
  `docs/ARCHITECTURE.md` seção 9.

> Nota sobre monorepo + npm workspaces: como este pacote depende de
> `@azion-migration/core` e `@azion-migration/ui` via workspace, o `npm install`
> precisa rodar a partir da raiz do repositório (onde está o `package.json` com
> `workspaces`), não de dentro de `apps/mod-bind-import`. Confirmar na Fase 0 como
> configurar isso no build da Azion (Install/Build Command customizado apontando pra raiz).

## Variáveis de ambiente

| Nome | Descrição |
|---|---|
| `EDGE_SQL_URL` | URL da API do Edge SQL (base de dados compartilhada `jobs`/`job_items`) |
| `EDGE_SQL_TOKEN` | Token de acesso ao Edge SQL (da aplicação, não do usuário) |
| `OBJECT_STORAGE_BUCKET` | Bucket do Object Storage para guardar os arquivos BIND originais |

## O que falta (marcado com `TODO` no código)

- Implementar de fato o client do Object Storage (`packages/core/src/storage/objectStorage.ts`)
  com um SDK S3 real.
- Confirmar o formato exato de request/response da API do Edge SQL
  (`packages/core/src/db/edgeSql.ts`).
- Confirmar o endpoint de identidade da Azion equivalente ao `azion whoami`
  (`packages/core/src/identity/whoami.ts`).
- Persistir `input_ref`/`created_by` no job (hoje os TODOs no `route.ts` mostram onde).
- Testes automatizados do `bindParser.ts` (é a peça com mais risco de regressão silenciosa —
  ver `docs/MVP-LEGACY-NOTES.md`).
