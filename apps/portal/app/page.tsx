import { MODULE_BASE_URL } from "../lib/moduleUrls";

const MODULES = [
  {
    key: "bind-import",
    title: "BIND DNS Zone File Import",
    tag: "Multi-Provider",
    description:
      "Importe arquivos de zona BIND (.zone/.txt) exportados de Akamai, Route53, BIND9 ou Windows Server.",
    status: "Fase 1 — em construção",
  },
  {
    key: "cf-dns-import",
    title: "Cloudflare DNS Import",
    tag: "Self-Service",
    description: "Leitura de zona na Cloudflare via API e criação de registros no Edge DNS.",
    status: "Fase 2 — planejado",
  },
  {
    key: "cf-acl-networklists",
    title: "Cloudflare ACLs -> Network Lists",
    tag: "Sincronização",
    description: "Sincroniza listas de IP/ACLs da Cloudflare para o Azion Network Lists.",
    status: "Fase 3 — planejado",
  },
  {
    key: "cf-proxy-migration",
    title: "Proxy -> Edge Application/Connector/Workload",
    tag: "Orquestrador API",
    description: "Detecta domínios em modo proxy na Cloudflare e provisiona o equivalente na Azion.",
    status: "Fase 4 — planejado",
  },
] as const;

export default function Home() {
  return (
    <>
      <header
        style={{
          backgroundColor: "#1c1c1c",
          color: "white",
          padding: "2.5rem 1rem",
          textAlign: "center",
          borderBottom: "4px solid #f36523",
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Azion Migration Platform
        </h1>
        <p style={{ color: "#ccc" }}>
          Portal de migração Cloudflare → Azion — versão modular, sem N8N.
        </p>
      </header>

      <main style={{ maxWidth: 1100, margin: "2rem auto", padding: "0 1.5rem" }}>
        <section
          style={{
            background: "white",
            border: "1px solid #e1e4e8",
            borderRadius: 8,
            padding: "1.25rem 1.5rem",
            marginBottom: "2rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <strong>Já tem um Job ID?</strong>{" "}
            <span style={{ color: "#6c757d" }}>
              Consulte o status e execute a importação na Azion.
            </span>
          </div>
          <a
            href="/jobs"
            style={{
              backgroundColor: "#1c1c1c",
              color: "white",
              textDecoration: "none",
              padding: "0.6rem 1.2rem",
              borderRadius: 6,
              fontWeight: 600,
            }}
          >
            Consultar Job ↗
          </a>
        </section>

        <h3 style={{ borderBottom: "2px solid #e1e4e8", paddingBottom: "0.5rem" }}>Módulos</h3>
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.5rem",
            marginTop: "1.5rem",
          }}
        >
          {MODULES.map((mod) => (
            <article
              key={mod.key}
              style={{
                background: "white",
                border: "1px solid #e1e4e8",
                borderRadius: 8,
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <span
                  style={{
                    backgroundColor: "#f36523",
                    color: "white",
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    fontWeight: "bold",
                  }}
                >
                  {mod.tag}
                </span>
                <h4 style={{ marginTop: "0.6rem" }}>{mod.title}</h4>
                <p style={{ color: "#6c757d", fontSize: "0.9rem" }}>{mod.description}</p>
                <p style={{ color: "#94a3b8", fontSize: "0.78rem", fontStyle: "italic" }}>
                  {mod.status}
                </p>
              </div>
              <a
                href={MODULE_BASE_URL[mod.key]}
                style={{
                  display: "inline-block",
                  textAlign: "center",
                  backgroundColor: "#f36523",
                  color: "white",
                  textDecoration: "none",
                  padding: "0.65rem 1rem",
                  borderRadius: 6,
                  fontWeight: 600,
                  marginTop: "1rem",
                }}
              >
                Acessar módulo ↗
              </a>
            </article>
          ))}
        </section>
      </main>

      <footer
        style={{
          textAlign: "center",
          marginTop: "3rem",
          padding: "2rem",
          color: "#6c757d",
          fontSize: "0.85rem",
          borderTop: "1px solid #e1e4e8",
        }}
      >
        <p>Azion Solutions Engineering Team</p>
      </footer>
    </>
  );
}
