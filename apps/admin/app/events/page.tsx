"use client";

import Image from "next/image";
import type { AlertVariant } from "@elo/ui";
import React, { FormEvent, useEffect, useMemo, useState } from "react";
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

const defaultStartDate = () =>
  new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16);

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
    return "Não foi possível conectar ao servidor.";
  }
  return raw;
}

function getAccessTypeLabel(accessType: string) {
  if (accessType === "free_members") return "Gratuito";
  if (accessType === "paid_members") return "Pago";
  return "Público";
}

function getEventTimingState(startsAt: string) {
  const start = new Date(startsAt).getTime();
  const now = Date.now();
  if (start > now) return { label: "Programado", variant: "info" };
  const sixHoursMs = 6 * 60 * 60 * 1000;
  if (now - start <= sixHoursMs) return { label: "Em andamento", variant: "success" };
  return { label: "Realizado", variant: "neutral" };
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

  const stats = useMemo(() => {
    const paid = events.filter((item) => item.accessType !== "free_members").length;
    const upcoming = events.filter(
      (item) => getEventTimingState(item.startsAt).label === "Programado"
    ).length;
    const withHero = events.filter((item) => Boolean(item.heroImageUrl)).length;
    return { total: events.length, paid, upcoming, withHero };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return events
      .filter((item) => (accessFilter === "all" ? true : item.accessType === accessFilter))
      .filter((item) => {
        if (!normalizedSearch) return true;
        return [item.title, item.summary, item.location].some((v) =>
          v?.toLowerCase().includes(normalizedSearch)
        );
      })
      .sort(
        (first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()
      );
  }, [accessFilter, events, search]);

  useEffect(() => {
    async function loadEvents() {
      try {
        setEvents(await apiRequest<EventListItem[]>("/admin/events"));
      } catch (requestError) {
        setFeedback({
          title: "Erro",
          description: normalizeApiError((requestError as Error).message),
          variant: "danger"
        });
      } finally {
        setLoadingEvents(false);
      }
    }
    void loadEvents();
  }, []);

  function resetForm() {
    setForm({ ...initialForm, startsAt: defaultStartDate() });
    setEditingEventId(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
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

    try {
      if (editingEventId) {
        await apiRequest(`/admin/events/${editingEventId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        setFeedback({
          title: "Evento atualizado",
          description: "Salvo com sucesso.",
          variant: "success"
        });
      } else {
        await apiRequest("/admin/events", { method: "POST", body: JSON.stringify(payload) });
        setFeedback({
          title: "Evento criado",
          description: "Publicado com sucesso.",
          variant: "success"
        });
      }
      resetForm();
      setEvents(await apiRequest<EventListItem[]>("/admin/events"));
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

  async function handleEdit(eventId: string) {
    setLoadingDetailsId(eventId);
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
        heroImageUrl:
          details.heroImageUrl && details.heroImageUrl !== EVENT_IMAGE_FALLBACK
            ? details.heroImageUrl
            : "",
        galleryImageUrls: (details.galleryImageUrls ?? []).join("\n")
      });
    } catch (requestError) {
      setFeedback({
        title: "Erro",
        description: normalizeApiError((requestError as Error).message),
        variant: "danger"
      });
    } finally {
      setLoadingDetailsId(null);
    }
  }

  async function handleDelete(eventId: string) {
    const eventTarget = events.find((item) => item.id === eventId);
    const confirmed = window.confirm(`Remover "${eventTarget?.title ?? "evento"}"?`);
    if (!confirmed) return;
    setRemovingEventId(eventId);
    try {
      await apiRequest(`/admin/events/${eventId}`, { method: "DELETE" });
      if (editingEventId === eventId) resetForm();
      setFeedback({ title: "Removido", description: "Evento excluído.", variant: "success" });
      setEvents(await apiRequest<EventListItem[]>("/admin/events"));
    } catch (requestError) {
      setFeedback({
        title: "Erro",
        description: normalizeApiError((requestError as Error).message),
        variant: "danger"
      });
    } finally {
      setRemovingEventId(null);
    }
  }

  if (loadingEvents) {
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
          <span style={cardLabelStyle}>Total de Eventos</span>
          <span style={cardValueStyle}>{stats.total}</span>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Programados</span>
          <span style={{ ...cardValueStyle, color: stats.upcoming > 0 ? "#f59e0b" : "#22c55e" }}>
            {stats.upcoming}
          </span>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Pagos</span>
          <span style={cardValueStyle}>{stats.paid}</span>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Com Capa</span>
          <span style={cardValueStyle}>{stats.withHero}</span>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar evento..."
          style={{ ...inputStyle, maxWidth: "280px" }}
        />
        <select
          value={accessFilter}
          onChange={(e) => setAccessFilter(e.target.value as AccessFilter)}
          style={{ ...selectStyle, width: "160px" }}
        >
          <option value="all">Todos</option>
          <option value="free_members">Gratuito</option>
          <option value="paid_members">Pago</option>
          <option value="public_with_member_discount">Público</option>
        </select>
      </div>

      {/* Lista + Formulário */}
      <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "1fr 380px" }}>
        {/* Lista de eventos */}
        <div
          style={{
            background: "#1a1a1a",
            borderRadius: "12px",
            padding: "16px",
            border: "1px solid rgba(255,255,255,0.06)"
          }}
        >
          {filteredEvents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.5)" }}>
              Nenhum evento encontrado
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
                    Evento
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 8px",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.75rem"
                    }}
                  >
                    Data/Local
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 8px",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.75rem"
                    }}
                  >
                    Acesso
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
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "48px",
                            height: "36px",
                            borderRadius: "6px",
                            overflow: "hidden",
                            position: "relative",
                            background: "#252525"
                          }}
                        >
                          {item.heroImageUrl && (
                            <Image
                              src={item.heroImageUrl}
                              alt=""
                              fill
                              style={{ objectFit: "cover" }}
                              unoptimized
                            />
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{item.title}</div>
                          <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                            {item.summary?.slice(0, 40)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ fontSize: "0.9rem" }}>
                        {new Date(item.startsAt).toLocaleDateString("pt-BR")}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                        {item.location}
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
                            item.accessType === "free_members"
                              ? "rgba(59,130,246,0.15)"
                              : "rgba(134,90,255,0.15)",
                          color: item.accessType === "free_members" ? "#3b82f6" : "#865aff"
                        }}
                      >
                        {getAccessTypeLabel(item.accessType)}
                      </span>
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
                            getEventTimingState(item.startsAt).variant === "info"
                              ? "rgba(59,130,246,0.15)"
                              : getEventTimingState(item.startsAt).variant === "success"
                                ? "rgba(34,197,94,0.15)"
                                : "rgba(107,114,128,0.15)",
                          color:
                            getEventTimingState(item.startsAt).variant === "info"
                              ? "#3b82f6"
                              : getEventTimingState(item.startsAt).variant === "success"
                                ? "#22c55e"
                                : "#9ca3af"
                        }}
                      >
                        {getEventTimingState(item.startsAt).label}
                      </span>
                    </td>
                    <td style={{ padding: "12px 8px", textAlign: "right" }}>
                      <button
                        onClick={() => handleEdit(item.id)}
                        disabled={loadingDetailsId === item.id}
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
                        {loadingDetailsId === item.id ? "..." : "Editar"}
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={removingEventId === item.id}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "none",
                          background: "rgba(239,68,68,0.2)",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: "0.8rem"
                        }}
                      >
                        {removingEventId === item.id ? "..." : "Excluir"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Formulário lateral */}
        <div
          style={{
            background: "#1a1a1a",
            borderRadius: "12px",
            padding: "20px",
            border: "1px solid rgba(255,255,255,0.06)",
            height: "fit-content"
          }}
        >
          <h3 style={{ margin: "0 0 16px", fontSize: "1rem", fontWeight: 600 }}>
            {isEditing ? "Editar evento" : "Novo evento"}
          </h3>

          {/* Preview da capa */}
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                height: "100px",
                borderRadius: "8px",
                overflow: "hidden",
                position: "relative",
                background: "#252525",
                marginBottom: "8px"
              }}
            >
              <Image
                src={previewImageUrl}
                alt="Preview"
                fill
                style={{ objectFit: "cover" }}
                unoptimized
              />
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  background: hasCustomHero ? "rgba(34,197,94,0.2)" : "rgba(107,114,128,0.2)",
                  color: hasCustomHero ? "#22c55e" : "#9ca3af"
                }}
              >
                {hasCustomHero ? "Capa custom" : "Capa padrão"}
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  background: isPaidAccess ? "rgba(134,90,255,0.2)" : "rgba(59,130,246,0.2)",
                  color: isPaidAccess ? "#865aff" : "#3b82f6"
                }}
              >
                {isPaidAccess ? "Pago" : "Gratuito"}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "rgba(255,255,255,0.5)",
                  marginBottom: "4px"
                }}
              >
                Título
              </label>
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
                style={inputStyle}
              />
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
                Descrição
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                required
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.5)",
                    marginBottom: "4px"
                  }}
                >
                  Início
                </label>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))}
                  required
                  style={inputStyle}
                />
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
                  Fim
                </label>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))}
                  style={inputStyle}
                />
              </div>
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
                Local
              </label>
              <input
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                required
                style={inputStyle}
              />
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
                Link online
              </label>
              <input
                value={form.onlineUrl}
                onChange={(e) => setForm((p) => ({ ...p, onlineUrl: e.target.value }))}
                placeholder="https://..."
                style={inputStyle}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.5)",
                    marginBottom: "4px"
                  }}
                >
                  Acesso
                </label>
                <select
                  value={form.accessType}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      accessType: e.target.value as EventForm["accessType"]
                    }))
                  }
                  style={selectStyle}
                >
                  <option value="free_members">Gratuito</option>
                  <option value="paid_members">Pago</option>
                  <option value="public_with_member_discount">Público</option>
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
                  Preço (R$)
                </label>
                <input
                  type="number"
                  value={form.priceCents}
                  onChange={(e) => setForm((p) => ({ ...p, priceCents: e.target.value }))}
                  disabled={!isPaidAccess}
                  style={inputStyle}
                />
              </div>
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
                URL da capa
              </label>
              <input
                value={form.heroImageUrl}
                onChange={(e) => setForm((p) => ({ ...p, heroImageUrl: e.target.value }))}
                placeholder="/uploads/..."
                style={inputStyle}
              />
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
                Galeria (URLs)
              </label>
              <textarea
                value={form.galleryImageUrls}
                onChange={(e) => setForm((p) => ({ ...p, galleryImageUrls: e.target.value }))}
                rows={2}
                placeholder="Uma URL por linha"
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(90deg, #5932d1 0%, #9b027c 100%)",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {saving ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "transparent",
                    color: "rgba(255,255,255,0.6)",
                    cursor: "pointer"
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </AdminShell>
  );
}
