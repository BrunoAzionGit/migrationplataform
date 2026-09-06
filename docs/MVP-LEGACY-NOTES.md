> **Atualização (05/09/2026):** decidimos ir para um projeto novo (greenfield), modular, em vez de migrar incrementalmente o repo atual. Este documento fica como referência do diagnóstico original e da arquitetura de um único app; a decisão e o desenho atual estão em `arquitetura-v2-modular.md`.

# Roadmap — Toolkit de Migração Cloudflare → Azion (versão sem N8N)

*Preparado a partir da análise do repo `azion-nextjs-project-migration-tool` (front) e da descrição do projeto. O repo `n8n-azn` é privado/inacessível a partir daqui — a análise dos workflows N8N se baseia no que foi descrito pelo Bruno.*

## 1. Diagnóstico do estado atual

**Arquitetura hoje:** Next.js 14 (static export) rodando como Edge Application na Azion → 4 formulários client-side → cada um faz `fetch` **direto do navegador** para um webhook N8N (dois hosts diferentes: `toolkit-migration.azion.app` e `enktjce9wes.map.azionedge.net`) → N8N (Python) fala com as APIs da Cloudflare e da Azion v4.

Pontos fortes: a ideia central é boa — self-service, cobre os 4 cenários certos (DNS via API, DNS via BIND file, ACLs→Network Lists, proxy→Edge Application/Connector/Workload), e já roda hospedado 100% na Azion. É um MVP funcional, não um protótipo de papel.

Problemas concretos que encontrei no código:

1. **Tokens da Cloudflare e da Azion trafegam do browser direto para o N8N**, em texto puro no JSON do POST. Ficam visíveis no DevTools/histórico de rede de quem preenche o form, e não há nenhuma camada de proxy/backend para validar, mascarar ou revogar isso. Para um cliente final usar isso "self-service" (como o app sugere: "Solutions Engineering, Parceiros e Clientes"), isso é um risco real de exposição de credenciais.
2. **Bug de falso-positivo em `cf-dns-import/page.jsx`**: o `catch` do `handleSubmit` seta a mensagem como `'✅ ... iniciada com sucesso!'` mesmo quando a requisição falhou ou o webhook está fora do ar. Ou seja, hoje o usuário pode ver "sucesso" numa importação que nunca aconteceu.
3. **Sem persistência nem histórico**: nenhuma das 4 telas grava o que foi importado, quando, por quem, com qual resultado. Se o N8N cair ou o workflow falhar no meio, não há como saber sem entrar no N8N e ler os logs de execução manualmente.
4. **Sem relatório estruturado**: `cf-migration` renderiza o retorno do N8N com `dangerouslySetInnerHTML` (HTML vindo do backend injetado direto no DOM) — funciona, mas é frágil e um vetor de XSS se o N8N ou algo no meio for comprometido; os outros fluxos nem isso têm.
5. **Dois hosts de webhook diferentes** (`toolkit-migration.azion.app` vs `enktjce9wes.map.azionedge.net`) sugerem ambientes/instâncias N8N inconsistentes — risco operacional (qual é a fonte da verdade?).
6. **Nenhuma autenticação no portal**: qualquer pessoa com a URL entra e roda uma migração, sem controle de quem fez o quê.
7. **Acoplamento total ao N8N**: toda a lógica de negócio (parsing de BIND, dedup de Target Content, criação de Edge Application/Connector/Workload, chamadas às duas APIs) vive em workflows N8N em uma instância que o time mantém — é o ponto único de falha e o principal motivo de vocês quererem sair dele.

## 2. Arquitetura alvo (sem N8N, nativa Azion)

