"use client";

import { AdminWorkspaceShell, ShellSessionGate } from "@elo/ui";
import { CalendarDays, CreditCard, Gauge, Trophy, UserRoundPlus, Users2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { clearStoredAuth, fetchMe, getStoredAuth } from "../lib/auth-client";

const items = [
  { href: "/", label: "Dashboard", icon: <Gauge size={16} /> },
  { href: "/members", label: "Membros", icon: <Users2 size={16} /> },
  { href: "/adesoes", label: "Adesoes", icon: <UserRoundPlus size={16} /> },
  { href: "/events", label: "Eventos", icon: <CalendarDays size={16} /> },
  { href: "/gamification", label: "Gamificação", icon: <Trophy size={16} /> },
  { href: "/financeiro", label: "Financeiro", icon: <CreditCard size={16} /> }
];

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [displayName, setDisplayName] = useState("Admin Elo");

  useEffect(() => {
    const stored = getStoredAuth();

    if (!stored?.session?.accessToken) {
      router.replace("/login");
      return;
    }

    fetchMe()
      .then(() => {
        setDisplayName(stored.user.displayName || "Admin Elo");
        setReady(true);
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router]);

  return (
    <ShellSessionGate ready={ready}>
      <AdminWorkspaceShell
        displayName={displayName}
        navItems={items}
        activeHref={pathname}
        onLogout={() => {
          clearStoredAuth();
          router.replace("/login");
        }}
        renderNavItem={({ item, style, active }) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              ...style,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
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
                  background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"
                }}
              >
                {item.icon}
              </span>
              <span style={{ fontWeight: 700, letterSpacing: "0.01em" }}>{item.label}</span>
            </span>
          </Link>
        )}
      >
        {children}
      </AdminWorkspaceShell>
    </ShellSessionGate>
  );
}
