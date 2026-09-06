/**
 * Client fino para o Azion Object Storage (protocolo S3-compatível).
 *
 * TODO (Fase 0): trocar por um client S3 de verdade (ex: @aws-sdk/client-s3
 * apontando para o endpoint da Azion) — assinar requisições S3 na mão não vale
 * a pena. Esta interface já é o formato que o resto do código espera, então
 * trocar a implementação por dentro não deve exigir mudar quem a usa.
 *
 * Uso: guardar o input original de cada job (arquivo BIND, JSON de zona lida
 * da Cloudflare) e o relatório final — nunca segredos/tokens.
 */

export interface ObjectStorageConfig {
  bucket: string;
  /** Prefixo por módulo dentro do bucket, ex: "bind-import/" */
  prefix: string;
}

export class ObjectStorageClient {
  constructor(private readonly config: ObjectStorageConfig) {}

  private key(jobId: string, filename: string): string {
    return `${this.config.prefix}${jobId}/${filename}`;
  }

  async putInput(jobId: string, filename: string, content: string | Buffer): Promise<string> {
    const key = this.key(jobId, filename);
    // TODO: substituir por PutObjectCommand do @aws-sdk/client-s3.
    throw new Error(`TODO: implementar upload real para ${this.config.bucket}/${key}`);
  }

  async putReport(jobId: string, html: string): Promise<string> {
    return this.putInput(jobId, "report.html", html);
  }

  async get(ref: string): Promise<string> {
    // TODO: substituir por GetObjectCommand do @aws-sdk/client-s3.
    throw new Error(`TODO: implementar download real de ${ref}`);
  }
}
