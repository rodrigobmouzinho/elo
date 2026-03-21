import { ArrowUpRight, ChevronDown, ChevronUp, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Badge, type BadgeVariant } from "./form-primitives";
import { Button } from "./button";
import { Card } from "./card";

type HeaderAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: HeaderAction[];
}) {
  return (
    <section
      style={{
        display: "grid",
        gap: "14px",
        padding: "8px 0 6px"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap"
        }}
      >
        <div style={{ display: "grid", gap: "10px", minWidth: "min(100%, 420px)" }}>
          {eyebrow}
          <div style={{ display: "grid", gap: "8px" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(1.7rem, 3vw, 2.8rem)",
                lineHeight: 0.98,
                maxWidth: "20ch"
              }}
            >
              {title}
            </h1>
            {description ? (
              <p
                style={{
                  margin: 0,
                  maxWidth: "72ch",
                  color: "var(--elo-text-secondary, #374151)",
                  fontSize: ".98rem",
                  lineHeight: 1.65
                }}
              >
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {actions?.length ? (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {actions.map((action) =>
              action.href ? (
                <a key={`${action.label}-${action.href}`} href={action.href} style={{ display: "inline-flex" }}>
                  <Button variant={action.variant}>{action.label}</Button>
                </a>
              ) : (
                <Button key={action.label} onClick={action.onClick} variant={action.variant}>
                  {action.label}
                </Button>
              )
            )}
          </div>
        ) : null}
      </div>

      {meta ? <div>{meta}</div> : null}
    </section>
  );
}

type MetricItem = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  badge?: ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger" | "info";
};

export function MetricStrip({ items }: { items: MetricItem[] }) {
  return (
    <section
      style={{
        display: "grid",
        gap: "12px",
        gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))"
      }}
    >
      {items.map((item) => (
        <Card
          key={item.label}
          tone="ghost"
          style={{
            borderRadius: "20px",
            padding: "18px",
            minHeight: "132px",
            boxShadow: "none",
            background:
              item.tone === "brand"
                ? "linear-gradient(180deg, rgba(134, 90, 255, 0.16), rgba(255, 255, 255, 0.96))"
                : "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(251,252,255,0.84))"
          }}
        >
          <div style={{ display: "grid", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
              <span
                style={{
                  color: "var(--elo-text-tertiary, #6B7280)",
                  fontSize: ".76rem",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase"
                }}
              >
                {item.label}
              </span>
              {item.badge}
            </div>
            <strong
              style={{
                fontFamily: "var(--elo-font-mono)",
                fontSize: "clamp(1.34rem, 1.9vw, 1.92rem)",
                lineHeight: 1,
                letterSpacing: "-0.03em"
              }}
            >
              {item.value}
            </strong>
            {item.hint ? (
              <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".88rem", lineHeight: 1.55 }}>
                {item.hint}
              </span>
            ) : null}
          </div>
        </Card>
      ))}
    </section>
  );
}

type PriorityItem = {
  title: string;
  description: string;
  tone?: BadgeVariant;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
};

export function PriorityStrip({ items }: { items: PriorityItem[] }) {
  return (
    <section style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
      {items.map((item) => (
        <Card
          key={item.title}
          tone="panel"
          style={{
            position: "relative",
            overflow: "hidden"
          }}
          headerAside={<Badge variant={item.tone ?? "neutral"}>{labelFromTone(item.tone ?? "neutral")}</Badge>}
        >
          <div
            style={{
              position: "absolute",
              inset: "0 auto 0 0",
              width: "3px",
              background:
                item.tone === "danger"
                  ? "var(--elo-semantic-danger)"
                  : item.tone === "warning"
                    ? "var(--elo-semantic-warning)"
                    : item.tone === "success"
                      ? "var(--elo-semantic-success)"
                      : "var(--elo-orbit)"
            }}
          />
          <div style={{ display: "grid", gap: "10px", paddingLeft: "6px" }}>
            <strong style={{ fontSize: "1.02rem" }}>{item.title}</strong>
            <p style={{ margin: 0, color: "var(--elo-text-secondary, #374151)" }}>{item.description}</p>
            {item.href ? (
              <a
                href={item.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "var(--elo-orbit, #865AFF)",
                  fontWeight: 700
                }}
              >
                {item.actionLabel}
                <ArrowUpRight size={14} />
              </a>
            ) : item.onAction ? (
              <Button size="sm" variant="secondary" onClick={item.onAction}>
                {item.actionLabel}
              </Button>
            ) : null}
          </div>
        </Card>
      ))}
    </section>
  );
}

