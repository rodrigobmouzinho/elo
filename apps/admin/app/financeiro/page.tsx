"use client";

import type { AlertVariant } from "@elo/ui";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { apiRequest, getStoredAuth } from "../../lib/auth-client";

type FinanceOverview = {
  membershipRevenueCents: number;
  eventRevenueCents: number;
  pendingMembershipPayments: number;
  pendingEventPayments: number;
  overduePayments: number;
};

type MembershipFinanceRow = {
  membershipId: string;
  memberId: string;
  memberName: string;
  status: "active" | "expired" | "canceled";
  expiresAt: string;
  latestPaymentId: string | null;
  latestPaymentGateway: string | null;
  latestPaymentStatus: "pending" | "paid" | "expired" | "refunded" | "none";
  latestPaymentAmountCents: number;
};

type ManualPaymentInstructions = {
  pixKey: string;
  keyType: string | null;
  beneficiaryName: string | null;
  proofContact: string | null;
  instructions: string;
  txId: string;
  pixCopyPaste: string;
};

type ChargeResponse = {
  membershipId: string;
  gateway: string;
  manualPayment: ManualPaymentInstructions | null;
  checkoutUrl: string | null;
};

type PendingEventPayment = {
  paymentId: string;
  eventId: string;
  eventTitle: string;
  memberId: string;
  memberName: string;
  amountCents: number;
  gateway: string;
  status: "pending" | "paid" | "expired" | "refunded";
  createdAt: string;
};

type DashboardPeriod = "7d" | "30d" | "90d" | "365d" | "all";
type ActiveView = "memberships" | "events";

type FeedbackState = {
  title: string;
  description: string;
  variant: AlertVariant;
};

const PERIOD_OPTIONS = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "365d", label: "12 meses" },
  { value: "all", label: "Total" }
];

const MEMBERSHIP_CHARGE_AMOUNT_CENTS = 100000;

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

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  }).format(cents / 100);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();
  if (normalized.includes("network") || normalized.includes("conexao"))
    return "Não foi possível conectar ao servidor.";
  return raw;
}

