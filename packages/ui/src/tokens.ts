export type EloThemeName = "light" | "dark";

const lightTheme = {
  brand: {
    primary: "#865AFF",
    primaryHover: "#7B4CFC",
    primaryActive: "#6E42E8"
  },
  accent: {
    graphite: "#06070B",
    orbit: "#865AFF",
    frost: "#F4F6FF",
    rail: "#0D0E14",
    dock: "rgba(255, 255, 255, 0.86)",
    metric: "#111318"
  },
  text: {
    primary: "#111111",
    secondary: "#374151",
    tertiary: "#6B7280",
    muted: "#9CA3AF",
    inverse: "#FFFFFF"
  },
  surface: {
    canvas: "#F0F5FF",
    base: "#FFFFFF",
    raised: "#F8F8FF",
    inset: "#EAEDF7"
  },
  border: {
    soft: "rgba(17, 17, 17, 0.06)",
    default: "rgba(17, 17, 17, 0.12)",
    strong: "rgba(17, 17, 17, 0.22)",
    focus: "rgba(134, 90, 255, 0.45)"
  },
  control: {
    bg: "#FFFFFF",
    bgHover: "#FAFAFF",
    bgActive: "#F3F4FF",
    bgDisabled: "#E5E7EB",
    border: "rgba(17, 17, 17, 0.12)",
    borderFocus: "rgba(134, 90, 255, 0.45)"
  },
  semantic: {
    success: "#166534",
    warning: "#92400E",
    danger: "#B91C1C",
    info: "#1D4ED8"
  },
  elevation: {
    level0: "none",
    level1: "0 6px 18px rgba(10, 10, 10, 0.08)",
    level2: "0 12px 30px rgba(10, 10, 10, 0.12)"
  }
} as const;

const darkTheme = {
  brand: {
    primary: "#865AFF",
    primaryHover: "#9370FF",
    primaryActive: "#7B4CFC"
  },
  accent: {
    graphite: "#05060A",
    orbit: "#9370FF",
    frost: "#191B24",
    rail: "#090A10",
    dock: "rgba(16, 18, 28, 0.88)",
    metric: "#F5F7FF"
  },
  text: {
    primary: "#F5F7FF",
    secondary: "#D0D7EB",
    tertiary: "#9AA3BC",
    muted: "#7D879E",
    inverse: "#0A0A0A"
  },
  surface: {
    canvas: "#050507",
    base: "#0F0F14",
    raised: "#16161E",
    inset: "#090A0F"
  },
  border: {
    soft: "rgba(240, 245, 255, 0.08)",
    default: "rgba(240, 245, 255, 0.16)",
    strong: "rgba(240, 245, 255, 0.28)",
    focus: "rgba(134, 90, 255, 0.55)"
  },
  control: {
    bg: "#12131A",
    bgHover: "#171824",
    bgActive: "#1B1D2A",
    bgDisabled: "#2B2E3A",
    border: "rgba(240, 245, 255, 0.16)",
    borderFocus: "rgba(134, 90, 255, 0.55)"
  },
  semantic: {
    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#F87171",
    info: "#60A5FA"
  },
  elevation: {
    level0: "none",
    level1: "0 6px 18px rgba(0, 0, 0, 0.35)",
    level2: "0 12px 30px rgba(0, 0, 0, 0.45)"
  }
} as const;

export const themes = {
  light: lightTheme,
  dark: darkTheme
} as const;

export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  7: "28px",
  8: "32px",
  9: "36px",
  10: "40px",
  11: "44px",
  12: "48px"
} as const;

export const radius = {
  xs: "8px",
  sm: "10px",
  md: "12px",
  lg: "16px",
  xl: "22px"
} as const;

export const motion = {
  fast: "140ms",
  normal: "220ms"
} as const;

type CssVariables = Record<`--${string}`, string>;

export function getThemeCssVariables(theme: EloThemeName = "light"): CssVariables {
  const selected = themes[theme];

  return {
    "--elo-color-brand-primary": selected.brand.primary,
    "--elo-color-brand-primary-hover": selected.brand.primaryHover,
    "--elo-color-brand-primary-active": selected.brand.primaryActive,
    "--elo-graphite": selected.accent.graphite,
    "--elo-orbit": selected.accent.orbit,
    "--elo-panel": selected.accent.frost,
    "--elo-rail": selected.accent.rail,
    "--elo-dock": selected.accent.dock,
    "--elo-metric": selected.accent.metric,
    "--elo-text-primary": selected.text.primary,
    "--elo-text-secondary": selected.text.secondary,
    "--elo-text-tertiary": selected.text.tertiary,
    "--elo-text-muted": selected.text.muted,
    "--elo-text-inverse": selected.text.inverse,
    "--elo-surface-canvas": selected.surface.canvas,
    "--elo-surface-base": selected.surface.base,
    "--elo-surface-raised": selected.surface.raised,
    "--elo-surface-inset": selected.surface.inset,
    "--elo-border-soft": selected.border.soft,
    "--elo-border-default": selected.border.default,
    "--elo-border-strong": selected.border.strong,
    "--elo-border-focus": selected.border.focus,
    "--elo-separator": selected.border.default,
    "--elo-control-bg": selected.control.bg,
    "--elo-control-bg-hover": selected.control.bgHover,
    "--elo-control-bg-active": selected.control.bgActive,
    "--elo-control-bg-disabled": selected.control.bgDisabled,
    "--elo-control-border": selected.control.border,
    "--elo-control-border-focus": selected.control.borderFocus,
    "--elo-semantic-success": selected.semantic.success,
    "--elo-semantic-warning": selected.semantic.warning,
    "--elo-semantic-danger": selected.semantic.danger,
    "--elo-semantic-info": selected.semantic.info,
    "--elo-elevation-0": selected.elevation.level0,
    "--elo-elevation-1": selected.elevation.level1,
    "--elo-elevation-2": selected.elevation.level2,
    "--elo-radius-xs": "6px",
    "--elo-radius-sm": "10px",
    "--elo-radius-md": "14px",
    "--elo-radius-lg": "20px",
    "--elo-radius-xl": "24px",
    "--elo-space-1": spacing[1],
    "--elo-space-2": spacing[2],
    "--elo-space-3": spacing[3],
    "--elo-space-4": spacing[4],
    "--elo-space-5": spacing[5],
    "--elo-space-6": spacing[6],
    "--elo-space-7": spacing[7],
    "--elo-space-8": spacing[8],
    "--elo-space-9": spacing[9],
    "--elo-space-10": spacing[10],
    "--elo-space-11": spacing[11],
    "--elo-space-12": spacing[12],
    "--elo-motion-fast": motion.fast,
    "--elo-motion-normal": motion.normal
  };
}

export const tokens = {
  themes,
  spacing,
  radius,
  motion,
  colors: {
    primary: lightTheme.brand.primary,
    ink: "#000000",
    paper: lightTheme.surface.canvas,
    surface: lightTheme.surface.base,
    muted: lightTheme.text.tertiary
  },
  shadow: {
    soft: lightTheme.elevation.level1
  }
} as const;
