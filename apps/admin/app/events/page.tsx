"use client";

import Image from "next/image";
import { Alert, Badge, Button, DataTable, EmptyState, FilterBar, Input, MetricStrip, PageHeader, Select, SidePanelForm, Textarea, passthroughImageLoader } from "@elo/ui";
import type { AlertVariant, BadgeVariant } from "@elo/ui";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { apiRequest } from "../../lib/auth-client";

type EventListItem = {
  id: string;
  title: string;
  summary: string;
  startsAt: string;
  location: string;
  onlineUrl?: string;
  accessType: "free_members" | "paid_members" | "public_with_member_discount";
  priceCents?: number;
  heroImageUrl?: string;
  galleryImageUrls?: string[];
};

type EventDetails = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt?: string;
  location: string;
  onlineUrl?: string;
  accessType: "free_members" | "paid_members" | "public_with_member_discount";
  priceCents?: number;
  heroImageUrl?: string;
  galleryImageUrls?: string[];
};

type EventForm = {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string;
  onlineUrl: string;
  accessType: "free_members" | "paid_members" | "public_with_member_discount";
  priceCents: string;
  heroImageUrl: string;
  galleryImageUrls: string;
};

type FeedbackState = {
  title: string;
  description: string;
  variant: AlertVariant;
};

type AccessFilter = "all" | EventForm["accessType"];

const EVENT_IMAGE_FALLBACK = "/event-placeholder.svg";

const defaultStartDate = () => new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16);

const initialForm: EventForm = {
  title: "",
  description: "",
  startsAt: defaultStartDate(),
  endsAt: "",
  location: "",
  onlineUrl: "",
  accessType: "free_members",
  priceCents: "",
  heroImageUrl: "",
  galleryImageUrls: ""
};

function toLocalDateTime(value?: string) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

function parseGalleryInput(value: string) {
  const items = value
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return items.length > 0 ? items : undefined;
}

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "Não foi possível conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

function getAccessTypeLabel(accessType: EventForm["accessType"] | EventListItem["accessType"]) {
  if (accessType === "free_members") return "Gratuito";
  if (accessType === "paid_members") return "Pago";
  return "Público + desconto";
}

function getAccessTypeBadgeVariant(accessType: EventForm["accessType"] | EventListItem["accessType"]): BadgeVariant {
  if (accessType === "free_members") return "info";
  if (accessType === "paid_members") return "brand";
  return "warning";
}

function getEventTimingState(startsAt: string): { label: string; variant: BadgeVariant } {
  const start = new Date(startsAt).getTime();
  const now = Date.now();

  if (start > now) {
    return { label: "Programado", variant: "info" };
  }

  const sixHoursMs = 6 * 60 * 60 * 1000;
  if (now - start <= sixHoursMs) {
    return { label: "Em andamento", variant: "success" };
  }

  return { label: "Realizado", variant: "neutral" };
}

