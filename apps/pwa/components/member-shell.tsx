/* eslint-disable @next/next/no-img-element */
"use client";

import { ShellSessionGate } from "@elo/ui";
import { ArrowLeft, Bell, CalendarDays, LogOut, Rocket, Share2, Trophy, UsersRound } from "lucide-react";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AUTH_UPDATED_EVENT,
  apiRequest,
  clearStoredAuth,
  fetchMe,
  getStoredAuth
} from "../lib/auth-client";
import type { ProjectNotificationsFeed } from "../lib/project-ideas";
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

type DetailHeaderConfig = {
  title: string;
  backHref: string;
  showShareButton?: boolean;
};

type MemberShellProps = {
  children: ReactNode;
  detailHeader?: DetailHeaderConfig;
  hideBottomNav?: boolean;
};

export function MemberShell({ children, detailHeader, hideBottomNav = Boolean(detailHeader) }: MemberShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [displayName, setDisplayName] = useState("Membro Elo");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const stored = getStoredAuth();

    if (!stored?.session?.accessToken) {
      router.replace("/login");
      return;
    }

    setDisplayName(stored.user.displayName || "Membro Elo");
    setAvatarUrl(stored.user.avatarUrl ?? null);

    fetchMe()
      .then((profile) => {
        if (profile.mustChangePassword) {
          router.replace("/primeiro-acesso");
          return;
        }

        setDisplayName(profile.displayName || stored.user.displayName || "Membro Elo");
        setAvatarUrl(profile.avatarUrl ?? stored.user.avatarUrl ?? null);
        setReady(true);
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router]);

  useEffect(() => {
    function handleAuthUpdated() {
      const stored = getStoredAuth();
      setDisplayName(stored?.user.displayName || "Membro Elo");
      setAvatarUrl(stored?.user.avatarUrl ?? null);
    }

    window.addEventListener(AUTH_UPDATED_EVENT, handleAuthUpdated);

    return () => {
      window.removeEventListener(AUTH_UPDATED_EVENT, handleAuthUpdated);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    let active = true;

    async function loadNotifications() {
      try {
        const feed = await apiRequest<ProjectNotificationsFeed>("/app/notifications");
        if (!active) return;
        setUnreadNotifications(feed.unreadCount);
      } catch {
        if (!active) return;
        setUnreadNotifications(0);
      }
    }

    void loadNotifications();

    function handleNotificationsUpdated() {
      void loadNotifications();
    }

    window.addEventListener("elo-notifications-updated", handleNotificationsUpdated);

    return () => {
      active = false;
      window.removeEventListener("elo-notifications-updated", handleNotificationsUpdated);
    };
  }, [pathname, ready]);

  const activeHref = resolveActiveHref(pathname);
  const activeItem = navItems.find((item) => item.href === activeHref);
  const memberName = useMemo(() => firstNameOf(displayName), [displayName]);
  const heading = activeHref === "/" ? `Ol\u00e1, ${memberName}` : activeItem?.label ?? displayName;

  async function handleShare() {
    if (typeof window === "undefined") return;

    const payload = {
      title: detailHeader?.title ?? "Elo Networking",
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload.url);
      }
    } catch {
      // Ignore share cancellation and clipboard failures.
    }
  }

  function handlePrimaryNavigation(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (pathname === href) {
      return;
    }

    event.preventDefault();
    window.location.assign(href);
  }

  return (
    <ShellSessionGate ready={ready}>
      <div
        className={`${styles.shell} ${hideBottomNav ? styles.shellWithoutDock : ""} ${displayFont.variable} ${bodyFont.variable}`}
      >
        <div className={styles.auraPrimary} aria-hidden="true" />
        <div className={styles.auraSecondary} aria-hidden="true" />

        {detailHeader ? (
          <header className={styles.detailTopBar}>
            <div className={styles.detailTopBarInner}>
              <div className={styles.detailHeaderGroup}>
                <Link href={detailHeader.backHref} className={styles.detailIconLink} aria-label="Voltar">
                  <ArrowLeft size={18} strokeWidth={2.1} />
                </Link>

                <h1 className={styles.detailHeading}>{detailHeader.title}</h1>
              </div>

              {detailHeader.showShareButton !== false ? (
                <button
                  className={styles.detailIconButton}
                  type="button"
                  aria-label="Compartilhar"
                  onClick={() => void handleShare()}
                >
                  <Share2 size={18} strokeWidth={2.1} />
                </button>
              ) : null}
            </div>
          </header>
        ) : (
          <header className={styles.topBar}>
            <div className={styles.topBarInner}>
              <div className={styles.identity}>
                <Link href="/perfil" className={styles.avatarLink} aria-label="Abrir perfil">
                  <span className={styles.avatarHalo} aria-hidden="true" />
                  <span className={styles.avatarCore}>
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className={styles.avatarImage}
                      />
                    ) : (
                      <span className={styles.avatarText}>{memberName.slice(0, 1).toUpperCase()}</span>
                    )}
                  </span>
                </Link>

                <div className={styles.headingGroup}>
                  <p className={styles.eyebrow}>Elo Networking</p>
                  <h1 className={styles.heading}>{heading}</h1>
                </div>
              </div>

              <div className={styles.topActions}>
                <button
                  className={styles.iconButton}
                  type="button"
                  aria-label={"Notifica\u00e7\u00f5es"}
                  onClick={() => router.push("/notificacoes")}
                >
                  <Bell size={18} strokeWidth={2.1} />
                  {unreadNotifications > 0 ? (
                    <span className={styles.notificationBadge}>
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  ) : null}
                </button>
                <button
                  className={styles.iconButton}
                  type="button"
                  aria-label="Encerrar sessão"
                  onClick={() => {
                    clearStoredAuth();
                    router.replace("/login");
                  }}
                >
                  <LogOut size={18} strokeWidth={2.1} />
                </button>
              </div>
            </div>
          </header>
        )}

        <main className={styles.content}>{children}</main>

        {!hideBottomNav ? (
          <nav className={styles.bottomDock} aria-label={"Navega\u00e7\u00e3o principal"}>
            {navItems.map((item) => {
              const active = item.href === activeHref;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={(event) => handlePrimaryNavigation(event, item.href)}
                >
                  {item.icon}
                  <span className={styles.navLabel}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>
    </ShellSessionGate>
  );
}
