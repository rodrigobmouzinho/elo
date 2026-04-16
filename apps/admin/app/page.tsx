"use client";

import { useEffect, useState } from "react";
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
  newMembersThisMonth: number;
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  }).format(cents / 100);
}

const cardStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
  padding: "20px",
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
  fontSize: "1.75rem",
  fontWeight: 700,
  color: "#fff"
};

export default function AdminHomePage() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([
      apiRequest<Array<{ id: string; createdAt?: string }>>("/admin/members"),
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

      const members = membersResult.status === "fulfilled" ? membersResult.value : [];

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const newMembersThisMonth = members.filter((m) => {
        if (!m.createdAt) return false;
        const created = new Date(m.createdAt);
        return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
      }).length;

      if (financeResult.status === "rejected") {
        setError("Erro ao carregar dados financeiros");
      }

      setState({
        members: members.length,
        events: eventsResult.status === "fulfilled" ? eventsResult.value.length : 0,
        membershipRevenueCents: finance.membershipRevenueCents,
        eventRevenueCents: finance.eventRevenueCents,
        pendingMembershipPayments: finance.pendingMembershipPayments,
        pendingEventPayments: finance.pendingEventPayments,
        overduePayments: finance.overduePayments,
        newMembersThisMonth
      });
      setLoading(false);
    });
  }, []);

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

  const totalRevenue = state ? state.membershipRevenueCents + state.eventRevenueCents : 0;
  const totalPending = state ? state.pendingMembershipPayments + state.pendingEventPayments : 0;

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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px"
        }}
      >
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Total de Receita</span>
          <span style={cardValueStyle}>{formatCurrency(totalRevenue)}</span>
        </div>

        <div style={cardStyle}>
          <span style={cardLabelStyle}>Total de Pendentes</span>
          <span style={{ ...cardValueStyle, color: totalPending > 0 ? "#f59e0b" : "#22c55e" }}>
            {formatCurrency(totalPending)}
          </span>
        </div>

        <div style={cardStyle}>
          <span style={cardLabelStyle}>Membros Ativos</span>
          <span style={cardValueStyle}>{state?.members ?? 0}</span>
        </div>

        <div style={cardStyle}>
          <span style={cardLabelStyle}>Novos Membros do Mês</span>
          <span style={cardValueStyle}>{state?.newMembersThisMonth ?? 0}</span>
        </div>
      </div>
    </AdminShell>
  );
}
