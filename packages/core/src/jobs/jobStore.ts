import { EdgeSqlClient } from "../db/edgeSql.js";
import { generateJobId } from "./jobId.js";
import type { Job, JobItem, ModuleName } from "../types.js";

/**
 * Camada de acesso a `jobs` + `job_items` (ver db/schema.sql).
 * Cada método é deliberadamente simples — é a base que os 4 módulos reusam
 * via `packages/core`, então qualquer lógica nova de negócio deve entrar nos
 * módulos, não aqui.
 */
export class JobStore {
  constructor(private readonly db: EdgeSqlClient) {}

  /** Fase 1 (Importar): cria o job + grava cada item já com seq estável. */
  async createJob<TPayload>(
    module: ModuleName,
    items: TPayload[],
    opts: { createdBy?: string | null; inputRef?: string | null } = {}
  ): Promise<Job> {
    const id = generateJobId(module);
    const now = new Date().toISOString();

    await this.db.query(
      `INSERT INTO jobs (id, module, status, created_by, created_at, updated_at, total_items, input_ref)
       VALUES (?, ?, 'staged', ?, ?, ?, ?, ?)`,
      [id, module, opts.createdBy ?? null, now, now, items.length, opts.inputRef ?? null]
    );

    // Inserção em lote dos itens — se `items` for muito grande, o módulo
    // chamador deve dividir em chunks antes de chamar createJob.
    for (const [seq, payload] of items.entries()) {
      await this.db.query(
        `INSERT INTO job_items (job_id, seq, payload, status) VALUES (?, ?, ?, 'pending')`,
        [id, seq, JSON.stringify(payload)]
      );
    }

    return this.getJob(id) as Promise<Job>;
  }

  async getJob(id: string): Promise<Job | null> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM jobs WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) return null;
    return rowToJob(rows[0]);
  }

  async listPendingItems<TPayload = unknown>(jobId: string, limit: number): Promise<JobItem<TPayload>[]> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM job_items WHERE job_id = ? AND status = 'pending' ORDER BY seq ASC LIMIT ?`,
      [jobId, limit]
    );
    return rows.map(rowToJobItem) as JobItem<TPayload>[];
  }

  async markItemDone(itemId: number, azionResponse: unknown): Promise<void> {
    await this.db.query(
      `UPDATE job_items SET status = 'done', azion_response = ?, updated_at = ? WHERE id = ?`,
      [JSON.stringify(azionResponse ?? null), new Date().toISOString(), itemId]
    );
  }

  async markItemError(itemId: number, error: string): Promise<void> {
    await this.db.query(
      `UPDATE job_items SET status = 'error', error = ?, updated_at = ? WHERE id = ?`,
      [error, new Date().toISOString(), itemId]
    );
  }

  /** Recalcula done_items/error_items/status do job a partir dos itens — chamar após cada lote. */
  async recomputeJobStatus(jobId: string, opts: { reportRef?: string } = {}): Promise<Job> {
    const { rows } = await this.db.query<{ status: string; n: number }>(
      `SELECT status, COUNT(*) as n FROM job_items WHERE job_id = ? GROUP BY status`,
      [jobId]
    );
    const counts = Object.fromEntries(rows.map((r) => [r.status, r.n]));
    const done = counts.done ?? 0;
    const error = counts.error ?? 0;
    const pending = counts.pending ?? 0;

    const status = pending > 0 ? "running" : error > 0 ? "done_with_errors" : "done";

    await this.db.query(
      `UPDATE jobs SET done_items = ?, error_items = ?, status = ?, updated_at = ?, report_ref = COALESCE(?, report_ref)
       WHERE id = ?`,
      [done, error, status, new Date().toISOString(), opts.reportRef ?? null, jobId]
    );

    return this.getJob(jobId) as Promise<Job>;
  }
}

function rowToJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    module: row.module as Job["module"],
    status: row.status as Job["status"],
    createdBy: (row.created_by as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    totalItems: Number(row.total_items),
    doneItems: Number(row.done_items),
    errorItems: Number(row.error_items),
    inputRef: (row.input_ref as string) ?? null,
    reportRef: (row.report_ref as string) ?? null,
  };
}

function rowToJobItem(row: Record<string, unknown>): JobItem {
  return {
    id: Number(row.id),
    jobId: row.job_id as string,
    seq: Number(row.seq),
    payload: JSON.parse(row.payload as string),
    status: row.status as JobItem["status"],
    azionResponse: row.azion_response ? JSON.parse(row.azion_response as string) : null,
    error: (row.error as string) ?? null,
    updatedAt: row.updated_at as string,
  };
}
