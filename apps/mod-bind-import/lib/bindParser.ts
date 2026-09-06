/**
 * Parser de arquivo de zona BIND (.zone/.txt) — suporta os tipos que o MVP
 * original suportava: A, AAAA, CNAME, TXT, MX, SRV, NS. Reescrito do zero em
 * TypeScript (a lógica do N8N era Python e não temos acesso ao workflow
 * original — ver docs/ARCHITECTURE.md seção 7, "descartar").
 *
 * Suporta o essencial do formato: comentários (;), $ORIGIN, $TTL, e a linha
 * clássica `name [ttl] [IN] TYPE data...`. Não é um parser BIND completo
 * (não cobre $INCLUDE, TSIG, etc.) — suficiente para os casos de exportação
 * de Akamai/Route53/BIND9/Windows Server citados no MVP.
 */

export interface BindRecord {
  name: string;
  type: "A" | "AAAA" | "CNAME" | "TXT" | "MX" | "SRV" | "NS";
  ttl: number;
  data: string;
  priority?: number; // MX, SRV
}

const DEFAULT_TTL = 3600;
const SUPPORTED_TYPES = new Set(["A", "AAAA", "CNAME", "TXT", "MX", "SRV", "NS"]);

export function parseBindZone(content: string): BindRecord[] {
  const records: BindRecord[] = [];
  let origin = "";
  let defaultTtl = DEFAULT_TTL;
  let lastName = "";

  const lines = content
    .split(/\r?\n/)
    .map(stripComment)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (line.startsWith("$ORIGIN")) {
      origin = line.split(/\s+/)[1] ?? "";
      continue;
    }
    if (line.startsWith("$TTL")) {
      defaultTtl = parseInt(line.split(/\s+/)[1] ?? String(DEFAULT_TTL), 10) || DEFAULT_TTL;
      continue;
    }

    const tokens = line.split(/\s+/);
    if (tokens.length < 2) continue;

    // Nome pode ser omitido (herda da linha anterior) — formato BIND clássico.
    let idx = 0;
    let name = lastName;
    if (!/^\d+$/.test(tokens[0]) && tokens[0] !== "IN") {
      name = tokens[0];
      idx = 1;
    }
    lastName = name;

    let ttl = defaultTtl;
    if (/^\d+$/.test(tokens[idx])) {
      ttl = parseInt(tokens[idx], 10);
      idx += 1;
    }
    if (tokens[idx] === "IN") idx += 1;

    const type = tokens[idx];
    idx += 1;
    if (!type || !SUPPORTED_TYPES.has(type)) continue; // tipo não suportado neste v1 — ignora a linha

    const rest = tokens.slice(idx).join(" ");

    if (type === "MX" || type === "SRV") {
      const [prio, ...dataParts] = rest.split(/\s+/);
      records.push({
        name: normalizeName(name, origin),
        type: type as BindRecord["type"],
        ttl,
        data: dataParts.join(" "),
        priority: parseInt(prio, 10) || 0,
      });
    } else {
      records.push({
        name: normalizeName(name, origin),
        type: type as BindRecord["type"],
        ttl,
        data: rest.replace(/^"|"$/g, ""), // remove aspas de TXT
      });
    }
  }

  return records;
}

function stripComment(line: string): string {
  const idx = line.indexOf(";");
  return idx === -1 ? line : line.slice(0, idx);
}

function normalizeName(name: string, origin: string): string {
  if (name === "@" && origin) return origin;
  if (name.endsWith(".")) return name.slice(0, -1);
  return name;
}