export default function FinancePage() {
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [memberships, setMemberships] = useState<MembershipFinanceRow[]>([]);
  const [pendingEventPayments, setPendingEventPayments] = useState<PendingEventPayment[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [loadingFinance, setLoadingFinance] = useState(true);
  const [chargingId, setChargingId] = useState<string | null>(null);
  const [approvingMembershipId, setApprovingMembershipId] = useState<string | null>(null);
  const [approvingEventPaymentId, setApprovingEventPaymentId] = useState<string | null>(null);
  const [dashboardPeriod, setDashboardPeriod] = useState<DashboardPeriod>("30d");
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState<ActiveView>("memberships");

  const loadFinance = useCallback(async () => {
    setLoadingFinance(true);
    try {
      const periodQuery = dashboardPeriod === "all" ? "" : `?period=${dashboardPeriod}`;
      const [overviewData, membershipsData, eventPaymentsData] = await Promise.all([
        apiRequest<FinanceOverview>(`/admin/finance/overview${periodQuery}`),
        apiRequest<MembershipFinanceRow[]>("/admin/finance/memberships"),
        apiRequest<PendingEventPayment[]>("/admin/finance/event-payments")
      ]);
      setOverview(overviewData);
      setMemberships(membershipsData);
      setPendingEventPayments(eventPaymentsData);
    } catch (requestError) {
      setFeedback({
        title: "Erro",
        description: normalizeApiError((requestError as Error).message),
        variant: "danger"
      });
    } finally {
      setLoadingFinance(false);
    }
  }, [dashboardPeriod]);

  useEffect(() => {
    void loadFinance();
  }, [loadFinance]);

  const stats = useMemo(() => {
    const totalRevenue =
      (overview?.membershipRevenueCents ?? 0) + (overview?.eventRevenueCents ?? 0);
    const pending =
      (overview?.pendingMembershipPayments ?? 0) + (overview?.pendingEventPayments ?? 0);
    return {
      totalRevenue,
      pending,
      overdue: overview?.overduePayments ?? 0,
      memberships: memberships.length,
      eventPayments: pendingEventPayments.length
    };
  }, [overview, memberships, pendingEventPayments]);

  const filteredMemberships = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return memberships;
    return memberships.filter((m) => m.memberName.toLowerCase().includes(q));
  }, [memberships, search]);

  const filteredEventPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pendingEventPayments;
    return pendingEventPayments.filter(
      (p) => p.eventTitle.toLowerCase().includes(q) || p.memberName.toLowerCase().includes(q)
    );
  }, [pendingEventPayments, search]);

  async function exportFinanceDashboard() {
    setExporting(true);
    try {
      const auth = getStoredAuth();
      const token = auth?.session?.accessToken;
      if (!token) throw new Error("Não autenticado");
      const periodQuery = dashboardPeriod === "all" ? "" : `?period=${dashboardPeriod}`;
      const response = await fetch(`/backend/admin/finance/export${periodQuery}`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Falha ao exportar");
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `finance-${dashboardPeriod}.csv`;
      link.click();
      setFeedback({ title: "Sucesso", description: "Exportado com sucesso.", variant: "success" });
    } catch (requestError) {
      setFeedback({
        title: "Erro",
        description: normalizeApiError((requestError as Error).message),
        variant: "danger"
      });
    } finally {
      setExporting(false);
    }
  }

  async function generateCharge(item: MembershipFinanceRow) {
    if (
      !window.confirm(
        `Gerar cobrança de ${formatCurrency(MEMBERSHIP_CHARGE_AMOUNT_CENTS)} para ${item.memberName}?`
      )
    )
      return;
    setChargingId(item.membershipId);
    try {
      const charge = await apiRequest<ChargeResponse>(
        `/admin/finance/memberships/${item.membershipId}/charge`,
        {
          method: "POST",
          body: JSON.stringify({ amountCents: MEMBERSHIP_CHARGE_AMOUNT_CENTS, billingType: "PIX" })
        }
      );
      if (charge.manualPayment)
        setFeedback({
          title: "PIX criado",
          description: `TXID: ${charge.manualPayment.txId}`,
          variant: "warning"
        });
      else setFeedback({ title: "Sucesso", description: "Cobrança gerada.", variant: "success" });
      await loadFinance();
    } catch (e) {
      setFeedback({
        title: "Erro",
        description: normalizeApiError((e as Error).message),
        variant: "danger"
      });
    } finally {
      setChargingId(null);
    }
  }

  async function approveMembershipPayment(item: MembershipFinanceRow) {
    if (item.latestPaymentStatus !== "pending") return;
    if (!window.confirm(`Aprovar pagamento de ${formatCurrency(item.latestPaymentAmountCents)}?`))
      return;
    setApprovingMembershipId(item.membershipId);
    try {
      await apiRequest(`/admin/finance/memberships/${item.membershipId}/approve-payment`, {
        method: "POST",
        body: JSON.stringify({ note: "Aprovado" })
      });
      setFeedback({ title: "Aprovado", description: "Pagamento confirmado.", variant: "success" });
      await loadFinance();
    } catch (e) {
      setFeedback({
        title: "Erro",
        description: normalizeApiError((e as Error).message),
        variant: "danger"
      });
    } finally {
      setApprovingMembershipId(null);
    }
  }

  async function approveEventPayment(item: PendingEventPayment) {
    if (item.status !== "pending") return;
    if (!window.confirm(`Aprovar ${formatCurrency(item.amountCents)}?`)) return;
    setApprovingEventPaymentId(item.paymentId);
    try {
      await apiRequest(`/admin/finance/event-payments/${item.paymentId}/approve`, {
        method: "POST",
        body: JSON.stringify({ note: "Aprovado" })
      });
      setFeedback({
        title: "Aprovado",
        description: "Pagamento de evento confirmado.",
        variant: "success"
      });
      await loadFinance();
    } catch (e) {
      setFeedback({
        title: "Erro",
        description: normalizeApiError((e as Error).message),
        variant: "danger"
      });
    } finally {
      setApprovingEventPaymentId(null);
    }
  }

  if (loadingFinance) {
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
          <span style={cardLabelStyle}>Receita Total</span>
          <span style={{ ...cardValueStyle, color: "#865aff" }}>
            {formatCurrency(stats.totalRevenue)}
          </span>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Pendentes</span>
          <span style={{ ...cardValueStyle, color: stats.pending > 0 ? "#f59e0b" : "#22c55e" }}>
            {stats.pending}
          </span>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Anuidades</span>
          <span style={cardValueStyle}>{stats.memberships}</span>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Eventos</span>
          <span style={cardValueStyle}>{stats.eventPayments}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", alignItems: "center" }}>
        <select
          value={dashboardPeriod}
          onChange={(e) => setDashboardPeriod(e.target.value as DashboardPeriod)}
          aria-label="Período do dashboard"
          name="dashboardPeriod"
          style={{ ...selectStyle, width: "140px" }}
        >
          {PERIOD_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          aria-label="Buscar lançamentos"
          name="search"
          autoComplete="off"
          style={{ ...inputStyle, flex: 1, maxWidth: "300px" }}
        />
        <button
          type="button"
          onClick={() => exportFinanceDashboard()}
          disabled={exporting}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          {exporting ? "Exportando..." : "Exportar CSV"}
        </button>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button
          type="button"
          onClick={() => setActiveView("memberships")}
          aria-pressed={activeView === "memberships"}
          style={{
            padding: "10px 20px",
            borderRadius: "8px 8px 0 0",
            border: "none",
            background: activeView === "memberships" ? "#1a1a1a" : "#252525",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          Anuidades ({filteredMemberships.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveView("events")}
          aria-pressed={activeView === "events"}
          style={{
            padding: "10px 20px",
            borderRadius: "8px 8px 0 0",
            border: "none",
            background: activeView === "events" ? "#1a1a1a" : "#252525",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          Eventos ({filteredEventPayments.length})
        </button>
      </div>

      {/* Tabela */}
      <div
        style={{
          background: "#1a1a1a",
          borderRadius: "12px",
          padding: "16px",
          border: "1px solid rgba(255,255,255,0.06)"
        }}
      >
        {activeView === "memberships" ? (
          filteredMemberships.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.5)" }}>
              Nenhuma anuidade
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.75rem"
                    }}
                  >
                    Membro
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.75rem"
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.75rem"
                    }}
                  >
                    Pagamento
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "12px",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.75rem"
                    }}
                  >
                    Valor
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "12px",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.75rem"
                    }}
                  >
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMemberships.map((m) => (
                  <tr
                    key={m.membershipId}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: 600 }}>{m.memberName}</div>
                      <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                        Expira: {new Date(m.expiresAt).toLocaleDateString("pt-BR")}
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "0.7rem",
                          background:
                            m.status === "active"
                              ? "rgba(34,197,94,0.15)"
                              : "rgba(245,158,11,0.15)",
                          color: m.status === "active" ? "#22c55e" : "#f59e0b"
                        }}
                      >
                        {m.status === "active"
                          ? "Ativa"
                          : m.status === "expired"
                            ? "Expirada"
                            : "Cancelada"}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "0.7rem",
                          background:
                            m.latestPaymentStatus === "paid"
                              ? "rgba(34,197,94,0.15)"
                              : m.latestPaymentStatus === "pending"
                                ? "rgba(245,158,11,0.15)"
                                : "rgba(107,114,128,0.15)",
                          color:
                            m.latestPaymentStatus === "paid"
                              ? "#22c55e"
                              : m.latestPaymentStatus === "pending"
                                ? "#f59e0b"
                                : "#9ca3af"
                        }}
                      >
                        {m.latestPaymentStatus === "paid"
                          ? "Pago"
                          : m.latestPaymentStatus === "pending"
                            ? "Pendente"
                            : "Sem pagamento"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        textAlign: "right",
                        fontFamily: "monospace",
                        fontWeight: 700
                      }}
                    >
                      {formatCurrency(m.latestPaymentAmountCents)}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => approveMembershipPayment(m)}
                        disabled={
                          approvingMembershipId === m.membershipId ||
                          m.latestPaymentStatus !== "pending"
                        }
                        style={{
                          marginRight: "8px",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "1px solid rgba(255,255,255,0.1)",
                          background: "transparent",
                          color: "#fff",
                          cursor: "pointer",
                          fontSize: "0.8rem"
                        }}
                      >
                        {approvingMembershipId === m.membershipId
                          ? "..."
                          : m.latestPaymentStatus === "pending"
                            ? "Aprovar"
                            : "-"}
                      </button>
                      <button
                        type="button"
                        onClick={() => generateCharge(m)}
                        disabled={chargingId === m.membershipId}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "none",
                          background: "rgba(134,90,255,0.2)",
                          color: "#865aff",
                          cursor: "pointer",
                          fontSize: "0.8rem"
                        }}
                      >
                        {chargingId === m.membershipId ? "..." : "PIX"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : filteredEventPayments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.5)" }}>
            Nenhum pagamento de evento
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "0.75rem"
                  }}
                >
                  Evento
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "0.75rem"
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "12px",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "0.75rem"
                  }}
                >
                  Valor
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "0.75rem"
                  }}
                >
                  Data
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "12px",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "0.75rem"
                  }}
                >
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEventPayments.map((p) => (
                <tr key={p.paymentId} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <td style={{ padding: "12px" }}>
                    <div style={{ fontWeight: 600 }}>{p.eventTitle}</div>
                    <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                      {p.memberName}
                    </div>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "999px",
                        fontSize: "0.7rem",
                        background:
                          p.status === "paid"
                            ? "rgba(34,197,94,0.15)"
                            : p.status === "pending"
                              ? "rgba(245,158,11,0.15)"
                              : "rgba(239,68,68,0.15)",
                        color:
                          p.status === "paid"
                            ? "#22c55e"
                            : p.status === "pending"
                              ? "#f59e0b"
                              : "#ef4444"
                      }}
                    >
                      {p.status === "paid"
                        ? "Pago"
                        : p.status === "pending"
                          ? "Pendente"
                          : p.status === "expired"
                            ? "Expirado"
                            : "Estornado"}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontWeight: 700
                    }}
                  >
                    {formatCurrency(p.amountCents)}
                  </td>
                  <td style={{ padding: "12px", fontSize: "0.85rem" }}>
                    {formatDateTime(p.createdAt)}
                  </td>
                  <td style={{ padding: "12px", textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => approveEventPayment(p)}
                      disabled={approvingEventPaymentId === p.paymentId || p.status !== "pending"}
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
                      {approvingEventPaymentId === p.paymentId
                        ? "..."
                        : p.status === "pending"
                          ? "Aprovar"
                          : "-"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