```
Next.js (Edge Application, já existe)
        │  fetch p/ mesmo domínio (sem CORS, sem token exposto a terceiros)
        ▼
Edge Functions (orquestração — substitui o N8N)
   ├─ recebe o job, valida input, cria registro em Edge SQL (status=queued)
   ├─ chama Cloudflare API / lê arquivo BIND / lê ACLs
   ├─ grava progresso incremental em Edge SQL (status=running, X/Y processados)
   ├─ chama Azion API v4 (Edge DNS, Network Lists, Edge App/Connector/Workload)
   ├─ salva payload de entrada + relatório final no Object Storage (auditoria)
   └─ atualiza Edge SQL (status=done/error) + dispara notificação (Slack/e-mail)
        │
        ▼
Edge SQL: tabela de jobs/execuções (histórico, filtros, dashboard)
Object Storage: arquivo BIND original, JSON de entrada (sem token em claro), relatório HTML/PDF
```

Por que essa combinação atende ao que você já descreveu no projeto:
- **Edge SQL** guarda o *estado* de cada execução (fila, progresso, sucesso/erro) — é exatamente o "banco de dados para facilitar processamento assíncrono" que você mencionou. É SQLite-compatível, ACID, replicado globalmente; limite de **30s por query** e write só na instância *main* (replicas são eventualmente consistentes) — ótimo para status/histórico, não é uma fila de mensagens.
- **Object Storage** (S3-compatible) é o lugar certo para os arquivos de input (BIND, listas) e os relatórios gerados — mantém histórico "de arquivo" sem sobrecarregar o SQL.
- **Edge Functions** eliminam o N8N como motor de orquestração, mas atenção a uma limitação real de qualquer runtime de edge (Azion incluso): são isolates com tempo de execução curto por invocação, pensados para request/response, não para um job de 30-60 minutos rodando numa única chamada. Migrações grandes (milhares de registros DNS, zonas grandes) precisam ser desenhadas em **lotes/paginação** — cada invocação processa um pedaço e atualiza o progresso no Edge SQL, e algo dispara a próxima invocação (o próprio front fazendo polling + "continue", ou um cron externo simples tipo GitHub Actions agendado chamando um endpoint "processa próximo lote"). Isso é uma decisão de arquitetura que precisa ser validada cedo — é o maior risco técnico da migração.

## 3. Roadmap proposto

### Fase 0 — Estancar o sangramento (1–2 semanas, sem mudar arquitetura)
Objetivo: tirar os riscos mais graves do ar antes de qualquer refactor grande.
- Corrigir o bug de falso-sucesso no `cf-dns-import` (não mostrar "sucesso" dentro do `catch`).
- Unificar os dois hosts de webhook em um só ambiente N8N conhecido.
- Registrar (mesmo que manualmente, num Google Sheet/DB simples) toda execução: quem, quando, quais IDs, resultado — enquanto o resto não existe.
- **Saída da fase:** zero falso-positivo, um único ambiente de execução, rastreabilidade mínima.

### Fase 1 — Backend próprio + segurança de credenciais (2–4 semanas)
Objetivo: parar de mandar token do browser direto pro N8N, sem ainda remover o N8N.
- Criar uma Edge Function simples que recebe o POST do front, valida input, e só **então** repassa para o N8N (o front nunca mais fala com o N8N diretamente).
- Tokens deixam de ser digitados a cada uso: avaliar guardar credenciais de Cloudflare/Azion por cliente/zona em um cofre (variável de ambiente da Edge Function por enquanto; storage cifrado depois) — reduz exposição e erro humano.
- Criar a tabela de jobs no Edge SQL (`id, tipo, input_ref, status, criado_em, atualizado_em, resultado_ref, erro`) e passar a gravar cada submissão ali, mesmo que a execução ainda seja no N8N.
- **Saída da fase:** nenhum token trafega do navegador para fora do domínio Azion; toda execução tem uma linha no banco desde o clique em "Submit".

