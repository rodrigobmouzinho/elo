import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant = "primary", size = "md", style, ...props }: Props) {
  const disabled = props.disabled ?? false;

  const paddings = {
    sm: "10px 12px",
    md: "12px 14px",
    lg: "14px 18px"
  } as const;

  const fontSize = {
    sm: ".9rem",
    md: ".95rem",
    lg: "1rem"
  } as const;

  const variants = {
    primary: {
      border: "1px solid transparent",
      background: "linear-gradient(135deg, var(--elo-orbit, #865AFF), #6F43EB)",
      color: "var(--elo-text-inverse, #FFFFFF)",
      boxShadow: "0 12px 26px rgba(134, 90, 255, 0.18)"
    },
    secondary: {
      border: "1px solid var(--elo-border-default, rgba(17, 17, 17, 0.12))",
      background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(248,250,255,0.86))",
      color: "var(--elo-text-primary, #111111)",
      boxShadow: "0 8px 18px rgba(15, 16, 23, 0.04)"
    },
    ghost: {
      border: "1px solid transparent",
      background: "rgba(255,255,255,0.02)",
      color: "var(--elo-text-secondary, #374151)",
      boxShadow: "none"
    },
    danger: {
      border: "1px solid transparent",
      background: "linear-gradient(135deg, #C52B2B, #971919)",
      color: "var(--elo-text-inverse, #FFFFFF)",
      boxShadow: "0 10px 24px rgba(185, 28, 28, 0.18)"
    }
  } as const;

  const current = variants[variant];

  return (
    <button
      {...props}
      style={{
        minHeight: size === "sm" ? "40px" : size === "lg" ? "50px" : "46px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        borderRadius: "var(--elo-radius-md, 14px)",
        padding: paddings[size],
        fontSize: fontSize[size],
        fontWeight: 700,
        letterSpacing: "0.012em",
        lineHeight: 1.1,
        cursor: disabled ? "not-allowed" : "pointer",
        transition:
          "transform var(--elo-motion-fast, 140ms) ease, filter var(--elo-motion-fast, 140ms) ease, box-shadow var(--elo-motion-fast, 140ms) ease, background-color var(--elo-motion-fast, 140ms) ease",
        opacity: disabled ? 0.55 : 1,
        transform: "translateY(0)",
        ...current,
        ...(style ?? {})
      }}
    />
  );
}
