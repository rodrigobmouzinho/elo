"use client";

import { Alert, Badge, Button, Card, DataTable, EmptyState, MetricStrip, PageHeader, PriorityStrip } from "@elo/ui";
import type { BadgeVariant } from "@elo/ui";
import { Activity, ArrowUpRight, CalendarDays, CreditCard, Radar, ShieldCheck, Sparkles, Users2, Wallet } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
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

type ActionVariant = "success" | "warning" | "danger" | "info" | "brand";

type DecisionAction = {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  variant: ActionVariant;
};

type CommandSignal = {
  id: string;
  label: string;
  value: string;
  detail: string;
  variant: BadgeVariant;
  icon: ReactNode;
};

type ModuleRow = {
  id: string;
  module: string;
  summary: string;
  pulse: string;
  nextMove: string;
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

function kpiBadge(variant: BadgeVariant, label: string) {
  return <Badge variant={variant}>{label}</Badge>;
}

function decisionActions(state: DashboardState, totalPending: number): DecisionAction[] {
  const actions: DecisionAction[] = [];

  if (state.overduePayments > 0) {
    actions.push({
      id: "overdue",
      title: "Regularizar pagamentos vencidos",
      description: `${state.overduePayments} cobrança(s) vencida(s) estão pressionando caixa e experiência do membro.`,
      href: "/financeiro",
      cta: "Abrir financeiro",
      variant: "danger"
    });
  }

  if (totalPending > 0) {
    actions.push({
      id: "pending",
      title: "Liberar aprovações manuais",
      description: `${totalPending} pagamento(s) aguardam validação para destravar acesso, presença e receita.`,
      href: "/financeiro",
      cta: "Revisar pendências",
      variant: "warning"
    });
  }

  if (state.events < 4) {
    actions.push({
      id: "agenda",
      title: "Dar fôlego à agenda da comunidade",
      description:
        state.events === 0
          ? "Nenhum evento está publicado. A descoberta do app perde tração sem agenda visível."
          : `${state.events} evento(s) no ar. Vale preparar a próxima leva antes que a vitrine esfrie.`,
      href: "/events",
      cta: state.events === 0 ? "Criar evento" : "Reforçar agenda",
      variant: state.events === 0 ? "danger" : "info"
    });
  }

  if (state.members < 12) {
    actions.push({
      id: "members",
      title: "Expandir e qualificar a base ativa",
      description: `${state.members} membro(s) sob gestão. O CRM ainda pede crescimento e leitura mais frequente de relacionamento.`,
      href: "/members",
      cta: "Abrir CRM",
      variant: "brand"
    });
  }

  actions.push({
    id: "gamification",
    title: "Sustentar o ritmo da temporada",
    description: "A gamificação precisa continuar visível para manter recorrência, percepção de status e presença nos eventos.",
    href: "/gamification",
    cta: "Ver gamificação",
    variant: "brand"
  });

  actions.push({
    id: "finance-baseline",
    title: "Revisar caixa e exportações do ciclo",
    description: "Mesmo sem fila crítica, a rotina financeira precisa manter exportação, conferência e previsibilidade operacional.",
    href: "/financeiro",
    cta: "Checar caixa",
    variant: "success"
  });

  return actions.slice(0, 4);
}

function commandSignals(state: DashboardState, totalRevenueCents: number, totalPending: number): CommandSignal[] {
  return [
    {
      id: "cash",
      label: "Caixa observado",
      value: formatCurrency(totalRevenueCents),
      detail:
        totalPending > 0 || state.overduePayments > 0
          ? `${totalPending} pendente(s) e ${state.overduePayments} atraso(s) no radar.`
          : "Fluxo financeiro sem fila crítica no momento.",
      variant: totalPending > 0 || state.overduePayments > 0 ? "warning" : "success",
      icon: <Wallet size={16} />
    },
    {
      id: "agenda",
      label: "Cadência da agenda",
      value: `${state.events.toLocaleString("pt-BR")} evento(s)`,
      detail:
        state.events >= 4
          ? "A vitrine do app já sustenta recorrência e descoberta com folga."
          : state.events > 0
            ? "A agenda está viva, mas vale antecipar a próxima janela de divulgação."
            : "Sem programação ativa. A comunidade perde contexto de encontro.",
      variant: state.events >= 4 ? "success" : state.events > 0 ? "info" : "danger",
      icon: <CalendarDays size={16} />
    },
    {
      id: "base",
      label: "Base em relacionamento",
      value: `${state.members.toLocaleString("pt-BR")} membro(s)`,
      detail:
        state.members >= 12
          ? "Já existe massa crítica para operar ativações e reputação de comunidade."
          : "A base ainda está compacta; o CRM precisa de cuidado e expansão.",
      variant: state.members >= 12 ? "success" : "brand",
      icon: <Users2 size={16} />
    }
  ];
}

function moduleRows(state: DashboardState, totalPending: number): ModuleRow[] {
  return [
    {
      id: "members",
      module: "Membros",
      summary: `${state.members.toLocaleString("pt-BR")} perfis na base para leitura de relacionamento e ativação.`,
      pulse: state.members >= 12 ? "Base saudável" : "Base em construção",
      nextMove: state.members >= 12 ? "Priorizar qualidade e recorrência do CRM." : "Ampliar entrada e enriquecer perfis-chave.",
      href: "/members",
      variant: state.members >= 12 ? "success" : "brand"
    },
    {
      id: "events",
      module: "Eventos",
      summary:
        state.events > 0
          ? `${state.events.toLocaleString("pt-BR")} evento(s) publicados sustentando descoberta e presença.`
          : "Nenhum evento publicado; o app fica sem seu principal gatilho de encontro.",
      pulse: state.events >= 4 ? "Agenda robusta" : state.events > 0 ? "Agenda ativa" : "Sem agenda",
      nextMove: state.events >= 4 ? "Revisar mídia e conversão das próximas publicações." : "Programar a próxima leva e blindar o calendário.",
      href: "/events",
      variant: state.events >= 4 ? "success" : state.events > 0 ? "info" : "danger"
    },
    {
      id: "finance",
      module: "Financeiro",
      summary:
        totalPending > 0 || state.overduePayments > 0
          ? `${totalPending} aprovação(ões) e ${state.overduePayments} atraso(s) alterando o ritmo do caixa.`
          : "Caixa sem gargalo crítico de aprovação ou vencimento.",
      pulse: totalPending > 0 || state.overduePayments > 0 ? "Exige ação" : "Fluxo limpo",
      nextMove:
        totalPending > 0 || state.overduePayments > 0
          ? "Atacar pendências antes que virem fricção de acesso e confiança."
          : "Manter exportação e conferência para não perder previsibilidade.",
      href: "/financeiro",
      variant: totalPending > 0 || state.overduePayments > 0 ? "warning" : "success"
    },
    {
      id: "gamification",
      module: "Gamificação",
      summary: "Ranking, badges e temporada são o motor de recorrência e visibilidade dentro da comunidade.",
      pulse: "Pulso da temporada",
      nextMove: "Usar campanhas, badges e pódio como reforço de presença e pertencimento.",
      href: "/gamification",
      variant: "brand"
    }
  ];
}

export default function AdminHomePage() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

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
      const nextErrors = [membersResult, eventsResult, financeResult]
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) => (result.reason instanceof Error ? result.reason.message : String(result.reason)));

      const members = membersResult.status === "fulfilled" ? membersResult.value : [];
      const events = eventsResult.status === "fulfilled" ? eventsResult.value : [];
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

      setState({
        members: members.length,
        events: events.length,
        membershipRevenueCents: finance.membershipRevenueCents,
        eventRevenueCents: finance.eventRevenueCents,
        pendingMembershipPayments: finance.pendingMembershipPayments,
        pendingEventPayments: finance.pendingEventPayments,
        overduePayments: finance.overduePayments
      });
      setErrors(nextErrors);
    });
  }, []);

  const totalRevenueCents = state ? state.membershipRevenueCents + state.eventRevenueCents : 0;
  const totalPending = state ? state.pendingMembershipPayments + state.pendingEventPayments : 0;

  const metrics = useMemo(
    () =>
      state
        ? [
            {
              label: "Receita acumulada",
              value: formatCurrency(totalRevenueCents),
              hint: "anuidade + eventos em observação",
              badge: kpiBadge("brand", "Caixa"),
              tone: "brand" as const
            },
            {
              label: "Base ativa",
              value: state.members.toLocaleString("pt-BR"),
              hint: "membros sob gestão no CRM",
              badge: kpiBadge("success", "Relacionamento"),
              tone: "success" as const
            },
            {
              label: "Agenda publicada",
              value: state.events.toLocaleString("pt-BR"),
              hint: "eventos disponíveis no app",
              badge: kpiBadge(state.events >= 4 ? "success" : state.events > 0 ? "info" : "warning", state.events >= 4 ? "Forte" : state.events > 0 ? "Ativa" : "Repor"),
              tone: state.events >= 4 ? ("success" as const) : state.events > 0 ? ("info" as const) : ("warning" as const)
            },
            {
              label: "Pendências",
              value: totalPending.toLocaleString("pt-BR"),
              hint: "pagamentos aguardando ação",
              badge: kpiBadge(totalPending > 0 ? "warning" : "success", totalPending > 0 ? "Fila" : "Em dia"),
              tone: totalPending > 0 ? ("warning" as const) : ("success" as const)
            },
            {
              label: "Atrasos",
              value: state.overduePayments.toLocaleString("pt-BR"),
              hint: "cobranças vencidas no radar",
              badge: kpiBadge(state.overduePayments > 0 ? "danger" : "success", state.overduePayments > 0 ? "Crítico" : "Zero"),
              tone: state.overduePayments > 0 ? ("danger" as const) : ("success" as const)
            }
          ]
        : [],
    [state, totalPending, totalRevenueCents]
  );

  const actionDeck = state ? decisionActions(state, totalPending) : [];
  const executiveSignals = state ? commandSignals(state, totalRevenueCents, totalPending) : [];
  const moduleHealthRows = state ? moduleRows(state, totalPending) : [];

  const revenuePerMember = state?.members ? formatCurrency(Math.round(totalRevenueCents / state.members)) : formatCurrency(0);
  const agendaCoverage = state
    ? state.events >= 4
      ? "Cobertura confortável"
      : state.events > 0
        ? "Cobertura curta"
        : "Cobertura zerada"
    : "Carregando";
  const queueSummary = state
    ? totalPending > 0 || state.overduePayments > 0
      ? "Há fila operacional aberta"
      : "Nenhuma fila crítica no momento"
    : "Carregando";
  const turnLabel = state
    ? state.overduePayments > 0
      ? "Turno sob pressão"
      : totalPending > 0
        ? "Fila de decisão ativa"
        : state.events < 4
          ? "Agenda pede reforço"
          : "Operação estabilizada"
    : "Preparando turno";
  const turnDescription = state
    ? state.overduePayments > 0
      ? "O caixa pede ação imediata antes que o atrito chegue ao membro."
      : totalPending > 0
        ? "Existem aprovações em espera travando receita e experiência."
        : state.events < 4
          ? "A agenda continua viva, mas a próxima publicação precisa entrar antes do fôlego cair."
          : "Caixa, agenda e base estão limpos. A prioridade agora é ganhar ritmo e escala."
    : "Carregando visão executiva da operação.";

  return (
    <AdminShell>
      <PageHeader
        eyebrow={<Badge variant="brand">Mesa executiva</Badge>}
        title="Command center para decidir caixa, agenda e comunidade"
        description="O dashboard agora funciona como uma mesa de turno: uma leitura rápida do que exige ação, do que está saudável e da próxima alavanca de ritmo da operação."
        meta={
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Badge variant="info">Admin denso e executivo</Badge>
            <Badge variant="neutral">Primeira decisão em menos de 5 segundos</Badge>
            <Badge variant="brand">Marca + operação na mesma linguagem</Badge>
          </div>
        }
        actions={[
          { label: "Abrir financeiro", href: "/financeiro" },
          { label: "Revisar agenda", href: "/events", variant: "secondary" }
        ]}
      />

      {errors.map((error) => (
        <Alert key={error} variant="warning" title="Parte do painel precisa de atenção">
          {error}
        </Alert>
      ))}

      {!state ? (
        <Alert variant="info" title="Montando a mesa do turno">
          Carregando caixa, agenda, CRM e o pulso da comunidade para montar a leitura executiva.
        </Alert>
      ) : (
        <div style={{ display: "grid", gap: "18px" }}>
          <section
            style={{
              display: "grid",
              gap: "18px",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))"
            }}
          >
            <article
              style={{
                display: "grid",
                gap: "18px",
                padding: "24px",
                borderRadius: "30px",
                background:
                  "radial-gradient(120% 120% at 0% 0%, rgba(134, 90, 255, 0.22), rgba(134, 90, 255, 0) 38%), linear-gradient(150deg, rgba(11, 14, 24, 0.98), rgba(18, 21, 34, 0.96) 62%, rgba(42, 46, 64, 0.92) 100%)",
                color: "rgba(255,255,255,0.96)",
                boxShadow: "0 26px 62px rgba(10, 12, 18, 0.22)"
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "16px",
                  flexWrap: "wrap"
                }}
              >
                <div style={{ display: "grid", gap: "10px", maxWidth: "700px" }}>
                  <Badge variant={totalPending > 0 || state.overduePayments > 0 ? "warning" : "success"} style={{ justifySelf: "start" }}>
                    {turnLabel}
                  </Badge>
                  <div style={{ display: "grid", gap: "8px" }}>
                    <h2 style={{ margin: 0, fontSize: "clamp(1.7rem, 3vw, 2.55rem)", lineHeight: 0.98, color: "inherit" }}>
                      Mesa do turno para caixa, agenda e confiança da comunidade.
                    </h2>
                    <p style={{ margin: 0, color: "rgba(233, 236, 255, 0.8)", maxWidth: "62ch", lineHeight: 1.75 }}>
                      {turnDescription} O restante do painel organiza o que observar agora, qual módulo merece a próxima visita e como manter a operação limpa sem perder densidade executiva.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: "8px",
                    minWidth: "220px",
                    padding: "16px 18px",
                    borderRadius: "22px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.06)"
                  }}
                >
                  <span style={{ fontSize: ".76rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(233,236,255,0.72)" }}>
                    Postura do turno
                  </span>
                  <strong style={{ fontSize: "1.05rem", lineHeight: 1.2 }}>{queueSummary}</strong>
                  <span style={{ color: "rgba(233,236,255,0.76)", fontSize: ".92rem", lineHeight: 1.6 }}>
                    Prioridade de hoje: proteger o caixa sem deixar a agenda e o CRM perderem temperatura.
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "12px",
                  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))"
                }}
              >
                {executiveSignals.map((signal) => (
                  <article
                    key={signal.id}
                    style={{
                      display: "grid",
                      gap: "10px",
                      padding: "16px 18px",
                      borderRadius: "22px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                      <span
                        style={{
                          width: "36px",
                          height: "36px",
                          display: "grid",
                          placeItems: "center",
                          borderRadius: "999px",
                          background: "rgba(255,255,255,0.08)",
                          color: "rgba(255,255,255,0.96)"
                        }}
                      >
                        {signal.icon}
                      </span>
                      <Badge variant={signal.variant}>{signal.label}</Badge>
                    </div>
                    <strong style={{ fontFamily: "var(--elo-font-mono)", fontSize: "1.45rem", lineHeight: 1 }}>
                      {signal.value}
                    </strong>
                    <span style={{ color: "rgba(233,236,255,0.78)", fontSize: ".92rem", lineHeight: 1.6 }}>{signal.detail}</span>
                  </article>
                ))}
              </div>

              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ display: "grid", gap: "4px" }}>
                    <span style={{ fontSize: ".76rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(233,236,255,0.7)" }}>
                      Ações agora
                    </span>
                    <strong style={{ fontSize: "1.05rem" }}>A fila já responde qual é o próximo movimento da operação.</strong>
                  </div>
                  <Badge variant="brand">Orbital Connector</Badge>
                </div>
                <PriorityStrip
                  items={actionDeck.map((action) => ({
                    title: action.title,
                    description: action.description,
                    tone: action.variant,
                    actionLabel: action.cta,
                    href: action.href
                  }))}
                />
              </div>
            </article>

            <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
              <Card tone="panel" title="Radar da liderança" subtitle="Três leituras que ajudam a calibrar ritmo, cobertura e eficiência do caixa.">
                <div style={{ display: "grid", gap: "10px" }}>
                  {[
                    {
                      label: "Receita por membro",
                      value: revenuePerMember,
                      detail: "densidade financeira da base ativa",
                      icon: <CreditCard size={15} />
                    },
                    {
                      label: "Cobertura da agenda",
                      value: agendaCoverage,
                      detail: "quanto a programação sustenta descoberta",
                      icon: <Activity size={15} />
                    },
                    {
                      label: "Estado das aprovações",
                      value: queueSummary,
                      detail: "quanto da operação está em espera agora",
                      icon: <ShieldCheck size={15} />
                    }
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: "grid",
                        gap: "6px",
                        padding: "14px 16px",
                        borderRadius: "18px",
                        border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                        background: "rgba(255,255,255,0.76)"
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--elo-text-tertiary, #6B7280)", fontSize: ".76rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        {item.icon}
                        {item.label}
                      </span>
                      <strong style={{ fontFamily: "var(--elo-font-mono)", fontSize: "1.18rem", lineHeight: 1.1 }}>{item.value}</strong>
                      <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".9rem", lineHeight: 1.55 }}>{item.detail}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card tone="ghost" title="Rotas de trabalho" subtitle="Entradas rápidas para não desperdiçar energia entre observação e ação.">
                <div style={{ display: "grid", gap: "10px" }}>
                  {[
                    { href: "/financeiro", label: "Financeiro", description: "aprovação, exportação e conferência", icon: <CreditCard size={16} /> },
                    { href: "/events", label: "Eventos", description: "agenda, mídia e vitrine do app", icon: <CalendarDays size={16} /> },
                    { href: "/members", label: "CRM", description: "leitura da base, status e cobertura", icon: <Users2 size={16} /> },
                    { href: "/gamification", label: "Temporada", description: "ritmo, ranking e reputação", icon: <Sparkles size={16} /> }
                  ].map((shortcut) => (
                    <Link
                      key={shortcut.href}
                      href={shortcut.href}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        padding: "14px 16px",
                        borderRadius: "18px",
                        border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                        background: "rgba(255,255,255,0.8)"
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "12px" }}>
                        <span
                          style={{
                            width: "34px",
                            height: "34px",
                            display: "grid",
                            placeItems: "center",
                            borderRadius: "999px",
                            background: "rgba(134, 90, 255, 0.12)",
                            color: "var(--elo-orbit, #865AFF)"
                          }}
                        >
                          {shortcut.icon}
                        </span>
                        <span style={{ display: "grid", gap: "4px" }}>
                          <strong>{shortcut.label}</strong>
                          <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".9rem" }}>{shortcut.description}</span>
                        </span>
                      </span>
                      <ArrowUpRight size={16} color="var(--elo-orbit, #865AFF)" />
                    </Link>
                  ))}
                </div>
              </Card>
            </div>
          </section>

          <MetricStrip items={metrics} />

          <section
            style={{
              display: "grid",
              gap: "18px",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))"
            }}
          >
            <Card
              title="Radar operacional por módulo"
              subtitle="Cada linha mostra o estado do módulo, a leitura do pulso atual e o próximo movimento recomendado."
              tone="ghost"
              headerAside={<Badge variant="info">Tempo real</Badge>}
            >
              <DataTable
                rows={moduleHealthRows}
                rowKey={(row) => row.id}
                columns={[
                  {
                    key: "module",
                    header: "Módulo",
                    sortable: true,
                    sortValue: (row) => row.module,
                    render: (row) => (
                      <div style={{ display: "grid", gap: "6px" }}>
                        <strong>{row.module}</strong>
                        <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem", lineHeight: 1.55 }}>{row.summary}</span>
                      </div>
                    )
                  },
                  {
                    key: "pulse",
                    header: "Pulso",
                    width: "170px",
                    sortable: true,
                    sortValue: (row) => row.pulse,
                    render: (row) => <Badge variant={row.variant}>{row.pulse}</Badge>
                  },
                  {
                    key: "nextMove",
                    header: "Próximo movimento",
                    render: (row) => <span style={{ color: "var(--elo-text-secondary, #374151)", lineHeight: 1.6 }}>{row.nextMove}</span>
                  },
                  {
                    key: "action",
                    header: "Ação",
                    width: "150px",
                    align: "right",
                    render: (row) => (
                      <Link
                        href={row.href}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          color: "var(--elo-orbit, #865AFF)",
                          fontWeight: 700
                        }}
                      >
                        Abrir
                        <ArrowUpRight size={14} />
                      </Link>
                    )
                  }
                ]}
              />
            </Card>

            <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
              <Card tone="panel" title="Leitura da manhã" subtitle="Uma explicação curta do que estes números significam para a operação.">
                <div style={{ display: "grid", gap: "10px" }}>
                  {[
                    {
                      label: "Caixa",
                      description:
                        totalPending > 0 || state.overduePayments > 0
                          ? "Existe dinheiro esperando ação humana. A meta é converter fila em acesso liberado o quanto antes."
                          : "O caixa está estável. O foco sai do apagar incêndio e volta para previsibilidade e exportação."
                    },
                    {
                      label: "Agenda",
                      description:
                        state.events >= 4
                          ? "A programação já sustenta bem a descoberta. Agora vale subir a régua de mídia e conversão."
                          : "A agenda está viva, mas ainda curta. O app depende dela para parecer ativo e desejável."
                    },
                    {
                      label: "Base",
                      description:
                        state.members >= 12
                          ? "A base permite leituras de comportamento e ativação mais consistentes."
                          : "O relacionamento ainda está concentrado. Crescer a base aumenta margem para conexões e receita."
                    }
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: "grid",
                        gap: "5px",
                        padding: "14px 16px",
                        borderRadius: "18px",
                        border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                        background: "rgba(255,255,255,0.76)"
                      }}
                    >
                      <strong style={{ fontSize: ".98rem" }}>{item.label}</strong>
                      <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem", lineHeight: 1.6 }}>{item.description}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <article
                style={{
                  display: "grid",
                  gap: "14px",
                  padding: "22px 20px",
                  borderRadius: "26px",
                  background:
                    "radial-gradient(120% 120% at 0% 0%, rgba(134, 90, 255, 0.22), rgba(134, 90, 255, 0) 44%), linear-gradient(180deg, rgba(14,16,26,0.98), rgba(22,24,37,0.96))",
                  color: "rgba(255,255,255,0.96)",
                  boxShadow: "0 20px 46px rgba(11, 14, 22, 0.2)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                  <Badge variant="brand">Princípio de operação</Badge>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: ".78rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(233,236,255,0.72)" }}>
                    <Radar size={14} />
                    orbital connector
                  </span>
                </div>
                <div style={{ display: "grid", gap: "8px" }}>
                  <strong style={{ fontSize: "1.06rem", lineHeight: 1.25 }}>Se algo sair do eixo, ele precisa aparecer aqui antes de contaminar o resto do workspace.</strong>
                  <p style={{ margin: 0, color: "rgba(233,236,255,0.8)", lineHeight: 1.7 }}>
                    Esta superfície foi desenhada para concentrar prioridade real. O objetivo não é mostrar mais números, e sim reduzir o tempo entre perceber um gargalo e entrar no módulo certo para resolvê-lo.
                  </p>
                </div>
                <Button variant="secondary" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ justifySelf: "start" }}>
                  Voltar ao topo
                </Button>
              </article>
            </div>
          </section>
        </div>
      )}

      {state ? null : (
        <EmptyState title="Sem dados operacionais" description="Assim que o backend responder com os indicadores, a mesa executiva aparecerá aqui." />
      )}
    </AdminShell>
  );
}
