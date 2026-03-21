import type { CSSProperties, ReactNode } from "react";

type CardTone = "default" | "panel" | "ghost";

type CardProps = {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  tone?: CardTone;
  footer?: ReactNode;
  headerAside?: ReactNode;
  style?: CSSProperties;
};

export function Card({ title, subtitle, children, tone = "default", footer, headerAside, style }: CardProps) {
  const backgrounds = {
    default: "var(--elo-surface-base, #FFFFFF)",
    panel: "var(--elo-panel, #F4F6FF)",
    ghost: "rgba(255, 255, 255, 0.82)"
  } as const;

  return (
    <article
      style={{
        background: backgrounds[tone],
        borderRadius: "var(--elo-radius-lg, 20px)",
        padding: "var(--elo-space-5, 20px)",
        boxShadow: tone === "ghost" ? "none" : "var(--elo-elevation-1, 0 6px 18px rgba(10, 10, 10, 0.08))",
        border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
        color: "var(--elo-text-primary, #111111)",
        backdropFilter: tone === "ghost" ? "blur(12px)" : undefined,
        ...(style ?? {})
      }}
    >
      {title || subtitle || headerAside ? (
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "12px"
          }}
        >
          <div style={{ display: "grid", gap: "4px" }}>
            {title ? (
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  lineHeight: 1.15,
                  color: "var(--elo-text-primary, #111111)"
                }}
              >
                {title}
              </h3>
            ) : null}
            {subtitle ? (
              <p
                style={{
                  margin: 0,
                  color: "var(--elo-text-tertiary, #6B7280)",
                  fontSize: ".92rem",
                  lineHeight: 1.5
                }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          {headerAside}
        </header>
      ) : null}
      {children ? <div style={{ marginTop: title || subtitle || headerAside ? "var(--elo-space-4, 16px)" : 0 }}>{children}</div> : null}
      {footer ? <footer style={{ marginTop: "var(--elo-space-4, 16px)" }}>{footer}</footer> : null}
    </article>
  );
}
