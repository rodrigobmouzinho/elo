"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  FilterBar,
  Input,
  MetricStrip,
  PageHeader,
  PriorityStrip,
  SectionTabs,
  Select
} from "@elo/ui";
import type { AlertVariant, BadgeVariant } from "@elo/ui";
import { CreditCard, Download, Receipt, ShieldCheck, TriangleAlert, WalletCards } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  pixQrCodeImage: string;
  amountCents: number;
  externalReference: string;
};

type ChargeResponse = {
  membershipId: string;
  gateway: string;
  gatewayPaymentId: string | null;
  checkoutUrl: string | null;
  pixQrCode: string | null;
  manualPayment: ManualPaymentInstructions | null;
  dueDate: string | null;
  value: number;
  paymentStatus: "pending" | "paid" | "expired" | "refunded";
};

type PendingEventPayment = {
  paymentId: string;
  eventId: string;
  eventTitle: string;
  memberId: string;
  memberName: string;
  amountCents: number;
  gateway: string;
  gatewayPaymentId: string | null;
  externalReference: string | null;
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

const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "365d", label: "Últimos 12 meses" },
  { value: "all", label: "Período completo" }
];

const MEMBERSHIP_CHARGE_AMOUNT_CENTS = 100000;

function buildFinancePeriodQuery(period: DashboardPeriod) {
  if (period === "all") {
    return "";
  }

  const search = new URLSearchParams();
  search.set("period", period);
  return `?${search.toString()}`;
}

function resolveFileNameFromDisposition(value: string | null, fallback: string) {
  if (!value) {
    return fallback;
  }

  const match = value.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? fallback;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  }).format(cents / 100);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "Não foi possível conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

function formatManualChargeMessage(instructions: ManualPaymentInstructions, amountCents: number) {
  const keyType = instructions.keyType ? ` (${instructions.keyType})` : "";
  const beneficiary = instructions.beneficiaryName ? `Favorecido: ${instructions.beneficiaryName}. ` : "";
  const proofContact = instructions.proofContact ? `Comprovante: ${instructions.proofContact}. ` : "";

  return [
    `Cobrança manual criada com valor ${formatCurrency(amountCents)}.`,
    `TXID: ${instructions.txId}.`,
    `Chave PIX${keyType}: ${instructions.pixKey}.`,
    `PIX copia e cola: ${instructions.pixCopyPaste}.`,
    beneficiary,
    proofContact,
    instructions.instructions
  ]
    .filter(Boolean)
    .join(" ");
}

function membershipStatusLabel(status: MembershipFinanceRow["status"]) {
  if (status === "active") return "Ativa";
  if (status === "expired") return "Expirada";
  return "Cancelada";
}

function membershipStatusBadgeVariant(status: MembershipFinanceRow["status"]): BadgeVariant {
  if (status === "active") return "success";
  if (status === "expired") return "warning";
  return "neutral";
}

function paymentStatusLabel(status: MembershipFinanceRow["latestPaymentStatus"] | PendingEventPayment["status"]) {
  if (status === "pending") return "Pendente";
  if (status === "paid") return "Pago";
  if (status === "expired") return "Expirado";
  if (status === "refunded") return "Estornado";
  return "Sem pagamento";
}

function paymentStatusBadgeVariant(
  status: MembershipFinanceRow["latestPaymentStatus"] | PendingEventPayment["status"]
): BadgeVariant {
  if (status === "paid") return "success";
  if (status === "pending") return "warning";
  if (status === "expired" || status === "refunded") return "danger";
  return "neutral";
}

