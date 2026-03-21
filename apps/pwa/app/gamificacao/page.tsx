"use client";

import { Alert, Badge, Button, Card, EmptyState, FeedCard, LogoMark, SocialStatPill } from "@elo/ui";
import type { AlertVariant, BadgeVariant } from "@elo/ui";
import { ArrowRight, Crown, Flame, Medal, Sparkles, Target, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MemberShell } from "../../components/member-shell";
import { apiRequest, getStoredAuth } from "../../lib/auth-client";

type RankingEntry = {
  memberId: string;
  name: string;
  points: number;
  rank: number;
  medals: string[];
};

type SeasonChampionHistory = {
  seasonId: string;
  season: string;
  champion: string;
  classification: RankingEntry[];
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

function rankingBadgeVariant(rank: number): BadgeVariant {
  if (rank === 1) return "brand";
  if (rank === 2) return "info";
  if (rank === 3) return "warning";
  return "neutral";
}

function rankingBadgeLabel(rank: number) {
  if (rank === 1) return "Top 1";
  if (rank === 2) return "Top 2";
  if (rank === 3) return "Top 3";
  return `#${rank}`;
}

function podiumHeight(rank: number) {
  if (rank === 1) return "188px";
  if (rank === 2) return "154px";
  return "136px";
}

export default function GamificacaoPage() {
  const [season, setSeason] = useState("-");
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [champions, setChampions] = useState<SeasonChampionHistory[]>([]);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  useEffect(() => {
    const auth = getStoredAuth();
    setMemberId(auth?.user.memberId ?? null);

    async function loadRanking() {
      setLoadingData(true);

      try {
        const data = await apiRequest<{
          season: string;
          ranking: RankingEntry[];
          champions: SeasonChampionHistory[];
        }>("/app/gamification/ranking");

        setSeason(data.season);
        setRanking(data.ranking);
        setChampions(data.champions ?? []);
      } catch (requestError) {
        setFeedback({
          title: "Falha ao carregar gamificação",
          description: normalizeApiError((requestError as Error).message),
          variant: "danger"
        });
      } finally {
        setLoadingData(false);
      }
    }

    void loadRanking();
  }, []);

  const currentMemberRanking = useMemo(
    () => (memberId ? ranking.find((entry) => entry.memberId === memberId) ?? null : null),
    [memberId, ranking]
  );

  const leader = ranking[0] ?? null;
  const podium = useMemo(() => ranking.slice(0, 3), [ranking]);
  const leaderboard = useMemo(() => ranking.slice(3), [ranking]);
  const totalMedals = useMemo(() => ranking.reduce((total, entry) => total + entry.medals.length, 0), [ranking]);
  const totalPoints = useMemo(() => ranking.reduce((total, entry) => total + entry.points, 0), [ranking]);

  const pointsToLeader = useMemo(() => {
    if (!leader || !currentMemberRanking || leader.memberId === currentMemberRanking.memberId) {
      return 0;
    }

    return Math.max(leader.points - currentMemberRanking.points, 0);
  }, [currentMemberRanking, leader]);

  const seasonNarrative = !ranking.length
    ? "A temporada está pronta para ganhar narrativa. Assim que os primeiros pontos entrarem, esta tela passa a funcionar como o placar social da comunidade."
    : currentMemberRanking
      ? currentMemberRanking.rank === 1
        ? "Você está puxando a comunidade agora. O foco deixa de ser perseguir e passa a ser sustentar liderança com constância."
        : `Você já está na corrida. Faltam ${pointsToLeader.toLocaleString("pt-BR")} pontos para encostar em ${leader?.name ?? "a liderança"}.`
      : "O topo já começou a se mover. Entre no ranking com presença, eventos e ações que geram reputação dentro da comunidade.";

  const momentumTitle = !currentMemberRanking
    ? "Sua trilha começa quando os primeiros pontos entrarem."
    : currentMemberRanking.rank === 1
      ? "Você está na frente e precisa proteger a posição."
      : `Você está em ${rankingBadgeLabel(currentMemberRanking.rank)} e tem espaço para subir.`;

  const advancementHints = currentMemberRanking
    ? [
        pointsToLeader > 0
          ? `Use o gap de ${pointsToLeader.toLocaleString("pt-BR")} ponto(s) como meta operacional desta temporada.`
          : "Sua meta agora é ampliar margem e tornar a liderança menos frágil.",
        currentMemberRanking.medals.length > 0
          ? `Você já carrega ${currentMemberRanking.medals.length} medalha(s), o que ajuda a dar contexto e reputação ao seu avanço.`
          : "As primeiras medalhas ajudam a transformar pontuação em percepção clara de reputação.",
        "Eventos, presença e participação visível continuam sendo os sinais mais fáceis de converter em ranking social."
      ]
    : [
        "Entre na agenda e nas interações da comunidade para colocar seu nome no placar.",
        "Assim que você pontuar, esta área vira seu cartão pessoal de corrida.",
        "Perfil forte e participação recorrente ajudam a acelerar reputação e leitura social."
      ];

  const gapToLeaderValue = !ranking.length || !currentMemberRanking ? "-" : pointsToLeader.toLocaleString("pt-BR");
  const gapToLeaderDescription = !ranking.length
    ? "O topo ainda não tem distância definida. Quando a temporada ganhar corpo, este gap vira seu indicador mais útil de aproximação."
    : !currentMemberRanking
      ? "Você ainda não está no ranking. Os próximos eventos e ações da comunidade vão abrir sua leitura competitiva."
      : pointsToLeader > 0
        ? "A diferença para a liderança agora está clara. A intenção desta tela é transformar isso em uma meta fácil de acompanhar."
        : "Você já está no topo. Agora a leitura muda para defesa de posição, cadência e constância de reputação.";

  return (
    <MemberShell>
      <div style={{ display: "grid", gap: "18px" }}>
        <section
          style={{
            display: "grid",
            gap: "18px",
            gridTemplateColumns: "minmax(0, 1.35fr) minmax(300px, 0.92fr)",
            padding: "22px",
            borderRadius: "30px",
            border: "1px solid rgba(134, 90, 255, 0.12)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.82)), radial-gradient(80% 80% at 0% 0%, rgba(134, 90, 255, 0.18), transparent 54%)",
            boxShadow: "0 22px 52px rgba(76, 59, 120, 0.12)"
          }}
        >
          <div style={{ display: "grid", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: "10px", maxWidth: "700px" }}>
                <Badge variant="brand" style={{ justifySelf: "start" }}>
                  Pulso da temporada
                </Badge>
                <div style={{ display: "grid", gap: "8px" }}>
                  <h1 style={{ margin: 0, fontSize: "clamp(2rem, 6.2vw, 3.55rem)", lineHeight: 0.94 }}>
                    O ranking agora funciona como uma corrida social viva.
                  </h1>
                  <p style={{ margin: 0, color: "var(--elo-text-secondary, #374151)", maxWidth: "58ch", lineHeight: 1.75 }}>
                    Veja quem está puxando a comunidade, quanto falta para tocar o topo e quais sinais transformam presença em reputação dentro da Elo.
                  </p>
                </div>
              </div>
              <LogoMark size="lg" />
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <SocialStatPill label="temporada ativa" value={season} icon={<Trophy size={16} />} />
              <SocialStatPill label="líder atual" value={leader?.name ?? "Em formação"} icon={<Crown size={16} />} />
              <SocialStatPill label="pontos em jogo" value={totalPoints.toLocaleString("pt-BR")} icon={<Sparkles size={16} />} />
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Link href="/">
                <Button>Voltar ao feed</Button>
              </Link>
              <Link href="/perfil">
                <Button variant="secondary">Refinar meu perfil</Button>
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
                  label: "membros ranqueados",
                  value: ranking.length.toLocaleString("pt-BR"),
                  hint: "quem já aparece na disputa"
                },
                {
                  label: "medalhas distribuídas",
                  value: totalMedals.toLocaleString("pt-BR"),
                  hint: "reconhecimento visível da temporada"
                },
                {
                  label: "histórico colecionável",
                  value: champions.length.toLocaleString("pt-BR"),
                  hint: "temporadas guardadas no arquivo Elo"
                }
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "grid",
                    gap: "4px",
                    padding: "15px 16px",
                    borderRadius: "20px",
                    background: "rgba(255,255,255,0.7)",
                    border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))"
                  }}
                >
                  <span style={{ color: "var(--elo-text-tertiary, #6B7280)", fontSize: ".76rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>{item.label}</span>
                  <strong style={{ fontFamily: "var(--elo-font-mono)", fontSize: "1.08rem" }}>{item.value}</strong>
                  <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".88rem" }}>{item.hint}</span>
                </div>
              ))}
            </div>
          </div>

          <article
            style={{
              display: "grid",
              gap: "14px",
              padding: "22px 20px",
              borderRadius: "28px",
              background:
                "radial-gradient(120% 120% at 0% 0%, rgba(134, 90, 255, 0.24), rgba(134, 90, 255, 0) 42%), linear-gradient(155deg, rgba(11,14,24,0.98), rgba(18,21,34,0.96) 62%, rgba(40,44,64,0.92))",
              color: "rgba(255,255,255,0.96)",
              boxShadow: "0 24px 56px rgba(10, 12, 18, 0.2)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <Badge variant="brand">Seu card de corrida</Badge>
              <span style={{ fontSize: ".78rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(233,236,255,0.72)" }}>
                temporada {season}
              </span>
            </div>

            <div style={{ display: "grid", gap: "8px" }}>
              <h2 style={{ margin: 0, fontSize: "1.45rem", lineHeight: 1.04, color: "inherit", fontFamily: "var(--elo-font-body)" }}>{momentumTitle}</h2>
              <p style={{ margin: 0, color: "rgba(233,236,255,0.8)", lineHeight: 1.7 }}>{seasonNarrative}</p>
            </div>

            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(138px, 1fr))" }}>
              <div style={{ display: "grid", gap: "6px", padding: "14px 16px", borderRadius: "18px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ fontSize: ".76rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(233,236,255,0.72)" }}>
                  posição
                </span>
                <strong style={{ fontFamily: "var(--elo-font-mono)", fontSize: "1.42rem", lineHeight: 1 }}>
                  {currentMemberRanking ? `#${currentMemberRanking.rank}` : "-"}
                </strong>
              </div>
              <div style={{ display: "grid", gap: "6px", padding: "14px 16px", borderRadius: "18px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ fontSize: ".76rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(233,236,255,0.72)" }}>
                  pontos
                </span>
                <strong style={{ fontFamily: "var(--elo-font-mono)", fontSize: "1.42rem", lineHeight: 1 }}>
                  {currentMemberRanking ? currentMemberRanking.points.toLocaleString("pt-BR") : "0"}
                </strong>
              </div>
              <div style={{ display: "grid", gap: "6px", padding: "14px 16px", borderRadius: "18px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ fontSize: ".76rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(233,236,255,0.72)" }}>
                  gap topo
                </span>
                <strong style={{ fontFamily: "var(--elo-font-mono)", fontSize: "1.42rem", lineHeight: 1 }}>{gapToLeaderValue}</strong>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {currentMemberRanking ? <Badge variant={rankingBadgeVariant(currentMemberRanking.rank)}>{rankingBadgeLabel(currentMemberRanking.rank)}</Badge> : <Badge variant="neutral">Ainda fora do ranking</Badge>}
              {currentMemberRanking?.medals.length ? (
                currentMemberRanking.medals.map((medal) => (
                  <Badge key={`self-${medal}`} variant="success">
                    {medal}
                  </Badge>
                ))
              ) : (
                <Badge variant="neutral">Sem medalhas na temporada</Badge>
              )}
            </div>
          </article>
        </section>

        {feedback ? (
          <Alert variant={feedback.variant} title={feedback.title}>
            {feedback.description}
          </Alert>
        ) : null}

        {loadingData ? (
          <Alert variant="info" title="Atualizando corrida da temporada">
            Carregando ranking, histórico e leitura personalizada da sua posição.
          </Alert>
        ) : null}

        <section
          style={{
            display: "grid",
            gap: "18px",
            gridTemplateColumns: "minmax(0, 1.35fr) minmax(300px, 0.95fr)"
          }}
        >
          <Card tone="ghost" title="Pódio ao vivo" subtitle="O topo da comunidade e a tabela completa aparecem na mesma narrativa visual.">
            {ranking.length === 0 ? (
              <EmptyState
                icon={<Trophy size={18} />}
                title="Temporada pronta para começar"
                description="Assim que os primeiros pontos entrarem, este espaço vira o placar vivo da comunidade."
              />
            ) : (
              <div style={{ display: "grid", gap: "14px" }}>
                <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", alignItems: "end" }}>
                  {podium.map((entry) => {
                    const isCurrentMember = entry.memberId === memberId;

                    return (
                      <article
                        key={entry.memberId}
                        style={{
                          display: "grid",
                          gap: "10px",
                          minHeight: podiumHeight(entry.rank),
                          alignContent: "end",
                          padding: "18px",
                          borderRadius: "22px",
                          background:
                            entry.rank === 1
                              ? "linear-gradient(180deg, rgba(134, 90, 255, 0.22), rgba(255,255,255,0.96))"
                              : "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(247,249,255,0.88))",
                          border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                          boxShadow: entry.rank === 1 ? "0 18px 34px rgba(134, 90, 255, 0.12)" : "none"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                          <Badge variant={rankingBadgeVariant(entry.rank)}>{rankingBadgeLabel(entry.rank)}</Badge>
                          {isCurrentMember ? <Badge variant="brand">Você</Badge> : null}
                        </div>
                        <strong style={{ fontSize: "1.05rem" }}>{entry.name}</strong>
                        <span style={{ color: "var(--elo-text-secondary, #374151)", fontFamily: "var(--elo-font-mono)", fontWeight: 700 }}>
                          {entry.points.toLocaleString("pt-BR")} pts
                        </span>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {entry.medals.length > 0 ? (
                            entry.medals.map((medal) => (
                              <Badge key={`${entry.memberId}-${medal}`} variant="success">
                                {medal}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="neutral">Sem medalhas</Badge>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: "10px",
                    padding: "14px",
                    borderRadius: "22px",
                    background: "rgba(255,255,255,0.74)",
                    border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))"
                  }}
                >
                  {[...podium, ...leaderboard].map((entry) => {
                    const isCurrentMember = entry.memberId === memberId;

                    return (
                      <article
                        key={entry.memberId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                          flexWrap: "wrap",
                          padding: "14px 16px",
                          borderRadius: "18px",
                          border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                          background:
                            isCurrentMember
                              ? "linear-gradient(180deg, rgba(134, 90, 255, 0.14), rgba(255,255,255,0.92))"
                              : "rgba(255,255,255,0.9)"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          <Badge variant={rankingBadgeVariant(entry.rank)}>{rankingBadgeLabel(entry.rank)}</Badge>
                          <strong>{entry.name}</strong>
                          {isCurrentMember ? <Badge variant="brand">Você</Badge> : null}
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {entry.medals.length > 0 ? (
                            entry.medals.map((medal) => (
                              <Badge key={`${entry.memberId}-${medal}`} variant="success">
                                {medal}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="neutral">Sem medalhas</Badge>
                          )}
                          <Badge variant="info">{entry.points.toLocaleString("pt-BR")} pts</Badge>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
            <Card tone="panel" title="Gap e momentum" subtitle="O lado direito agora funciona como leitura pessoal e meta de aproximação.">
              <div style={{ display: "grid", gap: "10px" }}>
                <SocialStatPill label="gap para liderança" value={gapToLeaderValue} icon={<Target size={16} />} />
                <SocialStatPill label="ritmo do topo" value={leader ? `${leader.points.toLocaleString("pt-BR")} pts` : "-"} icon={<Flame size={16} />} />
                <SocialStatPill label="seu momento" value={currentMemberRanking ? rankingBadgeLabel(currentMemberRanking.rank) : "Fora do ranking"} icon={<Zap size={16} />} />
                <p style={{ margin: 0, color: "var(--elo-text-secondary, #374151)", lineHeight: 1.7 }}>{gapToLeaderDescription}</p>
              </div>
            </Card>

            <FeedCard
              eyebrow={<Badge variant="info">Como subir</Badge>}
              title="Pistas rápidas para ganhar terreno"
              description={
                <div style={{ display: "grid", gap: "8px" }}>
                  {advancementHints.map((hint) => (
                    <div key={hint} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                      <span
                        style={{
                          width: "24px",
                          height: "24px",
                          display: "grid",
                          placeItems: "center",
                          borderRadius: "999px",
                          background: "rgba(134, 90, 255, 0.12)",
                          color: "var(--elo-orbit, #865AFF)",
                          flexShrink: 0
                        }}
                      >
                        <ArrowRight size={14} />
                      </span>
                      <span style={{ lineHeight: 1.65 }}>{hint}</span>
                    </div>
                  ))}
                </div>
              }
              badges={
                <>
                  <Badge variant="brand">Ranking legível</Badge>
                  <Badge variant="success">Reputação visível</Badge>
                  <Badge variant="neutral">Histórico colecionável</Badge>
                </>
              }
            />

            <Card title="Arquivo de campeões" subtitle="O histórico da Elo aparece como memória social da comunidade.">
              {champions.length === 0 ? (
                <EmptyState
                  icon={<Medal size={18} />}
                  title="Sem temporadas encerradas"
                  description="Quando as primeiras temporadas forem concluídas, esta área vira a coleção de campeões e seus pódios."
                />
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {champions.map((seasonHistory) => (
                    <article
                      key={seasonHistory.seasonId}
                      style={{
                        display: "grid",
                        gap: "10px",
                        padding: "16px",
                        borderRadius: "20px",
                        border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                        background: "rgba(255,255,255,0.82)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                        <strong>{seasonHistory.season}</strong>
                        <Badge variant="brand">Campeão: {seasonHistory.champion}</Badge>
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {seasonHistory.classification.slice(0, 3).map((classification) => (
                          <Badge key={`${seasonHistory.seasonId}-${classification.memberId}`} variant={rankingBadgeVariant(classification.rank)}>
                            {rankingBadgeLabel(classification.rank)} {classification.name}
                          </Badge>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </section>
      </div>
    </MemberShell>
  );
}
