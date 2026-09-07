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

Ver `.env.example` (copiar para `.env.local`, que já está no `.gitignore` — nunca commitar
com valores reais).

| Nome | Descrição |
|---|---|
| `EDGE_SQL_URL` | `https://api.azion.com/v4/edge_sql/databases/<id>/query` — confirmado e em uso |
| `EDGE_SQL_TOKEN` | Token de acesso ao Edge SQL (da aplicação, não do usuário) |
| `OBJECT_STORAGE_BUCKET` | Nome do bucket (Restricted) para os arquivos BIND originais e relatórios |
| `OBJECT_STORAGE_ENDPOINT` | Endpoint S3-compatível, ex.: `https://s3.us-east-005.azionstorage.net` |
| `OBJECT_STORAGE_REGION` | Região do endpoint, ex.: `us-east-005` |
| `OBJECT_STORAGE_ACCESS_KEY` | Access key da credencial S3 do bucket (capacidades readFiles+writeFiles) |
| `OBJECT_STORAGE_SECRET_KEY` | Secret key correspondente — **rotacionar se algum dia vazar em chat/log** |

## O que falta (marcado com `TODO` no código)

- Confirmar o endpoint de identidade da Azion equivalente ao `azion whoami`
  (`packages/core/src/identity/whoami.ts`).
- Persistir `input_ref`/`created_by` no job (hoje os TODOs no `route.ts` mostram onde).
- Testes automatizados do `bindParser.ts` (é a peça com mais risco de regressão silenciosa —
  ver `docs/MVP-LEGACY-NOTES.md`).
- **Object Storage não foi testado de ponta a ponta ainda** (o ambiente onde o client foi
  escrito não tinha rede liberada pro domínio da Azion) — testar o `putInput`/`get` de
  verdade antes de confiar no fluxo completo.
