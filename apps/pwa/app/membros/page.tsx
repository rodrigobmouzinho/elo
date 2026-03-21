"use client";

import Link from "next/link";
import { Alert, Badge, Button, Card, EmptyState, FilterBar, Input, PageHeader, SocialStatPill } from "@elo/ui";
import type { AlertVariant, BadgeVariant } from "@elo/ui";
import { MapPin, MessageCircleMore, Search, Sparkles, UsersRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MemberShell } from "../../components/member-shell";
import { apiRequest, getStoredAuth } from "../../lib/auth-client";

type Member = {
  id: string;
  fullName: string;
  city: string;
  state: string;
  area: string;
  whatsapp: string;
};

type FeedbackState = {
  title: string;
  description: string;
  variant: AlertVariant;
};

type ConnectionState = "created" | "existing";

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "Não foi possível conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

function toWhatsappUrl(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;

  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  if (normalized.length < 12 || normalized.length > 13) return null;

  return `https://wa.me/${normalized}`;
}

function connectionBadge(state?: ConnectionState): { label: string; variant: BadgeVariant } | null {
  if (state === "created") {
    return { label: "Elo criado", variant: "success" };
  }

  if (state === "existing") {
    return { label: "Elo existente", variant: "info" };
  }

  return null;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function discoveryReason(member: Member) {
  if (toWhatsappUrl(member.whatsapp)) {
    return "Canal direto já disponível para acelerar a aproximação.";
  }

  return `Atua em ${member.city}/${member.state} e pode ampliar sua leitura local da comunidade.`;
}

export default function MembrosPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [connectionStateById, setConnectionStateById] = useState<Record<string, ConnectionState>>({});
  const requestTokenRef = useRef(0);

  async function loadMembers(searchTerm: string) {
    const token = requestTokenRef.current + 1;
    requestTokenRef.current = token;
    setLoadingMembers(true);
    setFeedback((previous) => (previous?.variant === "danger" ? null : previous));

    try {
      const normalizedSearch = searchTerm.trim();
      const query = normalizedSearch ? `?search=${encodeURIComponent(normalizedSearch)}` : "";
      const response = await apiRequest<Member[]>(`/app/members${query}`);

      if (requestTokenRef.current !== token) return;
      setMembers(response);
    } catch (requestError) {
      if (requestTokenRef.current !== token) return;
      setFeedback({
        title: "Falha ao carregar diretório",
        description: normalizeApiError((requestError as Error).message),
        variant: "danger"
      });
    } finally {
      if (requestTokenRef.current === token) {
        setLoadingMembers(false);
      }
    }
  }

  useEffect(() => {
    const auth = getStoredAuth();
    setCurrentMemberId(auth?.user.memberId ?? null);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMembers(search);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  useEffect(() => {
    return () => {
      requestTokenRef.current += 1;
    };
  }, []);

  async function createElo(memberId: string) {
    const targetMember = members.find((member) => member.id === memberId);

    setLoadingId(memberId);
    setFeedback(null);

    try {
      const result = await apiRequest<{ message: string; created: boolean }>(`/app/members/${memberId}/elo`, {
        method: "POST",
        body: JSON.stringify({})
      });

      setConnectionStateById((previous) => ({
        ...previous,
        [memberId]: result.created ? "created" : "existing"
      }));

      setFeedback({
        title: result.created ? "Elo criado com sucesso" : "Elo já existente",
        description: result.created
          ? `${targetMember?.fullName ?? "Este membro"} agora faz parte da sua rede de conexões.`
          : `Você já possui conexão com ${targetMember?.fullName ?? "este membro"}.`,
        variant: result.created ? "success" : "info"
      });
    } catch (actionError) {
      setFeedback({
        title: "Falha ao criar elo",
        description: normalizeApiError((actionError as Error).message),
        variant: "danger"
      });
    } finally {
      setLoadingId(null);
    }
  }

  const dashboard = useMemo(() => {
    const withWhatsapp = members.filter((member) => Boolean(toWhatsappUrl(member.whatsapp))).length;
    const representedCities = new Set(
      members.map((member) => `${member.city.trim().toLowerCase()}-${member.state.trim().toLowerCase()}`)
    ).size;
    const activeConnections = Object.keys(connectionStateById).length;

    return {
      total: members.length,
      withWhatsapp,
      representedCities,
      activeConnections
    };
  }, [members, connectionStateById]);

  const discoveryDeck = useMemo(() => members.filter((member) => member.id !== currentMemberId).slice(0, 3), [currentMemberId, members]);

  const communityRadar = useMemo(() => {
    const topCityEntry = Object.entries(
      members.reduce<Record<string, number>>((accumulator, member) => {
        const key = `${member.city.trim() || "Sem cidade"}/${member.state.trim() || "--"}`;
        accumulator[key] = (accumulator[key] ?? 0) + 1;
        return accumulator;
      }, {})
    ).sort((first, second) => second[1] - first[1])[0];

    const topAreaEntry = Object.entries(
      members.reduce<Record<string, number>>((accumulator, member) => {
        const key = member.area.trim() || "Sem área";
        accumulator[key] = (accumulator[key] ?? 0) + 1;
        return accumulator;
      }, {})
    ).sort((first, second) => second[1] - first[1])[0];

    return {
      topCity: topCityEntry?.[0] ?? "Sem praça dominante",
      topCityCount: topCityEntry?.[1] ?? 0,
      topArea: topAreaEntry?.[0] ?? "Sem área dominante",
      topAreaCount: topAreaEntry?.[1] ?? 0
    };
  }, [members]);

  const normalizedSearch = search.trim();

  return (
    <MemberShell>
      <div style={{ display: "grid", gap: "18px" }}>
        <PageHeader
          eyebrow={<Badge variant="brand">Diretório Elo</Badge>}
          title="Pessoas que podem virar o próximo elo importante"
          description="O diretório agora funciona como uma lista social: mais contexto por linha, ações rápidas e feedback instantâneo quando você cria uma conexão."
          meta={
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <SocialStatPill label="membros listados" value={dashboard.total.toLocaleString("pt-BR")} icon={<UsersRound size={16} />} />
              <SocialStatPill label="com WhatsApp" value={dashboard.withWhatsapp.toLocaleString("pt-BR")} icon={<MessageCircleMore size={16} />} />
              <SocialStatPill label="elos nesta sessão" value={dashboard.activeConnections.toLocaleString("pt-BR")} icon={<Sparkles size={16} />} />
            </div>
          }
        />

        {feedback ? (
          <Alert variant={feedback.variant} title={feedback.title}>
            {feedback.description}
          </Alert>
        ) : null}

        <section
          style={{
            display: "grid",
            gap: "16px",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))"
          }}
        >
          <article
            style={{
              display: "grid",
              gap: "16px",
              padding: "22px 24px",
              borderRadius: "28px",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,246,255,0.92)), radial-gradient(circle at top left, rgba(134,90,255,0.22), transparent 48%)",
              border: "1px solid rgba(134, 90, 255, 0.16)",
              boxShadow: "0 20px 44px rgba(18, 21, 32, 0.08)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <Badge variant="brand">Radar de conexões</Badge>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--elo-text-tertiary, #6B7280)",
                  fontSize: ".8rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase"
                }}
              >
                <Sparkles size={15} />
                Descoberta viva
              </span>
            </div>

            <div style={{ display: "grid", gap: "10px", maxWidth: "58ch" }}>
              <h2 style={{ margin: 0, fontSize: "clamp(1.55rem, 2.8vw, 2.35rem)", lineHeight: 0.98, maxWidth: "14ch" }}>
                Pessoas certas para puxar a próxima conversa.
              </h2>
              <p style={{ margin: 0, color: "var(--elo-text-secondary, #374151)", lineHeight: 1.7 }}>
                O diretório deixa de ser só uma base e passa a funcionar como trilha de networking: praça dominante, área em movimento
                e atalhos de conexão já aparecem antes da lista completa.
              </p>
            </div>

            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
              <div style={{ display: "grid", gap: "6px", padding: "14px 16px", borderRadius: "20px", background: "rgba(255,255,255,0.78)", border: "1px solid rgba(17,17,17,0.06)" }}>
                <span style={{ fontSize: ".76rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--elo-text-tertiary, #6B7280)" }}>
                  Praça mais ativa
                </span>
                <strong>{communityRadar.topCity}</strong>
                <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>
                  {communityRadar.topCityCount.toLocaleString("pt-BR")} perfil(is) nesta praça
                </span>
              </div>
              <div style={{ display: "grid", gap: "6px", padding: "14px 16px", borderRadius: "20px", background: "rgba(255,255,255,0.78)", border: "1px solid rgba(17,17,17,0.06)" }}>
                <span style={{ fontSize: ".76rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--elo-text-tertiary, #6B7280)" }}>
                  Área em fluxo
                </span>
                <strong>{communityRadar.topArea}</strong>
                <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>
                  {communityRadar.topAreaCount.toLocaleString("pt-BR")} pessoa(s) neste cluster
                </span>
              </div>
              <div style={{ display: "grid", gap: "6px", padding: "14px 16px", borderRadius: "20px", background: "rgba(19,22,32,0.96)", color: "rgba(255,255,255,0.96)" }}>
                <span style={{ fontSize: ".76rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(234,236,255,0.72)" }}>
                  Contato rápido
                </span>
                <strong style={{ fontFamily: "var(--elo-font-mono)", fontSize: "1.4rem", lineHeight: 1 }}>
                  {dashboard.withWhatsapp.toLocaleString("pt-BR")}
                </strong>
                <span style={{ color: "rgba(234,236,255,0.8)", fontSize: ".92rem" }}>
                  perfis com WhatsApp pronto para abordagem
                </span>
              </div>
            </div>
          </article>

          <Card tone="panel" title="Primeiros para abordar" subtitle="Atalhos de descoberta para destravar conversa nesta sessão.">
            {discoveryDeck.length === 0 ? (
              <EmptyState
                icon={<UsersRound size={18} />}
                title="Sem sugestões imediatas"
                description="Assim que mais membros estiverem disponíveis, a trilha de abordagem aparecerá aqui."
              />
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {discoveryDeck.map((member) => {
                  const whatsappUrl = toWhatsappUrl(member.whatsapp);
                  const connectionState = connectionStateById[member.id];

                  return (
                    <article
                      key={`discovery-${member.id}`}
                      style={{
                        display: "grid",
                        gap: "10px",
                        padding: "14px 16px",
                        borderRadius: "18px",
                        border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                        background: "rgba(255,255,255,0.8)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span
                            style={{
                              width: "44px",
                              height: "44px",
                              display: "grid",
                              placeItems: "center",
                              borderRadius: "15px",
                              background: "rgba(134, 90, 255, 0.14)",
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
                        {connectionState ? <Badge variant={connectionBadge(connectionState)?.variant ?? "info"}>{connectionBadge(connectionState)?.label}</Badge> : null}
                      </div>

                      <p style={{ margin: 0, color: "var(--elo-text-secondary, #374151)", lineHeight: 1.6 }}>
                        {discoveryReason(member)}
                      </p>

                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <Badge variant="neutral">{member.city}/{member.state}</Badge>
                        <Badge variant="info">{member.area}</Badge>
                        {whatsappUrl ? <Badge variant="success">Contato instantâneo</Badge> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </Card>
        </section>

        <FilterBar
          actions={
            <Badge variant="neutral">
              {dashboard.total.toLocaleString("pt-BR")} perfil(is)
            </Badge>
          }
        >
          <label style={{ display: "grid", gap: "6px", minWidth: "280px", flex: "1 1 280px" }}>
            <span style={{ fontSize: ".8rem", fontWeight: 700, color: "var(--elo-text-tertiary, #6B7280)" }}>Buscar por nome</span>
            <Input
              id="member-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ex.: Ana, João, Rodrigo"
              type="search"
            />
          </label>
        </FilterBar>

        {loadingMembers ? (
          <Alert variant="info" title="Atualizando diretório">
            Carregando membros ativos para você criar novos elos.
          </Alert>
        ) : null}

        <section style={{ display: "grid", gap: "12px" }}>
          {members.map((member) => {
            const whatsappUrl = toWhatsappUrl(member.whatsapp);
            const isSelf = member.id === currentMemberId;
            const connectionState = connectionStateById[member.id];
            const connectionStatus = connectionBadge(connectionState);
            const disableConnectAction =
              isSelf || loadingId === member.id || connectionState === "created" || connectionState === "existing";

            return (
              <article
                key={member.id}
                style={{
                  display: "grid",
                  gap: "14px",
                  padding: "18px 18px",
                  borderRadius: "24px",
                  border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(249,250,255,0.84))",
                  boxShadow: "0 12px 28px rgba(22, 24, 40, 0.06)"
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gap: "14px",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
                    alignItems: "center"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <span
                      style={{
                        width: "52px",
                        height: "52px",
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "18px",
                        background: isSelf ? "rgba(134, 90, 255, 0.18)" : "rgba(17, 19, 24, 0.05)",
                        color: isSelf ? "var(--elo-orbit, #865AFF)" : "var(--elo-text-primary, #111111)",
                        fontWeight: 800,
                        boxShadow: isSelf ? "0 10px 24px rgba(134, 90, 255, 0.12)" : "none"
                      }}
                    >
                      {initials(member.fullName)}
                    </span>
                    <div style={{ display: "grid", gap: "4px" }}>
                      <strong style={{ fontSize: "1rem" }}>{member.fullName}</strong>
                      <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>
                        {member.area} · {member.city}/{member.state}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "8px", minWidth: 0 }}>
                    <p style={{ margin: 0, color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem", lineHeight: 1.55 }}>
                      {discoveryReason(member)}
                    </p>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <Badge variant="neutral">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <MapPin size={13} />
                          {member.city}/{member.state}
                        </span>
                      </Badge>
                      <Badge variant="info">{member.area}</Badge>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {isSelf ? <Badge variant="brand">Seu perfil</Badge> : null}
                    {connectionStatus ? <Badge variant={connectionStatus.variant}>{connectionStatus.label}</Badge> : null}
                    <Badge variant={whatsappUrl ? "success" : "neutral"}>{whatsappUrl ? "WhatsApp ativo" : "Sem WhatsApp"}</Badge>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Button onClick={() => void createElo(member.id)} disabled={disableConnectAction}>
                    {isSelf
                      ? "Seu perfil"
                      : loadingId === member.id
                        ? "Conectando..."
                        : connectionState === "created"
                          ? "Elo criado"
                          : connectionState === "existing"
                            ? "Já conectado"
                            : "Criar elo"}
                  </Button>
                  {whatsappUrl ? (
                    <Link href={whatsappUrl} target="_blank" rel="noreferrer">
                      <Button variant="secondary">
                        Chamar no WhatsApp
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}

          {!loadingMembers && members.length === 0 ? (
            <EmptyState
              icon={<Search size={18} />}
              title="Nenhum membro encontrado"
              description={
                normalizedSearch
                  ? "Ajuste o nome pesquisado para ampliar os resultados do diretório."
                  : "Não há membros ativos disponíveis no momento."
              }
            />
          ) : null}
        </section>
      </div>
    </MemberShell>
  );
}
