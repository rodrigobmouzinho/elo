"use client";

import Image from "next/image";
import { Alert, Badge, Button, EmptyState, FeedCard, LogoMark, SocialStatPill, passthroughImageLoader } from "@elo/ui";
import type { AlertVariant, BadgeVariant } from "@elo/ui";
import { ArrowRight, CalendarDays, Crown, Ticket, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MemberShell } from "../components/member-shell";
import { apiRequest, getStoredAuth } from "../lib/auth-client";

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

type RankingEntry = {
  memberId: string;
  name: string;
  points: number;
  rank: number;
  medals: string[];
};

type FeedbackState = {
  title: string;
  description: string;
  variant: AlertVariant;
};

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "Não foi possível conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  }).format(cents / 100);
}

function getAccessLabel(accessType: EventItem["accessType"]) {
  if (accessType === "free_members") return "Gratuito para membros";
  if (accessType === "paid_members") return "Pago para membros";
  return "Público com desconto para membros";
}

function getAccessVariant(accessType: EventItem["accessType"]): BadgeVariant {
  if (accessType === "free_members") return "info";
  if (accessType === "paid_members") return "brand";
  return "warning";
}

function getEventTimingState(startsAt: string): { label: string; variant: BadgeVariant } {
  const startsAtMs = new Date(startsAt).getTime();
  const now = Date.now();

  if (startsAtMs > now) {
    return { label: "Programado", variant: "info" };
  }

  const sixHoursMs = 6 * 60 * 60 * 1000;
  if (now - startsAtMs <= sixHoursMs) {
    return { label: "Acontecendo", variant: "success" };
  }

  return { label: "Encerrado", variant: "neutral" };
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [members, setMembers] = useState<MemberPreview[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [season, setSeason] = useState("Temporada Elo");
  const [loadingHome, setLoadingHome] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);

  useEffect(() => {
    const auth = getStoredAuth();
    setMemberId(auth?.user.memberId ?? null);

    async function loadHome() {
      setLoadingHome(true);
      setFeedback(null);

      const [eventsResult, membersResult, rankingResult] = await Promise.allSettled([
        apiRequest<EventItem[]>("/app/events"),
        apiRequest<MemberPreview[]>("/app/members"),
        apiRequest<{ season: string; ranking: RankingEntry[] }>("/app/gamification/ranking")
      ]);

      if (eventsResult.status === "fulfilled") {
        setEvents(eventsResult.value);
      } else {
        setFeedback({
          title: "Falha ao carregar a agenda",
          description: normalizeApiError(eventsResult.reason instanceof Error ? eventsResult.reason.message : String(eventsResult.reason)),
          variant: "danger"
        });
      }

      if (membersResult.status === "fulfilled") {
        setMembers(membersResult.value.slice(0, 6));
      }

      if (rankingResult.status === "fulfilled") {
        setSeason(rankingResult.value.season);
        setRanking(rankingResult.value.ranking);
      }

      setLoadingHome(false);
    }

    void loadHome();
  }, []);

  const featuredEvent = events[0] ?? null;
  const featuredTiming = featuredEvent ? getEventTimingState(featuredEvent.startsAt) : null;
  const currentMemberRanking = useMemo(
    () => (memberId ? ranking.find((entry) => entry.memberId === memberId) ?? null : null),
    [memberId, ranking]
  );

  const dashboard = useMemo(() => {
    const paid = events.filter((event) => event.accessType !== "free_members").length;
    const online = events.filter((event) => Boolean(event.onlineUrl)).length;

    return {
      total: events.length,
      paid,
      online,
      members: members.length,
      leader: ranking[0]?.name ?? "Comunidade em aquecimento"
    };
  }, [events, members.length, ranking]);

  return (
    <MemberShell>
      <div style={{ display: "grid", gap: "18px" }}>
        <section
          style={{
            display: "grid",
            gap: "18px",
            padding: "20px",
            borderRadius: "30px",
            border: "1px solid rgba(134, 90, 255, 0.12)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.8)), radial-gradient(80% 80% at 0% 0%, rgba(134, 90, 255, 0.18), transparent 52%)",
            boxShadow: "0 18px 44px rgba(76, 59, 120, 0.1)"
          }}
        >
          <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}>
            <div style={{ display: "grid", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: "10px", maxWidth: "620px" }}>
                  <Badge variant="brand" style={{ justifySelf: "start" }}>
                    Hoje na Elo
                  </Badge>
                  <h1 style={{ margin: 0, fontSize: "clamp(2rem, 6vw, 3.8rem)", lineHeight: 0.94 }}>
                    Descubra o próximo elo entre pessoas, eventos e reputação.
                  </h1>
                  <p style={{ margin: 0, color: "var(--elo-text-secondary, #374151)", maxWidth: "54ch", lineHeight: 1.7 }}>
                    A Elo agora abre como um hub social de networking: você entende o que está acontecendo, quem conhecer e qual ação vale agora em poucos segundos.
                  </p>
                </div>
                <LogoMark size="lg" />
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <SocialStatPill label="eventos no radar" value={dashboard.total.toLocaleString("pt-BR")} icon={<CalendarDays size={16} />} />
                <SocialStatPill label="membros para conhecer" value={dashboard.members.toLocaleString("pt-BR")} icon={<UsersRound size={16} />} />
                <SocialStatPill label="temporada ativa" value={season} icon={<Trophy size={16} />} />
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Link href="/membros">
                  <Button>Explorar pessoas</Button>
                </Link>
                <Link href="/gamificacao">
                  <Button variant="secondary">Ver pulso da temporada</Button>
                </Link>
              </div>
              <div
                style={{
                  display: "grid",
                  gap: "12px",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
                }}
              >
                {[
                  {
                    label: "Líder da temporada",
                    value: dashboard.leader,
                    hint: "quem está puxando o momento"
                  },
                  {
                    label: "Agenda com presença online",
                    value: `${dashboard.online.toLocaleString("pt-BR")} encontro(s)`,
                    hint: "mix presencial + online"
                  },
                  {
                    label: "Experiências com checkout",
                    value: `${dashboard.paid.toLocaleString("pt-BR")} evento(s)`,
                    hint: "jornada de confirmação ativa"
                  }
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "grid",
                      gap: "4px",
                      padding: "15px 16px",
                      borderRadius: "20px",
                      background: "rgba(255,255,255,0.68)",
                      border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))"
                    }}
                  >
                    <span style={{ color: "var(--elo-text-tertiary, #6B7280)", fontSize: ".76rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {item.label}
                    </span>
                    <strong style={{ fontSize: "1.04rem" }}>{item.value}</strong>
                    <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".88rem" }}>{item.hint}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gap: "14px", alignContent: "start" }}>
              <FeedCard
                eyebrow={
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <Badge variant="brand">Evento em destaque</Badge>
                    {featuredTiming ? <Badge variant={featuredTiming.variant}>{featuredTiming.label}</Badge> : null}
                  </div>
                }
                title={featuredEvent?.title ?? "Agenda preparando novidades"}
                media={
                  featuredEvent ? (
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: "240px",
                        overflow: "hidden",
                        borderRadius: "20px"
                      }}
                    >
                      <Image
                        loader={passthroughImageLoader}
                        unoptimized
                        fill
                        priority
                        sizes="(max-width: 900px) 100vw, 36vw"
                        src={featuredEvent.heroImageUrl ?? "/event-placeholder.svg"}
                        alt={`Imagem do evento ${featuredEvent.title}`}
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                  ) : undefined
                }
                description={
                  featuredEvent ? (
                    <div style={{ display: "grid", gap: "10px" }}>
                      <span>{featuredEvent.summary}</span>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <Badge variant={getAccessVariant(featuredEvent.accessType)}>{getAccessLabel(featuredEvent.accessType)}</Badge>
                        <Badge variant={featuredEvent.onlineUrl ? "info" : "neutral"}>
                          {featuredEvent.onlineUrl ? "Online disponível" : "Presencial"}
                        </Badge>
                      </div>
                    </div>
                  ) : "Assim que um novo encontro for publicado, ele aparece aqui com contexto e ação direta."
                }
                footer={
                  featuredEvent ? (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                      <div style={{ display: "grid", gap: "4px" }}>
                        <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".9rem" }}>
                          {new Date(featuredEvent.startsAt).toLocaleString("pt-BR")}
                        </span>
                        <span style={{ color: "var(--elo-text-tertiary, #6B7280)", fontSize: ".86rem" }}>{featuredEvent.location}</span>
                      </div>
                      <Link href={`/eventos/${featuredEvent.id}`}>
                        <Button>
                          {featuredEvent.accessType === "free_members" ? "Ver e confirmar" : "Ver e pagar"}
                          <ArrowRight size={16} />
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <Link href="/membros">
                      <Button>Explorar comunidade</Button>
                    </Link>
                  )
                }
                style={{
                  borderRadius: "28px",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(247,249,255,0.9)), radial-gradient(120% 120% at 100% 0%, rgba(134, 90, 255, 0.12), transparent 54%)"
                }}
              />

              <article
                style={{
                  display: "grid",
                  gap: "10px",
                  padding: "18px",
                  borderRadius: "24px",
                  border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.88), rgba(248,250,255,0.74))"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                  <div style={{ display: "grid", gap: "4px" }}>
                    <Badge variant="info" style={{ justifySelf: "start" }}>
                      Pulso imediato
                    </Badge>
                    <strong style={{ fontSize: "1.08rem" }}>Radar do dia</strong>
                  </div>
                  <LogoMark size="sm" />
                </div>
                <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".94rem", lineHeight: 1.6 }}>
                  Abra a comunidade já sabendo onde está a próxima conversa, quem está subindo no ranking e qual evento merece sua atenção.
                </span>
              </article>
            </div>
          </div>
        </section>

        {feedback ? (
          <Alert variant={feedback.variant} title={feedback.title}>
            {feedback.description}
          </Alert>
        ) : null}

        {loadingHome ? (
          <Alert variant="info" title="Montando sua home">
            Carregando agenda, diretório e pulso da comunidade.
          </Alert>
        ) : null}

        <section style={{ display: "grid", gap: "18px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          <div style={{ display: "grid", gap: "14px" }}>
            <FeedCard
              eyebrow={<Badge variant="info">Pessoas para conhecer</Badge>}
              title="Radar social para continuar a conversa"
              description="O diretório aparece como uma shortlist social: contexto, localização e atalho de contato para você agir sem fricção."
              footer={
                <Link href="/membros">
                  <Button variant="secondary">Abrir diretório completo</Button>
                </Link>
              }
            />

            <div style={{ display: "grid", gap: "10px" }}>
              {members.length > 0 ? (
                members.slice(0, 4).map((member) => (
                  <article
                    key={member.id}
                    style={{
                      display: "grid",
                      gap: "10px",
                      padding: "16px 18px",
                      borderRadius: "22px",
                      border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(249,250,255,0.82)), radial-gradient(90% 120% at 0% 0%, rgba(134, 90, 255, 0.08), transparent 48%)",
                      boxShadow: "0 10px 28px rgba(22, 24, 40, 0.06)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span
                          style={{
                            width: "48px",
                            height: "48px",
                            display: "grid",
                            placeItems: "center",
                            borderRadius: "18px",
                            background: "rgba(134, 90, 255, 0.12)",
                            color: "var(--elo-orbit, #865AFF)",
                            fontWeight: 800
                          }}
                        >
                          {initials(member.fullName)}
                        </span>
                        <div style={{ display: "grid", gap: "4px" }}>
                          <strong>{member.fullName}</strong>
                          <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".9rem" }}>{member.area}</span>
                        </div>
                      </div>
                      <Badge variant="neutral">{member.city}/{member.state}</Badge>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {member.whatsapp ? (
                        <a
                          href={`https://wa.me/${member.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: "inline-flex" }}
                        >
                          <Button size="sm">Chamar no WhatsApp</Button>
                        </a>
                      ) : null}
                      <Link href="/membros">
                        <Button size="sm" variant="secondary">Ver diretório</Button>
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState
                  icon={<UsersRound size={18} />}
                  title="Sem sugestões de membros no momento"
                  description="Assim que o diretório carregar, esta área volta a sugerir pessoas relevantes para criar novos elos."
                />
              )}
            </div>

            <section style={{ display: "grid", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: "4px" }}>
                  <strong style={{ fontSize: "1.1rem" }}>Agenda em fluxo</strong>
                  <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>
                    A agenda vira stream: capa, contexto e ação principal visíveis antes do clique.
                  </span>
                </div>
                <Badge variant="info">{dashboard.paid} pago(s)</Badge>
              </div>

              {events.length > 0 ? (
                events.slice(0, 5).map((event) => {
                  const timing = getEventTimingState(event.startsAt);

                  return (
                    <article
                      key={event.id}
                      style={{
                        display: "grid",
                        gap: "14px",
                        padding: "16px",
                        borderRadius: "24px",
                        border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                        background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(249,250,255,0.84))",
                        boxShadow: "0 10px 24px rgba(20, 22, 34, 0.05)"
                      }}
                    >
                      <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "108px minmax(0, 1fr)" }}>
                        <div
                          style={{
                            position: "relative",
                            width: "108px",
                            height: "96px",
                            overflow: "hidden",
                            borderRadius: "18px",
                            background: "rgba(134, 90, 255, 0.1)"
                          }}
                        >
                          <Image
                            loader={passthroughImageLoader}
                            unoptimized
                            fill
                            sizes="108px"
                            src={event.heroImageUrl ?? "/event-placeholder.svg"}
                            alt={`Imagem do evento ${event.title}`}
                            style={{ objectFit: "cover" }}
                          />
                        </div>

                        <div style={{ display: "grid", gap: "8px", minWidth: 0 }}>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <Badge variant={timing.variant}>{timing.label}</Badge>
                            <Badge variant={getAccessVariant(event.accessType)}>{getAccessLabel(event.accessType)}</Badge>
                          </div>
                          <div style={{ display: "grid", gap: "6px" }}>
                            <strong style={{ fontSize: "1.06rem", lineHeight: 1.2 }}>{event.title}</strong>
                            <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".93rem", lineHeight: 1.6 }}>
                              {event.summary}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <Badge variant="neutral">{new Date(event.startsAt).toLocaleString("pt-BR")}</Badge>
                            <Badge variant="neutral">{event.location}</Badge>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>
                          {event.accessType === "free_members" ? "Entrada gratuita para membros" : formatCurrency(event.priceCents ?? 0)}
                        </span>
                        <Link href={`/eventos/${event.id}`}>
                          <Button variant="secondary" size="sm">
                            Abrir detalhe
                          </Button>
                        </Link>
                      </div>
                    </article>
                  );
                })
              ) : (
                <EmptyState
                  icon={<Ticket size={18} />}
                  title="Nenhum evento publicado"
                  description="Quando a agenda receber novos encontros, esta seção vira o stream principal da comunidade."
                />
              )}
            </section>
          </div>

          <div style={{ display: "grid", gap: "14px", alignContent: "start" }}>
            <FeedCard
              eyebrow={<Badge variant="brand">Pulso da comunidade</Badge>}
              title="Ranking curto da temporada"
              description="Leia a energia da comunidade em poucos segundos: quem lidera, quem está subindo e onde você entra nessa história."
              footer={
                <Link href="/gamificacao">
                  <Button variant="secondary">Ver ranking completo</Button>
                </Link>
              }
            />

            <div style={{ display: "grid", gap: "10px" }}>
              {ranking.length > 0 ? (
                ranking.slice(0, 4).map((entry) => (
                  <article
                    key={entry.memberId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "14px 16px",
                      borderRadius: "20px",
                      border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                      background:
                        entry.memberId === memberId
                          ? "linear-gradient(135deg, rgba(134, 90, 255, 0.16), rgba(255,255,255,0.92))"
                          : "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(249,250,255,0.82))"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        style={{
                          width: "38px",
                          height: "38px",
                          display: "grid",
                          placeItems: "center",
                          borderRadius: "14px",
                          background: "rgba(17, 19, 24, 0.06)",
                          fontWeight: 800
                        }}
                      >
                        #{entry.rank}
                      </span>
                      <div style={{ display: "grid", gap: "3px" }}>
                        <strong>{entry.name}</strong>
                        <span style={{ color: "var(--elo-text-tertiary, #6B7280)", fontSize: ".84rem" }}>
                          {entry.medals.length > 0 ? entry.medals.join(", ") : "Sem medalhas ainda"}
                        </span>
                      </div>
                    </div>
                    <Badge variant={entry.rank === 1 ? "brand" : "info"}>{entry.points.toLocaleString("pt-BR")} pts</Badge>
                  </article>
                ))
              ) : (
                <EmptyState
                  icon={<Crown size={18} />}
                  title="Ranking em preparação"
                  description="Assim que os primeiros pontos entrarem, o pulso da temporada aparece aqui."
                />
              )}
            </div>

            <FeedCard
              eyebrow={<Badge variant="success">Seu momento</Badge>}
              title={currentMemberRanking ? `Você está em #${currentMemberRanking.rank}` : "Sua trilha está começando"}
              description={
                currentMemberRanking
                  ? `Você soma ${currentMemberRanking.points.toLocaleString("pt-BR")} pontos na temporada ${season}.`
                  : "Participe dos próximos eventos e interações para aparecer no ranking desta temporada."
              }
              footer={
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <Badge variant="info">Líder atual: {dashboard.leader}</Badge>
                  <Badge variant="neutral">{dashboard.online} evento(s) online</Badge>
                </div>
              }
            />
          </div>
        </section>
      </div>
    </MemberShell>
  );
}
