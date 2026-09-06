# Arquitetura V2 — Plataforma Modular de Migração (greenfield, sem N8N)

*Este documento substitui a abordagem de migração incremental descrita em `roadmap-sem-n8n.md` (mantido como referência histórica/MVP). A decisão foi construir um projeto novo, modular, posicionando o portal atual (`azion-nextjs-project-migration-tool` + N8N) como MVP/prova de conceito.*

## 1. Decisão e por quê

O MVP validou a ideia (self-service, 4 fluxos, hospedado na Azion) e o levantamento anterior já apontava os limites: credenciais trafegando pelo browser, zero histórico, acoplamento total ao N8N, um monólito de formulários sem separação de responsabilidades. Em vez de remendar isso, o projeto novo nasce **modular**: cada fluxo (BIND import, CF DNS import, ACLs→Network Lists, Proxy→Edge App/Connector/Workload) vira um **módulo independente**, com seu próprio front, sua própria lógica de backend e seu próprio deploy — e um **portal/shell** por cima agrega os módulos e concentra o que precisa ser único (dashboard cross-módulo, tela de consulta/execução de Job por Job ID, notificações). Não há autenticação própria — ver seção 6.

## 2. Visão geral

```
                        ┌─────────────────────────┐
                        │   Portal (shell)         │  ← Edge Application própria
                        │   - lista módulos         │
                        │   - dashboard unificado   │
                        │   - consulta/executa Job  │
                        │     (por Job ID)          │
                        └───────────┬───────────────┘
                                    │ links / iframe-free (cada módulo é uma URL própria)
        ┌───────────────┬───────────┴───────────┬───────────────────┐
        ▼               ▼                       ▼                   ▼
 ┌─────────────┐ ┌──────────────┐      ┌──────────────────┐ ┌────────────────────┐
 │ mod-bind-   │ │ mod-cf-dns-  │      │ mod-cf-acl-       │ │ mod-cf-proxy-       │
 │ import      │ │ import       │      │ networklists      │ │ migration            │
 │ (Edge App   │ │ (Edge App    │      │ (Edge App própria)│ │ (Edge App própria)   │
 │ própria)    │ │ própria)     │      │                   │ │                      │
 └──────┬──────┘ └──────┬───────┘      └─────────┬─────────┘ └──────────┬───────────┘
        │               │                         │                     │
        └───────────────┴───────────┬─────────────┴─────────────────────┘
                                     ▼
                    ┌────────────────────────────────────┐
                    │  Camada de dados compartilhada       │
                    │  - Edge SQL: tabelas `jobs`+`job_items`│
                    │    (Job ID prefixado por módulo)      │
                    │  - Object Storage: inputs + relatórios│
                    │    (prefixo por módulo no bucket)     │
                    └────────────────────────────────────┘
                                     ▲
                    ┌────────────────────────────────────┐
                    │  packages/core (TypeScript, compart.) │
                    │  - client Cloudflare API              │
                    │  - client Azion API v4                │
                    │  - client Edge SQL / Object Storage    │
                    │  - tipos de job/status                 │
                    │  - identificação via token Azion        │
                    │    (best-effort, para auditoria)        │
                    │  - notificação (Slack/e-mail)          │
                    └────────────────────────────────────┘
```

Cada módulo é **independente na UI e no deploy**, mas todos falam com a mesma base de dados de jobs (Edge SQL) e o mesmo bucket de storage — é isso que permite ao portal montar um dashboard único de "tudo que já foi migrado, por quem, quando, com que resultado" sem cada módulo reinventar isso.

## 3. Estrutura de repositório: monorepo com deploys independentes

Recomendo **um único repositório Git**, com workspaces (`pnpm` ou `npm workspaces`), mas cada módulo continua sendo publicado como uma **Azion Edge Application separada** — exatamente como o MVP atual já faz hoje (o README dele já usa o campo **Root Directory** do "Import from GitHub" da Azion para apontar para uma subpasta específica). Isso significa: dá para ter N Edge Applications na Azion, cada uma importando o mesmo repo GitHub mas com Root Directory diferente, e cada uma builda/deploya de forma independente quando o código daquela pasta muda.

