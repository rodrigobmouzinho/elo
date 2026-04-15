"use client";

import { Badge, DataTable, MetricStrip } from "@elo/ui";
import type { BadgeVariant } from "@elo/ui";
import { CalendarDays, CreditCard, Sparkles, Users2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "../components/admin-shell";
import { apiRequest } from "../lib/auth-client";

type DashboardState = {
  members: number;
  events: number;
  membershipRevenueCents: number;
  eventRevenueCents: number;
  pendingMembershipPayments: number;
  pendingEventPayments: number;
  overduePayments: number;
};

type ModuleRow = {
  id: string;
  module: string;
  status: string;
  count: number;
  href: string;
  variant: BadgeVariant;
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  }).format(cents / 100);
}

export default function AdminHomePage() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([
      apiRequest<Array<{ id: string }>>("/admin/members"),
      apiRequest<Array<{ id: string }>>("/admin/events"),
      apiRequest<{
        membershipRevenueCents: number;
        eventRevenueCents: number;
        pendingMembershipPayments: number;
        pendingEventPayments: number;
        overduePayments: number;
      }>("/admin/finance/overview")
    ]).then(([membersResult, eventsResult, financeResult]) => {
      const finance =
        financeResult.status === "fulfilled"
          ? financeResult.value
          : {
              membershipRevenueCents: 0,
              eventRevenueCents: 0,
              pendingMembershipPayments: 0,
              pendingEventPayments: 0,
              overduePayments: 0
            };

      if (financeResult.status === "rejected") {
        setError("Erro ao carregar dados financeiros");
      }

      setState({
        members: membersResult.status === "fulfilled" ? membersResult.value.length : 0,
        events: eventsResult.status === "fulfilled" ? eventsResult.value.length : 0,
        membershipRevenueCents: finance.membershipRevenueCents,
        eventRevenueCents: finance.eventRevenueCents,
        pendingMembershipPayments: finance.pendingMembershipPayments,
        pendingEventPayments: finance.pendingEventPayments,
        overduePayments: finance.overduePayments
      });
      setLoading(false);
    });
  }, []);

  const totalRevenueCents = state ? state.membershipRevenueCents + state.eventRevenueCents : 0;
  const totalPending = state ? state.pendingMembershipPayments + state.pendingEventPayments : 0;

  const metrics = useMemo(
    () =>
      state
        ? [
            {
              label: "Receita",
              value: formatCurrency(totalRevenueCents),
              hint: "Total",
              badge: <Badge variant="brand">R$</Badge>,
              tone: "brand" as const
            },
            {
              label: "Membros",
              value: state.members.toString(),
              hint: "Total",
              badge: <Badge variant="success">CRM</Badge>,
              tone: "success" as const
            },
            {
              label: "Eventos",
              value: state.events.toString(),
              hint: "Publicados",
              badge: <Badge variant="info">Agenda</Badge>,
              tone: "info" as const
            },
            {
              label: "Pendências",
              value: totalPending.toString(),
              hint: "Aguardando",
              badge: (
                <Badge variant={totalPending > 0 ? "warning" : "success"}>
                  {totalPending > 0 ? "Atenção" : "OK"}
                </Badge>
              ),
              tone: totalPending > 0 ? ("warning" as const) : ("success" as const)
            }
          ]
        : [],
    [state, totalPending, totalRevenueCents]
  );

  const moduleRows: ModuleRow[] = useMemo(() => {
    if (!state) return [];

    return [
      {
        id: "members",
        module: "Membros",
        status: state.members > 0 ? `${state.members} ativos` : "Nenhum",
        count: state.members,
        href: "/members",
        variant: state.members > 0 ? "success" : ("warning" as BadgeVariant)
      },
      {
        id: "events",
        module: "Eventos",
        status: state.events > 0 ? `${state.events} publicados` : "Nenhum",
        count: state.events,
        href: "/events",
        variant: state.events > 0 ? "success" : ("warning" as BadgeVariant)
      },
      {
        id: "finance",
        module: "Financeiro",
        status: totalPending > 0 ? `${totalPending} pendente(s)` : "Em dia",
        count: totalPending,
        href: "/financeiro",
        variant: totalPending > 0 ? "warning" : ("success" as BadgeVariant)
      },
      {
        id: "gamification",
        module: "Gamificação",
        status: "Ativo",
        count: 0,
        href: "/gamification",
        variant: "brand" as BadgeVariant
      }
    ];
  }, [state, totalPending]);

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
          Carregando dados...
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            background: "rgba(239,68,68,0.1)",
            color: "#ef4444",
            marginBottom: "16px"
          }}
        >
          {error}
        </div>
      )}

      <MetricStrip items={metrics} />

      <div style={{ marginTop: "24px" }}>
        <DataTable
          rows={moduleRows}
          rowKey={(row) => row.id}
          columns={[
            {
              key: "module",
              header: "Módulo",
              render: (row) => (
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span
                    style={{
                      width: "36px",
                      height: "36px",
                      display: "grid",
                      placeItems: "center",
                      borderRadius: "8px",
                      background: "rgba(134, 90, 255, 0.1)"
                    }}
                  >
                    {row.module === "Membros" && <Users2 size={18} />}
                    {row.module === "Eventos" && <CalendarDays size={18} />}
                    {row.module === "Financeiro" && <CreditCard size={18} />}
                    {row.module === "Gamificação" && <Sparkles size={18} />}
                  </span>
                  <strong>{row.module}</strong>
                </div>
              )
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <Badge variant={row.variant}>{row.status}</Badge>
            },
            {
              key: "action",
              header: "",
              align: "right",
              width: "100px",
              render: (row) => (
                <Link
                  href={row.href}
                  style={{
                    color: "#865aff",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    textDecoration: "none"
                  }}
                >
                  Acessar →
                </Link>
              )
            }
          ]}
        />
      </div>
    </AdminShell>
  );
}
