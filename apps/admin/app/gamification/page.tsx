"use client";

import type { AlertVariant } from "@elo/ui";
import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { apiRequest } from "../../lib/auth-client";
import {
  formatLocalDateTimeInput,
  toIsoFromLocalDateTimeInput
} from "../../lib/datetime";

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
  grants: Array<{ memberName: string; badgeName: string }>;
};

type FeedbackState = {
  title: string;
  description: string;
  variant: AlertVariant;
};

const DEFAULT_SEASON_DURATION_DAYS = 180;

const defaultSeasonStartAt = () => formatLocalDateTimeInput(new Date());
const defaultSeasonEndsAt = () =>
  formatLocalDateTimeInput(new Date(Date.now() + DEFAULT_SEASON_DURATION_DAYS * 24 * 3600 * 1000));

const cardStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
  padding: "16px",
  borderRadius: "12px",
  background: "#1a1a1a",
  border: "1px solid rgba(255,255,255,0.06)"
};

const cardLabelStyle = {
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "rgba(255,255,255,0.5)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em"
};

const cardValueStyle = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "#fff"
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#252525",
  color: "#fff",
  fontSize: "0.875rem"
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 32px 10px 12px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#252525",
  color: "#fff",
  fontSize: "0.875rem",
  appearance: "none" as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  cursor: "pointer"
};

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();
  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "Não foi possível conectar ao servidor.";
  }
  return raw;
}

function formatSeasonPeriod(season: SeasonItem) {
  return `${new Date(season.startsAt).toLocaleDateString("pt-BR")} até ${new Date(season.endsAt).toLocaleDateString("pt-BR")}`;
}