```
repo/
├── apps/
│   ├── portal/                    → Azion Edge App "portal"      (Root Directory: apps/portal)
│   ├── mod-bind-import/           → Azion Edge App "bind-import"  (Root Directory: apps/mod-bind-import)
│   ├── mod-cf-dns-import/         → Azion Edge App "cf-dns"       (Root Directory: apps/mod-cf-dns-import)
│   ├── mod-cf-acl-networklists/   → Azion Edge App "cf-acl"       (Root Directory: apps/mod-cf-acl-networklists)
│   └── mod-cf-proxy-migration/    → Azion Edge App "cf-proxy"     (Root Directory: apps/mod-cf-proxy-migration)
├── packages/
│   ├── core/                      # clients de API, tipos, Edge SQL/Storage, auth, notificações
│   └── ui/                        # componentes visuais compartilhados (o portal e os módulos têm a mesma cara)
├── package.json (workspaces)
└── pnpm-workspace.yaml
```

**Por que monorepo em vez de um repo por módulo:** com só 4-5 apps e um time pequeno, manter `packages/core` como pacote versionado publicado separadamente (o que um poly-repo exigiria) é overhead sem benefício agora — toda mudança no client da Cloudflare/Azion teria que ser publicada e atualizada em cada repo. Monorepo dá o melhor dos dois mundos: código compartilhado sem duplicação, deploy de cada módulo continua 100% independente (a Azion builda cada Edge Application isoladamente pela Root Directory, então um módulo quebrado não derruba os outros). Se um módulo crescer a ponto de precisar de um time próprio com ciclo de release totalmente separado, aí sim vale extrair para um repo próprio — mas não é o caso de partida.

## 4. Módulos (mapeados a partir do MVP)

| Módulo | Responsabilidade | Complexidade | Ordem sugerida |
|---|---|---|---|
| `mod-bind-import` | Parse de arquivo BIND (.zone/.txt) + criação de registros no Edge DNS | Baixa (não depende da API da Cloudflare) | 1º |
| `mod-cf-dns-import` | Leitura de zona na Cloudflare via API + criação de registros no Edge DNS | Média | 2º |
| `mod-cf-acl-networklists` | Leitura de ACLs/IP lists da Cloudflare + criação de Network Lists na Azion | Média | 3º |
| `mod-cf-proxy-migration` | Detecta domínios em modo proxy na Cloudflare, clona Edge Application base, cria Connector + Workload, dedup por Target Content, gera relatório | Alta | 4º |

Cada módulo é um app Next.js (SSR, via Azion Bundler) com sua própria UI de formulário + tela de progresso/status + relatório, e suas próprias rotas de API (Edge Functions) fazendo a orquestração — tudo em **TypeScript**, sem depender de N8N nem de um runtime Python separado.

## 5. Padrão de execução: Importar → Executar, disparado por Job ID (decidido)

Como a Azion não tem hoje um mecanismo nativo de cron/fila, o padrão adotado é **duas fases separadas, sem cron**, com um Job ID global (mesmo formato em todos os módulos) como elo entre elas:

**Fase 1 — Importar (staging):**
1. Usuário submete o form do módulo (token Cloudflare + zona, ou upload de arquivo BIND, etc.). **Token da Cloudflare só é usado aqui, na hora, e nunca é persistido.**
2. O módulo lê a fonte (API da Cloudflare ou arquivo) e grava cada registro individualmente na base, associado a um **Job ID único global** (prefixado por módulo, ex.: `bnd-8f3a1c2e` para BIND, `cfd-...` para CF DNS, `acl-...`, `pxy-...` — dá pra identificar de cara qual módulo dono do job só pelo ID).
3. Job fica com `status=staged` — nada foi escrito na Azion ainda. O usuário recebe o Job ID na tela.

