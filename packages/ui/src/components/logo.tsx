import type { CSSProperties } from "react";

type LogoSize = "sm" | "md" | "lg";

const sizes = {
  sm: 28,
  md: 38,
  lg: 48
} as const;

const wordmarkWidths = {
  sm: 112,
  md: 148,
  lg: 188
} as const;

type LogoMarkProps = {
  size?: LogoSize;
  style?: CSSProperties;
};

export function LogoMark({ size = "md", style }: LogoMarkProps) {
  return (
    <img
      src="/brand/elo-mark.png"
      alt="Símbolo Elo Networking"
      width={sizes[size]}
      height={sizes[size]}
      style={{
        width: sizes[size],
        height: sizes[size],
        display: "block",
        objectFit: "contain",
        ...style
      }}
    />
  );
}

type LogoWordmarkProps = {
  size?: LogoSize;
  plated?: boolean;
  style?: CSSProperties;
};

export function LogoWordmark({ size = "md", plated = false, style }: LogoWordmarkProps) {
  const image = (
    <img
      src="/brand/elo-wordmark.png"
      alt="Elo Networking"
      width={wordmarkWidths[size]}
      height={Math.round(wordmarkWidths[size] * 0.34)}
      style={{
        width: wordmarkWidths[size],
        height: "auto",
        display: "block",
        objectFit: "contain"
      }}
    />
  );

  if (!plated) {
    return <span style={{ display: "inline-flex", ...style }}>{image}</span>;
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 12px",
        borderRadius: "16px",
        background: "rgba(255, 255, 255, 0.95)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        ...style
      }}
    >
      {image}
    </span>
  );
}
