-- Edge SQL schema (SQLite dialect) — compartilhado por todos os módulos.
-- Ver docs/ARCHITECTURE.md seção 5 para o desenho do padrão Importar -> Executar.
--
-- Como aplicar: azion-cli / painel do Edge SQL, ou via API REST do Edge SQL
-- (ver packages/core/src/db/edgeSql.ts).

CREATE TABLE IF NOT EXISTS jobs (
  id            TEXT PRIMARY KEY,        -- prefixado por módulo, ex: bnd-8f3a1c2e
  module        TEXT NOT NULL,           -- 'bind-import' | 'cf-dns-import' | 'cf-acl-networklists' | 'cf-proxy-migration'
  status        TEXT NOT NULL DEFAULT 'staged',
                                          -- staged -> running -> done | done_with_errors | error
  created_by    TEXT,                    -- e-mail/conta resolvido do token Azion (best-effort, pode ficar NULL)
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  total_items   INTEGER NOT NULL DEFAULT 0,
  done_items    INTEGER NOT NULL DEFAULT 0,
  error_items   INTEGER NOT NULL DEFAULT 0,
  input_ref     TEXT,                    -- referência (chave) do input original no Object Storage
  report_ref    TEXT                     -- referência do relatório final no Object Storage
);

CREATE INDEX IF NOT EXISTS idx_jobs_module ON jobs(module);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

CREATE TABLE IF NOT EXISTS job_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id         TEXT NOT NULL REFERENCES jobs(id),
  seq            INTEGER NOT NULL,        -- ordem de importação, estável
  payload        TEXT NOT NULL,           -- JSON do registro a criar/migrar na Azion
  status         TEXT NOT NULL DEFAULT 'pending', -- pending | done | error
  azion_response TEXT,                    -- JSON da resposta da API v4 (quando aplicável)
  error          TEXT,
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_job_items_job_id ON job_items(job_id);
CREATE INDEX IF NOT EXISTS idx_job_items_status ON job_items(job_id, status);