**Fase 2 — Executar (aplica na Azion), disparada manualmente pelo usuário:**
4. Numa tela de "Consulta de Job", o usuário informa o Job ID, vê quantos itens estão pendentes/feitos/com erro, informa o **token da Azion** (só usado aqui, também nunca persistido) e clica em Executar.
5. A Edge Function processa as linhas com `status=pending` daquele Job ID, uma a uma (ou em lote pequeno), chamando a API v4 da Azion, e atualiza o status **de cada linha** (`done`/`error` + resposta/erro da API) — não só o status do job como um todo.
6. Se a função atingir o limite de tempo de execução antes de terminar, o job fica com `status=running` e as linhas restantes continuam `pending`: o usuário (ou o próprio front, enquanto a tela estiver aberta) simplesmente chama Executar de novo, e como o processamento só pega o que ainda está `pending`, é seguro clicar quantas vezes for preciso sem duplicar nada na Azion.
7. Ao não sobrar nenhuma linha `pending`: salva relatório final e o input original no Object Storage, marca `status=done` (ou `done_with_errors` se alguma linha falhou), dispara notificação.

Isso resolve a necessidade de cron sem introduzir nenhuma peça nova: quem "dispara a continuação" é o próprio usuário reabrindo a tela com o Job ID — e como o Job ID não é preso à sessão do navegador, dá pra fechar a aba no meio de uma migração grande e voltar depois para terminar.

**Schema (Edge SQL), dois tabelas:**
- `jobs`: `id (pk, prefixado por módulo)`, `module`, `status`, `criado_por (best-effort, via identidade do token Azion — seção 6)`, `criado_em`, `atualizado_em`, `input_ref (Object Storage)`, `relatorio_ref (Object Storage)`.
- `job_items`: `id`, `job_id (fk)`, `seq`, `payload (json do registro a criar/migrar)`, `status (pending/done/error)`, `azion_response`, `erro`.

**Trade-off aceito:** não é "dispare e esqueça" — um job parado em `running`/`staged` só avança quando alguém volta com o Job ID. Para o uso previsto (alguém acompanhando a própria migração) isso não é problema; se no futuro for necessário terminar jobs esquecidos automaticamente, dá para adicionar algo bem leve (ex.: um GitHub Action agendado batendo num endpoint público "continue jobs pendentes") sem reintroduzir uma dependência do porte do N8N — não é necessário para o v1.

Esse padrão fica implementado uma vez em `packages/core` (helper de "job/job_items" + máquina de estados) e cada módulo só pluga sua lógica específica de import (parser BIND, chamada à API da Cloudflare) e de execução (qual chamada da API v4 da Azion cada tipo de item dispara) — evita reescrever a mesma máquina de estados 4 vezes.

## 6. Autenticação: decisão — sem sistema próprio

Definido: **não existe login/senha/SSO no portal nem nos módulos.** A justificativa é direta — para qualquer módulo fazer algo de útil, o usuário já precisa colar um **token pessoal válido da Azion** (gerado no Console da Azion, o que por si só exige estar logado lá). Esse token já é, na prática, a credencial de acesso à ferramenta: quem não tem um token Azion válido não consegue rodar nada, então uma segunda camada de login seria redundante.

Como isso funciona em cada módulo:
- Não existe uma etapa separada de "validar token antes de fazer qualquer coisa" — as próprias chamadas que o módulo já precisa fazer à API da Azion (e da Cloudflare, quando aplicável) para executar o job são o gate: se o token for inválido/expirado, essas chamadas retornam 401/403 e o job é marcado como erro. Isso é mais simples do que manter uma verificação de identidade paralela e é consistente com "o mais simples possível".
- Para fins de **auditoria** (saber quem rodou o quê no relatório/dashboard), vale uma chamada best-effort a um endpoint de identidade da Azion (o `azion whoami` da CLI mostra que existe um mecanismo para resolver e-mail a partir do token — o endpoint exato da API v4 precisa ser confirmado na Fase 0 via `api.azion.com`/OpenAPI spec da Azion) para gravar o e-mail/conta do token na linha do job. Se essa chamada falhar por qualquer motivo, o job segue normalmente e fica registrado como "não identificado" — a auditoria é um "nice to have", não um bloqueio.
- O dashboard do portal usa a mesma lógica: para ver o histórico, pede o token Azion (igual aos módulos) em vez de ter uma tela de login própria. Isso mantém uma única credencial em todo o sistema.
- O token da Cloudflare (quando o módulo precisa) nunca é uma credencial de identidade — só é usado para chamar a API da Cloudflare no backend e não deve ser persistido em lugar nenhum (Edge SQL guarda status/metadados, não segredos).

