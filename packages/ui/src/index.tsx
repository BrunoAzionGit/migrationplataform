import type { ReactNode } from "react";

/**
 * Design system mínimo. Propositalmente pequeno — o objetivo é só dar uma
 * cara consistente ao portal + módulos sem herdar os estilos inline do MVP
 * (ver docs/ARCHITECTURE.md seção 7). Evolui conforme os módulos forem
 * precisando de mais componentes.
 */

const colors = {
  brand: "#f36523",
  ink: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  bg: "#f8fafc",
  success: "#166534",
  successBg: "#f0fdf4",
  successBorder: "#bbf7d0",
  errorText: "#991b1b",
  errorBg: "#fef2f2",
  errorBorder: "#fecaca",
};

export function Card({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 32,
        maxWidth: 560,
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "40px 20px",
        background: colors.bg,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: colors.ink,
      }}
    >
      {children}
    </div>
  );
}

export function StatusBanner({ type, message }: { type: "success" | "error"; message: string }) {
  const isSuccess = type === "success";
  return (
    <div
      style={{
        marginTop: 20,
        padding: 14,
        borderRadius: 8,
        fontSize: "0.9rem",
        backgroundColor: isSuccess ? colors.successBg : colors.errorBg,
        border: `1px solid ${isSuccess ? colors.successBorder : colors.errorBorder}`,
        color: isSuccess ? colors.success : colors.errorText,
      }}
    >
      {message}
    </div>
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        width: "100%",
        padding: "14px 16px",
        backgroundColor: props.disabled ? "#fdba74" : colors.brand,
        color: "#fff",
        border: "none",
        borderRadius: 8,
        fontWeight: 700,
        fontSize: "1rem",
        cursor: props.disabled ? "not-allowed" : "pointer",
        ...props.style,
      }}
    />
  );
}

export function StatusBadge({ status }: { status: string }) {
  const palette: Record<string, { bg: string; fg: string }> = {
    staged: { bg: "#f1f5f9", fg: "#334155" },
    running: { bg: "#fff7ed", fg: "#9a3412" },
    done: { bg: colors.successBg, fg: colors.success },
    done_with_errors: { bg: "#fefce8", fg: "#854d0e" },
    error: { bg: colors.errorBg, fg: colors.errorText },
    pending: { bg: "#f1f5f9", fg: "#334155" },
  };
  const { bg, fg } = palette[status] ?? palette.staged;
  return (
    <span
      style={{
        backgroundColor: bg,
        color: fg,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 700,
        textTransform: "uppercase",
      }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export { colors };
