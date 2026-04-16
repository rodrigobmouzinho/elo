"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Gauge,
  LogOut,
  Trophy,
  UserRoundPlus,
  Users2
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { clearStoredAuth, fetchMe, getStoredAuth } from "../lib/auth-client";

const navItems = [
  { href: "/", label: "Visão geral", icon: <Gauge size={18} /> },
  { href: "/members", label: "Membros", icon: <Users2 size={18} /> },
  { href: "/adesoes", label: "Adesões", icon: <UserRoundPlus size={18} /> },
  { href: "/events", label: "Eventos", icon: <CalendarDays size={18} /> },
  { href: "/gamification", label: "Gamificação", icon: <Trophy size={18} /> },
  { href: "/financeiro", label: "Financeiro", icon: <CreditCard size={18} /> }
];

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = getStoredAuth();

    if (!stored?.session?.accessToken) {
      router.replace("/login");
      return;
    }

    fetchMe()
      .then(() => {
        setReady(true);
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router]);

  function handleLogout() {
    clearStoredAuth();
    router.replace("/login");
  }

  if (!ready) {
    return (
      <div
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          background: "#131313",
          color: "#fff"
        }}
      >
        Carregando...
      </div>
    );
  }

  const sidebarWidth = collapsed ? "72px" : "220px";
  const sidebarNavId = "admin-sidebar-nav";

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#131313"
      }}
    >
      <aside
        style={{
          display: "flex",
          flexDirection: "column",
          width: sidebarWidth,
          padding: collapsed ? "16px 12px" : "24px 16px",
          background: "#131313",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          transition: "width 200ms ease",
          overflow: "hidden",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 100
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: collapsed ? "column" : "row",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            marginBottom: "24px",
            minHeight: "56px",
            gap: collapsed ? "12px" : "0"
          }}
          >
          <Image
            src="/brand/elo-mark.png"
            alt="Elo"
            width={56}
            height={56}
            style={{
              width: collapsed ? "36px" : "56px",
              height: collapsed ? "36px" : "56px",
              objectFit: "contain",
              flexShrink: 0
            }}
          />
          <button
            type="button"
            aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            aria-expanded={!collapsed}
            aria-controls={sidebarNavId}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              border: "none",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
              flexShrink: 0
            }}
          >
            {collapsed ? (
              <ChevronRight size={16} aria-hidden="true" />
            ) : (
              <ChevronLeft size={16} aria-hidden="true" />
            )}
          </button>
        </div>

        <nav
          id={sidebarNavId}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            flex: 1
          }}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  height: "44px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
                  background: isActive ? "rgba(134, 90, 255, 0.15)" : "transparent",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  transition:
                    "background-color 140ms ease, color 140ms ease, box-shadow 140ms ease, transform 140ms ease"
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    background: isActive ? "rgba(134, 90, 255, 0.2)" : "rgba(255,255,255,0.06)",
                    flexShrink: 0
                  }}
                >
                  {item.icon}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          aria-label="Sair da conta"
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            height: "44px",
            padding: "0 12px",
            borderRadius: "8px",
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.5)",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
            marginTop: "auto",
            whiteSpace: "nowrap",
            overflow: "hidden"
          }}
        >
          <LogOut size={18} aria-hidden="true" />
          {!collapsed && <span>Sair</span>}
        </button>
      </aside>

      <main
        style={{
          flex: 1,
          padding: "24px",
          overflowY: "auto",
          marginLeft: sidebarWidth,
          transition: "margin-left 200ms ease"
        }}
      >
        {children}
      </main>
    </div>
  );
}
