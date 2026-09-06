/** @type {import('next').NextConfig} */
// SSR (não static export) — a Azion já suporta Next.js com SSR via Azion
// Bundler (ver docs/ARCHITECTURE.md seção 2), então mantemos rotas de API
// server-side ao invés de `output: 'export'` como o MVP antigo usava.
const nextConfig = {
  transpilePackages: ["@azion-migration/core", "@azion-migration/ui"],
};

module.exports = nextConfig;
