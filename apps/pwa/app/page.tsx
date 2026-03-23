"use client";

import { passthroughImageLoader } from "@elo/ui";
import { CalendarDays, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MemberShell } from "../components/member-shell";
import { apiRequest } from "../lib/auth-client";
import styles from "./page.module.css";

type EventItem = {
  id: string;
  title: string;
  summary: string;
  startsAt: string;
  location: string;
  onlineUrl?: string;
  accessType: "free_members" | "paid_members" | "public_with_member_discount";
  priceCents?: number;
  heroImageUrl?: string;
  galleryImageUrls?: string[];
};

type MemberPreview = {
  id: string;
  fullName: string;
  city: string;
  state: string;
  area: string;
  whatsapp: string;
};

type FeedbackTone = "danger" | "info";

type FeedbackState = {
  title: string;
  description: string;
  tone: FeedbackTone;
};

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "N\u00e3o foi poss\u00edvel conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatCardDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Em breve";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short"
  })
    .format(date)
    .replace(".", "")
    .toUpperCase();
}

function getUpcomingEvents(events: EventItem[]) {
  const ordered = [...events].sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
  const threshold = Date.now() - 6 * 60 * 60 * 1000;
  const upcoming = ordered.filter((event) => new Date(event.startsAt).getTime() >= threshold);
  return upcoming.length > 0 ? upcoming : ordered;
}

function rotateMembers(members: MemberPreview[], index: number, total: number) {
  if (members.length === 0) return [];

  return Array.from({ length: Math.min(total, members.length) }, (_, offset) => members[(index + offset) % members.length]);
}