export default function GamificationPage() {
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

  const stats = useMemo(() => {
    const withBadges = ranking.filter((item) => item.medals.length > 0).length;
    return {
      totalSeasons: seasons.length,
      activeSeasons: seasons.filter((s) => s.active).length,
      totalRanking: ranking.length,
      withBadges,
      topPoints: ranking[0]?.points ?? 0,
      leaderName: ranking[0]?.name ?? "N/A"
    };
  }, [ranking, seasons]);

  const loadRanking = useCallback(async () => {
    const response = await apiRequest<{ season: string; ranking: RankingEntry[] }>(
      "/app/gamification/ranking"
    );
    setRanking(response.ranking);
  }, []);

  const loadSeasons = useCallback(async () => {
    const response = await apiRequest<SeasonItem[]>("/admin/gamification/seasons");
    setSeasons(response);
    setForm((prev) => {
      if (response.some((item) => item.id === prev.seasonId)) return prev;
      const currentSeason = response.find((item) => item.active) ?? response[0];
      return { ...prev, seasonId: currentSeason?.id ?? "" };
    });
  }, []);

  const refreshGamificationData = useCallback(async () => {
    setLoadingData(true);
    try {
      await Promise.all([loadRanking(), loadSeasons()]);
    } catch (requestError) {
      setFeedback({
        title: "Erro",
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
      setFeedback({ title: "Erro", description: "Selecione uma temporada.", variant: "warning" });
      return;
    }
    setSaving(true);
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
      setFeedback({ title: "Sucesso", description: "Pontos lançados.", variant: "success" });
      await refreshGamificationData();
    } catch (submitError) {
      setFeedback({
        title: "Erro",
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
    try {
      await apiRequest("/admin/gamification/seasons", {
        method: "POST",
        body: JSON.stringify({
          name: seasonForm.name.trim(),
          startsAt: toIsoFromLocalDateTimeInput(seasonForm.startsAt),
          endsAt: toIsoFromLocalDateTimeInput(seasonForm.endsAt)
        })
      });
      setSeasonForm({ name: "", startsAt: defaultSeasonStartAt(), endsAt: defaultSeasonEndsAt() });
      setFeedback({ title: "Sucesso", description: "Temporada criada.", variant: "success" });
      await refreshGamificationData();
    } catch (submitError) {
      setFeedback({
        title: "Erro",
        description: normalizeApiError((submitError as Error).message),
        variant: "danger"
      });
    } finally {
      setSeasonSaving(false);
    }
  }

  async function handleActivateSeason(seasonItem: SeasonItem) {
    if (seasonItem.active) return;
    const confirmed = window.confirm(`Ativar "${seasonItem.name}"?`);
    if (!confirmed) return;
    setActivatingSeasonId(seasonItem.id);
    try {
      await apiRequest(`/admin/gamification/seasons/${seasonItem.id}/activate`, {
        method: "POST",
        body: JSON.stringify({})
      });
      setFeedback({
        title: "Sucesso",
        description: `Temporada ${seasonItem.name} ativada.`,
        variant: "success"
      });
      await refreshGamificationData();
    } catch (requestError) {
      setFeedback({
        title: "Erro",
        description: normalizeApiError((requestError as Error).message),
        variant: "danger"
      });
    } finally {
      setActivatingSeasonId(null);
    }
  }

  async function handleProcessBadges() {
    const confirmed = window.confirm("Processar badges agora?");
    if (!confirmed) return;
    setProcessingBadges(true);
    try {
      const response = await apiRequest<BadgeJobResponse>("/admin/gamification/badges/process", {
        method: "POST",
        body: JSON.stringify({})
      });
      setFeedback({
        title: "Sucesso",
        description: `${response.grantedCount} badges concedidos.`,
        variant: "success"
      });
      await refreshGamificationData();
    } catch (requestError) {
      setFeedback({
        title: "Erro",
        description: normalizeApiError((requestError as Error).message),
        variant: "danger"
      });
    } finally {
      setProcessingBadges(false);
    }
  }

  if (loadingData) {
    return (
      <AdminShell>
        <div
          style={{
            display: "grid",
            placeItems: "center",
            minHeight: "50vh",
            color: "rgba(255,255,255,0.5)"
          }}
        >
          Carregando...
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "16px",
            background:
              feedback.variant === "danger"
                ? "rgba(239,68,68,0.1)"
                : feedback.variant === "success"
                  ? "rgba(34,197,94,0.1)"
                  : "rgba(245,158,11,0.1)",
            color:
              feedback.variant === "danger"
                ? "#ef4444"
                : feedback.variant === "success"
                  ? "#22c55e"
                  : "#f59e0b"
          }}
        >
          <strong>{feedback.title}</strong>
          <p style={{ margin: "4px 0 0", opacity: 0.8 }}>{feedback.description}</p>
        </div>
      )}

      {/* Cards de métricas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "24px"
        }}
      >
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Temporadas</span>
          <span style={cardValueStyle}>{stats.totalSeasons}</span>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Ativas</span>
          <span
            style={{ ...cardValueStyle, color: stats.activeSeasons > 0 ? "#22c55e" : "#f59e0b" }}
          >
            {stats.activeSeasons}
          </span>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Ranking</span>
          <span style={cardValueStyle}>{stats.totalRanking}</span>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Líder</span>
          <span
            style={{
              fontSize: "1.05rem",
              fontWeight: 700,
              color: "#fff",
              wordBreak: "break-word"
            }}
          >
            {stats.leaderName}
          </span>
          <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.55)" }}>
            {stats.topPoints} pts
          </span>
        </div>
      </div>

      {/* Status da temporada */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", alignItems: "center" }}>
        <span style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.7)" }}>Temporada:</span>
        <span
          style={{
            padding: "6px 12px",
            borderRadius: "8px",
            background: activeSeason ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
            color: activeSeason ? "#22c55e" : "#f59e0b",
            fontSize: "0.875rem",
            fontWeight: 600
          }}
        >
          {activeSeason ? activeSeason.name : "Nenhuma ativa"}
        </span>
        <button
          type="button"
          onClick={() => handleProcessBadges()}
          disabled={processingBadges}
          style={{
            marginLeft: "auto",
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent",
            color: "#fff",
            cursor: "pointer",
            fontSize: "0.875rem"
          }}
        >
          {processingBadges ? "Processando..." : "Processar badges"}
        </button>
      </div>

      {/* Lista + Formulários */}
      <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "1fr 380px" }}>
        {/* Tabelas */}
        <div style={{ display: "grid", gap: "16px" }}>
          {/* Temporadas */}
          <div
            style={{
              background: "#1a1a1a",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid rgba(255,255,255,0.06)"
            }}
          >
            <h4 style={{ margin: "0 0 12px", fontSize: "0.9rem", fontWeight: 600 }}>Temporadas</h4>
            {seasons.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", color: "rgba(255,255,255,0.5)" }}>
                Nenhuma temporada
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "0.75rem"
                      }}
                    >
                      Nome
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "0.75rem"
                      }}
                    >
                      Período
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "0.75rem"
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "8px",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "0.75rem"
                      }}
                    >
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {seasons.map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <td style={{ padding: "8px", fontWeight: 600 }}>{s.name}</td>
                      <td
                        style={{
                          padding: "8px",
                          fontSize: "0.8rem",
                          color: "rgba(255,255,255,0.5)"
                        }}
                      >
                        {formatSeasonPeriod(s)}
                      </td>
                      <td style={{ padding: "8px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                            background: s.active
                              ? "rgba(34,197,94,0.15)"
                              : "rgba(107,114,128,0.15)",
                            color: s.active ? "#22c55e" : "#9ca3af"
                          }}
                        >
                          {s.active ? "Ativa" : "Inativa"}
                        </span>
                      </td>
                      <td style={{ padding: "8px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleActivateSeason(s)}
                          disabled={s.active || activatingSeasonId === s.id}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "4px",
                            border: "1px solid rgba(255,255,255,0.1)",
                            background: "transparent",
                            color: "#fff",
                            cursor: "pointer",
                            fontSize: "0.75rem"
                          }}
                        >
                          {s.active ? "Ativa" : "Ativar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Ranking */}
          <div
            style={{
              background: "#1a1a1a",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid rgba(255,255,255,0.06)"
            }}
          >
            <h4 style={{ margin: "0 0 12px", fontSize: "0.9rem", fontWeight: 600 }}>Ranking</h4>
            {ranking.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", color: "rgba(255,255,255,0.5)" }}>
                Nenhum membro ranqueado
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "0.75rem"
                      }}
                    >
                      Posição
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "0.75rem"
                      }}
                    >
                      Membro
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "8px",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "0.75rem"
                      }}
                    >
                      Pontos
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "0.75rem"
                      }}
                    >
                      Badges
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.slice(0, 10).map((r) => (
                    <tr
                      key={r.memberId}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <td style={{ padding: "8px" }}>
                        <span
                          style={{
                            width: "28px",
                            height: "28px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "6px",
                            background:
                              r.rank <= 3 ? "rgba(134,90,255,0.2)" : "rgba(107,114,128,0.2)",
                            color: r.rank <= 3 ? "#865aff" : "#9ca3af",
                            fontSize: "0.8rem",
                            fontWeight: 700
                          }}
                        >
                          {r.rank}
                        </span>
                      </td>
                      <td style={{ padding: "8px", fontWeight: 600 }}>{r.name}</td>
                      <td
                        style={{
                          padding: "8px",
                          textAlign: "right",
                          fontFamily: "monospace",
                          fontWeight: 700
                        }}
                      >
                        {r.points}
                      </td>
                      <td style={{ padding: "8px" }}>
                        {r.medals.length > 0 ? (
                          r.medals.map((m) => (
                            <span
                              key={m}
                              style={{
                                marginRight: "4px",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "0.65rem",
                                background: "rgba(34,197,94,0.15)",
                                color: "#22c55e"
                              }}
                            >
                              {m}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>
                            -
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Formulários laterais */}
        <div style={{ display: "grid", gap: "16px", height: "fit-content" }}>
          {/* Criar temporada */}
          <div
            style={{
              background: "#1a1a1a",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid rgba(255,255,255,0.06)"
            }}
          >
            <h4 style={{ margin: "0 0 12px", fontSize: "0.9rem", fontWeight: 600 }}>
              Nova temporada
            </h4>
            <form onSubmit={handleSeasonSubmit} style={{ display: "grid", gap: "10px" }}>
              <label
                htmlFor="season-name"
                style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}
              >
                Nome
              </label>
              <input
                id="season-name"
                name="name"
                autoComplete="off"
                value={seasonForm.name}
                onChange={(e) => setSeasonForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nome"
                required
                style={inputStyle}
              />
              <label
                htmlFor="season-starts-at"
                style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}
              >
                Início
              </label>
              <input
                id="season-starts-at"
                type="datetime-local"
                name="startsAt"
                value={seasonForm.startsAt}
                onChange={(e) => setSeasonForm((p) => ({ ...p, startsAt: e.target.value }))}
                required
                style={inputStyle}
              />
              <label
                htmlFor="season-ends-at"
                style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}
              >
                Fim
              </label>
              <input
                id="season-ends-at"
                type="datetime-local"
                name="endsAt"
                value={seasonForm.endsAt}
                onChange={(e) => setSeasonForm((p) => ({ ...p, endsAt: e.target.value }))}
                required
                style={inputStyle}
              />
              <button
                type="submit"
                disabled={seasonSaving}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(90deg, #5932d1 0%, #9b027c 100%)",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {seasonSaving ? "Criando..." : "Criar"}
              </button>
            </form>
          </div>

          {/* Lançar pontos */}
          <div
            style={{
              background: "#1a1a1a",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid rgba(255,255,255,0.06)"
            }}
          >
            <h4 style={{ margin: "0 0 12px", fontSize: "0.9rem", fontWeight: 600 }}>
              Lançar pontos
            </h4>
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "10px" }}>
              <label
                htmlFor="points-member-id"
                style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}
              >
                Member ID
              </label>
              <input
                id="points-member-id"
                name="memberId"
                autoComplete="off"
                value={form.memberId}
                onChange={(e) => setForm((p) => ({ ...p, memberId: e.target.value }))}
                placeholder="Member ID (UUID)"
                required
                style={inputStyle}
              />
              <label
                htmlFor="points-event-id"
                style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}
              >
                Event ID
              </label>
              <input
                id="points-event-id"
                name="eventId"
                autoComplete="off"
                value={form.eventId}
                onChange={(e) => setForm((p) => ({ ...p, eventId: e.target.value }))}
                placeholder="Event ID (UUID)"
                required
                style={inputStyle}
              />
              <label
                htmlFor="points-season-id"
                style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}
              >
                Temporada
              </label>
              <select
                id="points-season-id"
                name="seasonId"
                value={form.seasonId}
                onChange={(e) => setForm((p) => ({ ...p, seasonId: e.target.value }))}
                required
                style={selectStyle}
              >
                <option value="">Selecione</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <label
                htmlFor="points-value"
                style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}
              >
                Pontos
              </label>
              <input
                id="points-value"
                name="points"
                type="number"
                inputMode="numeric"
                autoComplete="off"
                value={form.points}
                onChange={(e) => setForm((p) => ({ ...p, points: e.target.value }))}
                placeholder="Pontos"
                required
                style={inputStyle}
              />
              <label
                htmlFor="points-reason"
                style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}
              >
                Motivo
              </label>
              <textarea
                id="points-reason"
                name="reason"
                autoComplete="off"
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="Motivo"
                required
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
              />
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(90deg, #5932d1 0%, #9b027c 100%)",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {saving ? "Salvando..." : "Lançar"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
