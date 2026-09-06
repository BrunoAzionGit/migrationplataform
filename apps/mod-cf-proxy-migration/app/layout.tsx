export const metadata = {
  title: "Proxy -> Edge Application/Connector/Workload — Azion Migration Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
