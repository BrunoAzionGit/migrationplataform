import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

/**
 * Client para o Azion Object Storage via protocolo S3-compatível.
 * Endpoint e credenciais confirmados em docs/ARCHITECTURE.md seção 10 /
 * https://www.azion.com/en/documentation/products/store/storage/s3-protocol-for-object-storage/ :
 *   - endpoint: https://s3.<region>.azionstorage.net (região usada no exemplo: us-east-005)
 *   - credenciais: access key + secret key gerados por bucket, com capacidades
 *     readFiles/writeFiles/listFiles (Console: bucket -> aba de credenciais S3)
 *   - bucket recomendado como "Restricted": só acessível via API/S3, nunca pelo
 *     Azion Web Platform direto — é o certo pra guardar input/relatório privados.
 *
 * NÃO testei a conectividade real a partir do ambiente onde este código foi
 * escrito (política de rede do sandbox bloqueia esse domínio) — testar no seu
 * ambiente (local ou já publicado) antes de confiar cegamente nisso.
 *
 * Uso: guardar o input original de cada job (arquivo BIND, JSON de zona lida
 * da Cloudflare) e o relatório final — nunca segredos/tokens do usuário.
 */

export interface ObjectStorageConfig {
  bucket: string;
  /** Prefixo por módulo dentro do bucket, ex: "bind-import/" */
  prefix: string;
  /** Endpoint S3-compatível da Azion, ex: https://s3.us-east-005.azionstorage.net */
  endpoint: string;
  /** Região usada no endpoint (ex: "us-east-005") — exigida pelo SDK S3, mesmo não sendo AWS de verdade. */
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class ObjectStorageClient {
  private readonly s3: S3Client;

  constructor(private readonly config: ObjectStorageConfig) {
    this.s3 = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // Endpoints S3-compatíveis fora da AWS geralmente precisam de path-style
      // (bucket.no.path em vez de bucket-como-subdomínio) — ver o guia de S3
      // protocol da Azion linkado acima.
      forcePathStyle: true,
    });
  }

  private key(jobId: string, filename: string): string {
    return `${this.config.prefix}${jobId}/${filename}`;
  }

  async putInput(jobId: string, filename: string, content: string | Buffer): Promise<string> {
    const key = this.key(jobId, filename);
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: content,
      })
    );
    return key;
  }

  async putReport(jobId: string, html: string): Promise<string> {
    const key = this.key(jobId, "report.html");
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: html,
        ContentType: "text/html; charset=utf-8",
      })
    );
    return key;
  }

  /** `ref` é a key retornada por putInput/putReport (não uma URL). */
  async get(ref: string): Promise<string> {
    const res = await this.s3.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: ref }));
    return (await res.Body?.transformToString()) ?? "";
  }
}
