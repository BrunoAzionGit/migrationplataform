import { EdgeSqlClient, JobStore, ObjectStorageClient } from "@azion-migration/core";

/**
 * Monta os clients compartilhados a partir de variáveis de ambiente da
 * própria Edge Application deste módulo (configuradas no Console da Azion,
 * nunca digitadas pelo usuário). Ver docs/ARCHITECTURE.md seção 6 — isto é
 * diferente do token da Azion que o usuário informa para EXECUTAR o job.
 */
export function getJobStore(): JobStore {
  const db = new EdgeSqlClient({
    baseUrl: requireEnv("EDGE_SQL_URL"),
    token: requireEnv("EDGE_SQL_TOKEN"),
  });
  return new JobStore(db);
}

export function getObjectStorage(): ObjectStorageClient {
  return new ObjectStorageClient({
    bucket: requireEnv("OBJECT_STORAGE_BUCKET"),
    prefix: "bind-import/",
  });
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variável de ambiente ${name} não configurada. Ver README.md deste módulo.`
    );
  }
  return value;
}
