# Azion Migration Platform

Plataforma modular para migrar recursos da Cloudflare para a Azion (DNS via API, DNS via
arquivo BIND, ACLs → Network Lists, proxy → Edge Application/Connector/Workload) — sem N8N.

Este repo é o resultado da decisão de construir um projeto novo (greenfield), modular,
posicionando o portal anterior (`azion-nextjs-project-migration-tool` + N8N) como MVP/prova
de conceito. **Leia `docs/ARCHITECTURE.md` antes de mexer em qualquer coisa** — ele documenta
todas as decisões (por que monorepo, por que sem login, como funciona o Job ID, etc.) e o
porquê de cada uma. `docs/MVP-LEGACY-NOTES.md` guarda o diagnóstico do MVP original.

## Estrutura

```
apps/
  portal/                    → hub: lista os módulos + consulta de Job por ID
  mod-bind-import/           → Fase 1 (referência de implementação — construído)
  mod-cf-dns-import/         → Fase 2 (placeholder)
  mod-cf-acl-networklists/   → Fase 3 (placeholder)
  mod-cf-proxy-migration/    → Fase 4 (placeholder)
packages/
  core/    → clients (Azion API v4, Cloudflare API, Edge SQL, Object Storage),
             tipos, e o helper de job (Importar -> Executar) compartilhado
  ui/      → componentes visuais mínimos compartilhados
db/
  schema.sql → schema do Edge SQL (tabelas jobs + job_items)
docs/
  ARCHITECTURE.md      → arquitetura e decisões (documento vivo)
  MVP-LEGACY-NOTES.md  → diagnóstico do MVP anterior (referência histórica)
```

Cada `apps/*` é publicado como sua própria Edge Application na Azion, com **Root Directory**
apontando para a respectiva pasta — mesmo mecanismo que o MVP anterior já usava. Deploy de
cada módulo é 100% independente; o que é compartilhado é só código (`packages/*`) e dados
(Edge SQL + Object Storage).

## Como rodar localmente

```bash
npm install        # na raiz — resolve os workspaces (apps/* e packages/*)
npm run dev:portal          # http://localhost:3000
npm run dev:bind-import     # http://localhost:3001
```

Cada módulo precisa das variáveis de ambiente de conexão com Edge SQL/Object Storage — ver o
README de cada `apps/<módulo>` (ainda não há segredo de usuário nessas variáveis; token da
Cloudflare e da Azion são sempre digitados na hora pelo usuário, nunca ficam em `.env`).

## Estado atual (Fase 0/1 do roadmap)

- [x] Estrutura do monorepo, `packages/core` com os clients e o helper de job.
- [x] `mod-bind-import` construído ponta a ponta (import + execução em lote via Job ID).
- [x] `portal` com listagem de módulos e consulta de Job.
- [ ] Confirmar endpoint exato de identidade da Azion (equivalente ao `azion whoami`).
- [ ] Implementar o client real do Object Storage (hoje só a interface existe).
- [ ] Confirmar o formato exato da API REST do Edge SQL e ajustar `edgeSql.ts`.
- [ ] Validar o build de monorepo com npm workspaces no processo de deploy da Azion
      (Root Directory por app, mas `npm install` precisa rodar a partir da raiz).
- [ ] `mod-cf-dns-import`, `mod-cf-acl-networklists`, `mod-cf-proxy-migration` — ainda
      placeholders; seguem o mesmo padrão de `mod-bind-import` quando forem construídos.

Ver `docs/ARCHITECTURE.md` seção 8 para o roadmap completo por fase.
