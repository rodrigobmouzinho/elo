"use client";

import { ShellSessionGate } from "@elo/ui";
import { Bell, CalendarDays, Rocket, Trophy, UsersRound } from "lucide-react";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { clearStoredAuth, fetchMe, getStoredAuth } from "../lib/auth-client";
import styles from "./member-shell.module.css";

const displayFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--member-font-display"
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--member-font-body"
});

const navItems = [
  { href: "/", label: "Eventos", icon: <CalendarDays size={18} strokeWidth={2.1} /> },
  { href: "/gamificacao", label: "Pr\u00eamios", icon: <Trophy size={18} strokeWidth={2.1} /> },
  { href: "/membros", label: "Membros", icon: <UsersRound size={18} strokeWidth={2.1} /> },
  { href: "/projetos", label: "Projetos", icon: <Rocket size={18} strokeWidth={2.1} /> }
] as const;

function resolveActiveHref(pathname: string) {
  if (pathname === "/") return "/";
  if (pathname.startsWith("/eventos/")) return "/";
  if (pathname.startsWith("/gamificacao")) return "/gamificacao";
  if (pathname.startsWith("/membros")) return "/membros";
  if (pathname.startsWith("/projetos")) return "/projetos";
  return pathname;
}

function firstNameOf(value: string) {
  return value.trim().split(/\s+/)[0] || "Membro";
}

export function MemberShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [displayName, setDisplayName] = useState("Membro Elo");

  useEffect(() => {
    const stored = getStoredAuth();

    if (!stored?.session?.accessToken) {
      router.replace("/login");
      return;
    }

    fetchMe()
      .then(() => {
        setDisplayName(stored.user.displayName || "Membro Elo");
        setReady(true);
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router]);

  const activeHref = resolveActiveHref(pathname);
  const activeItem = navItems.find((item) => item.href === activeHref);
  const memberName = useMemo(() => firstNameOf(displayName), [displayName]);
  const heading = activeHref === "/" ? `Ol\u00e1, ${memberName}` : activeItem?.label ?? displayName;

  return (
    <ShellSessionGate ready={ready}>
      <div className={`${styles.shell} ${displayFont.variable} ${bodyFont.variable}`}>
        <div className={styles.auraPrimary} aria-hidden="true" />
        <div className={styles.auraSecondary} aria-hidden="true" />

        <header className={styles.topBar}>
          <div className={styles.topBarInner}>
            <div className={styles.identity}>
              <Link href="/perfil" className={styles.avatarLink} aria-label="Abrir perfil">
                <span className={styles.avatarHalo} aria-hidden="true" />
                <span className={styles.avatarCore}>
                  <span className={styles.avatarText}>{memberName.slice(0, 1).toUpperCase()}</span>
                </span>
              </Link>

              <div className={styles.headingGroup}>
                <p className={styles.eyebrow}>Elo Networking</p>
                <h1 className={styles.heading}>{heading}</h1>
              </div>
            </div>

            <div className={styles.topActions}>
              <button className={styles.iconButton} type="button" aria-label={"Notifica\u00e7\u00f5es"}>
                <Bell size={18} strokeWidth={2.1} />
              </button>
              <button
                className={styles.logoutButton}
                type="button"
                onClick={() => {
                  clearStoredAuth();
                  router.replace("/login");
                }}
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        <main className={styles.content}>{children}</main>

        <nav className={styles.bottomDock} aria-label={"Navega\u00e7\u00e3o principal"}>
          {navItems.map((item) => {
            const active = item.href === activeHref;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.icon}
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </ShellSessionGate>
  );
}