Isso elimina o item que estava em aberto sobre "cookie cross-domain entre módulos" — como não há sessão, não há nada para compartilhar entre domínios.

## 7. O que herdar do MVP vs o que descartar

**Aproveitar:**
- As regras de negócio já validadas: quais campos da Cloudflare/Azion são necessários por fluxo, a lógica de dedup por Target Content, o parsing de tipos de registro (A, CNAME, TXT, MX, SRV) do BIND, a UX geral (self-service, linguagem, fluxo de 3-4 campos → submit → resultado).
- Os textos e o posicionamento do portal (Onboarding, Self-Service, etc.) — já testados com o público certo (Solutions Engineering, parceiros, clientes).

**Descartar:**
- Os formulários falando direto com webhooks do N8N.
- Estilos inline React (vale um design system mínimo em `packages/ui`).
- Qualquer lógica Python do N8N é **reescrita em TypeScript**, não portada — os workflows do N8N não têm testes nem tipos, então é melhor reconstruir a partir das regras de negócio do que tentar transliterar.
- O N8N em si e os dois hosts de webhook inconsistentes.

## 8. Roadmap de construção

- **Fase 0 — Fundação (2-3 semanas):** monorepo criado, `packages/core` com os clients de Cloudflare/Azion API, schema do Edge SQL (`jobs`, incluindo coluna de identidade resolvida do token) e bucket do Object Storage definidos, confirmação do endpoint de identidade da Azion (equivalente ao `whoami`), portal shell mínimo (lista módulos, sem dashboard ainda), pipeline de deploy validado com uma Edge Application "hello world" usando Root Directory.
- **Fase 1 — `mod-bind-import` ponta a ponta (3-4 semanas):** primeiro módulo real, prova o padrão de job em lote + Edge SQL + Object Storage + TypeScript, com deploy independente. É o módulo mais simples de propósito, para validar a arquitetura antes de replicar.
- **Fase 2 — `mod-cf-dns-import` (2-3 semanas):** reaproveita o `packages/core` já testado; ganho de velocidade em relação à Fase 1.
- **Fase 3 — `mod-cf-acl-networklists` (2 semanas).**
- **Fase 4 — `mod-cf-proxy-migration` (3-5 semanas):** o mais complexo, deixado por último de propósito.
- **Fase 5 — Portal completo (paralelo às fases 2-4):** dashboard unificado (lista jobs de todos os módulos via Edge SQL, protegido pelo mesmo token Azion), notificações Slack/e-mail. Sem item de "autenticação central" a construir — já resolvido na seção 6.
- **Fase 6 — Corte:** MVP antigo e N8N desligados, DNS/links do portal atual redirecionados para o novo.

## 9. Decisões (todas fechadas)

- ~~Cron/lote em Edge Functions~~ — **resolvido** (seção 5): padrão Importar→Executar disparado pelo usuário via Job ID, sem depender de cron nativo da Azion.
- ~~Onde ficam os módulos publicamente~~ — **resolvido: Opção A, subdomínio por módulo** (ex.: `bind.migracao.suaempresa.com`, `dns.migracao...`, `acl.migracao...`, `proxy.migracao...`, `portal.migracao...`). Cada Edge Application aponta direto pro seu próprio subdomínio, sem nenhuma camada de roteamento compartilhada entre módulos — consistente com o deploy 100% independente por módulo.

## 10. A confirmar durante a implementação (não bloqueia o design, só a Fase 0)

- **Endpoint exato de identidade da Azion**: qual chamada da API v4 (via `api.azion.com`/OpenAPI) resolve token → e-mail/conta, equivalente ao que o `azion whoami` da CLI faz — necessário só para preencher o campo "executado por" na auditoria dos jobs (seção 6). Não bloqueia nada: se não for encontrado a tempo, o job roda normalmente e o campo fica "não identificado".
