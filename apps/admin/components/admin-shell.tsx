"use client";

import {
  CalendarDays,
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
  { href: "/", label: "Visão geral", icon: <Gauge size={20} /> },
  { href: "/members", label: "Membros", icon: <Users2 size={20} /> },
  { href: "/adesoes", label: "Adesões", icon: <UserRoundPlus size={20} /> },
  { href: "/events", label: "Eventos", icon: <CalendarDays size={20} /> },
  { href: "/gamification", label: "Gamificação", icon: <Trophy size={20} /> },
  { href: "/financeiro", label: "Financeiro", icon: <CreditCard size={20} /> }
];

const styles = {
  container: {
    display: "grid",
    gridTemplateColumns: "240px 1fr",
    minHeight: "100vh",
    background: "#131313"
  } as React.CSSProperties,
  sidebar: {
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
    gap: "24px",
    padding: "24px 16px",
    background: "#131313",
    borderRight: "1px solid rgba(255,255,255,0.06)"
  } as React.CSSProperties,
  logo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px"
  } as React.CSSProperties,
  logoImg: {
    width: "48px",
    height: "48px",
    objectFit: "contain"
  } as React.CSSProperties,
  nav: {
    display: "grid",
    gap: "4px"
  } as React.CSSProperties,
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 14px",
    borderRadius: "10px",
    color: "rgba(255,255,255,0.72)",
    textDecoration: "none",
    fontSize: "0.94rem",
    fontWeight: 600,
    transition: "all 140ms ease"
  } as React.CSSProperties,
  navLinkActive: {
    background: "rgba(134, 90, 255, 0.15)",
    color: "#ffffff"
  } as React.CSSProperties,
  navIcon: {
    display: "grid",
    placeItems: "center",
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.06)",
    flexShrink: 0
  } as React.CSSProperties,
  logout: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 14px",
    borderRadius: "10px",
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.5)",
    fontSize: "0.94rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "color 140ms ease"
  } as React.CSSProperties,
  main: {
    padding: "24px 32px",
    overflowY: "auto" as const
  }
};

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

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

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <Image
            src="/brand/elo-mark.png"
            alt="Elo"
            width={64}
            height={64}
            style={styles.logoImg}
          />
        </div>

        <nav style={styles.nav}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  ...styles.navLink,
                  ...(isActive ? styles.navLinkActive : {})
                }}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button onClick={handleLogout} style={styles.logout}>
          <LogOut size={20} />
          Sair
        </button>
      </aside>

      <main style={styles.main}>{children}</main>
    </div>
  );
}
