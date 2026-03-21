"use client";

import { Alert, Badge, Button, Card, Input, LogoMark, PageHeader, SocialStatPill, Textarea } from "@elo/ui";
import type { AlertVariant } from "@elo/ui";
import { MapPin, MessageCircleMore, NotebookPen, ShieldCheck, Sparkles, Target } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { MemberShell } from "../../components/member-shell";
import { apiRequest } from "../../lib/auth-client";

type ProfileForm = {
  fullName: string;
  city: string;
  state: string;
  area: string;
  bio: string;
  specialty: string;
};

type ProfileResponse = ProfileForm & {
  email: string;
  phone: string;
  whatsapp: string;
};

type FeedbackState = {
  title: string;
  description: string;
  variant: AlertVariant;
};

const initialProfileForm: ProfileForm = {
  fullName: "",
  city: "",
  state: "",
  area: "",
  bio: "",
  specialty: ""
};

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "Não foi possível conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

function toWhatsappUrl(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;

  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  if (normalized.length < 12 || normalized.length > 13) return null;

  return `https://wa.me/${normalized}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function PerfilPage() {
  const [form, setForm] = useState<ProfileForm>(initialProfileForm);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const whatsappUrl = toWhatsappUrl(whatsapp);

  useEffect(() => {
    async function loadProfile() {
      setLoadingProfile(true);

      try {
        const profile = await apiRequest<ProfileResponse>("/app/profile");

        setForm({
          fullName: profile.fullName ?? "",
          city: profile.city ?? "",
          state: profile.state ?? "",
          area: profile.area ?? "",
          bio: profile.bio ?? "",
          specialty: profile.specialty ?? ""
        });
        setEmail(profile.email ?? "");
        setPhone(profile.phone ?? "");
        setWhatsapp(profile.whatsapp ?? "");
      } catch (requestError) {
        setFeedback({
          title: "Falha ao carregar perfil",
          description: normalizeApiError((requestError as Error).message),
          variant: "danger"
        });
      } finally {
        setLoadingProfile(false);
      }
    }

    void loadProfile();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      await apiRequest("/app/profile", {
        method: "PATCH",
        body: JSON.stringify(form)
      });

      setFeedback({
        title: "Perfil atualizado",
        description: "Suas informações de perfil foram salvas com sucesso.",
        variant: "success"
      });
    } catch (submitError) {
      setFeedback({
        title: "Falha ao salvar perfil",
        description: normalizeApiError((submitError as Error).message),
        variant: "danger"
      });
    } finally {
      setSaving(false);
    }
  }

  const profileCompletion = useMemo(() => {
    const editableFields = [form.fullName, form.city, form.state, form.area, form.specialty, form.bio];
    const filled = editableFields.filter((value) => value.trim().length > 0).length;
    const total = editableFields.length;

    return {
      filled,
      total,
      percent: Math.round((filled / total) * 100)
    };
  }, [form]);

  const nextImprovement = useMemo(() => {
    if (!form.specialty.trim()) {
      return "Adicione sua especialidade para facilitar a leitura do seu valor pela comunidade.";
    }

    if (!form.bio.trim()) {
      return "Escreva uma bio curta com repertório, momento e o tipo de conversa que você quer abrir.";
    }

    if (!form.city.trim() || !form.state.trim()) {
      return "Defina sua praça principal para aparecer com contexto local nas conexões e eventos.";
    }

    return "Seu perfil já transmite um posicionamento sólido. Agora mantenha a narrativa atualizada conforme sua atuação evolui.";
  }, [form.bio, form.city, form.specialty, form.state]);

  const profileSignals = useMemo(
    () => [
      {
        label: "Narrativa",
        value: form.bio.trim() ? "Bio ativa" : "Bio ausente",
        detail: form.bio.trim() ? "Você já oferece contexto para gerar conversa." : "Sem narrativa, o perfil perde profundidade social."
      },
      {
        label: "Especialidade",
        value: form.specialty.trim() || "Em definição",
        detail: form.specialty.trim() ? "Seu recorte profissional está visível." : "Sem especialidade, o matching fica genérico."
      },
      {
        label: "Praça",
        value: form.city && form.state ? `${form.city}/${form.state}` : "Não informada",
        detail: form.city && form.state ? "Sua presença local está clara no diretório." : "A praça ajuda eventos e conexões mais rápidas."
      },
      {
        label: "Contato",
        value: whatsappUrl ? "WhatsApp ativo" : "Sem WhatsApp",
        detail: whatsappUrl ? "Canal direto pronto para aproximar conversas." : "Sem canal rápido, a fricção de contato aumenta."
      }
    ],
    [form.bio, form.city, form.specialty, form.state, whatsappUrl]
  );

  return (
    <MemberShell>
      <div style={{ display: "grid", gap: "18px" }}>
        <PageHeader
          eyebrow={<Badge variant="brand">Perfil do membro</Badge>}
          title="Sua vitrine dentro da comunidade"
          description="O perfil agora organiza identidade, reputação e contexto profissional com mais clareza para facilitar conexões relevantes."
          meta={
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <SocialStatPill label="perfil preenchido" value={`${profileCompletion.percent}%`} icon={<Sparkles size={16} />} />
              <SocialStatPill label="contato principal" value={whatsappUrl ? "WhatsApp ativo" : "Sem WhatsApp"} icon={<MessageCircleMore size={16} />} />
              <SocialStatPill label="área" value={form.area || "A definir"} icon={<NotebookPen size={16} />} />
            </div>
          }
        />

        {feedback ? (
          <Alert variant={feedback.variant} title={feedback.title}>
            {feedback.description}
          </Alert>
        ) : null}

        {loadingProfile ? (
          <Alert variant="info" title="Carregando perfil">
            Preparando seus dados para edição.
          </Alert>
        ) : null}

        <section
          style={{
            display: "grid",
            gap: "18px",
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
                "linear-gradient(140deg, rgba(14,16,26,0.98), rgba(34,37,52,0.96) 64%, rgba(134,90,255,0.84) 140%)",
              color: "rgba(255,255,255,0.96)",
              boxShadow: "0 24px 58px rgba(11, 14, 22, 0.22)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <Badge variant="brand">Dossier social</Badge>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "rgba(234,236,255,0.78)",
                  fontSize: ".8rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase"
                }}
              >
                <ShieldCheck size={15} />
                Posicionamento vivo
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <span
                style={{
                  width: "78px",
                  height: "78px",
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "26px",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  fontSize: "1.5rem",
                  fontWeight: 800
                }}
              >
                {initials(form.fullName || "Elo")}
              </span>
              <div style={{ display: "grid", gap: "6px" }}>
                <strong style={{ fontSize: "1.2rem" }}>{form.fullName || "Membro Elo"}</strong>
                <span style={{ color: "rgba(234,236,255,0.82)" }}>{form.specialty || "Especialidade em construção"}</span>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <Badge variant="brand">{form.area || "Área não definida"}</Badge>
                  {form.city && form.state ? <Badge variant="neutral">{form.city}/{form.state}</Badge> : null}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: "10px", maxWidth: "58ch" }}>
              <h2 style={{ margin: 0, fontSize: "clamp(1.45rem, 2.4vw, 2rem)", lineHeight: 1.02, maxWidth: "16ch" }}>
                Seu perfil precisa transmitir clareza e confiança em poucos segundos.
              </h2>
              <p style={{ margin: 0, color: "rgba(234,236,255,0.8)", lineHeight: 1.7 }}>
                Antes de editar, a leitura principal agora mostra o que a comunidade enxerga: narrativa, praça, especialidade e prontidão para contato.
              </p>
            </div>

            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
              {[
                {
                  label: "completude",
                  value: `${profileCompletion.percent}%`,
                  detail: `${profileCompletion.filled}/${profileCompletion.total} sinais prontos`
                },
                {
                  label: "canal direto",
                  value: whatsappUrl ? "WhatsApp ativo" : "Contato parcial",
                  detail: whatsappUrl ? "resposta rápida para novos elos" : "ative um canal mais fluido"
                },
                {
                  label: "próximo passo",
                  value: form.specialty.trim() && form.bio.trim() ? "Refinar narrativa" : "Completar sinais",
                  detail: form.specialty.trim() && form.bio.trim() ? "ajuste fino de posicionamento" : "especialidade e bio primeiro"
                }
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "grid",
                    gap: "6px",
                    padding: "14px 16px",
                    borderRadius: "18px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.1)"
                  }}
                >
                  <span style={{ fontSize: ".76rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(234,236,255,0.72)" }}>
                    {item.label}
                  </span>
                  <strong style={{ fontSize: "1rem" }}>{item.value}</strong>
                  <span style={{ color: "rgba(234,236,255,0.78)", fontSize: ".9rem" }}>{item.detail}</span>
                </div>
              ))}
            </div>
          </article>

          <Card tone="panel" title="Leitura pública do seu perfil" subtitle="Como a comunidade te percebe antes mesmo da primeira mensagem.">
            <div style={{ display: "grid", gap: "12px" }}>
              {profileSignals.map((signal) => (
                <div
                  key={signal.label}
                  style={{
                    display: "grid",
                    gap: "6px",
                    padding: "12px 14px",
                    borderRadius: "18px",
                    border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                    background: "rgba(255,255,255,0.78)"
                  }}
                >
                  <span style={{ fontSize: ".76rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--elo-text-tertiary, #6B7280)" }}>
                    {signal.label}
                  </span>
                  <strong>{signal.value}</strong>
                  <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>{signal.detail}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section
          style={{
            display: "grid",
            gap: "18px",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))"
          }}
        >
          <div style={{ display: "grid", gap: "14px" }}>
            <Card tone="panel" title="Sua assinatura na Elo" subtitle="Uma combinação de identidade, praça e repertório profissional.">
              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ color: "var(--elo-text-secondary, #374151)", fontWeight: 700 }}>Completude do perfil</span>
                  <strong>{profileCompletion.percent}%</strong>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "10px",
                    borderRadius: "999px",
                    background: "rgba(17, 19, 24, 0.08)",
                    overflow: "hidden"
                  }}
                >
                  <div
                    style={{
                      width: `${profileCompletion.percent}%`,
                      height: "100%",
                      borderRadius: "999px",
                      background: "linear-gradient(135deg, var(--elo-orbit), #6F43EB)"
                    }}
                  />
                </div>
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
                    <Target size={14} />
                    Próximo refinamento
                  </span>
                  <p style={{ margin: 0, color: "var(--elo-text-secondary, #374151)", lineHeight: 1.65 }}>{nextImprovement}</p>
                </div>
              </div>
            </Card>

            <Card title="Contato e identidade" subtitle="E-mail e celular continuam protegidos pela plataforma; o WhatsApp organiza sua disponibilidade social.">
              <div style={{ display: "grid", gap: "12px" }}>
                <label style={{ display: "grid", gap: "8px" }}>
                  <span style={{ fontWeight: 700, color: "var(--elo-text-secondary, #374151)" }}>E-mail</span>
                  <Input value={email} disabled />
                </label>
                <label style={{ display: "grid", gap: "8px" }}>
                  <span style={{ fontWeight: 700, color: "var(--elo-text-secondary, #374151)" }}>Celular</span>
                  <Input value={phone} disabled />
                </label>
                <label style={{ display: "grid", gap: "8px" }}>
                  <span style={{ fontWeight: 700, color: "var(--elo-text-secondary, #374151)" }}>WhatsApp</span>
                  <Input value={whatsapp || "Não disponível"} disabled />
                </label>
                {whatsappUrl ? (
                  <a href={whatsappUrl} target="_blank" rel="noreferrer">
                    <Button variant="secondary">Abrir conversa no WhatsApp</Button>
                  </a>
                ) : null}
              </div>
            </Card>
          </div>

          <Card title="Editar posicionamento" subtitle="Atualize como você quer ser encontrado, lido e lembrado dentro da comunidade.">
            <div
              style={{
                display: "grid",
                gap: "8px",
                padding: "14px 16px",
                borderRadius: "18px",
                background: "rgba(255,255,255,0.72)",
                border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                marginBottom: "14px"
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: ".78rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--elo-text-tertiary, #6B7280)" }}>
                <LogoMark size="sm" />
                Playbook de perfil
              </span>
              <p style={{ margin: 0, color: "var(--elo-text-secondary, #374151)", lineHeight: 1.65 }}>
                Primeiro diga quem você é e onde atua. Depois refine especialidade e bio para tornar seu perfil mais memorável e mais fácil de conectar.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
              <label style={{ display: "grid", gap: "8px" }}>
                <span style={{ fontWeight: 700, color: "var(--elo-text-secondary, #374151)" }}>Nome completo</span>
                <Input
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  minLength={3}
                  required
                />
              </label>

              <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <label style={{ display: "grid", gap: "8px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontWeight: 700, color: "var(--elo-text-secondary, #374151)" }}>
                    <MapPin size={14} />
                    Cidade
                  </span>
                  <Input
                    value={form.city}
                    onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                    minLength={2}
                    required
                  />
                </label>
                <label style={{ display: "grid", gap: "8px" }}>
                  <span style={{ fontWeight: 700, color: "var(--elo-text-secondary, #374151)" }}>UF</span>
                  <Input
                    value={form.state}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, state: event.target.value.replace(/\s/g, "").toUpperCase() }))
                    }
                    maxLength={2}
                    minLength={2}
                    required
                  />
                </label>
              </div>

              <label style={{ display: "grid", gap: "8px" }}>
                <span style={{ fontWeight: 700, color: "var(--elo-text-secondary, #374151)" }}>Área de atuação</span>
                <Input
                  value={form.area}
                  onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))}
                  minLength={2}
                  maxLength={40}
                  required
                />
              </label>

              <label style={{ display: "grid", gap: "8px" }}>
                <span style={{ fontWeight: 700, color: "var(--elo-text-secondary, #374151)" }}>Especialidade</span>
                <Input
                  value={form.specialty}
                  onChange={(event) => setForm((prev) => ({ ...prev, specialty: event.target.value }))}
                  maxLength={120}
                />
              </label>

              <label style={{ display: "grid", gap: "8px" }}>
                <span style={{ fontWeight: 700, color: "var(--elo-text-secondary, #374151)" }}>Biografia</span>
                <Textarea
                  value={form.bio}
                  onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
                  maxLength={500}
                  style={{ minHeight: "140px" }}
                />
              </label>

              <Button type="submit" disabled={saving || loadingProfile} size="lg">
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </form>
          </Card>
        </section>
      </div>
    </MemberShell>
  );
}