function formatCurrency(cents?: number) {
  if (typeof cents !== "number") return null;

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  }).format(cents / 100);
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [form, setForm] = useState<EventForm>(initialForm);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingDetailsId, setLoadingDetailsId] = useState<string | null>(null);
  const [removingEventId, setRemovingEventId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const isEditing = Boolean(editingEventId);
  const isPaidAccess = form.accessType !== "free_members";
  const previewImageUrl = form.heroImageUrl.trim() || EVENT_IMAGE_FALLBACK;
  const hasCustomHero = form.heroImageUrl.trim().length > 0;
  const galleryPreviewUrls = (parseGalleryInput(form.galleryImageUrls) ?? []).slice(0, 8);

  const dashboard = useMemo(() => {
    const paid = events.filter((item) => item.accessType !== "free_members").length;
    const withCustomHero = events.filter((item) => Boolean(item.heroImageUrl)).length;
    const upcoming = events.filter((item) => getEventTimingState(item.startsAt).label === "Programado").length;

    return {
      total: events.length,
      paid,
      withCustomHero,
      upcoming
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return events
      .filter((item) => (accessFilter === "all" ? true : item.accessType === accessFilter))
      .filter((item) => {
        if (!normalizedSearch) return true;

        return [item.title, item.summary, item.location].some((value) =>
          value.toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime());
  }, [accessFilter, events, search]);
  const nextEvent = filteredEvents.find((item) => getEventTimingState(item.startsAt).label === "Programado") ?? filteredEvents[0] ?? null;

  async function loadEvents() {
    setLoadingEvents(true);

    try {
      setEvents(await apiRequest<EventListItem[]>("/admin/events"));
    } catch (requestError) {
      setFeedback({
        title: "Falha ao carregar eventos",
        description: normalizeApiError((requestError as Error).message),
        variant: "danger"
      });
    } finally {
      setLoadingEvents(false);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, []);

  function resetForm() {
    setForm({ ...initialForm, startsAt: defaultStartDate() });
    setEditingEventId(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        location: form.location.trim(),
        onlineUrl: form.onlineUrl.trim() || undefined,
        accessType: form.accessType,
        priceCents: form.accessType === "free_members" ? undefined : Number(form.priceCents),
        heroImageUrl: form.heroImageUrl.trim() || undefined,
        galleryImageUrls: parseGalleryInput(form.galleryImageUrls)
      };

      if (editingEventId) {
        await apiRequest(`/admin/events/${editingEventId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });

        setFeedback({
          title: "Evento atualizado",
          description: "As informações do evento foram atualizadas com sucesso.",
          variant: "success"
        });
      } else {
        await apiRequest("/admin/events", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        setFeedback({
          title: "Evento publicado",
          description: "Novo evento publicado com sucesso para a comunidade.",
          variant: "success"
        });
      }

      resetForm();
      await loadEvents();
    } catch (submitError) {
      setFeedback({
        title: "Falha ao salvar evento",
        description: normalizeApiError((submitError as Error).message),
        variant: "danger"
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(eventId: string) {
    setLoadingDetailsId(eventId);
    setFeedback(null);

    try {
      const details = await apiRequest<EventDetails>(`/admin/events/${eventId}`);

      setEditingEventId(eventId);
      setForm({
        title: details.title,
        description: details.description,
        startsAt: toLocalDateTime(details.startsAt),
        endsAt: toLocalDateTime(details.endsAt),
        location: details.location,
        onlineUrl: details.onlineUrl ?? "",
        accessType: details.accessType,
        priceCents: details.priceCents ? String(details.priceCents) : "",
        heroImageUrl: details.heroImageUrl && details.heroImageUrl !== EVENT_IMAGE_FALLBACK ? details.heroImageUrl : "",
        galleryImageUrls: (details.galleryImageUrls ?? []).join("\n")
      });

      setFeedback({
        title: "Modo edição ativado",
        description: "Painel lateral preenchido com os dados do evento selecionado.",
        variant: "info"
      });
    } catch (requestError) {
      setFeedback({
        title: "Falha ao carregar detalhes",
        description: normalizeApiError((requestError as Error).message),
        variant: "danger"
      });
    } finally {
      setLoadingDetailsId(null);
    }
  }

  async function handleDelete(eventId: string) {
    const eventTarget = events.find((item) => item.id === eventId);
    const confirmed = window.confirm(`Deseja remover o evento "${eventTarget?.title ?? "selecionado"}"?`);
    if (!confirmed) return;

    setRemovingEventId(eventId);
    setFeedback(null);

    try {
      await apiRequest(`/admin/events/${eventId}`, { method: "DELETE" });
      if (editingEventId === eventId) {
        resetForm();
      }

      setFeedback({
        title: "Evento removido",
        description: "O evento foi removido da programação com sucesso.",
        variant: "success"
      });

      await loadEvents();
    } catch (requestError) {
      setFeedback({
        title: "Falha ao remover evento",
        description: normalizeApiError((requestError as Error).message),
        variant: "danger"
      });
    } finally {
      setRemovingEventId(null);
    }
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow={<Badge variant="brand">Eventos Admin</Badge>}
        title="Agenda, mídia e acesso em uma única superfície"
        description="O módulo agora prioriza triagem por tabela: data, tipo de acesso, preço e qualidade visual do evento ficam legíveis na mesma passada de olho."
        meta={
          <FilterBar
            actions={<Badge variant="neutral">{filteredEvents.length.toLocaleString("pt-BR")} item(ns)</Badge>}
          >
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por título, resumo ou local"
              type="search"
              style={{ maxWidth: "340px" }}
            />
            <Select
              value={accessFilter}
              onChange={(event) => setAccessFilter(event.target.value as AccessFilter)}
              style={{ maxWidth: "190px" }}
            >
              <option value="all">Todos os acessos</option>
              <option value="free_members">Gratuito</option>
              <option value="paid_members">Pago</option>
              <option value="public_with_member_discount">Público + desconto</option>
            </Select>
          </FilterBar>
        }
      />

      {feedback ? (
        <Alert variant={feedback.variant} title={feedback.title}>
          {feedback.description}
        </Alert>
      ) : null}

      {loadingEvents ? (
        <Alert variant="info" title="Atualizando programação">
          Carregando agenda, acesso e ativos visuais dos eventos publicados.
        </Alert>
      ) : null}

      <div style={{ display: "grid", gap: "16px" }}>
        <MetricStrip
          items={[
            {
              label: "Eventos totais",
              value: dashboard.total.toLocaleString("pt-BR"),
              hint: "agenda registrada",
              badge: <Badge variant="brand">Agenda</Badge>,
              tone: "brand"
            },
            {
              label: "Programados",
              value: dashboard.upcoming.toLocaleString("pt-BR"),
              hint: "ainda por acontecer",
              badge: <Badge variant="info">No radar</Badge>,
              tone: "info"
            },
            {
              label: "Pagos",
              value: dashboard.paid.toLocaleString("pt-BR"),
              hint: "com checkout ativo",
              badge: <Badge variant="warning">Checkout</Badge>,
              tone: "warning"
            },
            {
              label: "Capas customizadas",
              value: dashboard.withCustomHero.toLocaleString("pt-BR"),
              hint: "qualidade visual",
              badge: <Badge variant="success">Brand</Badge>,
              tone: "success"
            }
          ]}
        />

        {nextEvent ? (
          <section style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
            <article
              style={{
                display: "grid",
                gap: "14px",
                padding: "18px",
                borderRadius: "24px",
                border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(248,250,255,0.86))",
                boxShadow: "0 14px 30px rgba(15, 16, 23, 0.06)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: "4px" }}>
                  <Badge variant="brand" style={{ justifySelf: "start" }}>
                    Próximo destaque
                  </Badge>
                  <strong style={{ fontSize: "1.08rem" }}>{nextEvent.title}</strong>
                </div>
                <Badge variant={getEventTimingState(nextEvent.startsAt).variant}>{getEventTimingState(nextEvent.startsAt).label}</Badge>
              </div>
              <div style={{ display: "grid", gap: "6px" }}>
                <span style={{ color: "var(--elo-text-secondary, #374151)" }}>{nextEvent.summary}</span>
                <span style={{ color: "var(--elo-text-tertiary, #6B7280)", fontSize: ".9rem" }}>
                  {new Date(nextEvent.startsAt).toLocaleString("pt-BR")} · {nextEvent.location}
                </span>
              </div>
            </article>

            <article
              style={{
                display: "grid",
                gap: "12px",
                padding: "18px",
                borderRadius: "24px",
                border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(248,250,255,0.86))"
              }}
            >
              <Badge variant="info" style={{ justifySelf: "start" }}>
                Leitura operacional
              </Badge>
              <div style={{ display: "grid", gap: "6px" }}>
                <strong style={{ fontSize: "1.08rem" }}>Agenda pronta para triagem visual</strong>
                <p style={{ margin: 0, color: "var(--elo-text-secondary, #374151)", lineHeight: 1.6 }}>
                  Cada linha agora deve responder rapidamente: o evento é quando, como monetiza, se tem boa mídia e qual ação precisa da operação.
                </p>
              </div>
            </article>
          </section>
        ) : null}

        <section
          style={{
            display: "grid",
            gap: "16px",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))"
          }}
        >
          <div style={{ minWidth: 0 }}>
            <DataTable
              rows={filteredEvents}
              rowKey={(item) => item.id}
              emptyState={
                <EmptyState
                  title="Nenhum evento encontrado"
                  description="Ajuste os filtros ou publique uma nova programação pelo painel lateral."
                />
              }
              columns={[
                {
                  key: "title",
                  header: "Evento",
                  sortable: true,
                  sortValue: (item) => item.title,
                  render: (item) => (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <div
                        style={{
                          width: "76px",
                          height: "58px",
                          borderRadius: "14px",
                          overflow: "hidden",
                          position: "relative",
                          border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))"
                        }}
                      >
                        <Image
                          loader={passthroughImageLoader}
                          unoptimized
                          fill
                          sizes="76px"
                          src={item.heroImageUrl ?? EVENT_IMAGE_FALLBACK}
                          alt={`Capa do evento ${item.title}`}
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                      <div style={{ display: "grid", gap: "7px" }}>
                        <strong>{item.title}</strong>
                        <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".9rem", lineHeight: 1.55 }}>
                          {item.summary}
                        </span>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <Badge variant={getEventTimingState(item.startsAt).variant}>{getEventTimingState(item.startsAt).label}</Badge>
                          <Badge variant={getAccessTypeBadgeVariant(item.accessType)}>{getAccessTypeLabel(item.accessType)}</Badge>
                        </div>
                      </div>
                    </div>
                  )
                },
                {
                  key: "timing",
                  header: "Quando e onde",
                  sortable: true,
                  sortValue: (item) => item.startsAt,
                  render: (item) => (
                    <div style={{ display: "grid", gap: "6px" }}>
                      <span>{new Date(item.startsAt).toLocaleString("pt-BR")}</span>
                      <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>
                        {item.location}
                      </span>
                    </div>
                  )
                },
                {
                  key: "access",
                  header: "Acesso",
                  width: "200px",
                  sortable: true,
                  sortValue: (item) => item.accessType,
                  render: (item) => (
                    <div style={{ display: "grid", gap: "6px" }}>
                      <Badge variant={item.onlineUrl ? "info" : "neutral"}>{item.onlineUrl ? "Híbrido / online" : "Presencial"}</Badge>
                      {item.priceCents ? (
                        <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>
                          {formatCurrency(item.priceCents)}
                        </span>
                      ) : (
                        <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>
                          Sem cobrança
                        </span>
                      )}
                    </div>
                  )
                },
                {
                  key: "status",
                  header: "Status",
                  width: "160px",
                  sortable: true,
                  sortValue: (item) => getEventTimingState(item.startsAt).label,
                  render: (item) => <Badge variant={getEventTimingState(item.startsAt).variant}>{getEventTimingState(item.startsAt).label}</Badge>
                },
                {
                  key: "media",
                  header: "Visual",
                  width: "170px",
                  render: (item) => (
                    <div style={{ display: "grid", gap: "6px" }}>
                      <Badge variant={item.heroImageUrl ? "success" : "neutral"}>
                        {item.heroImageUrl ? "Capa custom" : "Capa padrão"}
                      </Badge>
                      <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>
                        {(item.galleryImageUrls ?? []).length} imagem(ns) na galeria
                      </span>
                    </div>
                  )
                },
                {
                  key: "actions",
                  header: "Ações",
                  width: "220px",
                  align: "right",
                  render: (item) => (
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={loadingDetailsId === item.id}
                        onClick={() => handleEdit(item.id)}
                      >
                        {loadingDetailsId === item.id ? "Abrindo..." : "Editar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={removingEventId === item.id}
                        onClick={() => handleDelete(item.id)}
                      >
                        {removingEventId === item.id ? "Removendo..." : "Excluir"}
                      </Button>
                    </div>
                  )
                }
              ]}
            />
          </div>

          <SidePanelForm
            badge={<Badge variant={isEditing ? "warning" : "brand"}>{isEditing ? "Modo edição" : "Novo evento"}</Badge>}
                  title={isEditing ? "Editar evento" : "Publicar evento"}
            description="Criação e edição ficam no painel lateral, com preview de capa e galeria para reduzir erro visual antes da publicação."
          >
            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ display: "grid", gap: "8px" }}>
                <div
                  style={{
                    height: "150px",
                    borderRadius: "18px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    overflow: "hidden",
                    position: "relative"
                  }}
                >
                  <Image
                    loader={passthroughImageLoader}
                    unoptimized
                    fill
                    sizes="(max-width: 1024px) 100vw, 28vw"
                    src={previewImageUrl}
                    alt="Prévia da capa do evento"
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <Badge variant={hasCustomHero ? "success" : "neutral"}>
                    {hasCustomHero ? "Hero custom" : "Hero padrão"}
                  </Badge>
                  <Badge variant={isPaidAccess ? "brand" : "info"}>{isPaidAccess ? "Com checkout" : "Entrada livre"}</Badge>
                  <Badge variant={galleryPreviewUrls.length > 0 ? "info" : "neutral"}>
                    {galleryPreviewUrls.length} item(ns) na galeria
                  </Badge>
                </div>
                {galleryPreviewUrls.length > 0 ? (
                  <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                    {galleryPreviewUrls.slice(0, 3).map((imageUrl) => (
                      <div
                        key={imageUrl}
                        style={{
                          height: "56px",
                          borderRadius: "12px",
                          border: "1px solid rgba(255,255,255,0.08)",
                          overflow: "hidden",
                          position: "relative"
                        }}
                      >
                        <Image
                          loader={passthroughImageLoader}
                          unoptimized
                          fill
                          sizes="96px"
                          src={imageUrl}
                          alt="Prévia da galeria do evento"
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
                <label style={{ display: "grid", gap: "6px" }}>
                  <span>Título</span>
                  <Input
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    required
                  />
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span>Descrição</span>
                  <Textarea
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    required
                    style={{ minHeight: "120px" }}
                  />
                </label>

                <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                  <label style={{ display: "grid", gap: "6px" }}>
                    <span>Início</span>
                    <Input
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
                      required
                    />
                  </label>
                  <label style={{ display: "grid", gap: "6px" }}>
                    <span>Fim</span>
                    <Input
                      type="datetime-local"
                      value={form.endsAt}
                      onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))}
                    />
                  </label>
                </div>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span>Local</span>
                  <Input
                    value={form.location}
                    onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                    required
                  />
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span>Link online</span>
                  <Input
                    value={form.onlineUrl}
                    onChange={(event) => setForm((prev) => ({ ...prev, onlineUrl: event.target.value }))}
                    placeholder="https://..."
                  />
                </label>

                <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "minmax(0, 1fr) 120px" }}>
                  <label style={{ display: "grid", gap: "6px" }}>
                    <span>Tipo de acesso</span>
                    <Select
                      value={form.accessType}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, accessType: event.target.value as EventForm["accessType"] }))
                      }
                    >
                      <option value="free_members">Gratuito</option>
                      <option value="paid_members">Pago</option>
                      <option value="public_with_member_discount">Público + desconto</option>
                    </Select>
                  </label>
                  <label style={{ display: "grid", gap: "6px" }}>
                    <span>Preço</span>
                    <Input
                      type="number"
                      value={form.priceCents}
                      onChange={(event) => setForm((prev) => ({ ...prev, priceCents: event.target.value }))}
                      disabled={!isPaidAccess}
                    />
                  </label>
                </div>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span>URL da capa</span>
                  <Input
                    value={form.heroImageUrl}
                    onChange={(event) => setForm((prev) => ({ ...prev, heroImageUrl: event.target.value }))}
                    placeholder="/uploads/capa.png ou https://..."
                  />
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span>Galeria (uma URL por linha)</span>
                  <Textarea
                    value={form.galleryImageUrls}
                    onChange={(event) => setForm((prev) => ({ ...prev, galleryImageUrls: event.target.value }))}
                    style={{ minHeight: "120px" }}
                  />
                </label>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Salvando..." : isEditing ? "Salvar evento" : "Publicar evento"}
                  </Button>
                  {isEditing ? (
                    <Button type="button" variant="secondary" onClick={resetForm}>
                      Cancelar edição
                    </Button>
                  ) : null}
                </div>
              </form>
            </div>
          </SidePanelForm>
        </section>
      </div>
    </AdminShell>
  );
}
