"use client";

import { Bell, ChevronRight, LogOut } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { Badge } from "./form-primitives";
import { LogoMark, LogoWordmark } from "./logo";

export type ShellNavItem = {
  readonly href: string;
  readonly label: string;
  readonly shortLabel?: string;
  readonly icon?: ReactNode;
  readonly badge?: string;
  readonly section?: string;
  readonly mobileOnly?: boolean;
  readonly desktopOnly?: boolean;
};

type RenderNavItemArgs = {
  item: ShellNavItem;
  active: boolean;
  style: CSSProperties;
  compact: boolean;
};

export type ShellRenderNavItem = (args: RenderNavItemArgs) => ReactNode;

function useMinWidth(minWidth: number) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${minWidth}px)`);
    const update = () => setMatches(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [minWidth]);

  return matches;
}

export function ShellSessionGate({ ready, children }: { ready: boolean; children: ReactNode }) {
  if (!ready) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "var(--elo-space-6, 24px)",
          color: "var(--elo-text-secondary, #374151)"
        }}
      >
        Validando sessão...
      </main>
    );
  }

  return <>{children}</>;
}

export function getShellNavItemStyle(active: boolean, compact = false): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: compact ? "center" : "space-between",
    gap: compact ? "8px" : "10px",
    minHeight: compact ? "58px" : "48px",
    textAlign: compact ? "center" : "left",
    padding: compact ? "10px 8px" : "11px 13px",
    borderRadius: compact ? "18px" : "16px",
    border: active ? "1px solid rgba(134, 90, 255, 0.2)" : "1px solid transparent",
    background: active ? "rgba(134, 90, 255, 0.12)" : "transparent",
    color: active ? "var(--elo-text-primary, #111111)" : "inherit",
    fontWeight: 700,
    fontSize: compact ? ".8rem" : ".92rem",
    boxShadow: active ? "inset 0 0 0 1px rgba(134, 90, 255, 0.08)" : "none",
    transition:
      "background-color var(--elo-motion-fast, 140ms) ease, color var(--elo-motion-fast, 140ms) ease, border-color var(--elo-motion-fast, 140ms) ease, transform var(--elo-motion-fast, 140ms) ease"
  };
}

function renderShellNavItem(
  item: ShellNavItem,
  active: boolean,
  compact: boolean,
  renderItem?: ShellRenderNavItem
) {
  const style = getShellNavItemStyle(active, compact);

  if (renderItem) {
    return renderItem({ item, active, style, compact });
  }

  return (
    <a key={item.href} href={item.href} style={style}>
      {item.label}
    </a>
  );
}

type AdminNavigationShellProps = {
  children: ReactNode;
  displayName: string;
  navItems: ReadonlyArray<ShellNavItem>;
  activeHref: string;
  onLogout: () => void;
  renderNavItem?: ShellRenderNavItem;
};

export function AdminWorkspaceShell({
  children,
  displayName,
  navItems,
  activeHref,
  onLogout,
  renderNavItem
}: AdminNavigationShellProps) {
  const activeItem = navItems.find((item) => item.href === activeHref);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "304px minmax(0, 1fr)",
        background:
          "radial-gradient(980px 460px at 0% 0%, rgba(134, 90, 255, 0.16), transparent 56%), radial-gradient(540px 300px at 100% 0%, rgba(17, 19, 24, 0.08), transparent 65%), linear-gradient(180deg, #F8FAFF 0%, var(--elo-surface-canvas, #F0F5FF) 100%)"
      }}
    >
      <aside
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          padding: "20px 18px",
          display: "grid",
          gridTemplateRows: "auto auto 1fr auto",
          gap: "18px",
          color: "rgba(255, 255, 255, 0.88)",
          background:
            "radial-gradient(460px 220px at 0% 0%, rgba(134, 90, 255, 0.16), transparent 52%), linear-gradient(180deg, #090A10 0%, var(--elo-rail, #0D0E14) 100%)",
          borderRight: "1px solid rgba(255, 255, 255, 0.08)"
        }}
      >
        <div style={{ display: "grid", gap: "14px" }}>
          <LogoWordmark
            plated
            size="md"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "16px 18px",
              borderRadius: "20px",
              background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,247,255,0.9))"
            }}
          />
          <div style={{ display: "grid", gap: "5px" }}>
            <small
              style={{
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "0.08em",
                textTransform: "uppercase"
              }}
            >
              Admin control
            </small>
            <strong style={{ fontSize: "1.04rem", color: "#FFFFFF" }}>{displayName}</strong>
            <span style={{ color: "rgba(255,255,255,0.66)", fontSize: ".9rem", lineHeight: 1.55 }}>
              Operação, aprovação financeira e ritmo da comunidade em uma única vista.
            </span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: "10px",
            padding: "14px",
            borderRadius: "18px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
              <LogoMark size="sm" />
              <span style={{ display: "grid", gap: "2px" }}>
                <strong style={{ color: "#FFFFFF", fontSize: ".95rem" }}>Workspace ativo</strong>
                <span style={{ color: "rgba(255,255,255,0.56)", fontSize: ".82rem" }}>Fila executiva em foco</span>
              </span>
            </span>
            <Bell size={16} />
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Badge variant="brand">Elo Ops</Badge>
            <Badge variant="neutral">{activeItem?.label ?? "Painel"}</Badge>
          </div>
        </div>

        <nav style={{ display: "grid", gap: "8px", alignContent: "start" }}>
          <small
            style={{
              color: "rgba(255,255,255,0.48)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "0 10px"
            }}
          >
            Navegação
          </small>
          {navItems.map((item) =>
            item.mobileOnly ? null : (
              <div key={item.href}>
                {renderNavItem ? (
                  renderNavItem({
                    item,
                    active: activeHref === item.href,
                    style: {
                      ...getShellNavItemStyle(activeHref === item.href, false),
                      color: activeHref === item.href ? "#FFFFFF" : "rgba(255,255,255,0.74)",
                      background:
                        activeHref === item.href
                          ? "linear-gradient(135deg, rgba(134, 90, 255, 0.22), rgba(134, 90, 255, 0.1))"
                          : "transparent"
                    },
                    compact: false
                  })
                ) : (
                  <a
                    href={item.href}
                    style={{
                      ...getShellNavItemStyle(activeHref === item.href, false),
                      color: activeHref === item.href ? "#FFFFFF" : "rgba(255,255,255,0.74)",
                      background:
                        activeHref === item.href
                          ? "linear-gradient(135deg, rgba(134, 90, 255, 0.22), rgba(134, 90, 255, 0.1))"
                          : "transparent"
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                      <span
                        style={{
                          width: "30px",
                          height: "30px",
                          display: "grid",
                          placeItems: "center",
                          borderRadius: "999px",
                          background:
                            activeHref === item.href ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"
                        }}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </span>
                    {item.badge ? <Badge variant="brand">{item.badge}</Badge> : null}
                  </a>
                )}
              </div>
            )
          )}
        </nav>

        <div
          style={{
            display: "grid",
            gap: "12px",
            padding: "16px",
            borderRadius: "18px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)"
          }}
        >
          <div style={{ display: "grid", gap: "4px" }}>
            <span
              style={{
                color: "rgba(255,255,255,0.58)",
                fontSize: ".78rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em"
              }}
            >
              Workspace
            </span>
            <strong style={{ color: "#FFFFFF" }}>Elo Networking</strong>
            <span style={{ color: "rgba(255,255,255,0.56)", fontSize: ".84rem" }}>Uma operação por vez, sem perder contexto.</span>
          </div>
          <button
            type="button"
            onClick={onLogout}
            style={{
              minHeight: "44px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "#FFFFFF",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      <main style={{ minWidth: 0 }}>
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            padding: "16px 24px",
            backdropFilter: "blur(18px)",
            background: "rgba(248, 250, 255, 0.78)",
            borderBottom: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))"
          }}
        >
          <div style={{ display: "grid", gap: "6px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--elo-text-tertiary, #6B7280)" }}>
              <span style={{ fontWeight: 800, color: "var(--elo-text-secondary, #374151)" }}>Elo Ops</span>
              <ChevronRight size={14} />
              <span>{activeItem?.label ?? "Painel"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <strong style={{ fontSize: "1rem", color: "var(--elo-text-primary, #111111)" }}>
                {activeItem?.label ?? "Workspace"}
              </strong>
              <Badge variant="info">Foco operacional</Badge>
            </div>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                display: "grid",
                gap: "3px",
                padding: "8px 12px",
                borderRadius: "14px",
                border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                background: "rgba(255,255,255,0.72)"
              }}
            >
              <span style={{ fontSize: ".72rem", color: "var(--elo-text-tertiary, #6B7280)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Sessão
              </span>
              <span style={{ fontWeight: 700, color: "var(--elo-text-secondary, #374151)" }}>{displayName}</span>
            </div>
            <span
              style={{
                width: "42px",
                height: "42px",
                display: "grid",
                placeItems: "center",
                borderRadius: "999px",
                background: "rgba(134, 90, 255, 0.14)",
                color: "var(--elo-orbit, #865AFF)",
                fontWeight: 800
              }}
            >
              {displayName.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <div style={{ width: "100%", maxWidth: "1520px", padding: "22px 24px 30px", margin: "0 auto" }}>{children}</div>
      </main>
    </div>
  );
}

type MemberNavigationShellProps = {
  children: ReactNode;
  displayName: string;
  profileAction?: ReactNode;
  navItems: ReadonlyArray<ShellNavItem>;
  activeHref: string;
  onLogout: () => void;
  renderNavItem?: ShellRenderNavItem;
};

export function MemberAppShell({
  children,
  displayName,
  profileAction,
  navItems,
  activeHref,
  onLogout,
  renderNavItem
}: MemberNavigationShellProps) {
  const isDesktop = useMinWidth(1100);
  const activeItem = navItems.find((item) => item.href === activeHref);
  const desktopItems = navItems.filter((item) => !item.mobileOnly);
  const mobileItems = navItems.filter((item) => !item.desktopOnly);

  if (isDesktop) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          gridTemplateColumns: "110px minmax(0, 1fr)",
          background:
            "radial-gradient(50% 60% at 0% 0%, rgba(134, 90, 255, 0.18), rgba(134, 90, 255, 0) 60%), radial-gradient(40% 34% at 100% 0%, rgba(134, 90, 255, 0.1), rgba(134, 90, 255, 0) 72%), linear-gradient(180deg, #FAF7FF 0%, var(--elo-surface-canvas, #F0F5FF) 64%, #EEF4FF 100%)"
        }}
      >
        <aside
          style={{
            position: "sticky",
            top: 0,
            height: "100vh",
            padding: "18px 14px",
            display: "grid",
            gridTemplateRows: "auto 1fr auto",
            gap: "20px",
            borderRight: "1px solid rgba(17, 17, 17, 0.06)",
            background: "rgba(255,255,255,0.58)",
            backdropFilter: "blur(18px)"
          }}
        >
          <div style={{ display: "grid", justifyItems: "center", gap: "10px" }}>
            <span
              style={{
                width: "56px",
                height: "56px",
                display: "grid",
                placeItems: "center",
                borderRadius: "18px",
                background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(240,243,255,0.94))",
                border: "1px solid rgba(134, 90, 255, 0.14)",
                boxShadow: "0 16px 36px rgba(134, 90, 255, 0.12)"
              }}
            >
              <LogoMark size="md" />
            </span>
            <small
              style={{
                fontWeight: 800,
                letterSpacing: "0.18em",
                color: "var(--elo-text-tertiary, #6B7280)",
                textTransform: "uppercase"
              }}
            >
              Elo
            </small>
          </div>

          <nav style={{ display: "grid", gap: "10px", alignContent: "start" }}>
            {desktopItems.map((item) => renderShellNavItem(item, activeHref === item.href, true, renderNavItem))}
          </nav>

          <div style={{ display: "grid", gap: "10px", justifyItems: "center" }}>
            {profileAction}
            <button
              type="button"
              onClick={onLogout}
              aria-label="Sair"
              style={{
                width: "44px",
                height: "44px",
                display: "grid",
                placeItems: "center",
                borderRadius: "14px",
                border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                background: "rgba(255,255,255,0.76)",
                color: "var(--elo-text-secondary, #374151)",
                cursor: "pointer"
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </aside>

        <div style={{ minWidth: 0 }}>
          <header
            style={{
              position: "sticky",
              top: 0,
              zIndex: 5,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              padding: "16px 24px",
              borderBottom: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
              background: "rgba(250, 247, 255, 0.76)",
              backdropFilter: "blur(20px)"
            }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: "16px" }}>
              <LogoWordmark size="sm" />
              <div style={{ display: "grid", gap: "3px" }}>
                <small style={{ color: "var(--elo-text-tertiary, #6B7280)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Rede Elo
                </small>
                <strong style={{ color: "var(--elo-text-primary, #111111)" }}>{activeItem?.label ?? "Comunidade"}</strong>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Badge variant="brand">Feed social</Badge>
              <span
                style={{
                  padding: "10px 12px",
                  borderRadius: "14px",
                  border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                  background: "rgba(255,255,255,0.7)",
                  color: "var(--elo-text-secondary, #374151)",
                  fontWeight: 700
                }}
              >
                {displayName}
              </span>
            </div>
          </header>

          <main style={{ width: "100%", maxWidth: "1180px", padding: "26px 30px 42px", margin: "0 auto" }}>{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        paddingBottom: "126px",
        background:
          "radial-gradient(74% 54% at 18% 0%, rgba(134, 90, 255, 0.18), rgba(134, 90, 255, 0) 62%), radial-gradient(44% 36% at 100% 0%, rgba(134, 90, 255, 0.12), rgba(134, 90, 255, 0) 70%), linear-gradient(180deg, #FAF7FF 0%, var(--elo-surface-canvas, #F0F5FF) 70%, #EEF4FF 100%)"
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: "rgba(250, 247, 255, 0.84)",
          borderBottom: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
          backdropFilter: "blur(18px)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          padding: "12px 16px"
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <LogoWordmark size="sm" />
          <div style={{ display: "grid", gap: "2px", minWidth: 0 }}>
            <small
              style={{
                color: "var(--elo-text-tertiary, #6B7280)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              {activeItem?.label ?? "Comunidade"}
            </small>
            <p
              style={{
                margin: 0,
                fontWeight: 800,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              {displayName}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {profileAction}
          <button
            type="button"
            onClick={onLogout}
            style={{
              minHeight: "40px",
              display: "grid",
              placeItems: "center",
              borderRadius: "12px",
              border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
              background: "rgba(255,255,255,0.88)",
              color: "var(--elo-text-secondary, #374151)",
              padding: "0 12px",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Sair
          </button>
        </div>
      </header>

      <main style={{ padding: "16px", maxWidth: "860px", margin: "0 auto" }}>{children}</main>

      <nav
        style={{
          position: "fixed",
          left: "50%",
          bottom: "14px",
          transform: "translateX(-50%)",
          width: "min(720px, calc(100% - 24px))",
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(mobileItems.length, 1)}, minmax(0, 1fr))`,
          gap: "8px",
          borderRadius: "26px",
          border: "1px solid rgba(255, 255, 255, 0.44)",
          background: "var(--elo-dock, rgba(255,255,255,0.86))",
          boxShadow: "0 18px 36px rgba(18, 16, 30, 0.16)",
          backdropFilter: "blur(22px)",
          padding: "8px"
        }}
      >
        {mobileItems.map((item) => renderShellNavItem(item, activeHref === item.href, true, renderNavItem))}
      </nav>
    </div>
  );
}

export const AdminNavigationShell = AdminWorkspaceShell;
export const MemberNavigationShell = MemberAppShell;
