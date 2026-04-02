"use client";

import {
  Alert,
  Badge,
  Button,
  DataTable,
  EmptyState,
  MetricStrip,
  PageHeader,
  PriorityStrip,
  SidePanelForm,
  Textarea,
  Input,
  Select,
  Card
} from "@elo/ui";
import type { AlertVariant, BadgeVariant } from "@elo/ui";
import { Award, CalendarClock, Medal, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { apiRequest } from "../../lib/auth-client";

type RankingEntry = {
  memberId: string;
  name: string;
  points: number;
  rank: number;
  medals: string[];
};

type SeasonItem = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
};

type BadgeJobResponse = {
  seasonName: string | null;
  grantedCount: number;
  grants: Array<{
    memberName: string;
    badgeName: string;
  }>;
};

type FeedbackState = {
  title: string;
  description: string;
  variant: AlertVariant;
};

const DEFAULT_SEASON_DURATION_DAYS = 180;

function defaultSeasonStartAt() {
  return new Date().toISOString().slice(0, 16);
}

function defaultSeasonEndsAt() {
  return new Date(Date.now() + DEFAULT_SEASON_DURATION_DAYS * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 16);
}

function formatSeasonPeriod(season: SeasonItem) {
  return `${new Date(season.startsAt).toLocaleDateString("pt-BR")} ate ${new Date(season.endsAt).toLocaleDateString("pt-BR")}`;
}

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "Não foi possível conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

