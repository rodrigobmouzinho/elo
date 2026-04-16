"use client";

import type { MemberApplication, MemberApplicationStatus } from "@elo/core";
import type { AlertVariant } from "@elo/ui";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { apiRequest } from "../../lib/auth-client";

type ApplicationsFeed = {
  items: MemberApplication[];
  statuses: MemberApplicationStatus[];
};

type FeedbackState = {
  title: string;
  description: string;
  variant: AlertVariant;
};

type VisibilityFilter = "all" | "open" | "final";

const defaultMembershipExpiration = () =>
  new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 16);

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

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();
  if (normalized.includes("conectar") || normalized.includes("network")) {
    return "Não foi possível conectar ao servidor.";
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

export default function AdesoesPage() {
  const [items, setItems] = useState<MemberApplication[]>([]);
  const [statuses, setStatuses] = useState<MemberApplicationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("open");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStatusId, setSelectedStatusId] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [customStatusLabel, setCustomStatusLabel] = useState("");
  const [membershipExpiresAt, setMembershipExpiresAt] = useState(defaultMembershipExpiration());
  const [rejectReason, setRejectReason] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const selectedApplication = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return items
      .filter((item) => {
        if (visibilityFilter === "open") return !item.status.isFinal;
        if (visibilityFilter === "final") return item.status.isFinal;
        return true;
      })
      .filter((item) => (statusFilter === "all" ? true : item.status.id === statusFilter))
      .filter((item) => {
        if (!normalizedSearch) return true;
        return [item.fullName, item.email, item.whatsapp, item.city, item.state, item.area].some(
          (v) => v?.toLowerCase().includes(normalizedSearch)
        );
      })
      .sort(
        (first, second) =>
          new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
      );
  }, [items, search, statusFilter, visibilityFilter]);

  const activeStatuses = useMemo(
    () => statuses.filter((status) => status.active && !status.isFinal),
    [statuses]
  );

  const metrics = useMemo(() => {
    const open = items.filter((item) => !item.status.isFinal).length;
    const approved = items.filter((item) => item.status.code === "approved").length;
    const rejected = items.filter((item) => item.status.code === "rejected").length;
    const awaiting = items.filter(
      (item) => item.status.code === "awaiting_whatsapp_contact"
    ).length;
    return { total: items.length, open, approved, rejected, awaiting };
  }, [items]);

  useEffect(() => {
    async function loadFeed() {
      try {
        const payload = await apiRequest<ApplicationsFeed>("/admin/member-applications");
        setItems(payload.items);
        setStatuses(payload.statuses);
        setSelectedId(payload.items[0]?.id ?? null);
      } catch (error) {
        setFeedback({
          title: "Erro",
          description: normalizeApiError((error as Error).message),
          variant: "danger"
        });
      } finally {
        setLoading(false);
      }
    }
    void loadFeed();
  }, []);

  useEffect(() => {
    if (!selectedApplication) {
      setSelectedStatusId("");
      setInternalNotes("");
      setRejectReason("");
      setMembershipExpiresAt(defaultMembershipExpiration());
      return;
    }
    setSelectedStatusId(selectedApplication.status.id);
    setInternalNotes(selectedApplication.internalNotes ?? "");
    setRejectReason(selectedApplication.rejectionReason ?? "");
    setMembershipExpiresAt(defaultMembershipExpiration());
  }, [selectedApplication]);

  async function handleCreateStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customStatusLabel.trim()) return;
    setSaving(true);
    try {
      const status = await apiRequest<MemberApplicationStatus>(
        "/admin/member-application-statuses",
        {
          method: "POST",
          body: JSON.stringify({ label: customStatusLabel.trim() })
        }
      );
      setStatuses((current) => [...current, status].sort((a, b) => a.sortOrder - b.sortOrder));
      setCustomStatusLabel("");
      setFeedback({
        title: "Status criado",
        description: `${status.label} adicionado.`,
        variant: "success"
      });
    } catch (error) {
      setFeedback({
        title: "Erro",
        description: normalizeApiError((error as Error).message),
        variant: "danger"
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedApplication) return;
    setSaving(true);
    try {
      await apiRequest(`/admin/member-applications/${selectedApplication.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          statusId:
            selectedStatusId !== selectedApplication.status.id ? selectedStatusId : undefined,
          internalNotes
        })
      });
      setFeedback({ title: "Atualizado", description: "Status salvo.", variant: "success" });
      const payload = await apiRequest<ApplicationsFeed>("/admin/member-applications");
      setItems(payload.items);
    } catch (error) {
      setFeedback({
        title: "Erro",
        description: normalizeApiError((error as Error).message),
        variant: "danger"
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    if (!selectedApplication) return;
    setSaving(true);
    try {
      const result = await apiRequest<{ deliveryMode: string; temporaryPassword?: string }>(
        `/admin/member-applications/${selectedApplication.id}/approve`,
        {
          method: "POST",
          body: JSON.stringify({
            membershipExpiresAt: new Date(membershipExpiresAt).toISOString(),
            internalNotes
          })
        }
      );
      setFeedback({
        title: "Aprovado",
        description:
          result.deliveryMode === "email"
            ? "Conta criada, e-mail enviado."
            : `Conta criada. Senha: ${result.temporaryPassword}`,
        variant: "success"
      });
      const payload = await apiRequest<ApplicationsFeed>("/admin/member-applications");
      setItems(payload.items);
    } catch (error) {
      setFeedback({
        title: "Erro",
        description: normalizeApiError((error as Error).message),
        variant: "danger"
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!selectedApplication) return;
    setSaving(true);
    try {
      await apiRequest(`/admin/member-applications/${selectedApplication.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason, internalNotes })
      });
      setFeedback({ title: "Recusado", description: "Solicitação rejeitada.", variant: "warning" });
      const payload = await apiRequest<ApplicationsFeed>("/admin/member-applications");
      setItems(payload.items);
    } catch (error) {
      setFeedback({
        title: "Erro",
        description: normalizeApiError((error as Error).message),
        variant: "danger"
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
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
          <span style={cardLabelStyle}>Total de Solicitações</span>
          <span style={cardValueStyle}>{metrics.total}</span>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Em Fluxo</span>
          <span style={{ ...cardValueStyle, color: metrics.open > 0 ? "#f59e0b" : "#22c55e" }}>
            {metrics.open}
          </span>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Aprovadas</span>
          <span style={{ ...cardValueStyle, color: "#22c55e" }}>{metrics.approved}</span>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Recusadas</span>
          <span style={{ ...cardValueStyle, color: "#ef4444" }}>{metrics.rejected}</span>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          style={{ ...inputStyle, maxWidth: "300px" }}
        />
        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value as VisibilityFilter)}
          style={{ ...inputStyle, width: "160px" }}
        >
          <option value="all">Todos</option>
          <option value="open">Em fluxo</option>
          <option value="final">Finalizados</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ ...inputStyle, width: "180px" }}
        >
          <option value="all">Todos status</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Lista + Painel lateral */}
      <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "1fr 380px" }}>
        {/* Lista de solicitações */}
        <div
          style={{
            background: "#1a1a1a",
            borderRadius: "12px",
            padding: "16px",
            border: "1px solid rgba(255,255,255,0.06)"
          }}
        >
          {filteredItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.5)" }}>
              Nenhuma solicitação encontrada
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 8px",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.75rem"
                    }}
                  >
                    Candidato
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 8px",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.75rem"
                    }}
                  >
                    Local
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 8px",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.75rem"
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "12px 8px",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.75rem"
                    }}
                  >
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      cursor: "pointer",
                      background: selectedId === item.id ? "rgba(134,90,255,0.1)" : "transparent"
                    }}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span
                          style={{
                            width: "36px",
                            height: "36px",
                            display: "grid",
                            placeItems: "center",
                            borderRadius: "8px",
                            background: "rgba(134,90,255,0.15)",
                            fontWeight: 700,
                            fontSize: "0.875rem"
                          }}
                        >
                          {initials(item.fullName)}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{item.fullName}</div>
                          <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                            {item.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ fontSize: "0.9rem" }}>
                        {item.city}/{item.state}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                        {item.area}
                      </div>
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          background:
                            item.status.code === "approved"
                              ? "rgba(34,197,94,0.15)"
                              : item.status.code === "rejected"
                                ? "rgba(239,68,68,0.15)"
                                : "rgba(245,158,11,0.15)",
                          color:
                            item.status.code === "approved"
                              ? "#22c55e"
                              : item.status.code === "rejected"
                                ? "#ef4444"
                                : "#f59e0b"
                        }}
                      >
                        {item.status.label}
                      </span>
                    </td>
                    <td style={{ padding: "12px 8px", textAlign: "right" }}>
                      <button
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "1px solid rgba(255,255,255,0.1)",
                          background: "transparent",
                          color: "#fff",
                          cursor: "pointer",
                          fontSize: "0.8rem"
                        }}
                      >
                        Gerir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Painel lateral */}
        <div
          style={{
            background: "#1a1a1a",
            borderRadius: "12px",
            padding: "20px",
            border: "1px solid rgba(255,255,255,0.06)",
            height: "fit-content"
          }}
        >
          {selectedApplication ? (
            <div style={{ display: "grid", gap: "16px" }}>
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.5)",
                    marginBottom: "4px"
                  }}
                >
                  CANDIDATO
                </div>
                <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                  {selectedApplication.fullName}
                </div>
                <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}>
                  {selectedApplication.email}
                </div>
                <div style={{ fontSize: "0.9rem" }}>{selectedApplication.whatsapp}</div>
                <div style={{ fontSize: "0.9rem" }}>
                  {selectedApplication.city}/{selectedApplication.state}
                </div>
              </div>

              <form onSubmit={handleSaveWorkflow} style={{ display: "grid", gap: "12px" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "rgba(255,255,255,0.5)",
                      marginBottom: "4px"
                    }}
                  >
                    Status
                  </label>
                  <select
                    value={selectedStatusId}
                    onChange={(e) => setSelectedStatusId(e.target.value)}
                    disabled={selectedApplication.status.isFinal}
                    style={inputStyle}
                  >
                    {activeStatuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "rgba(255,255,255,0.5)",
                      marginBottom: "4px"
                    }}
                  >
                    Notas internas
                  </label>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    border: "none",
                    background: "linear-gradient(90deg, #5932d1 0%, #9b027c 100%)",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </form>

              {!selectedApplication.status.isFinal && (
                <>
                  <div style={{ display: "grid", gap: "12px" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.75rem",
                          color: "rgba(255,255,255,0.5)",
                          marginBottom: "4px"
                        }}
                      >
                        Validade
                      </label>
                      <input
                        type="datetime-local"
                        value={membershipExpiresAt}
                        onChange={(e) => setMembershipExpiresAt(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <button
                      onClick={() => handleApprove()}
                      disabled={saving}
                      style={{
                        padding: "12px",
                        borderRadius: "8px",
                        border: "none",
                        background: "#22c55e",
                        color: "#fff",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Aprovar
                    </button>
                  </div>
                  <div style={{ display: "grid", gap: "12px" }}>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Motivo da recusa"
                      rows={2}
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                    <button
                      onClick={() => handleReject()}
                      disabled={saving || rejectReason.trim().length < 3}
                      style={{
                        padding: "12px",
                        borderRadius: "8px",
                        border: "none",
                        background: "#ef4444",
                        color: "#fff",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Recusar
                    </button>
                  </div>
                </>
              )}

              <form onSubmit={handleCreateStatus} style={{ display: "grid", gap: "8px" }}>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>
                  Novo status
                </div>
                <input
                  value={customStatusLabel}
                  onChange={(e) => setCustomStatusLabel(e.target.value)}
                  placeholder="Nome do status"
                  style={inputStyle}
                />
                <button
                  type="submit"
                  disabled={saving || !customStatusLabel.trim()}
                  style={{
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "transparent",
                    color: "rgba(255,255,255,0.6)",
                    cursor: "pointer",
                    fontSize: "0.8rem"
                  }}
                >
                  Criar status
                </button>
              </form>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.5)" }}>
              Selecione uma solicitação
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
