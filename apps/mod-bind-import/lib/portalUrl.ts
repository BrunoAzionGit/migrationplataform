import { resolvePortalUrl } from "@azion-migration/core";

/**
 * URL do portal, resolvida via packages/core (localhost:3000 em dev, ou o
 * subdomínio de produção). NEXT_PUBLIC_PORTAL_URL sobrescreve se precisar
 * apontar pra staging ou pro domínio real sem mudar código.
 */
export const PORTAL_URL = resolvePortalUrl(process.env.NEXT_PUBLIC_PORTAL_URL);
