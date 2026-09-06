export const metadata = {
  title: "Azion Migration Platform",
  description: "Portal de migração Cloudflare -> Azion",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
