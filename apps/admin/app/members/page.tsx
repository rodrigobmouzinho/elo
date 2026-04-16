"use client";

import { formatBrazilianPhoneInput, isValidBrazilianMobile } from "@elo/core";
import { useBrazilLocations } from "@elo/ui";
import type { AlertVariant } from "@elo/ui";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { apiRequest } from "../../lib/auth-client";

type Member = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  whatsapp: string;
  city: string;
  state: string;
  area: string;
  bio?: string;
  specialty?: string;
  active: boolean;
  createdAt?: string;
};

type MemberForm = {
  fullName: string;
  email: string;
  phone: string;
  whatsapp: string;
  city: string;
  state: string;
  area: string;
  bio: string;
  specialty: string;
  membershipExpiresAt: string;
};

type FeedbackState = {
  title: string;
  description: string;
  variant: AlertVariant;
};

type MemberStatusFilter = "all" | "active" | "inactive";

const defaultMembershipExpiration = () =>
  new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);

const initialForm: MemberForm = {
  fullName: "",
  email: "",
  phone: "",
  whatsapp: "",
  city: "",
  state: "",
  area: "",
  bio: "",
  specialty: "",
  membershipExpiresAt: defaultMembershipExpiration()
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

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();
  if (
    normalized.includes("network") ||
    normalized.includes("conexao") ||
    normalized.includes("conexão")
  ) {
    return "Não foi possível conectar ao servidor. Tente novamente em instantes.";
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

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState<MemberForm>(initialForm);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [statusFilter, setStatusFilter] = useState<MemberStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const { states, cities } = useBrazilLocations({
    selectedState: form.state,
    selectedCity: form.city
  });

  const isEditing = Boolean(editingMemberId);

  useEffect(() => {
    async function loadMembers() {
      try {
        setMembers(await apiRequest<Member[]>("/admin/members"));
      } catch (requestError) {
        setFeedback({
          title: "Falha ao carregar membros",
          description: normalizeApiError((requestError as Error).message),
          variant: "danger"
        });
      } finally {
        setLoadingMembers(false);
      }
    }
    void loadMembers();
  }, []);

  const filteredMembers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return members
      .filter((member) => {
        if (statusFilter === "active") return member.active;
        if (statusFilter === "inactive") return !member.active;
        return true;
      })
      .filter((member) => {
        if (!normalizedSearch) return true;
        return [member.fullName, member.email, member.city, member.state, member.area].some(
          (value) => value.toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((first, second) => first.fullName.localeCompare(second.fullName, "pt-BR"));
  }, [members, search, statusFilter]);

  const stats = useMemo(() => {
    const active = members.filter((m) => m.active).length;
    const now = new Date();
    const newThisMonth = members.filter((m) => {
      if (!m.createdAt) return false;
      const created = new Date(m.createdAt);
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;

    return {
      total: members.length,
      active,
      inactive: members.length - active,
      newThisMonth
    };
  }, [members]);

  function resetForm() {
    setEditingMemberId(null);
    setForm({ ...initialForm, membershipExpiresAt: defaultMembershipExpiration() });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      if (!isValidBrazilianMobile(form.whatsapp)) {
        setFeedback({
          title: "WhatsApp inválido",
          description: "Informe um número de celular válido.",
          variant: "danger"
        });
        setSaving(false);
        return;
      }

      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        area: form.area.trim(),
        bio: form.bio.trim(),
        specialty: form.specialty.trim()
      };

      if (editingMemberId) {
        await apiRequest(`/admin/members/${editingMemberId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        setFeedback({
          title: "Membro atualizado",
          description: "Cadastro atualizado.",
          variant: "success"
        });
      } else {
        const membershipExpiresAt = new Date(form.membershipExpiresAt).toISOString();
        await apiRequest("/admin/members", {
          method: "POST",
          body: JSON.stringify({ ...payload, membershipExpiresAt })
        });
        setFeedback({
          title: "Membro cadastrado",
          description: "Novo membro adicionado.",
          variant: "success"
        });
      }

      resetForm();
      const updated = await apiRequest<Member[]>("/admin/members");
      setMembers(updated);
    } catch (submitError) {
      setFeedback({
        title: "Falha ao salvar",
        description: normalizeApiError((submitError as Error).message),
        variant: "danger"
      });
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(member: Member) {
    setEditingMemberId(member.id);
    setForm({
      fullName: member.fullName,
      email: member.email,
      phone: formatBrazilianPhoneInput(member.phone),
      whatsapp: formatBrazilianPhoneInput(member.whatsapp),
      city: member.city,
      state: member.state,
      area: member.area,
      bio: member.bio ?? "",
      specialty: member.specialty ?? "",
      membershipExpiresAt: defaultMembershipExpiration()
    });
  }

  async function toggleMemberActive(member: Member) {
    const actionLabel = member.active ? "inativar" : "reativar";
    const confirmed = window.confirm(`Deseja ${actionLabel} o membro "${member.fullName}"?`);
    if (!confirmed) return;

    try {
      if (member.active) {
        await apiRequest(`/admin/members/${member.id}`, { method: "DELETE" });
        setFeedback({
          title: "Membro inativado",
          description: `${member.fullName} foi inativado.`,
          variant: "warning"
        });
      } else {
        await apiRequest(`/admin/members/${member.id}`, {
          method: "PATCH",
          body: JSON.stringify({ active: true })
        });
        setFeedback({
          title: "Membro reativado",
          description: `${member.fullName} voltou à base.`,
          variant: "success"
        });
      }
      const updated = await apiRequest<Member[]>("/admin/members");
      setMembers(updated);
    } catch (submitError) {
      setFeedback({
        title: "Falha ao alterar status",
        description: normalizeApiError((submitError as Error).message),
        variant: "danger"
      });
    }
  }

  if (loadingMembers) {
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
          <span style={cardLabelStyle}>Total de Membros</span>
          <span style={cardValueStyle}>{stats.total}</span>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Ativos</span>
          <span style={{ ...cardValueStyle, color: "#22c55e" }}>{stats.active}</span>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Inativos</span>
          <span
            style={{
              ...cardValueStyle,
              color: stats.inactive > 0 ? "#f59e0b" : "rgba(255,255,255,0.5)"
            }}
          >
            {stats.inactive}
          </span>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Novos do Mês</span>
          <span style={cardValueStyle}>{stats.newThisMonth}</span>
        </div>
      </div>

      {/* Busca e filtro */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, e-mail, cidade..."
          style={{ ...inputStyle, maxWidth: "320px" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as MemberStatusFilter)}
          style={{ ...selectStyle, width: "140px" }}
        >
          <option value="all">Status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
      </div>

      {/* Tabela de membros */}
      <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "1fr 360px" }}>
        <div
          style={{
            background: "#1a1a1a",
            borderRadius: "12px",
            padding: "16px",
            border: "1px solid rgba(255,255,255,0.06)"
          }}
        >
          {filteredMembers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.5)" }}>
              Nenhum membro encontrado
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
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textTransform: "uppercase"
                    }}
                  >
                    Membro
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 8px",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textTransform: "uppercase"
                    }}
                  >
                    Local
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 8px",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textTransform: "uppercase"
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "12px 8px",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textTransform: "uppercase"
                    }}
                  >
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
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
                            fontSize: "0.875rem",
                            color: "#fff"
                          }}
                        >
                          {initials(member.fullName)}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600, color: "#fff" }}>{member.fullName}</div>
                          <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 8px", color: "rgba(255,255,255,0.7)" }}>
                      <div style={{ fontSize: "0.9rem", color: "#fff" }}>
                        {member.city}/{member.state}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                        {member.area}
                      </div>
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          background: member.active
                            ? "rgba(34,197,94,0.15)"
                            : "rgba(107,114,128,0.15)",
                          color: member.active ? "#22c55e" : "#9ca3af"
                        }}
                      >
                        {member.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 8px", textAlign: "right" }}>
                      <button
                        onClick={() => handleEdit(member)}
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
                        Editar
                      </button>
                      <button
                        onClick={() => toggleMemberActive(member)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "none",
                          background: member.active ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)",
                          color: member.active ? "#ef4444" : "#22c55e",
                          cursor: "pointer",
                          fontSize: "0.8rem"
                        }}
                      >
                        {member.active ? "Inativar" : "Reativar"}
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
          <h3
            style={{
              margin: "0 0 16px",
              fontSize: "1rem",
              fontWeight: 600,
              color: "rgba(255,255,255,0.7)"
            }}
          >
            {isEditing ? "Editar membro" : "Novo membro"}
          </h3>

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
                Nome
              </label>
              <input
                value={form.fullName}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
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
                E-mail
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
                disabled={isEditing}
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
                  Celular
                </label>
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, phone: formatBrazilianPhoneInput(e.target.value) }))
                  }
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
                  WhatsApp
                </label>
                <input
                  value={form.whatsapp}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, whatsapp: formatBrazilianPhoneInput(e.target.value) }))
                  }
                  required
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "12px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.5)",
                    marginBottom: "4px"
                  }}
                >
                  UF
                </label>
                <select
                  value={form.state}
                  onChange={(e) => setForm((p) => ({ ...p, state: e.target.value, city: "" }))}
                  required
                  style={selectStyle}
                >
                  <option value="">UF</option>
                  {states.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code}
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
                  Cidade
                </label>
                <select
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  required
                  disabled={!form.state}
                  style={selectStyle}
                >
                  <option value="">Cidade</option>
                  {cities.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
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
                Área
              </label>
              <input
                value={form.area}
                onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))}
                required
                style={inputStyle}
              />
            </div>
            {!isEditing && (
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
                <div style={{ position: "relative" }}>
                  <input
                    type="date"
                    value={form.membershipExpiresAt.split("T")[0]}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        membershipExpiresAt: e.target.value ? `${e.target.value}T00:00:00` : ""
                      }))
                    }
                    required
                    style={{
                      width: "100%",
                      padding: "10px 36px 10px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "#252525",
                      color: "#fff",
                      fontSize: "0.875rem",
                      WebkitAppearance: "none",
                      MozAppearance: "textfield"
                    }}
                  />
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none"
                    }}
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
              </div>
            )}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "rgba(255,255,255,0.5)",
                  marginBottom: "4px"
                }}
              >
                Especialidade
              </label>
              <input
                value={form.specialty}
                onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
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
                Bio
              </label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                rows={3}
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
                {saving ? "Salvando..." : isEditing ? "Salvar" : "Cadastrar"}
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