function seasonStatusBadgeVariant(active: boolean): BadgeVariant {
  return active ? "success" : "neutral";
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

function grantsSummary(grants: Array<{ memberName: string; badgeName: string }>) {
  if (grants.length === 0) return "Nenhum novo badge concedido.";

  const preview = grants
    .slice(0, 5)
    .map((item) => `${item.memberName}: ${item.badgeName}`)
    .join(" | ");

  if (grants.length <= 5) return preview;

  return `${preview} | +${grants.length - 5} concessão(ões)`;
}

export default function GamificationPage() {
  const [season, setSeason] = useState("-");
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [seasons, setSeasons] = useState<SeasonItem[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seasonSaving, setSeasonSaving] = useState(false);
  const [activatingSeasonId, setActivatingSeasonId] = useState<string | null>(null);
  const [processingBadges, setProcessingBadges] = useState(false);
  const [form, setForm] = useState({
    memberId: "",
    eventId: "",
    seasonId: "",
    points: "",
    reason: ""
  });
  const [seasonForm, setSeasonForm] = useState({
    name: "",
    startsAt: defaultSeasonStartAt(),
    endsAt: defaultSeasonEndsAt()
  });

  const activeSeason = useMemo(() => seasons.find((item) => item.active) ?? null, [seasons]);

  const dashboard = useMemo(() => {
    const withBadges = ranking.filter((item) => item.medals.length > 0).length;
    const activeCount = seasons.filter((item) => item.active).length;

    return {
      seasonsTotal: seasons.length,
      seasonsActive: activeCount,
      rankingTotal: ranking.length,
      withBadges,
      topPoints: ranking[0]?.points ?? 0,
      leaderName: ranking[0]?.name ?? "A definir"
    };
  }, [ranking, seasons]);

  const loadRanking = useCallback(async () => {
    const response = await apiRequest<{ season: string; ranking: RankingEntry[] }>("/app/gamification/ranking");
    setSeason(response.season);
    setRanking(response.ranking);
  }, []);

  const loadSeasons = useCallback(async () => {
    const response = await apiRequest<SeasonItem[]>("/admin/gamification/seasons");
    setSeasons(response);

    setForm((prev) => {
      if (response.some((item) => item.id === prev.seasonId)) {
        return prev;
      }

      const currentSeason = response.find((item) => item.active) ?? response[0];
      return {
        ...prev,
        seasonId: currentSeason?.id ?? ""
      };
    });
  }, []);

  const refreshGamificationData = useCallback(async () => {
    setLoadingData(true);

    try {
      await Promise.all([loadRanking(), loadSeasons()]);
    } catch (requestError) {
      setFeedback({
        title: "Falha ao carregar gamificação",
        description: normalizeApiError((requestError as Error).message),
        variant: "danger"
      });
    } finally {
      setLoadingData(false);
    }
  }, [loadRanking, loadSeasons]);

  useEffect(() => {
    void refreshGamificationData();
  }, [refreshGamificationData]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.seasonId) {
      setFeedback({
        title: "Temporada obrigatória",
        description: "Selecione uma temporada antes de lançar pontos.",
        variant: "warning"
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      await apiRequest("/admin/gamification/points", {
        method: "POST",
        body: JSON.stringify({
          memberId: form.memberId.trim(),
          eventId: form.eventId.trim(),
          seasonId: form.seasonId,
          points: Number(form.points),
          reason: form.reason.trim()
        })
      });

      setForm({ memberId: "", eventId: "", seasonId: "", points: "", reason: "" });
      setFeedback({
        title: "Pontuação lançada",
        description: "Registro de pontos realizado com sucesso para a temporada selecionada.",
        variant: "success"
      });
      await refreshGamificationData();
    } catch (submitError) {
      setFeedback({
        title: "Falha ao lançar pontos",
        description: normalizeApiError((submitError as Error).message),
        variant: "danger"
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSeasonSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSeasonSaving(true);
    setFeedback(null);

    try {
      await apiRequest("/admin/gamification/seasons", {
        method: "POST",
        body: JSON.stringify({
          name: seasonForm.name.trim(),
          startsAt: new Date(seasonForm.startsAt).toISOString(),
          endsAt: new Date(seasonForm.endsAt).toISOString()
        })
      });

      setSeasonForm({
        name: "",
        startsAt: defaultSeasonStartAt(),
        endsAt: defaultSeasonEndsAt()
      });
      setFeedback({
        title: "Temporada criada",
        description: "Nova temporada adicionada com sucesso ao calendário de gamificação.",
        variant: "success"
      });
      await refreshGamificationData();
    } catch (submitError) {
      setFeedback({
        title: "Falha ao criar temporada",
        description: normalizeApiError((submitError as Error).message),
        variant: "danger"
      });
    } finally {
      setSeasonSaving(false);
    }
  }

  async function handleActivateSeason(seasonItem: SeasonItem) {
    if (seasonItem.active) return;

    const confirmed = window.confirm(`Ativar a temporada \"${seasonItem.name}\" agora?`);
    if (!confirmed) return;

    setActivatingSeasonId(seasonItem.id);
    setFeedback(null);

    try {
      await apiRequest(`/admin/gamification/seasons/${seasonItem.id}/activate`, {
        method: "POST",
        body: JSON.stringify({})
      });

      setFeedback({
        title: "Temporada ativada",
        description: `A temporada ${seasonItem.name} agora está ativa para lançamentos.`,
        variant: "success"
      });
      await refreshGamificationData();
    } catch (requestError) {
      setFeedback({
        title: "Falha ao ativar temporada",
        description: normalizeApiError((requestError as Error).message),
        variant: "danger"
      });
    } finally {
      setActivatingSeasonId(null);
    }
  }

  async function handleProcessBadges() {
    const confirmed = window.confirm("Processar badges agora com base no ranking atual?");
    if (!confirmed) return;

    setProcessingBadges(true);
    setFeedback(null);

    try {
      const response = await apiRequest<BadgeJobResponse>("/admin/gamification/badges/process", {
        method: "POST",
        body: JSON.stringify({})
      });

      const seasonLabel = response.seasonName ?? "sem temporada ativa";
      setFeedback({
        title: "Processamento de badges concluído",
        description: `Executado para ${seasonLabel}. Novas concessões: ${response.grantedCount}. ${grantsSummary(response.grants)}`,
        variant: "success"
      });
      await refreshGamificationData();
    } catch (requestError) {
      setFeedback({
        title: "Falha no processamento de badges",
        description: normalizeApiError((requestError as Error).message),
        variant: "danger"
      });
    } finally {
      setProcessingBadges(false);
    }
  }

  const priorities = useMemo(() => {
    const items: Array<{ title: string; description: string; tone: BadgeVariant }> = [];

    if (!activeSeason) {
      items.push({
        title: "Ativar uma temporada",
        description: "Sem temporada ativa, o lançamento de pontos perde contexto operacional e histórico.",
        tone: "danger"
      });
    }

    if (ranking.length === 0) {
      items.push({
        title: "Aquecer o ranking",
        description: "Ainda não há membros ranqueados. Lance pontos dos primeiros eventos para destravar engajamento.",
        tone: "warning"
      });
    }

    if (dashboard.withBadges === 0 && ranking.length > 0) {
      items.push({
        title: "Processar badges da temporada",
        description: "Há ranking ativo sem medalhas distribuídas. Vale consolidar reconhecimento visual agora.",
        tone: "info"
      });
    }

    if (items.length === 0) {
      items.push({
        title: "Operação de gamificação em ritmo bom",
        description: "Temporada ativa, ranking em movimento e distribuição pronta para acompanhamento recorrente.",
        tone: "success"
      });
    }

    return items;
  }, [activeSeason, dashboard.withBadges, ranking.length]);

  return (
    <AdminShell>
      <div style={{ display: "grid", gap: "18px" }}>
        <PageHeader
          eyebrow={<Badge variant="brand">Gamificação Admin</Badge>}
          title="Motor de reputação e reconhecimento"
          description="A operação de gamificação precisa ser rápida para ativar temporadas, lançar pontos e processar badges sem quebrar o ritmo da comunidade."
          actions={[
            {
              label: processingBadges ? "Processando badges..." : "Processar badges",
              onClick: () => void handleProcessBadges(),
              variant: "secondary"
            }
          ]}
          meta={
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Badge variant={activeSeason ? "success" : "warning"}>
                {activeSeason ? `Temporada ativa: ${activeSeason.name}` : "Sem temporada ativa"}
              </Badge>
              <Badge variant="info">Ranking do app: {season}</Badge>
            </div>
          }
        />

        {feedback ? (
          <Alert variant={feedback.variant} title={feedback.title}>
            {feedback.description}
          </Alert>
        ) : null}

        {loadingData ? (
          <Alert variant="info" title="Atualizando gamificação">
            Carregando temporadas, ranking e ações automáticas.
          </Alert>
        ) : null}

        <PriorityStrip
          items={priorities.map((item) => ({
            title: item.title,
            description: item.description,
            tone: item.tone
          }))}
        />

        <MetricStrip
          items={[
            {
              label: "Temporadas",
              value: dashboard.seasonsTotal.toLocaleString("pt-BR"),
              hint: `${dashboard.seasonsActive} ativa(s)`,
              badge: <CalendarClock size={16} />
            },
            {
              label: "Membros ranqueados",
              value: dashboard.rankingTotal.toLocaleString("pt-BR"),
              hint: "Base atual do ranking",
              badge: <Trophy size={16} />
            },
            {
              label: "Com medalhas",
              value: dashboard.withBadges.toLocaleString("pt-BR"),
              hint: "Reconhecimento distribuído",
              badge: <Medal size={16} />
            },
            {
              label: "Liderança",
              value: dashboard.topPoints.toLocaleString("pt-BR"),
              hint: dashboard.leaderName,
              tone: "brand",
              badge: <Award size={16} />
            }
          ]}
        />

        <section
          style={{
            display: "grid",
            gap: "18px",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))"
          }}
        >
          <div style={{ display: "grid", gap: "14px", minWidth: 0 }}>
            <DataTable
              rowKey={(row) => row.id}
              rows={seasons}
              emptyState={
                <EmptyState
                  icon={<CalendarClock size={18} />}
                  title="Nenhuma temporada cadastrada"
                  description="Crie a primeira temporada para liberar lançamentos, ranking vivo e badges da comunidade."
                />
              }
              columns={[
                {
                  key: "name",
                  header: "Temporada",
                  sortable: true,
                  sortValue: (row) => row.name,
                  render: (row) => (
                    <div style={{ display: "grid", gap: "6px" }}>
                      <strong>{row.name}</strong>
                      <span style={{ color: "var(--elo-text-tertiary, #6B7280)", fontSize: ".86rem" }}>
                        {formatSeasonPeriod(row)}
                      </span>
                    </div>
                  )
                },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => <Badge variant={seasonStatusBadgeVariant(row.active)}>{row.active ? "Ativa" : "Inativa"}</Badge>
                },
                {
                  key: "window",
                  header: "Janela",
                  render: (row) => (
                    <span style={{ color: "var(--elo-text-secondary, #374151)" }}>{formatSeasonPeriod(row)}</span>
                  )
                },
                {
                  key: "actions",
                  header: "Ações",
                  width: "220px",
                  render: (row) => (
                    <Button
                      size="sm"
                      onClick={() => void handleActivateSeason(row)}
                      disabled={row.active || activatingSeasonId === row.id}
                    >
                      {row.active ? "Temporada ativa" : activatingSeasonId === row.id ? "Ativando..." : "Ativar"}
                    </Button>
                  )
                }
              ]}
            />

            <DataTable
              rowKey={(row) => row.memberId}
              rows={ranking}
              emptyState={
                <EmptyState
                  icon={<Target size={18} />}
                  title="Ranking ainda vazio"
                  description="Assim que a equipe lançar pontuação, os membros aparecerão aqui com posição, badges e liderança da temporada."
                />
              }
              columns={[
                {
                  key: "rank",
                  header: "Posição",
                  sortable: true,
                  sortValue: (row) => row.rank,
                  render: (row) => <Badge variant={rankingBadgeVariant(row.rank)}>{rankingBadgeLabel(row.rank)}</Badge>
                },
                {
                  key: "name",
                  header: "Membro",
                  sortable: true,
                  sortValue: (row) => row.name,
                  render: (row) => <strong>{row.name}</strong>
                },
                {
                  key: "points",
                  header: "Pontos",
                  align: "right",
                  sortable: true,
                  sortValue: (row) => row.points,
                  render: (row) => (
                    <span style={{ fontFamily: "var(--elo-font-mono)", fontWeight: 700 }}>
                      {row.points.toLocaleString("pt-BR")}
                    </span>
                  )
                },
                {
                  key: "medals",
                  header: "Badges",
                  render: (row) => (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {row.medals.length > 0 ? (
                        row.medals.map((medal) => (
                          <Badge key={`${row.memberId}-${medal}`} variant="success">
                            {medal}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="neutral">Sem medalhas</Badge>
                      )}
                    </div>
                  )
                }
              ]}
            />

            <Card
              title="Ações automáticas"
              subtitle="O processamento de badges fecha o ciclo de reconhecimento depois que o ranking já reflete as pontuações da temporada."
              headerAside={<Sparkles size={16} color="var(--elo-orbit, #865AFF)" />}
            >
              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <Badge variant={activeSeason ? "success" : "warning"}>
                    {activeSeason ? `Ativa: ${activeSeason.name}` : "Sem temporada ativa"}
                  </Badge>
                  <Badge variant="info">Líder atual: {dashboard.leaderName}</Badge>
                </div>
                <Button type="button" onClick={() => void handleProcessBadges()} disabled={processingBadges}>
                  {processingBadges ? "Processando badges..." : "Executar processamento agora"}
                </Button>
              </div>
            </Card>
          </div>

          <div style={{ display: "grid", gap: "14px", alignContent: "start" }}>
            <SidePanelForm
              badge={<Badge variant="brand">Nova temporada</Badge>}
              title="Abrir novo ciclo"
              description="Crie janelas fechadas para manter o histórico da comunidade claro, comparável e rastreável."
            >
              <form onSubmit={handleSeasonSubmit} style={{ display: "grid", gap: "12px" }}>
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: ".84rem", fontWeight: 700 }}>Nome da temporada</span>
                  <Input
                    placeholder="Ex.: Elo Sprint 2026"
                    value={seasonForm.name}
                    onChange={(event) => setSeasonForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                  />
                </label>
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: ".84rem", fontWeight: 700 }}>Início</span>
                  <Input
                    type="datetime-local"
                    value={seasonForm.startsAt}
                    onChange={(event) => setSeasonForm((prev) => ({ ...prev, startsAt: event.target.value }))}
                    required
                  />
                </label>
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: ".84rem", fontWeight: 700 }}>Fim</span>
                  <Input
                    type="datetime-local"
                    value={seasonForm.endsAt}
                    onChange={(event) => setSeasonForm((prev) => ({ ...prev, endsAt: event.target.value }))}
                    required
                  />
                </label>
                <Button type="submit" disabled={seasonSaving}>
                  {seasonSaving ? "Criando..." : "Criar temporada"}
                </Button>
              </form>
            </SidePanelForm>

            <SidePanelForm
              badge={<Badge variant="info">Lançamento manual</Badge>}
              title="Empurrar o ranking"
              description="Use quando um evento validado precisar refletir rapidamente no ranking e na leitura pública do app."
            >
              <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: ".84rem", fontWeight: 700 }}>Member ID</span>
                  <Input
                    placeholder="UUID do membro"
                    value={form.memberId}
                    onChange={(event) => setForm((prev) => ({ ...prev, memberId: event.target.value }))}
                    required
                  />
                </label>
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: ".84rem", fontWeight: 700 }}>Event ID</span>
                  <Input
                    placeholder="UUID do evento"
                    value={form.eventId}
                    onChange={(event) => setForm((prev) => ({ ...prev, eventId: event.target.value }))}
                    required
                  />
                </label>
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: ".84rem", fontWeight: 700 }}>Temporada</span>
                  <Select
                    value={form.seasonId}
                    onChange={(event) => setForm((prev) => ({ ...prev, seasonId: event.target.value }))}
                    required
                  >
                    {seasons.length === 0 ? (
                      <option value="">Cadastre uma temporada primeiro</option>
                    ) : (
                      seasons.map((seasonItem) => (
                        <option key={seasonItem.id} value={seasonItem.id}>
                          {seasonItem.name}
                          {seasonItem.active ? " (ativa)" : ""}
                        </option>
                      ))
                    )}
                  </Select>
                </label>
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: ".84rem", fontWeight: 700 }}>Pontos</span>
                  <Input
                    placeholder="Ex.: 20"
                    type="number"
                    min={1}
                    value={form.points}
                    onChange={(event) => setForm((prev) => ({ ...prev, points: event.target.value }))}
                    required
                  />
                </label>
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: ".84rem", fontWeight: 700 }}>Motivo</span>
                  <Textarea
                    placeholder="Descreva a justificativa do lançamento"
                    value={form.reason}
                    onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
                    required
                    style={{ minHeight: "90px" }}
                  />
                </label>
                <Button type="submit" disabled={saving}>
                  {saving ? "Lançando..." : "Lançar pontos"}
                </Button>
              </form>
            </SidePanelForm>

            <Card title="Recomendação operacional" subtitle="Sequência sugerida para manter a temporada viva sem gerar ruído no ranking.">
              <div style={{ display: "grid", gap: "10px" }}>
                {[
                  "1. Garanta uma temporada ativa antes de qualquer lançamento manual.",
                  "2. Lance pontos com motivo claro para rastreabilidade posterior.",
                  "3. Processe badges após a curva de pontuação começar a estabilizar."
                ].map((item) => (
                  <div key={item} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <span
                      style={{
                        width: "24px",
                        height: "24px",
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "999px",
                        background: "rgba(134, 90, 255, 0.12)",
                        color: "var(--elo-orbit, #865AFF)",
                        fontWeight: 800,
                        flexShrink: 0
                      }}
                    >
                      <Zap size={12} />
                    </span>
                    <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>{item}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
