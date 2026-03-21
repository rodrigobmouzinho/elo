import clsx from "clsx";
import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes
} from "react";

const controlBaseStyle: CSSProperties = {
  width: "100%",
  borderRadius: "var(--elo-radius-md, 12px)",
  border: "1px solid var(--elo-control-border, rgba(17, 17, 17, 0.12))",
  background: "var(--elo-control-bg, #FFFFFF)",
  color: "var(--elo-text-primary, #111111)",
  padding: "var(--elo-space-3, 12px)",
  lineHeight: 1.35,
  transition:
    "border-color var(--elo-motion-fast, 140ms) ease, box-shadow var(--elo-motion-fast, 140ms) ease, background-color var(--elo-motion-fast, 140ms) ease"
};

type PrimitiveStateProps = {
  invalid?: boolean;
};

type InputProps = InputHTMLAttributes<HTMLInputElement> & PrimitiveStateProps;

function isChoiceInput(type?: string) {
  return type === "checkbox" || type === "radio";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, style, type = "text", ...props },
  ref
) {
  if (isChoiceInput(type)) {
    return (
      <input
        {...props}
        ref={ref}
        type={type}
        className={clsx("elo-choice-control", className)}
        data-elo-invalid={invalid ? "true" : undefined}
        aria-invalid={invalid ? true : props["aria-invalid"]}
        style={style}
      />
    );
  }

  return (
    <input
      {...props}
      ref={ref}
      type={type}
      className={clsx("elo-control", className)}
      data-elo-invalid={invalid ? "true" : undefined}
      aria-invalid={invalid ? true : props["aria-invalid"]}
      style={{ ...controlBaseStyle, ...(style ?? {}) }}
    />
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & PrimitiveStateProps;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, style, ...props },
  ref
) {
  return (
    <select
      {...props}
      ref={ref}
      className={clsx("elo-control elo-select", className)}
      data-elo-invalid={invalid ? "true" : undefined}
      aria-invalid={invalid ? true : props["aria-invalid"]}
      style={{ ...controlBaseStyle, ...(style ?? {}) }}
    />
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & PrimitiveStateProps;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, style, ...props },
  ref
) {
  return (
    <textarea
      {...props}
      ref={ref}
      className={clsx("elo-control elo-textarea", className)}
      data-elo-invalid={invalid ? "true" : undefined}
      aria-invalid={invalid ? true : props["aria-invalid"]}
      style={{ ...controlBaseStyle, minHeight: "96px", resize: "vertical", ...(style ?? {}) }}
    />
  );
});

export type AlertVariant = "info" | "success" | "warning" | "danger";

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  title?: string;
  variant?: AlertVariant;
};

export function Alert({ children, className, title, variant = "info", style, ...props }: AlertProps) {
  return (
    <div
      {...props}
      role={variant === "danger" ? "alert" : "status"}
      className={clsx("elo-alert", `elo-alert--${variant}`, className)}
      style={style}
    >
      {title ? <strong className="elo-alert-title">{title}</strong> : null}
      <span>{children}</span>
    </div>
  );
}

export type BadgeVariant = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  variant?: BadgeVariant;
};

export function Badge({ children, className, variant = "neutral", style, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={clsx("elo-badge", `elo-badge--${variant}`, className)}
      style={style}
    >
      {children}
    </span>
  );
}
