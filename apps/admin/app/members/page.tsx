"use client";

import { formatBrazilianPhoneInput, isValidBrazilianMobile } from "@elo/core";
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
import { useBrazilLocations } from "@elo/ui";
import type { AlertVariant, BadgeVariant } from "@elo/ui";
import { MapPin, MessageCircleMore, ShieldCheck, UserRoundCheck, UserRoundX } from "lucide-react";
import { type CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
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
  new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 16);

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

const darkFieldStyle = {
  "--elo-control-bg": "#2a2a2a",
  "--elo-control-bg-hover": "#34343a",
  "--elo-control-bg-active": "#3b3b42",
  "--elo-control-bg-disabled": "#212126",
  "--elo-control-border": "rgba(203, 190, 255, 0.16)",
  "--elo-control-border-focus": "rgba(203, 190, 255, 0.58)",
  "--elo-text-primary": "#ffffff",
  "--elo-text-muted": "rgba(202, 195, 215, 0.62)"
} as CSSProperties;

function toMemberForm(member: Member): MemberForm {
  return {
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
  };
}

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao") || normalized.includes("conexão")) {
    return "Não foi possível conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

function profileCompleteness(member: Member): { label: string; variant: BadgeVariant; complete: boolean } {
  const hasBio = Boolean(member.bio?.trim());
  const hasSpecialty = Boolean(member.specialty?.trim());

  if (hasBio && hasSpecialty) {
    return { label: "Completo", variant: "success", complete: true };
  }

  if (hasBio || hasSpecialty) {
    return { label: "Parcial", variant: "warning", complete: false };
  }

  return { label: "Essencial", variant: "info", complete: false };
}

