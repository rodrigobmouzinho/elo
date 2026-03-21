"use client";

import { MemberAppShell, ShellSessionGate } from "@elo/ui";
import { Compass, Sparkles, Trophy, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { clearStoredAuth, fetchMe, getStoredAuth } from "../lib/auth-client";

const items = [
  { href: "/", label: "Descobrir", shortLabel: "Home", icon: <Compass size={18} /> },
  { href: "/membros", label: "Pessoas", shortLabel: "Pessoas", icon: <UsersRound size={18} /> },
  { href: "/projetos", label: "Projetos", shortLabel: "Projetos", icon: <Sparkles size={18} /> },
  { href: "/gamificacao", label: "Ranking", shortLabel: "Ranking", icon: <Trophy size={18} /> },
  { href: "/perfil", label: "Perfil", shortLabel: "Perfil", icon: <UserRound size={18} />, desktopOnly: true }
];

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

  return (
    <ShellSessionGate ready={ready}>
      <MemberAppShell
        displayName={displayName}
        navItems={items}
        activeHref={pathname}
        profileAction={
          <Link
            href="/perfil"
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "999px",
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, rgba(134, 90, 255, 0.18), rgba(134, 90, 255, 0.28))",
              color: "var(--elo-orbit, #865AFF)",
              fontWeight: 700,
              border: "1px solid rgba(134, 90, 255, 0.22)"
            }}
          >
            {displayName.slice(0, 1).toUpperCase()}
          </Link>
        }
        onLogout={() => {
          clearStoredAuth();
          router.replace("/login");
        }}
        renderNavItem={({ item, style, compact, active }) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              ...style,
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: compact ? "6px" : "8px",
              color: active ? "var(--elo-orbit, #865AFF)" : "var(--elo-text-secondary, #374151)"
            }}
          >
            <span
              style={{
                width: compact ? "30px" : "34px",
                height: compact ? "30px" : "34px",
                display: "grid",
                placeItems: "center",
                borderRadius: "999px",
                background: active ? "rgba(134, 90, 255, 0.14)" : "rgba(17, 19, 24, 0.05)"
              }}
            >
              {item.icon}
            </span>
            <span
              style={{
                fontSize: compact ? ".72rem" : ".78rem",
                fontWeight: 800,
                letterSpacing: "0.01em"
              }}
            >
              {item.shortLabel ?? item.label}
            </span>
          </Link>
        )}
      >
        {children}
      </MemberAppShell>
    </ShellSessionGate>
  );
}
