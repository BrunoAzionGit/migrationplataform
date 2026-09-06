# mod-cf-proxy-migration

**Status:** Fase 4 do roadmap — placeholder, ainda não implementado.

Segue o mesmo padrão Importar -> Executar de `mod-bind-import` (a referência de
implementação): fase de import grava itens em `job_items` via `@azion-migration/core`
(`JobStore`), fase de execução usa `runJobBatch` + `AzionClient`. Ver
`docs/ARCHITECTURE.md` seção 3 (módulos) e seção 5 (padrão de execução).

Deploy na Azion: mesma receita do mod-bind-import, com **Root Directory**
`apps/mod-cf-proxy-migration`.