function statusBadge(active: boolean): { label: string; variant: BadgeVariant } {
  return active ? { label: "Ativo", variant: "success" } : { label: "Inativo", variant: "neutral" };
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function hasWhatsapp(member: Member) {
  return Boolean(member.whatsapp.trim());
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState<MemberForm>(initialForm);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [statusChangeMemberId, setStatusChangeMemberId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MemberStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const {
    states,
    cities,
    loadingStates,
    loadingCities,
    statesError,
    citiesError
  } = useBrazilLocations({
    selectedState: form.state,
    selectedCity: form.city
  });

  const isEditing = Boolean(editingMemberId);

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

        return [member.fullName, member.email, member.city, member.state, member.area].some((value) =>
          value.toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((first, second) => {
        if (first.active !== second.active) return first.active ? -1 : 1;
        return first.fullName.localeCompare(second.fullName, "pt-BR");
      });
  }, [members, search, statusFilter]);

  const dashboard = useMemo(() => {
    const active = members.filter((member) => member.active).length;
    const inactive = members.length - active;
    const completeProfiles = members.filter((member) => profileCompleteness(member).complete).length;
    const cities = new Set(members.map((member) => `${member.city.trim().toLowerCase()}-${member.state}`)).size;
    const whatsappReady = members.filter((member) => hasWhatsapp(member)).length;
    const areas = new Set(members.map((member) => member.area.trim().toLowerCase()).filter(Boolean)).size;

    return {
      total: members.length,
      active,
      inactive,
      completeProfiles,
      cities,
      whatsappReady,
      areas
    };
  }, [members]);

  const crmRadar = useMemo(() => {
    const topCityEntry = Object.entries(
      members.reduce<Record<string, number>>((accumulator, member) => {
        const key = `${member.city.trim() || "Sem cidade"}/${member.state.trim() || "--"}`;
        accumulator[key] = (accumulator[key] ?? 0) + 1;
        return accumulator;
      }, {})
    ).sort((first, second) => second[1] - first[1])[0];

    return {
      inactiveShare: dashboard.total > 0 ? Math.round((dashboard.inactive / dashboard.total) * 100) : 0,
      completionShare: dashboard.total > 0 ? Math.round((dashboard.completeProfiles / dashboard.total) * 100) : 0,
      topCityLabel: topCityEntry?.[0] ?? "Sem praça dominante",
      topCityCount: topCityEntry?.[1] ?? 0
    };
  }, [dashboard.completeProfiles, dashboard.inactive, dashboard.total, members]);

  const priorityItems = useMemo(
    () => [
      {
        title: dashboard.inactive > 0 ? `${dashboard.inactive} membro(s) fora da base ativa` : "Base ativa estabilizada",
        description:
          dashboard.inactive > 0
            ? "Revise cadastros inativos para reduzir atrito de reentrada e limpar pendências de relacionamento."
            : "Nenhum perfil inativo precisa de atenção imediata nesta leitura.",
        tone: dashboard.inactive > 0 ? ("warning" as const) : ("success" as const)
      },
      {
        title:
          dashboard.completeProfiles < dashboard.total
            ? `${dashboard.total - dashboard.completeProfiles} perfil(is) ainda sem repertório completo`
            : "Perfis com contexto sólido",
        description:
          dashboard.completeProfiles < dashboard.total
            ? "Bio e especialidade incompletas diminuem a qualidade das conexões e da curadoria da comunidade."
            : "A base está pronta para matchmaking e leitura comercial mais precisa.",
        tone: dashboard.completeProfiles < dashboard.total ? ("info" as const) : ("success" as const)
      },
      {
        title: `${dashboard.whatsappReady.toLocaleString("pt-BR")} contato(s) com canal direto`,
        description: `${crmRadar.topCityLabel} lidera a base com ${crmRadar.topCityCount.toLocaleString(
          "pt-BR"
        )} perfil(is), ajudando a orientar ações locais e ativações por praça.`,
        tone: "brand" as const
      }
    ],
    [crmRadar.topCityCount, crmRadar.topCityLabel, dashboard.completeProfiles, dashboard.inactive, dashboard.total, dashboard.whatsappReady]
  );

  async function loadMembers() {
    setLoadingMembers(true);

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

  useEffect(() => {
    void loadMembers();
  }, []);

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
          description: "Informe um número de celular válido no padrão brasileiro.",
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
          description: "Cadastro atualizado com sucesso no diretório administrativo.",
          variant: "success"
        });
      } else {
        const membershipExpiresAt = new Date(form.membershipExpiresAt).toISOString();

        await apiRequest("/admin/members", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            membershipExpiresAt
          })
        });

        setFeedback({
          title: "Membro cadastrado",
          description: "Novo membro adicionado com sucesso na base da comunidade.",
          variant: "success"
        });
      }

      resetForm();
      await loadMembers();
    } catch (submitError) {
      setFeedback({
        title: "Falha ao salvar membro",
        description: normalizeApiError((submitError as Error).message),
        variant: "danger"
      });
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(member: Member) {
    setEditingMemberId(member.id);
    setFeedback({
      title: "Modo edição ativado",
      description: `Painel preenchido com os dados de ${member.fullName}.`,
      variant: "info"
    });
    setForm(toMemberForm(member));
  }

  function cancelEdit() {
    resetForm();
    setFeedback({
      title: "Edição cancelada",
      description: "Voltamos ao modo de novo cadastro no painel lateral.",
      variant: "info"
    });
  }

  async function toggleMemberActive(member: Member) {
    const actionLabel = member.active ? "inativar" : "reativar";
    const confirmed = window.confirm(`Deseja ${actionLabel} o membro "${member.fullName}"?`);
    if (!confirmed) return;

    setStatusChangeMemberId(member.id);
    setFeedback(null);

    try {
      if (member.active) {
        await apiRequest(`/admin/members/${member.id}`, { method: "DELETE" });
        setFeedback({
          title: "Membro inativado",
          description: `${member.fullName} foi marcado como inativo.`,
          variant: "warning"
        });
      } else {
        await apiRequest(`/admin/members/${member.id}`, {
          method: "PATCH",
          body: JSON.stringify({ active: true })
        });
        setFeedback({
          title: "Membro reativado",
          description: `${member.fullName} voltou a participar da base ativa.`,
          variant: "success"
        });
      }

      await loadMembers();
    } catch (submitError) {
      setFeedback({
        title: "Falha ao alterar status",
        description: normalizeApiError((submitError as Error).message),
        variant: "danger"
      });
    } finally {
      setStatusChangeMemberId(null);
    }
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow={<Badge variant="brand">Membros Admin</Badge>}
        title="CRM operacional da comunidade"
        description="Filtre, priorize e edite perfis sem tirar a lista de vista. O formulário vira ferramenta lateral, não o centro da tela."
        meta={
          <FilterBar
            actions={
              <Badge variant="neutral">
                {filteredMembers.length.toLocaleString("pt-BR")} visível(is)
              </Badge>
            }
          >
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, e-mail, cidade ou área"
              type="search"
              style={{ maxWidth: "360px" }}
            />
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as MemberStatusFilter)}
              style={{ maxWidth: "190px" }}
            >
              <option value="all">Todos os status</option>
              <option value="active">Somente ativos</option>
              <option value="inactive">Somente inativos</option>
            </Select>
          </FilterBar>
        }
      />

      {feedback ? (
        <Alert variant={feedback.variant} title={feedback.title}>
          {feedback.description}
        </Alert>
      ) : null}

      {loadingMembers ? (
        <Alert variant="info" title="Atualizando base de membros">
          Carregando perfis, status e completude para o CRM administrativo.
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
          <article
            style={{
              display: "grid",
              gap: "16px",
              padding: "22px 24px",
              borderRadius: "28px",
              background:
                "linear-gradient(140deg, rgba(14,16,26,0.98), rgba(32,36,52,0.94) 58%, rgba(134,90,255,0.84) 140%)",
              color: "rgba(255,255,255,0.96)",
              boxShadow: "0 24px 60px rgba(13, 16, 24, 0.24)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <Badge variant="brand">Mesa de relacionamento</Badge>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "rgba(234,236,255,0.78)",
                  fontSize: ".8rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase"
                }}
              >
                <ShieldCheck size={15} />
                CRM em fluxo
              </span>
            </div>

            <div style={{ display: "grid", gap: "10px", maxWidth: "60ch" }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: "clamp(1.45rem, 2vw, 2rem)",
                  lineHeight: 1.02,
                  maxWidth: "18ch"
                }}
              >
                Base ativa, cobertura local e qualidade de perfil em uma única leitura.
              </h2>
              <p style={{ margin: 0, color: "rgba(234,236,255,0.78)", lineHeight: 1.7 }}>
                Esta vista agora funciona como uma mesa de CRM: você identifica praça dominante, perfis incompletos e backlog
                de ativação antes de abrir o painel lateral.
              </p>
            </div>

            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              {[
                {
                  label: "Base ativa",
                  value: dashboard.active.toLocaleString("pt-BR"),
                  detail: `${crmRadar.inactiveShare}% da base pede reentrada`
                },
                {
                  label: "Perfis prontos",
                  value: `${crmRadar.completionShare}%`,
                  detail: `${dashboard.completeProfiles.toLocaleString("pt-BR")} com bio e especialidade`
                },
                {
                  label: "Canal direto",
                  value: dashboard.whatsappReady.toLocaleString("pt-BR"),
                  detail: "WhatsApp disponível para conexão"
                }
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "grid",
                    gap: "8px",
                    padding: "14px 16px",
                    borderRadius: "20px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.1)"
                  }}
                >
                  <span style={{ fontSize: ".76rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(234,236,255,0.72)" }}>
                    {item.label}
                  </span>
                  <strong style={{ fontSize: "1.5rem", lineHeight: 1, fontFamily: "var(--elo-font-mono)" }}>{item.value}</strong>
                  <span style={{ color: "rgba(234,236,255,0.76)", fontSize: ".9rem" }}>{item.detail}</span>
                </div>
              ))}
            </div>
          </article>

          <Card
            tone="panel"
            title="Radar do CRM"
            subtitle="Leitura curta para a próxima ação do time."
            style={{ alignSelf: "stretch" }}
          >
            <div style={{ display: "grid", gap: "12px" }}>
              {[
                {
                  icon: <UserRoundCheck size={16} />,
                  label: "Praça líder",
                  value: crmRadar.topCityLabel,
                  detail: `${crmRadar.topCityCount.toLocaleString("pt-BR")} perfis em destaque`
                },
                {
                  icon: <UserRoundX size={16} />,
                  label: "Inativos",
                  value: dashboard.inactive.toLocaleString("pt-BR"),
                  detail: "priorize reativação ou limpeza"
                },
                {
                  icon: <MessageCircleMore size={16} />,
                  label: "WhatsApp ativo",
                  value: dashboard.whatsappReady.toLocaleString("pt-BR"),
                  detail: "prontos para contato rápido"
                },
                {
                  icon: <MapPin size={16} />,
                  label: "Áreas cobertas",
                  value: dashboard.areas.toLocaleString("pt-BR"),
                  detail: `${dashboard.cities.toLocaleString("pt-BR")} cidade(s) representadas`
                }
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "grid",
                    gap: "6px",
                    padding: "12px 14px",
                    borderRadius: "18px",
                    border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                    background: "rgba(255,255,255,0.76)"
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--elo-text-tertiary, #6B7280)", fontSize: ".78rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {item.icon}
                    {item.label}
                  </span>
                  <strong style={{ fontSize: "1rem" }}>{item.value}</strong>
                  <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".9rem" }}>{item.detail}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <MetricStrip
          items={[
            {
              label: "Base total",
              value: dashboard.total.toLocaleString("pt-BR"),
              hint: "membros cadastrados",
              badge: <Badge variant="brand">CRM</Badge>,
              tone: "brand"
            },
            {
              label: "Ativos",
              value: dashboard.active.toLocaleString("pt-BR"),
              hint: "aptos para participação",
              badge: <Badge variant="success">Em dia</Badge>,
              tone: "success"
            },
            {
              label: "Inativos",
              value: dashboard.inactive.toLocaleString("pt-BR"),
              hint: "pedem revisão",
              badge: <Badge variant={dashboard.inactive > 0 ? "warning" : "neutral"}>Status</Badge>,
              tone: dashboard.inactive > 0 ? "warning" : "neutral"
            },
            {
              label: "Perfis completos",
              value: dashboard.completeProfiles.toLocaleString("pt-BR"),
              hint: "bio + especialidade",
              badge: <Badge variant="info">Qualidade</Badge>,
              tone: "info"
            },
            {
              label: "Cidades cobertas",
              value: dashboard.cities.toLocaleString("pt-BR"),
              hint: "alcance geográfico",
              badge: <Badge variant="neutral">Cobertura</Badge>,
              tone: "neutral"
            }
          ]}
        />

        <PriorityStrip items={priorityItems} />

        <section
          style={{
            display: "grid",
            gap: "16px",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))"
          }}
        >
          <div style={{ minWidth: 0 }}>
            <DataTable
              rows={filteredMembers}
              rowKey={(member) => member.id}
              emptyState={
                <EmptyState
                  title="Nenhum membro encontrado"
                  description="Ajuste os filtros ou cadastre um novo membro no painel lateral."
                />
              }
              columns={[
                {
                  key: "member",
                  header: "Membro",
                  sortable: true,
                  sortValue: (member) => member.fullName,
                  render: (member) => (
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
                        {initials(member.fullName)}
                      </span>
                      <span style={{ display: "grid", gap: "4px" }}>
                        <strong>{member.fullName}</strong>
                        <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".9rem" }}>{member.email}</span>
                      </span>
                    </div>
                  )
                },
                {
                  key: "location",
                  header: "Praça e área",
                  sortable: true,
                  sortValue: (member) => `${member.city}-${member.state}-${member.area}`,
                  render: (member) => (
                    <div style={{ display: "grid", gap: "6px" }}>
                      <strong>
                        {member.city}/{member.state}
                      </strong>
                      <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>
                        {member.area}
                      </span>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <Badge variant={hasWhatsapp(member) ? "success" : "neutral"}>
                          {hasWhatsapp(member) ? "WhatsApp ativo" : "Sem WhatsApp"}
                        </Badge>
                        {hasWhatsapp(member) ? (
                          <Badge variant="info">{formatBrazilianPhoneInput(member.whatsapp)}</Badge>
                        ) : null}
                      </div>
                    </div>
                  )
                },
                {
                  key: "signals",
                  header: "Sinais",
                  width: "220px",
                  sortable: true,
                  sortValue: (member) => profileCompleteness(member).label,
                  render: (member) => (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <Badge variant={profileCompleteness(member).variant}>{profileCompleteness(member).label}</Badge>
                      {member.specialty ? <Badge variant="info">{member.specialty}</Badge> : null}
                    </div>
                  )
                },
                {
                  key: "status",
                  header: "Status",
                  width: "140px",
                  sortable: true,
                  sortValue: (member) => (member.active ? 1 : 0),
                  render: (member) => <Badge variant={statusBadge(member.active).variant}>{statusBadge(member.active).label}</Badge>
                },
                {
                  key: "actions",
                  header: "Ações",
                  width: "220px",
                  align: "right",
                  render: (member) => (
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <Button size="sm" variant="secondary" onClick={() => handleEdit(member)}>
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant={member.active ? "danger" : "secondary"}
                        disabled={statusChangeMemberId === member.id}
                        onClick={() => toggleMemberActive(member)}
                      >
                        {statusChangeMemberId === member.id
                          ? "Atualizando..."
                          : member.active
                            ? "Inativar"
                            : "Reativar"}
                      </Button>
                    </div>
                  )
                }
              ]}
            />
          </div>

          <SidePanelForm
            badge={<Badge variant={isEditing ? "warning" : "brand"}>{isEditing ? "Modo edição" : "Novo cadastro"}</Badge>}
            title={isEditing ? "Editar membro" : "Cadastrar membro"}
            description="A gestão acontece com lista e formulário no mesmo campo de visão, sem perder contexto operacional."
          >
            <div
              style={{
                display: "grid",
                gap: "8px",
                padding: "14px 16px",
                borderRadius: "18px",
                background: "rgba(134, 90, 255, 0.08)",
                border: "1px solid rgba(134, 90, 255, 0.14)",
                marginBottom: "14px"
              }}
            >
              <span style={{ fontSize: ".78rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--elo-orbit, #865AFF)" }}>
                Playbook rápido
              </span>
              <p style={{ margin: 0, color: "var(--elo-text-secondary, #374151)", lineHeight: 1.65 }}>
                Capture dados essenciais, complemente especialidade e bio, e só então avance para a ativação comercial da pessoa na
                comunidade.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
              {statesError || citiesError ? (
                <Alert variant="warning" title="Localização indisponível">
                  {statesError ?? citiesError}
                </Alert>
              ) : null}

              <label style={{ display: "grid", gap: "6px" }}>
                <span>Nome completo</span>
                <Input
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  minLength={3}
                  required
                  style={darkFieldStyle}
                />
              </label>

              <label style={{ display: "grid", gap: "6px" }}>
                <span>E-mail</span>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                  disabled={isEditing}
                  style={darkFieldStyle}
                />
              </label>

              <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                <label style={{ display: "grid", gap: "6px" }}>
                  <span>Celular</span>
                  <Input
                    value={form.phone}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        phone: formatBrazilianPhoneInput(event.target.value)
                      }))
                    }
                    required
                    inputMode="numeric"
                    style={darkFieldStyle}
                  />
                </label>
                <label style={{ display: "grid", gap: "6px" }}>
                  <span>WhatsApp</span>
                  <Input
                    value={form.whatsapp}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        whatsapp: formatBrazilianPhoneInput(event.target.value)
                      }))
                    }
                    required
                    inputMode="numeric"
                    style={darkFieldStyle}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "88px minmax(0, 1fr)" }}>
                <label style={{ display: "grid", gap: "6px" }}>
                  <span>UF</span>
                  <Select
                    value={form.state}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        state: event.target.value,
                        city: ""
                      }))
                    }
                    required
                    disabled={loadingStates}
                    style={darkFieldStyle}
                  >
                    <option value="" disabled>
                      {loadingStates ? "Carregando..." : "Selecione a UF"}
                    </option>
                    {states.map((currentState) => (
                      <option key={currentState.code} value={currentState.code}>
                        {currentState.code}
                      </option>
                    ))}
                  </Select>
                </label>
                <label style={{ display: "grid", gap: "6px" }}>
                  <span>Cidade</span>
                  <Select
                    value={form.city}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        city: event.target.value
                      }))
                    }
                    required
                    disabled={!form.state || loadingCities || Boolean(citiesError)}
                    style={darkFieldStyle}
                  >
                    <option value="" disabled>
                      {!form.state ? "Selecione a UF primeiro" : loadingCities ? "Carregando..." : "Selecione a cidade"}
                    </option>
                    {cities.map((currentCity) => (
                      <option key={currentCity.name} value={currentCity.name}>
                        {currentCity.name}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>

              <label style={{ display: "grid", gap: "6px" }}>
                <span>Área</span>
                <Input
                  value={form.area}
                  onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))}
                  required
                  style={darkFieldStyle}
                />
              </label>

              {!isEditing ? (
                <label style={{ display: "grid", gap: "6px" }}>
                  <span>Validade da associação</span>
                  <Input
                    type="datetime-local"
                    value={form.membershipExpiresAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, membershipExpiresAt: event.target.value }))}
                    required
                    style={darkFieldStyle}
                  />
                </label>
              ) : null}

              <label style={{ display: "grid", gap: "6px" }}>
                <span>Especialidade</span>
                <Input
                  value={form.specialty}
                  onChange={(event) => setForm((prev) => ({ ...prev, specialty: event.target.value }))}
                  style={darkFieldStyle}
                />
              </label>

              <label style={{ display: "grid", gap: "6px" }}>
                <span>Bio</span>
                <Textarea
                  value={form.bio}
                  onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
                  style={{ ...darkFieldStyle, minHeight: "120px" }}
                />
              </label>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : isEditing ? "Salvar edição" : "Cadastrar membro"}
                </Button>
                {isEditing ? (
                  <Button type="button" variant="secondary" onClick={cancelEdit}>
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </form>
          </SidePanelForm>
        </section>
      </div>
    </AdminShell>
  );
}