export default function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [members, setMembers] = useState<MemberPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  useEffect(() => {
    let active = true;

    async function loadHome() {
      setLoading(true);
      setFeedback(null);

      const [eventsResult, membersResult] = await Promise.allSettled([
        apiRequest<EventItem[]>("/app/events"),
        apiRequest<MemberPreview[]>("/app/members")
      ]);

      if (!active) {
        return;
      }

      if (eventsResult.status === "fulfilled") {
        setEvents(eventsResult.value);
      } else {
        setFeedback({
          title: "Falha ao carregar os eventos",
          description: normalizeApiError(eventsResult.reason instanceof Error ? eventsResult.reason.message : String(eventsResult.reason)),
          tone: "danger"
        });
      }

      if (membersResult.status === "fulfilled") {
        setMembers(membersResult.value);
      } else if (eventsResult.status === "fulfilled") {
        setFeedback({
          title: "Eventos prontos, \u00f3rbita pendente",
          description: "A agenda est\u00e1 dispon\u00edvel, mas a lista de membros ativos ainda est\u00e1 sincronizando.",
          tone: "info"
        });
      }

      setLoading(false);
    }

    void loadHome();

    return () => {
      active = false;
    };
  }, []);

  const upcomingEvents = useMemo(() => getUpcomingEvents(events), [events]);
  const featuredEvent = upcomingEvents[0] ?? null;
  const listEvents = featuredEvent ? upcomingEvents.slice(1, 3) : upcomingEvents.slice(0, 2);
  const orbitMembers = members.slice(0, 5);

  return (
    <MemberShell>
      <div className={styles.page}>
        {feedback ? (
          <section
            className={`${styles.feedbackCard} ${feedback.tone === "danger" ? styles.feedbackDanger : styles.feedbackInfo}`}
            role={feedback.tone === "danger" ? "alert" : "status"}
            aria-live="polite"
          >
            <h2 className={styles.feedbackTitle}>{feedback.title}</h2>
            <p className={styles.feedbackText}>{feedback.description}</p>
          </section>
        ) : null}

        {featuredEvent ? (
          <Link href={`/eventos/${featuredEvent.id}`} className={styles.heroLink}>
            <div className={styles.heroMedia}>
              <Image
                loader={passthroughImageLoader}
                unoptimized
                fill
                priority
                sizes="(max-width: 900px) 100vw, 42rem"
                src={featuredEvent.heroImageUrl ?? "/event-placeholder.svg"}
                alt={`Imagem do evento ${featuredEvent.title}`}
                className={styles.heroImage}
              />
              <div className={styles.heroOverlay} aria-hidden="true" />
            </div>

            <div className={styles.heroContent}>
              <span className={styles.heroBadge}>Destaque Executivo</span>
              <h2 className={styles.heroTitle}>{featuredEvent.title}</h2>
              <p className={styles.heroSummary}>{featuredEvent.summary}</p>
              <div className={styles.heroMeta}>
                <span className={styles.heroMetaItem}>
                  <CalendarDays size={14} strokeWidth={2.1} />
                  {formatCardDate(featuredEvent.startsAt)}
                </span>
                <span className={styles.heroMetaItem}>
                  <MapPin size={14} strokeWidth={2.1} />
                  {featuredEvent.location}
                </span>
              </div>
            </div>
          </Link>
        ) : (
          <section className={styles.heroFallback}>
            <div className={styles.heroGlow} aria-hidden="true" />
            <div className={styles.heroContent}>
              <span className={styles.heroBadge}>Curadoria Elo</span>
              <h2 className={styles.heroTitle}>{"Pr\u00f3ximos encontros em prepara\u00e7\u00e3o"}</h2>
              <p className={styles.heroSummary}>
                Assim que novos eventos forem publicados, esta vitrine passa a destacar o encontro mais importante do momento.
              </p>
            </div>
          </section>
        )}

        <section className={styles.section} id="event-list">
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionEyebrow}>Curadoria</span>
              <h3 className={styles.sectionTitle}>{"Pr\u00f3ximos Eventos"}</h3>
            </div>
            {listEvents.length > 0 ? (
              <a href="#event-list" className={styles.sectionAction}>
                Ver tudo
              </a>
            ) : null}
          </div>

          {listEvents.length > 0 ? (
            <div className={styles.eventsGrid}>
              {listEvents.map((event, index) => {
                const attendeeGroup = rotateMembers(members, index, 3);

                return (
                  <Link key={event.id} href={`/eventos/${event.id}`} className={styles.eventCard}>
                    <div className={styles.eventMedia}>
                      <Image
                        loader={passthroughImageLoader}
                        unoptimized
                        fill
                        sizes="(max-width: 768px) 100vw, 22rem"
                        src={event.heroImageUrl ?? "/event-placeholder.svg"}
                        alt={`Imagem do evento ${event.title}`}
                        className={styles.eventImage}
                      />
                      {index === 0 ? <span className={styles.eventLimitBadge}>Vagas Limitadas</span> : null}
                    </div>

                    <div className={styles.eventBody}>
                      <h4 className={styles.eventTitle}>{event.title}</h4>
                      <p className={styles.eventSummary}>{event.summary}</p>

                      <div className={styles.eventFooter}>
                        <div className={styles.attendees} aria-hidden="true">
                          {attendeeGroup.map((member) => (
                            <span key={`${event.id}-${member.id}`} className={styles.attendee}>
                              {initials(member.fullName)}
                            </span>
                          ))}
                          {members.length > attendeeGroup.length ? (
                            <span className={styles.attendeeMore}>+{members.length - attendeeGroup.length}</span>
                          ) : null}
                        </div>
                        <span className={styles.eventMeta}>{`${formatCardDate(event.startsAt)} \u2022 ${event.location}`}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <section className={styles.emptyCard}>
              <h4 className={styles.emptyTitle}>{loading ? "Carregando agenda" : "Nenhum evento dispon\u00edvel"}</h4>
              <p className={styles.emptyText}>
                {loading
                  ? "Estamos montando a curadoria de pr\u00f3ximos encontros para voc\u00ea."
                  : "Assim que a equipe publicar novos encontros, eles aparecer\u00e3o aqui para valida\u00e7\u00e3o e confirma\u00e7\u00e3o."}
              </p>
            </section>
          )}
        </section>

        <section className={styles.section} id="orbit">
          <h3 className={styles.orbitTitle}>{"\u00d3rbita Ativa"}</h3>

          {orbitMembers.length > 0 ? (
            <div className={styles.orbitRow}>
              {orbitMembers.map((member, index) => (
                <Link
                  key={member.id}
                  href="/membros"
                  className={`${styles.orbitMember} ${index === 0 ? styles.orbitActive : ""}`}
                >
                  <div className={styles.orbitAvatarShell}>
                    <span className={styles.orbitRing} aria-hidden="true" />
                    <span className={styles.orbitGlow} aria-hidden="true" />
                    <span className={styles.orbitAvatar}>{initials(member.fullName)}</span>
                  </div>
                  <div>
                    <p className={styles.orbitName}>{member.fullName}</p>
                    <p className={styles.orbitRole}>{member.area}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <section className={styles.emptyCard}>
              <h4 className={styles.emptyTitle}>{loading ? "Sincronizando membros" : "\u00d3rbita em aquecimento"}</h4>
              <p className={styles.emptyText}>
                {loading
                  ? "A comunidade ativa est\u00e1 chegando para compor a \u00f3rbita desta tela."
                  : "Quando mais membros estiverem ativos, esta faixa passa a destacar quem est\u00e1 movimentando a rede."}
              </p>
            </section>
          )}
        </section>
      </div>
    </MemberShell>
  );
}