### Fase 2 — Migrar o primeiro fluxo para Edge Functions (3–5 semanas)
Objetivo: provar o modelo assíncrono sem N8N em um fluxo só, o mais simples (sugestão: **BIND Import**, porque não depende da API da Cloudflare — menos variáveis).
- Reescrever o parser BIND e a criação de registros na Azion Edge DNS como Edge Function.
- Implementar o padrão de lote: a function processa N registros por chamada, atualiza `Edge SQL`, e o front faz polling do status (barra de progresso real, não só "enviado com sucesso").
- Salvar o arquivo BIND original e o relatório final no Object Storage.
- **Saída da fase:** um fluxo 100% Azion-native, ponta a ponta, sem tocar no N8N. Isso valida o padrão de orquestração em lote antes de replicar para os outros 3 fluxos (que são mais complexos, por dependerem da API da Cloudflare).

### Fase 3 — Migrar os fluxos restantes (5–8 semanas)
Ordem sugerida por complexidade crescente:
1. **Cloudflare DNS Import** (API simples de leitura + criação).
2. **ACLs → Network Lists** (leitura de listas + criação, volume geralmente menor).
3. **Proxy → Edge Application/Connector/Workload** (o mais complexo: dedup por Target Content, clonagem de Edge Application base, vínculo de domínios — é o fluxo que hoje já gera "relatório em PDF", então precisa da lógica de relatório também migrada).
- Cada fluxo migrado libera N8N daquele webhook específico.
- **Saída da fase:** N8N sem nenhum workflow ativo ligado ao portal — pode ser desligado.

### Fase 4 — Controles, relatórios e notificações (paralelo à Fase 3, 3–4 semanas)
- Dashboard simples (Next.js + Edge SQL) listando execuções: filtro por tipo/status/data, drill-down no relatório de cada job.
- Autenticação no portal (mínimo: login único da equipe; se for expor a clientes/parceiros, considerar SSO ou magic link por e-mail).
- Notificação de fim de job por Slack e/ou e-mail com sucesso/falha e link pro relatório.
- Auditoria: quem disparou, IP, timestamps — já nasce no `Edge SQL` desde a Fase 1, aqui só ganha interface.
- **Saída da fase:** ninguém mais precisa abrir o N8N ou pedir print pro Bruno para saber se uma migração deu certo.

### Fase 5 — Desligar o N8N e endurecer (2 semanas)
- Remover o repo/infra do N8N (ou arquivar).
- Revisar rate limiting e retries contra a API da Cloudflare/Azion (hoje invisível dentro do N8N).
- Testes automatizados dos parsers (BIND é o mais arriscado a regressão silenciosa) e das chamadas de API com mocks.
- Runbook de operação: o que fazer quando um job trava em "running", como reprocessar, como revogar um token.

## 4. Decisões técnicas em aberto (vale decidir antes da Fase 2)
- **Como disparar o próximo lote de um job assíncrono?** Opções: (a) front faz polling e o próprio clique/timer dispara "processa próximo lote"; (b) a Edge Function se auto-invoca via fetch para outro endpoint; (c) cron externo (ex.: GitHub Actions agendado) batendo num endpoint "processa fila". A documentação da Azion não deixa claro um mecanismo nativo de cron/fila para Edge Functions — vale confirmar com o time de produto/suporte da Azion antes de comprometer a Fase 2 com uma abordagem.
- **Onde ficam os tokens de Cloudflare/Azion por cliente?** Variável de ambiente por enquanto é aceitável para uso interno; se o portal for exposto a clientes externos, precisa de um cofre de segredos por tenant.
- **Formato do relatório**: manter HTML (fácil de estilizar, já usado hoje) ou ir para PDF padronizado (mais formal para "evidência de entrega", como já descrito para o fluxo de proxy)? Pode ser decidido por fluxo.

## 5. Próximo passo imediato sugerido
Fechar a Fase 0 (bug do falso-sucesso + unificação de host) essa semana — é baixo esforço e já remove o risco mais visível — e, em paralelo, decidir o mecanismo de "processamento em lote" da seção 4, porque ele condiciona o desenho de todas as fases seguintes.
