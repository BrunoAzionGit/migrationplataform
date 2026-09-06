/**
 * Tipos compartilhados entre todos os módulos.
 * Ver docs/ARCHITECTURE.md seção 5 (padrão Importar -> Executar) e seção 3 (módulos).
 */

export type ModuleName =
  | "bind-import"
  | "cf-dns-import"
  | "cf-acl-networklists"
  | "cf-proxy-migration";

/** Prefixo de Job ID por módulo — usado para o ID global ser legível (ex: bnd-8f3a1c2e). */
export const MODULE_PREFIX: Record<ModuleName, string> = {
  "bind-import": "bnd",
  "cf-dns-import": "cfd",
  "cf-acl-networklists": "acl",
  "cf-proxy-migration": "pxy",
};

export type JobStatus = "staged" | "running" | "done" | "done_with_errors" | "error";
export type JobItemStatus = "pending" | "done" | "error";

export interface Job {
  id: string;
  module: ModuleName;
  status: JobStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  totalItems: number;
  doneItems: number;
  errorItems: number;
  inputRef: string | null;
  reportRef: string | null;
}

export interface JobItem<TPayload = unknown> {
  id: number;
  jobId: string;
  seq: number;
  payload: TPayload;
  status: JobItemStatus;
  azionResponse: unknown | null;
  error: string | null;
  updatedAt: string;
}

/** Resultado de processar um único item na fase de Executar. */
export interface ExecuteItemResult {
  ok: boolean;
  azionResponse?: unknown;
  error?: string;
}