export function FilterBar({
  children,
  actions
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        flexWrap: "wrap",
        padding: "12px 14px",
        borderRadius: "20px",
        border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
        background: "linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 255, 0.82))",
        boxShadow: "0 10px 24px rgba(15, 16, 23, 0.04)",
        backdropFilter: "blur(14px)"
      }}
    >
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", flex: "1 1 420px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--elo-text-tertiary, #6B7280)",
            fontWeight: 800,
            fontSize: ".78rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase"
          }}
        >
          <SlidersHorizontal size={15} />
          Filtros
        </span>
        {children}
      </div>
      {actions ? <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>{actions}</div> : null}
    </section>
  );
}

type DataTableColumn<Row> = {
  key: string;
  header: string;
  width?: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  sortValue?: (row: Row) => string | number;
  render: (row: Row) => ReactNode;
};

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  emptyState
}: {
  columns: Array<DataTableColumn<Row>>;
  rows: Row[];
  rowKey: (row: Row) => string;
  emptyState?: ReactNode;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const column = columns.find((item) => item.key === sortKey);
    if (!column?.sortValue) return rows;
    const sortValue = column.sortValue;

    return [...rows].sort((first, second) => {
      const a = sortValue(first);
      const b = sortValue(second);
      const result = a > b ? 1 : a < b ? -1 : 0;
      return sortDirection === "asc" ? result : -result;
    });
  }, [columns, rows, sortDirection, sortKey]);

  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div
      style={{
        overflowX: "auto",
        borderRadius: "22px",
        border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
        background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(251,252,255,0.92))",
        boxShadow: "var(--elo-elevation-1, 0 6px 18px rgba(10, 10, 10, 0.08))"
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "720px" }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  width: column.width,
                  textAlign: column.align ?? "left",
                  padding: "14px 16px",
                  borderBottom: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                  background: "rgba(249, 250, 255, 0.98)",
                  color: "var(--elo-text-tertiary, #6B7280)",
                  fontSize: ".78rem",
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase"
                }}
              >
                {column.sortable ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (sortKey === column.key) {
                        setSortDirection((previous) => (previous === "asc" ? "desc" : "asc"));
                      } else {
                        setSortKey(column.key);
                        setSortDirection("asc");
                      }
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      color: "inherit",
                      font: "inherit",
                      cursor: "pointer"
                    }}
                  >
                    {column.header}
                    {sortKey === column.key ? (
                      sortDirection === "asc" ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )
                    ) : null}
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => (
            <tr
              key={rowKey(row)}
              style={{
                background: index % 2 === 0 ? "transparent" : "rgba(247, 249, 255, 0.7)"
              }}
            >
              {columns.map((column) => (
                <td
                  key={`${rowKey(row)}-${column.key}`}
                  style={{
                    padding: "14px 16px",
                    borderBottom: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                    textAlign: column.align ?? "left",
                    verticalAlign: "top"
                  }}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EntityList({ children }: { children: ReactNode }) {
  return <div style={{ display: "grid", gap: "12px" }}>{children}</div>;
}

export function SidePanelForm({
  badge,
  title,
  description,
  children
}: {
  badge?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <aside
      style={{
        position: "sticky",
        top: "96px",
        display: "grid",
        gap: "14px",
        alignSelf: "start",
        padding: "18px",
        borderRadius: "24px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        background:
          "radial-gradient(160% 120% at 0% 0%, rgba(134, 90, 255, 0.2), rgba(134, 90, 255, 0) 38%), linear-gradient(180deg, rgba(15, 16, 23, 0.98), rgba(21, 24, 36, 0.94))",
        color: "var(--elo-text-inverse, #FFFFFF)",
        boxShadow: "0 18px 40px rgba(0, 0, 0, 0.28)"
      }}
    >
      <div style={{ display: "grid", gap: "8px" }}>
        {badge}
        <div style={{ display: "grid", gap: "6px" }}>
          <h2 style={{ margin: 0, fontSize: "1.15rem", fontFamily: "var(--elo-font-body)" }}>{title}</h2>
          {description ? (
            <p style={{ margin: 0, color: "rgba(255,255,255,0.72)", fontSize: ".94rem" }}>{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </aside>
  );
}

export function SectionTabs({
  items,
  active,
  onChange
}: {
  items: Array<{ id: string; label: string; badge?: string }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          style={{
            minHeight: "42px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            borderRadius: "999px",
            padding: "8px 12px",
            border:
              active === item.id
                ? "1px solid transparent"
                : "1px solid var(--elo-border-default, rgba(17, 17, 17, 0.12))",
            background:
              active === item.id ? "linear-gradient(135deg, var(--elo-orbit), #6F43EB)" : "rgba(255,255,255,0.7)",
            color: active === item.id ? "#FFFFFF" : "var(--elo-text-secondary, #374151)",
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          {item.label}
          {item.badge ? <span style={{ opacity: 0.8 }}>{item.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function FeedCard({
  eyebrow,
  title,
  description,
  media,
  badges,
  footer,
  style
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: ReactNode;
  media?: ReactNode;
  badges?: ReactNode;
  footer?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <article
      style={{
        display: "grid",
        gap: "14px",
        padding: "18px",
        borderRadius: "24px",
        border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
        background: "linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(250, 251, 255, 0.88))",
        boxShadow: "var(--elo-elevation-1, 0 6px 18px rgba(10, 10, 10, 0.08))",
        ...style
      }}
    >
      {media}
      <div style={{ display: "grid", gap: "10px" }}>
        {eyebrow}
        <div style={{ display: "grid", gap: "8px" }}>
          <h3
            style={{
              margin: 0,
              fontFamily: "var(--elo-font-display)",
              fontSize: "clamp(1.15rem, 5vw, 1.55rem)",
              lineHeight: 1.04
            }}
          >
            {title}
          </h3>
          {description ? (
            <div style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".97rem" }}>{description}</div>
          ) : null}
        </div>
        {badges ? <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>{badges}</div> : null}
        {footer}
      </div>
    </article>
  );
}

export function SocialStatPill({
  label,
  value,
  icon
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        minHeight: "50px",
        padding: "10px 12px",
        borderRadius: "18px",
        border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
        background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,249,255,0.84))"
      }}
    >
      {icon ? (
        <span
          style={{
            width: "28px",
            height: "28px",
            display: "grid",
            placeItems: "center",
            borderRadius: "999px",
            background: "rgba(134, 90, 255, 0.12)",
            color: "var(--elo-orbit, #865AFF)"
          }}
        >
          {icon}
        </span>
      ) : null}
      <div style={{ display: "grid", gap: "2px" }}>
        <strong style={{ fontSize: ".98rem", lineHeight: 1.1 }}>{value}</strong>
        <span style={{ color: "var(--elo-text-tertiary, #6B7280)", fontSize: ".76rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        justifyItems: "start",
        gap: "12px",
        padding: "24px",
        borderRadius: "24px",
        border: "1px dashed var(--elo-border-strong, rgba(17, 17, 17, 0.22))",
        background: "linear-gradient(180deg, rgba(255,255,255,0.86), rgba(248,250,255,0.74))"
      }}
    >
      {icon ? (
        <span
          style={{
            width: "44px",
            height: "44px",
            display: "grid",
            placeItems: "center",
            borderRadius: "999px",
            background: "rgba(134, 90, 255, 0.12)",
            color: "var(--elo-orbit, #865AFF)"
          }}
        >
          {icon}
        </span>
      ) : (
        <span
          style={{
            width: "44px",
            height: "44px",
            display: "grid",
            placeItems: "center",
            borderRadius: "999px",
            background: "rgba(134, 90, 255, 0.12)"
          }}
        >
          <Search size={18} color="var(--elo-orbit, #865AFF)" />
        </span>
      )}
      <div style={{ display: "grid", gap: "6px" }}>
        <strong style={{ fontSize: "1.04rem" }}>{title}</strong>
        <p style={{ margin: 0, color: "var(--elo-text-secondary, #374151)" }}>{description}</p>
      </div>
      {action}
    </div>
  );
}

function labelFromTone(tone: BadgeVariant) {
  if (tone === "danger") return "Urgente";
  if (tone === "warning") return "Atenção";
  if (tone === "success") return "Saudável";
  if (tone === "brand") return "Estratégico";
  if (tone === "info") return "Operacional";
  return "Contexto";
}
