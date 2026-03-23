"use client";

import type { MemberApplication, MemberApplicationStatus } from "@elo/core";
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
  Select,
  SidePanelForm,
  Textarea
} from "@elo/ui";
import type { AlertVariant, BadgeVariant } from "@elo/ui";
import { Clock3, Mail, MapPin, MessageCircleMore, UserRoundSearch } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
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

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("conectar") || normalized.includes("network")) {
    return "Não foi possível conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

function applicationBadge(status: MemberApplicationStatus): { label: string; variant: BadgeVariant } {
  if (status.code === "approved") return { label: status.label, variant: "success" };
  if (status.code === "rejected") return { label: status.label, variant: "danger" };
  if (status.code === "awaiting_payment") return { label: status.label, variant: "warning" };
  if (status.code === "awaiting_whatsapp_contact") return { label: status.label, variant: "info" };
  return { label: status.label, variant: "neutral" };
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

        return [
          item.fullName,
          item.email,
          item.whatsapp,
          item.city,
          item.state,
          item.area,
          item.specialty ?? ""
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
      })
      .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());
  }, [items, search, statusFilter, visibilityFilter]);

  const activeStatuses = useMemo(
    () => statuses.filter((status) => status.active && !status.isFinal),
    [statuses]
  );

  const metrics = useMemo(() => {
    const open = items.filter((item) => !item.status.isFinal).length;
    const approved = items.filter((item) => item.status.code === "approved").length;
    const rejected = items.filter((item) => item.status.code === "rejected").length;
    const awaitingWhatsapp = items.filter(
      (item) => item.status.code === "awaiting_whatsapp_contact"
    ).length;

    return {
      total: items.length,
      open,
      approved,
      rejected,
      awaitingWhatsapp
    };
  }, [items]);

  const priorityItems = useMemo(
    () => [
      {
        title:
          metrics.awaitingWhatsapp > 0
            ? `${metrics.awaitingWhatsapp} solicitação(ões) aguardando contato`
            : "Fila de contato via WhatsApp em dia",
        description:
          metrics.awaitingWhatsapp > 0
            ? "Concentre o time nas solicitações que já estão em fase de abordagem comercial."
            : "Nenhuma solicitação depende de contato inicial neste momento.",
        tone: metrics.awaitingWhatsapp > 0 ? ("warning" as const) : ("success" as const)
      },
      {
        title:
          metrics.open > 0
            ? `${metrics.open} solicitação(ões) ainda em fluxo`
            : "Não há solicitações abertas",
        description:
          metrics.open > 0
            ? "Use status intermediários para refletir o funil real de curadoria e pagamentos."
            : "A fila atual já foi totalmente decidida pelos administradores.",
        tone: metrics.open > 0 ? ("brand" as const) : ("neutral" as const)
      },
      {
        title: `${metrics.approved} aprovadas / ${metrics.rejected} recusadas`,
        description: "As decisões finais ficam registradas para auditoria e evitam retrabalho na triagem.",
        tone: "info" as const
      }
    ],
    [metrics.approved, metrics.awaitingWhatsapp, metrics.open, metrics.rejected]
  );

  async function loadFeed() {
    setLoading(true);

    try {
      const payload = await apiRequest<ApplicationsFeed>("/admin/member-applications");
      setItems(payload.items);
      setStatuses(payload.statuses);
      setSelectedId((current) =>
        current && payload.items.some((item) => item.id === current)
          ? current
          : payload.items[0]?.id ?? null
      );
    } catch (error) {
      setFeedback({
        title: "Falha ao carregar solicitações",
        description: normalizeApiError((error as Error).message),
        variant: "danger"
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
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
    setFeedback(null);

    try {
      const status = await apiRequest<MemberApplicationStatus>("/admin/member-application-statuses", {
        method: "POST",
        body: JSON.stringify({ label: customStatusLabel.trim() })
      });

      setStatuses((current) =>
        [...current, status].sort((first, second) => first.sortOrder - second.sortOrder)
      );
      setCustomStatusLabel("");
      setFeedback({
        title: "Novo status criado",
        description: `${status.label} já está disponível para o funil administrativo.`,
        variant: "success"
      });
    } catch (error) {
      setFeedback({
        title: "Falha ao criar status",
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
    setFeedback(null);

    try {
      await apiRequest<MemberApplication>(`/admin/member-applications/${selectedApplication.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          statusId:
            selectedStatusId !== selectedApplication.status.id ? selectedStatusId : undefined,
          internalNotes
        })
      });

      setFeedback({
        title: "Solicitação atualizada",
        description: "Status intermediário e notas internas foram sincronizados com sucesso.",
        variant: "success"
      });
      await loadFeed();
    } catch (error) {
      setFeedback({
        title: "Falha ao atualizar solicitação",
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
    setFeedback(null);

    try {
      const isoExpiration = new Date(membershipExpiresAt).toISOString();
      const result = await apiRequest<{
        deliveryMode: "email" | "manual";
        temporaryPassword?: string;
      }>(`/admin/member-applications/${selectedApplication.id}/approve`, {
        method: "POST",
        body: JSON.stringify({
          membershipExpiresAt: isoExpiration,
          internalNotes
        })
      });

      setFeedback({
        title: "Solicitação aprovada",
        description:
          result.deliveryMode === "email"
            ? "A conta foi criada e a senha temporária foi enviada por e-mail."
            : `A conta foi criada. Senha temporária para entrega manual: ${result.temporaryPassword ?? "indisponível"}.`,
        variant: "success"
      });
      await loadFeed();
    } catch (error) {
      setFeedback({
        title: "Falha ao aprovar solicitação",
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
    setFeedback(null);

    try {
      await apiRequest<MemberApplication>(`/admin/member-applications/${selectedApplication.id}/reject`, {
        method: "POST",
        body: JSON.stringify({
          reason: rejectReason,
          internalNotes
        })
      });

      setFeedback({
        title: "Solicitação recusada",
        description: "A decisão final foi registrada com a justificativa indicada.",
        variant: "warning"
      });
      await loadFeed();
    } catch (error) {
      setFeedback({
        title: "Falha ao recusar solicitação",
        description: normalizeApiError((error as Error).message),
        variant: "danger"
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow={<Badge variant="brand">Adesões</Badge>}
        title="Curadoria de novas adesões"
        description="Acompanhe a entrada de candidatos, reflita o funil real da operação e conclua aprovações com criação automática da conta do membro."
        meta={
          <FilterBar
            actions={<Badge variant="neutral">{filteredItems.length.toLocaleString("pt-BR")} visível(is)</Badge>}
          >
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, e-mail, WhatsApp, cidade ou área"
              type="search"
              style={{ maxWidth: "360px" }}
            />
            <Select
              value={visibilityFilter}
              onChange={(event) => setVisibilityFilter(event.target.value as VisibilityFilter)}
              style={{ maxWidth: "180px" }}
            >
              <option value="all">Toda a fila</option>
              <option value="open">Somente em fluxo</option>
              <option value="final">Somente finalizadas</option>
            </Select>
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{ maxWidth: "220px" }}
            >
              <option value="all">Todos os status</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.label}
                </option>
              ))}
            </Select>
          </FilterBar>
        }
      />

      {feedback ? (
        <Alert variant={feedback.variant} title={feedback.title}>
          {feedback.description}
        </Alert>
      ) : null}

      {loading ? (
        <Alert variant="info" title="Atualizando fila de adesões">
          Carregando solicitações, status intermediários e decisões finais.
        </Alert>
      ) : null}

      <div style={{ display: "grid", gap: "16px" }}>
        <section
          style={{
            display: "grid",
            gap: "16px",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))"
          }}
        >
          <Card
            tone="default"
            title="Mesa de triagem"
            subtitle="Transforme o funil comercial e operacional em status visíveis para o time."
          >
            <div style={{ display: "grid", gap: "12px" }}>
              {[
                {
                  label: "Solicitações abertas",
                  value: metrics.open.toLocaleString("pt-BR"),
                  detail: "Ainda sem decisão final"
                },
                {
                  label: "Aguardando WhatsApp",
                  value: metrics.awaitingWhatsapp.toLocaleString("pt-BR"),
                  detail: "Etapa operacional mais sensível"
                },
                {
                  label: "Decisões finais",
                  value: `${metrics.approved}/${metrics.rejected}`,
                  detail: "Aprovadas / recusadas"
                }
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "grid",
                    gap: "6px",
                    padding: "12px 14px",
                    borderRadius: "18px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.1)"
                  }}
                >
                  <span style={{ fontSize: ".75rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {item.label}
                  </span>
                  <strong style={{ fontSize: "1.45rem" }}>{item.value}</strong>
                  <span style={{ color: "rgba(255,255,255,0.78)", fontSize: ".9rem" }}>{item.detail}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card
            tone="panel"
            title="Status do funil"
            subtitle="Admin pode manter a linguagem operacional alinhada ao processo real."
          >
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {statuses.map((status) => (
                <Badge key={status.id} variant={applicationBadge(status).variant}>
                  {status.label}
                </Badge>
              ))}
            </div>
          </Card>
        </section>

        <MetricStrip
          items={[
            {
              label: "Total recebido",
              value: metrics.total.toLocaleString("pt-BR"),
              hint: "solicitações registradas",
              badge: <Badge variant="brand">Entrada</Badge>,
              tone: "brand"
            },
            {
              label: "Em fluxo",
              value: metrics.open.toLocaleString("pt-BR"),
              hint: "sem decisão final",
              badge: <Badge variant="warning">Ativas</Badge>,
              tone: "warning"
            },
            {
              label: "Aprovadas",
              value: metrics.approved.toLocaleString("pt-BR"),
              hint: "conta criada",
              badge: <Badge variant="success">Conversao</Badge>,
              tone: "success"
            },
            {
              label: "Recusadas",
              value: metrics.rejected.toLocaleString("pt-BR"),
              hint: "registro finalizado",
              badge: <Badge variant="danger">Fechadas</Badge>,
              tone: "danger"
            }
          ]}
        />

        <PriorityStrip items={priorityItems} />

        <section
          style={{
            display: "grid",
            gap: "16px",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))"
          }}
        >
          <div style={{ minWidth: 0 }}>
            <DataTable
              rows={filteredItems}
              rowKey={(item) => item.id}
              emptyState={
                <EmptyState
                  title="Nenhuma solicitação encontrada"
                  description="Ajuste os filtros ou aguarde novas entradas no formulário público."
                />
              }
              columns={[
                {
                  key: "applicant",
                  header: "Solicitante",
                  sortable: true,
                  sortValue: (item) => item.fullName,
                  render: (item) => (
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span
                        style={{
                          width: "42px",
                          height: "42px",
                          display: "grid",
                          placeItems: "center",
                          borderRadius: "14px",
                          background: "rgba(134, 90, 255, 0.12)",
                          color: "var(--elo-orbit, #865AFF)",
                          fontWeight: 800
                        }}
                      >
                        {initials(item.fullName)}
                      </span>
                      <span style={{ display: "grid", gap: "4px" }}>
                        <strong>{item.fullName}</strong>
                        <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".9rem" }}>
                          {item.email}
                        </span>
                      </span>
                    </div>
                  )
                },
                {
                  key: "context",
                  header: "Contexto",
                  sortable: true,
                  sortValue: (item) => `${item.city}-${item.state}-${item.area}`,
                  render: (item) => (
                    <div style={{ display: "grid", gap: "6px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <MapPin size={14} />
                        {item.city}/{item.state}
                      </span>
                      <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>{item.area}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>
                        <MessageCircleMore size={14} />
                        {item.whatsapp}
                      </span>
                    </div>
                  )
                },
                {
                  key: "status",
                  header: "Status",
                  width: "220px",
                  sortable: true,
                  sortValue: (item) => item.status.sortOrder,
                  render: (item) => (
                    <div style={{ display: "grid", gap: "8px" }}>
                      <Badge variant={applicationBadge(item.status).variant}>{item.status.label}</Badge>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--elo-text-secondary, #374151)", fontSize: ".88rem" }}>
                        <Clock3 size={14} />
                        {new Date(item.updatedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )
                },
                {
                  key: "actions",
                  header: "Ações",
                  width: "160px",
                  align: "right",
                  render: (item) => (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <Button size="sm" variant="secondary" onClick={() => setSelectedId(item.id)}>
                        Gerir
                      </Button>
                    </div>
                  )
                }
              ]}
            />
          </div>

          <SidePanelForm
            badge={<Badge variant={selectedApplication?.status.isFinal ? "neutral" : "brand"}>Painel da adesão</Badge>}
            title={selectedApplication ? selectedApplication.fullName : "Selecione uma solicitação"}
            description={
              selectedApplication
                ? "Atualize o funil, registre notas internas e conclua a decisão final quando a adesão estiver pronta."
                : "Escolha uma solicitação na lista para abrir a triagem completa."
            }
          >
            {selectedApplication ? (
              <div style={{ display: "grid", gap: "14px" }}>
                <div
                  style={{
                    display: "grid",
                    gap: "8px",
                    padding: "14px 16px",
                    borderRadius: "18px",
                    background: "rgba(134, 90, 255, 0.08)",
                    border: "1px solid rgba(134, 90, 255, 0.14)"
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: ".78rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--elo-orbit, #865AFF)" }}>
                    <Mail size={14} />
                    Dados enviados pelo candidato
                  </span>
                  <strong>{selectedApplication.email}</strong>
                  <span>{selectedApplication.whatsapp}</span>
                  <span>
                    {selectedApplication.city}/{selectedApplication.state} · {selectedApplication.area}
                  </span>
                  {selectedApplication.specialty ? <span>Talento principal: {selectedApplication.specialty}</span> : null}
                </div>

                <form onSubmit={handleSaveWorkflow} style={{ display: "grid", gap: "12px" }}>
                  <label style={{ display: "grid", gap: "6px" }}>
                    <span>Status intermediário</span>
                    <Select
                      value={selectedStatusId}
                      onChange={(event) => setSelectedStatusId(event.target.value)}
                      disabled={selectedApplication.status.isFinal}
                    >
                      {activeStatuses.map((status) => (
                        <option key={status.id} value={status.id}>
                          {status.label}
                        </option>
                      ))}
                    </Select>
                  </label>

                  <label style={{ display: "grid", gap: "6px" }}>
                    <span>Notas internas</span>
                    <Textarea
                      value={internalNotes}
                      onChange={(event) => setInternalNotes(event.target.value)}
                      style={{ minHeight: "120px" }}
                    />
                  </label>

                  <Button type="submit" disabled={saving}>
                    {saving ? "Salvando..." : "Salvar andamento"}
                  </Button>
                </form>

                <form onSubmit={handleCreateStatus} style={{ display: "grid", gap: "10px" }}>
                  <span style={{ fontWeight: 700 }}>Novo status intermediário</span>
                  <Input
                    value={customStatusLabel}
                    onChange={(event) => setCustomStatusLabel(event.target.value)}
                    placeholder="Ex: aguardando contrato"
                  />
                  <Button type="submit" variant="secondary" disabled={saving || !customStatusLabel.trim()}>
                    Criar status
                  </Button>
                </form>

                {!selectedApplication.status.isFinal ? (
                  <>
                    <Card tone="panel" title="Aprovar adesão" subtitle="Cria a conta do membro e envia a senha temporária por e-mail quando disponível.">
                      <div style={{ display: "grid", gap: "10px" }}>
                        <label style={{ display: "grid", gap: "6px" }}>
                          <span>Validade inicial da associação</span>
                          <Input
                            type="datetime-local"
                            value={membershipExpiresAt}
                            onChange={(event) => setMembershipExpiresAt(event.target.value)}
                          />
                        </label>

                        <Button type="button" onClick={() => void handleApprove()} disabled={saving}>
                          Aprovar e criar acesso
                        </Button>
                      </div>
                    </Card>

                    <Card tone="panel" title="Recusar adesão" subtitle="A justificativa fica registrada na trilha administrativa da solicitação.">
                      <div style={{ display: "grid", gap: "10px" }}>
                        <Textarea
                          value={rejectReason}
                          onChange={(event) => setRejectReason(event.target.value)}
                          placeholder="Explique de forma objetiva o motivo da recusa"
                          style={{ minHeight: "100px" }}
                        />

                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => void handleReject()}
                          disabled={saving || rejectReason.trim().length < 3}
                        >
                          Recusar solicitação
                        </Button>
                      </div>
                    </Card>
                  </>
                ) : (
                  <Card
                    tone={selectedApplication.status.code === "approved" ? "panel" : "ghost"}
                    title="Decisão final registrada"
                    subtitle={
                      selectedApplication.status.code === "approved"
                        ? "A conta do membro já foi provisionada e o primeiro acesso fica a cargo do próprio usuário."
                        : "A solicitação foi encerrada e a justificativa fica preservada para auditoria interna."
                    }
                  >
                    {selectedApplication.rejectionReason ? (
                      <p style={{ margin: 0, color: "var(--elo-text-secondary, #374151)", lineHeight: 1.65 }}>
                        Justificativa: {selectedApplication.rejectionReason}
                      </p>
                    ) : null}
                  </Card>
                )}
              </div>
            ) : (
              <EmptyState
                title="Nenhuma solicitação selecionada"
                description="Escolha um item da fila para registrar andamento, aprovar ou recusar."
                icon={<UserRoundSearch size={18} />}
              />
            )}
          </SidePanelForm>
        </section>
      </div>
    </AdminShell>
  );
}
