import type { ExecuteItemResult, Job, JobItem } from "../types";
import type { JobStore } from "./jobStore";

/**
 * A máquina de estados de "Executar" — o mesmo helper é usado pelos 4 módulos.
 * Cada módulo só fornece `executeItem`, que sabe transformar um payload
 * importado em uma chamada real à API v4 da Azion.
 *
 * Time-boxed de propósito: Edge Functions são isolates de execução curta
 * (ver ARCHITECTURE.md seção 2), então processamos o quanto der dentro de
 * `timeBudgetMs` e devolvemos o job com o que sobrou como `pending` — a UI
 * (tela de Job) decide se chama de novo automaticamente ou espera o usuário
 * clicar em "Executar" outra vez. Nenhum item é reprocessado: só pega o que
 * ainda está `pending`, então clicar várias vezes é sempre seguro.
 */
export interface RunBatchOptions {
  /** Quantos itens tentar processar nesta chamada, no máximo. */
  batchSize?: number;
  /** Orçamento de tempo (ms) — para de puxar mais itens perto do limite da function. */
  timeBudgetMs?: number;
}

export interface RunBatchResult {
  job: Job;
  processedThisBatch: number;
}

export async function runJobBatch<TPayload = unknown>(
  store: JobStore,
  jobId: string,
  executeItem: (payload: TPayload, item: JobItem<TPayload>) => Promise<ExecuteItemResult>,
  opts: RunBatchOptions = {}
): Promise<RunBatchResult> {
  const batchSize = opts.batchSize ?? 25;
  const timeBudgetMs = opts.timeBudgetMs ?? 20_000; // deixa margem de sobra sob um limite típico de ~30s
  const startedAt = Date.now();

  const items = await store.listPendingItems<TPayload>(jobId, batchSize);
  let processed = 0;

  for (const item of items) {
    if (Date.now() - startedAt > timeBudgetMs) break;

    try {
      const result = await executeItem(item.payload, item);
      if (result.ok) {
        await store.markItemDone(item.id, result.azionResponse);
      } else {
        await store.markItemError(item.id, result.error ?? "erro não especificado");
      }
    } catch (err) {
      await store.markItemError(item.id, err instanceof Error ? err.message : String(err));
    }
    processed += 1;
  }

  const job = await store.recomputeJobStatus(jobId);
  return { job, processedThisBatch: processed };
}