function priorityLabel(variant: BadgeVariant) {
  if (variant === "danger") return "Ação imediata";
  if (variant === "warning") return "Prioridade";
  if (variant === "brand") return "Estratégico";
  if (variant === "info") return "Operacional";
  return "Estável";
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
      const periodQuery = buildFinancePeriodQuery(dashboardPeriod);

      const [overviewData, membershipsData, pendingEventPaymentsData] = await Promise.all([
        apiRequest<FinanceOverview>(`/admin/finance/overview${periodQuery}`),
        apiRequest<MembershipFinanceRow[]>("/admin/finance/memberships"),
        apiRequest<PendingEventPayment[]>("/admin/finance/event-payments")
      ]);

      setOverview(overviewData);
      setMemberships(membershipsData);
      setPendingEventPayments(pendingEventPaymentsData);
    } catch (requestError) {
      setFeedback({
        title: "Falha ao carregar financeiro",
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

  const pendingTotal = useMemo(() => {
    if (!overview) return 0;
    return overview.pendingMembershipPayments + overview.pendingEventPayments;
  }, [overview]);

  const totalRevenueCents = useMemo(() => {
    if (!overview) return 0;
    return overview.membershipRevenueCents + overview.eventRevenueCents;
  }, [overview]);

  const pendingApprovalAmountCents = useMemo(() => {
    const membershipPending = memberships
      .filter((item) => item.latestPaymentStatus === "pending")
      .reduce((total, item) => total + item.latestPaymentAmountCents, 0);
    const eventPending = pendingEventPayments
      .filter((item) => item.status === "pending")
      .reduce((total, item) => total + item.amountCents, 0);

    return membershipPending + eventPending;
  }, [memberships, pendingEventPayments]);

  const financeQueueDigest = useMemo(
    () => [
      {
        label: "Fila total",
        value: pendingTotal.toLocaleString("pt-BR"),
        hint: "itens aguardando decisão"
      },
      {
        label: "Valor em trânsito",
        value: formatCurrency(pendingApprovalAmountCents),
        hint: "PIX e cobranças em reconciliação"
      },
      {
        label: "Cobranças vencidas",
        value: (overview?.overduePayments ?? 0).toLocaleString("pt-BR"),
        hint: "precisam de decisão imediata"
      }
    ],
    [overview?.overduePayments, pendingApprovalAmountCents, pendingTotal]
  );

  const priorities = useMemo(() => {
    if (!overview) return [] as Array<{ title: string; description: string; tone: BadgeVariant; href?: string }>;

    const items: Array<{ title: string; description: string; tone: BadgeVariant; href?: string }> = [];

    if (overview.overduePayments > 0) {
      items.push({
        title: "Regularizar cobranças vencidas",
        description: `${overview.overduePayments} cobrança(s) precisam de decisão imediata no fechamento atual.`,
        tone: "danger",
        href: "#fila-operacional"
      });
    }

    if (overview.pendingMembershipPayments > 0) {
      items.push({
        title: "Aprovar anuidades pendentes",
        description: `${overview.pendingMembershipPayments} anuidade(s) aguardam validação manual.`,
        tone: "warning",
        href: "#fila-operacional"
      });
    }

    if (overview.pendingEventPayments > 0) {
      items.push({
        title: "Destravar pagamentos de eventos",
        description: `${overview.pendingEventPayments} confirmação(ões) de evento estão na fila de reconciliação.`,
        tone: "info",
        href: "#fila-operacional"
      });
    }

    if (items.length === 0) {
      items.push({
        title: "Operação financeira saudável",
        description: "Sem pendências críticas. Mantenha exportação e conferência como rotina de controle.",
        tone: "success"
      });
    }

    return items;
  }, [overview]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredMemberships = useMemo(() => {
    if (!normalizedSearch) return memberships;

    return memberships.filter((item) => {
      const haystack = [
        item.memberName,
        membershipStatusLabel(item.status),
        paymentStatusLabel(item.latestPaymentStatus),
        item.latestPaymentGateway ?? "manual_pix"
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [memberships, normalizedSearch]);

  const filteredEventPayments = useMemo(() => {
    if (!normalizedSearch) return pendingEventPayments;

    return pendingEventPayments.filter((item) => {
      const haystack = [
        item.eventTitle,
        item.memberName,
        paymentStatusLabel(item.status),
        item.gateway,
        item.externalReference ?? ""
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [normalizedSearch, pendingEventPayments]);

  async function exportFinanceDashboard() {
    setExporting(true);
    setFeedback(null);

    try {
      const auth = getStoredAuth();
      const token = auth?.session?.accessToken;

      if (!token) {
        throw new Error("Você precisa estar autenticado.");
      }

      const periodQuery = buildFinancePeriodQuery(dashboardPeriod);
      const response = await fetch(`/backend/admin/finance/export${periodQuery}`, {
        method: "GET",
        headers: {
          authorization: `Bearer ${token}`
        },
        cache: "no-store"
      });

      if (!response.ok) {
        let message = "Falha ao exportar dashboard financeiro";

        try {
          const payload = await response.json();
          if (payload?.error) {
            message = payload.error;
          }
        } catch {}

        throw new Error(message);
      }

      const blob = await response.blob();
      const fallbackName = `finance-dashboard-${dashboardPeriod}.csv`;
      const filename = resolveFileNameFromDisposition(response.headers.get("content-disposition"), fallbackName);

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setFeedback({
        title: "Exportação concluída",
        description: `Arquivo gerado com sucesso: ${filename}.`,
        variant: "success"
      });
    } catch (requestError) {
      setFeedback({
        title: "Falha ao exportar dashboard",
        description: normalizeApiError((requestError as Error).message),
        variant: "danger"
      });
    } finally {
      setExporting(false);
    }
  }

  async function generateCharge(item: MembershipFinanceRow) {
    const confirmed = window.confirm(
      `Gerar cobrança manual PIX de ${formatCurrency(MEMBERSHIP_CHARGE_AMOUNT_CENTS)} para ${item.memberName}?`
    );

    if (!confirmed) return;

    setChargingId(item.membershipId);
    setFeedback(null);

    try {
      const charge = await apiRequest<ChargeResponse>(`/admin/finance/memberships/${item.membershipId}/charge`, {
        method: "POST",
        body: JSON.stringify({
          amountCents: MEMBERSHIP_CHARGE_AMOUNT_CENTS,
          billingType: "PIX"
        })
      });

      if (charge.gateway === "manual_pix" && charge.manualPayment) {
        setFeedback({
          title: "Cobrança manual PIX criada",
          description: formatManualChargeMessage(charge.manualPayment, MEMBERSHIP_CHARGE_AMOUNT_CENTS),
          variant: "warning"
        });
      } else if (charge.checkoutUrl) {
        setFeedback({
          title: "Cobrança criada",
          description: `Checkout disponível em: ${charge.checkoutUrl}`,
          variant: "success"
        });
      } else {
        setFeedback({
          title: "Cobrança criada",
          description: "Cobrança registrada com sucesso no módulo financeiro.",
          variant: "success"
        });
      }

      await loadFinance();
    } catch (chargeError) {
      setFeedback({
        title: "Falha ao gerar cobrança",
        description: normalizeApiError((chargeError as Error).message),
        variant: "danger"
      });
    } finally {
      setChargingId(null);
    }
  }

  async function approveMembershipPayment(item: MembershipFinanceRow) {
    if (item.latestPaymentStatus !== "pending") {
      return;
    }

    const confirmed = window.confirm(
      `Confirmar pagamento manual de ${formatCurrency(item.latestPaymentAmountCents)} para ${item.memberName}?`
    );

    if (!confirmed) return;

    setApprovingMembershipId(item.membershipId);
    setFeedback(null);

    try {
      await apiRequest(`/admin/finance/memberships/${item.membershipId}/approve-payment`, {
        method: "POST",
        body: JSON.stringify({
          note: "Aprovado manualmente no painel admin"
        })
      });

      setFeedback({
        title: "Pagamento de anuidade aprovado",
        description: `Pagamento de ${item.memberName} confirmado com sucesso.`,
        variant: "success"
      });
      await loadFinance();
    } catch (approveError) {
      setFeedback({
        title: "Falha ao aprovar anuidade",
        description: normalizeApiError((approveError as Error).message),
        variant: "danger"
      });
    } finally {
      setApprovingMembershipId(null);
    }
  }

  async function approveEventPayment(item: PendingEventPayment) {
    if (item.status !== "pending") {
      return;
    }

    const confirmed = window.confirm(
      `Aprovar pagamento de ${formatCurrency(item.amountCents)} para ${item.memberName} no evento ${item.eventTitle}?`
    );

    if (!confirmed) return;

    setApprovingEventPaymentId(item.paymentId);
    setFeedback(null);

    try {
      await apiRequest(`/admin/finance/event-payments/${item.paymentId}/approve`, {
        method: "POST",
        body: JSON.stringify({
          note: "Aprovado manualmente no painel admin"
        })
      });

      setFeedback({
        title: "Pagamento de evento aprovado",
        description: `Pagamento de ${item.memberName} aprovado e presença confirmada no evento.`,
        variant: "success"
      });
      await loadFinance();
    } catch (approveError) {
      setFeedback({
        title: "Falha ao aprovar evento",
        description: normalizeApiError((approveError as Error).message),
        variant: "danger"
      });
    } finally {
      setApprovingEventPaymentId(null);
    }
  }

  return (
    <AdminShell>
      <div style={{ display: "grid", gap: "18px" }}>
        <PageHeader
          eyebrow={<Badge variant="brand">Financeiro Admin</Badge>}
          title="Operação financeira em tempo real"
          description="Leia receita, pendências e aprovações em uma única superfície. A prioridade aqui é enxergar o próximo desbloqueio em segundos."
          actions={[
            {
              label: exporting ? "Exportando..." : "Exportar CSV",
              onClick: () => void exportFinanceDashboard(),
              variant: "secondary"
            }
          ]}
          meta={
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Badge variant="info">PIX manual only</Badge>
              <Badge variant="neutral">Conciliação orientada por fila</Badge>
              <Badge variant="brand">Período: {PERIOD_OPTIONS.find((item) => item.value === dashboardPeriod)?.label}</Badge>
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
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))"
          }}
        >
          <article
            style={{
              display: "grid",
              gap: "18px",
              padding: "22px",
              borderRadius: "28px",
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "radial-gradient(110% 120% at 0% 0%, rgba(134, 90, 255, 0.22), rgba(134, 90, 255, 0) 34%), linear-gradient(180deg, rgba(15, 16, 23, 0.98), rgba(21, 24, 36, 0.95))",
              color: "var(--elo-text-inverse, #FFFFFF)",
              boxShadow: "0 24px 48px rgba(12, 14, 22, 0.3)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ display: "grid", gap: "8px", maxWidth: "48ch" }}>
                <Badge variant="brand" style={{ justifySelf: "start" }}>
                  Mesa de caixa
                </Badge>
                <h2 style={{ margin: 0, fontSize: "clamp(1.5rem, 3vw, 2.3rem)", lineHeight: 0.98 }}>
                  A operação precisa mostrar o próximo desbloqueio antes do fechamento.
                </h2>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.72)", lineHeight: 1.7 }}>
                  Aqui a leitura principal é simples: risco imediato, dinheiro em trânsito e fila que destrava presença, anuidade e receita sem espalhar o contexto em várias telas.
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "8px",
                  minWidth: "240px",
                  padding: "14px 16px",
                  borderRadius: "18px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)"
                }}
              >
                <span style={{ fontSize: ".76rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.58)" }}>
                  Receita consolidada
                </span>
                <strong style={{ fontFamily: "var(--elo-font-mono)", fontSize: "clamp(1.7rem, 3vw, 2.4rem)", lineHeight: 1 }}>
                  {formatCurrency(totalRevenueCents)}
                </strong>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: ".92rem" }}>
                  {PERIOD_OPTIONS.find((item) => item.value === dashboardPeriod)?.label}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              {financeQueueDigest.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "grid",
                    gap: "6px",
                    padding: "16px",
                    borderRadius: "18px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)"
                  }}
                >
                  <span style={{ fontSize: ".75rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.56)" }}>
                    {item.label}
                  </span>
                  <strong style={{ fontFamily: "var(--elo-font-mono)", fontSize: "1.26rem" }}>{item.value}</strong>
                  <span style={{ color: "rgba(255,255,255,0.68)", fontSize: ".88rem" }}>{item.hint}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Badge variant="info">PIX manual only</Badge>
              <Badge variant="warning">{overview?.pendingMembershipPayments ?? 0} anuidades aguardando</Badge>
              <Badge variant="neutral">{overview?.pendingEventPayments ?? 0} eventos em reconciliação</Badge>
            </div>
          </article>

          <div style={{ display: "grid", gap: "14px", alignContent: "start" }}>
            <Card
              title="Janela de operação"
              subtitle="Recorte, busca e visão ativa precisam orientar a leitura antes da aprovação."
              tone="panel"
              headerAside={<Download size={16} color="var(--elo-orbit, #865AFF)" />}
              style={{ borderRadius: "26px" }}
            >
              <div style={{ display: "grid", gap: "10px" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <Badge variant="brand">{PERIOD_OPTIONS.find((item) => item.value === dashboardPeriod)?.label}</Badge>
                  <Badge variant="info">Visão: {activeView === "memberships" ? "Anuidades" : "Eventos"}</Badge>
                </div>
                <div
                  style={{
                    display: "grid",
                    gap: "4px",
                    padding: "14px 16px",
                    borderRadius: "18px",
                    background: "rgba(255,255,255,0.76)",
                    border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))"
                  }}
                >
                  <span style={{ color: "var(--elo-text-tertiary, #6B7280)", fontSize: ".76rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Busca ativa
                  </span>
                  <strong>{normalizedSearch || "Nenhuma busca aplicada"}</strong>
                </div>
                <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>
                  Exporte o consolidado no fim de cada ciclo para registrar fechamento e auditoria externa.
                </span>
              </div>
            </Card>

            <Card
              title="Faixa crítica"
              subtitle="Tudo o que pode travar caixa, evento ou acesso aparece antes do detalhe."
              style={{ borderRadius: "26px" }}
            >
              <div style={{ display: "grid", gap: "10px" }}>
                {priorities.slice(0, 3).map((item) => (
                  <div
                    key={`${item.title}-${item.tone}`}
                    style={{
                      display: "grid",
                      gap: "5px",
                      padding: "12px 14px",
                      borderRadius: "16px",
                      background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,250,255,0.82))",
                      border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                      <strong>{item.title}</strong>
                      <Badge variant={item.tone}>{priorityLabel(item.tone)}</Badge>
                    </div>
                    <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".9rem", lineHeight: 1.55 }}>{item.description}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <PriorityStrip
          items={priorities.map((item) => ({
            title: item.title,
            description: item.description,
            tone: item.tone,
            href: item.href,
            actionLabel: "Abrir fila"
          }))}
        />

        <MetricStrip
          items={[
            {
              label: "Receita total",
              value: formatCurrency(totalRevenueCents),
              hint: "Anuidades + eventos no período",
              tone: "brand",
              badge: <WalletCards size={16} />
            },
            {
              label: "Anuidades",
              value: formatCurrency(overview?.membershipRevenueCents ?? 0),
              hint: `${overview?.pendingMembershipPayments ?? 0} pendência(s)`,
              badge: <Receipt size={16} />
            },
            {
              label: "Eventos",
              value: formatCurrency(overview?.eventRevenueCents ?? 0),
              hint: `${overview?.pendingEventPayments ?? 0} em validação`,
              badge: <CreditCard size={16} />
            },
            {
              label: "Pendências totais",
              value: pendingTotal.toLocaleString("pt-BR"),
              hint: "Aguardando reconciliação",
              badge: <ShieldCheck size={16} />
            },
            {
              label: "Em atraso",
              value: (overview?.overduePayments ?? 0).toLocaleString("pt-BR"),
              hint: "Cobranças que exigem decisão",
              tone: overview?.overduePayments ? "danger" : "neutral",
              badge: <TriangleAlert size={16} />
            }
          ]}
        />

        <FilterBar
          actions={
            <Button variant="ghost" size="sm" onClick={() => void loadFinance()}>
              Atualizar visão
            </Button>
          }
        >
          <label style={{ display: "grid", gap: "6px", minWidth: "220px" }}>
            <span style={{ fontSize: ".78rem", fontWeight: 700, color: "var(--elo-text-tertiary, #6B7280)" }}>Período</span>
            <Select value={dashboardPeriod} onChange={(event) => setDashboardPeriod(event.target.value as DashboardPeriod)}>
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>

          <label style={{ display: "grid", gap: "6px", minWidth: "280px", flex: "1 1 280px" }}>
            <span style={{ fontSize: ".78rem", fontWeight: 700, color: "var(--elo-text-tertiary, #6B7280)" }}>Buscar membro, evento ou status</span>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ex.: Ana, pendente, Summit..."
              type="search"
            />
          </label>
        </FilterBar>

        <section
          id="fila-operacional"
          style={{ display: "grid", gap: "18px", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}
        >
          <div style={{ display: "grid", gap: "14px", minWidth: 0 }}>
            <SectionTabs
              items={[
                { id: "memberships", label: "Anuidades", badge: filteredMemberships.length.toLocaleString("pt-BR") },
                { id: "events", label: "Eventos", badge: filteredEventPayments.length.toLocaleString("pt-BR") }
              ]}
              active={activeView}
              onChange={(value) => setActiveView(value as ActiveView)}
            />

            {loadingFinance && !overview ? (
              <Alert variant="info" title="Atualizando financeiro">
                Carregando indicadores, anuidades e pendências de eventos.
              </Alert>
            ) : null}

            {activeView === "memberships" ? (
              <DataTable
                rowKey={(row) => row.membershipId}
                rows={filteredMemberships}
                emptyState={
                  <EmptyState
                    icon={<Receipt size={18} />}
                    title="Nenhuma anuidade no recorte atual"
                    description="A fila de anuidades será exibida aqui assim que houver dados compatíveis com o período ou com a busca aplicada."
                  />
                }
                columns={[
                  {
                    key: "member",
                    header: "Membro",
                    sortable: true,
                    sortValue: (row) => row.memberName,
                    render: (row) => (
                      <div style={{ display: "grid", gap: "6px" }}>
                        <strong>{row.memberName}</strong>
                        <span style={{ color: "var(--elo-text-tertiary, #6B7280)", fontSize: ".86rem" }}>
                          Expira em {formatDate(row.expiresAt)}
                        </span>
                      </div>
                    )
                  },
                  {
                    key: "membership-status",
                    header: "Anuidade",
                    render: (row) => (
                      <Badge variant={membershipStatusBadgeVariant(row.status)}>{membershipStatusLabel(row.status)}</Badge>
                    )
                  },
                  {
                    key: "payment-status",
                    header: "Pagamento",
                    render: (row) => (
                      <div style={{ display: "grid", gap: "6px" }}>
                        <Badge variant={paymentStatusBadgeVariant(row.latestPaymentStatus)}>
                          {paymentStatusLabel(row.latestPaymentStatus)}
                        </Badge>
                        <span style={{ color: "var(--elo-text-tertiary, #6B7280)", fontSize: ".82rem" }}>
                          {row.latestPaymentId ? `ID ${row.latestPaymentId.slice(0, 8)}` : "Sem histórico recente"}
                        </span>
                      </div>
                    )
                  },
                  {
                    key: "gateway",
                    header: "Gateway",
                    render: (row) => <Badge variant="info">{row.latestPaymentGateway ?? "manual_pix"}</Badge>
                  },
                  {
                    key: "amount",
                    header: "Valor",
                    align: "right",
                    sortable: true,
                    sortValue: (row) => row.latestPaymentAmountCents,
                    render: (row) => (
                      <span style={{ fontFamily: "var(--elo-font-mono)", fontWeight: 700 }}>
                        {formatCurrency(row.latestPaymentAmountCents)}
                      </span>
                    )
                  },
                  {
                    key: "actions",
                    header: "Ações",
                    width: "260px",
                    render: (row) => {
                      const canApprove = row.latestPaymentStatus === "pending";

                      return (
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <Button
                            size="sm"
                            onClick={() => void approveMembershipPayment(row)}
                            disabled={approvingMembershipId === row.membershipId || !canApprove}
                          >
                            {approvingMembershipId === row.membershipId
                              ? "Aprovando..."
                              : canApprove
                                ? "Aprovar"
                                : "Sem pendência"}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void generateCharge(row)}
                            disabled={chargingId === row.membershipId}
                          >
                            {chargingId === row.membershipId ? "Gerando..." : "Gerar PIX"}
                          </Button>
                        </div>
                      );
                    }
                  }
                ]}
              />
            ) : (
              <DataTable
                rowKey={(row) => row.paymentId}
                rows={filteredEventPayments}
                emptyState={
                  <EmptyState
                    icon={<ShieldCheck size={18} />}
                    title="Nenhuma pendência de evento"
                    description="Quando houver comprovantes aguardando aprovação, a fila aparecerá aqui com contexto e ação direta."
                  />
                }
                columns={[
                  {
                    key: "event",
                    header: "Evento",
                    sortable: true,
                    sortValue: (row) => row.eventTitle,
                    render: (row) => (
                      <div style={{ display: "grid", gap: "6px" }}>
                        <strong>{row.eventTitle}</strong>
                        <span style={{ color: "var(--elo-text-tertiary, #6B7280)", fontSize: ".86rem" }}>
                          {row.memberName}
                        </span>
                      </div>
                    )
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (row) => <Badge variant={paymentStatusBadgeVariant(row.status)}>{paymentStatusLabel(row.status)}</Badge>
                  },
                  {
                    key: "gateway",
                    header: "Gateway",
                    render: (row) => (
                      <div style={{ display: "grid", gap: "6px" }}>
                        <Badge variant="info">{row.gateway}</Badge>
                        <span style={{ color: "var(--elo-text-tertiary, #6B7280)", fontSize: ".82rem" }}>
                          {row.externalReference ?? "Sem referência externa"}
                        </span>
                      </div>
                    )
                  },
                  {
                    key: "amount",
                    header: "Valor",
                    align: "right",
                    sortable: true,
                    sortValue: (row) => row.amountCents,
                    render: (row) => (
                      <span style={{ fontFamily: "var(--elo-font-mono)", fontWeight: 700 }}>
                        {formatCurrency(row.amountCents)}
                      </span>
                    )
                  },
                  {
                    key: "created",
                    header: "Entrada",
                    sortable: true,
                    sortValue: (row) => new Date(row.createdAt).getTime(),
                    render: (row) => (
                      <span style={{ color: "var(--elo-text-secondary, #374151)" }}>{formatDateTime(row.createdAt)}</span>
                    )
                  },
                  {
                    key: "actions",
                    header: "Ações",
                    width: "220px",
                    render: (row) => {
                      const canApprove = row.status === "pending";

                      return (
                        <Button
                          size="sm"
                          onClick={() => void approveEventPayment(row)}
                          disabled={approvingEventPaymentId === row.paymentId || !canApprove}
                        >
                          {approvingEventPaymentId === row.paymentId
                            ? "Aprovando..."
                            : canApprove
                              ? "Aprovar e confirmar"
                              : "Tratado"}
                        </Button>
                      );
                    }
                  }
                ]}
              />
            )}
          </div>

          <div style={{ display: "grid", gap: "14px", alignContent: "start" }}>
            <Card
              title="Radar de aprovação"
              subtitle="A lateral funciona como a bancada de decisão rápida do módulo."
              tone="panel"
              style={{
                borderRadius: "26px",
                background:
                  "radial-gradient(150% 130% at 0% 0%, rgba(134, 90, 255, 0.18), rgba(134, 90, 255, 0) 42%), linear-gradient(180deg, rgba(248,250,255,0.96), rgba(241,244,255,0.92))"
              }}
            >
              <div style={{ display: "grid", gap: "12px" }}>
                {[
                  {
                    label: "Anuidades pendentes",
                    value: (overview?.pendingMembershipPayments ?? 0).toLocaleString("pt-BR"),
                    hint: "aguardando validação manual"
                  },
                  {
                    label: "Eventos pendentes",
                    value: (overview?.pendingEventPayments ?? 0).toLocaleString("pt-BR"),
                    hint: "comprovantes para conciliar"
                  },
                  {
                    label: "Valor em trânsito",
                    value: formatCurrency(pendingApprovalAmountCents),
                    hint: "montante que ainda não virou receita confirmada"
                  }
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "grid",
                      gap: "5px",
                      padding: "14px 16px",
                      borderRadius: "18px",
                      background: "rgba(255,255,255,0.72)",
                      border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))"
                    }}
                  >
                    <span style={{ color: "var(--elo-text-tertiary, #6B7280)", fontSize: ".76rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {item.label}
                    </span>
                    <strong style={{ fontFamily: "var(--elo-font-mono)", fontSize: "1.14rem" }}>{item.value}</strong>
                    <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".9rem", lineHeight: 1.55 }}>{item.hint}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card
              title="Guia de aprovação manual"
              subtitle="Use a fila para validar prova de pagamento e manter rastreabilidade em cada aprovação."
              style={{ borderRadius: "26px" }}
            >
              <div style={{ display: "grid", gap: "12px" }}>
                {[
                  "1. Confirme valor, membro e status antes de aprovar.",
                  "2. Gere nova cobrança PIX apenas quando o ciclo anterior estiver vencido ou ausente.",
                  "3. Exporte o CSV ao fim do período para fechamento e auditoria externa."
                ].map((step) => (
                  <div key={step} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <span
                      style={{
                        width: "26px",
                        height: "26px",
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "999px",
                        background: "rgba(134, 90, 255, 0.12)",
                        color: "var(--elo-orbit, #865AFF)",
                        fontWeight: 800,
                        flexShrink: 0
                      }}
                    >
                      •
                    </span>
                    <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".94rem" }}>{step}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card
              title="Sinal do período"
              subtitle="O recorte escolhido organiza os indicadores principais e a exportação do consolidado."
              headerAside={<Download size={16} color="var(--elo-orbit, #865AFF)" />}
              style={{ borderRadius: "26px" }}
            >
              <div style={{ display: "grid", gap: "10px" }}>
                <Badge variant="brand" style={{ justifySelf: "start" }}>
                  {PERIOD_OPTIONS.find((item) => item.value === dashboardPeriod)?.label}
                </Badge>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <Badge variant="neutral">Busca ativa: {normalizedSearch || "nenhuma"}</Badge>
                  <Badge variant="info">Visão: {activeView === "memberships" ? "Anuidades" : "Eventos"}</Badge>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
