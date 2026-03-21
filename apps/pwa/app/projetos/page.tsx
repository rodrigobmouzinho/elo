"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  FeedCard,
  FilterBar,
  Input,
  PageHeader,
  Select,
  SocialStatPill,
  Textarea
} from "@elo/ui";
import type { AlertVariant, BadgeVariant } from "@elo/ui";
import { ArrowRight, BriefcaseBusiness, Layers3, Search, Sparkles, UsersRound } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { MemberShell } from "../../components/member-shell";
import { apiRequest } from "../../lib/auth-client";

type Idea = {
  id: string;
  title: string;
  category: string;
  description: string;
  lookingFor: string;
  ownerName?: string;
};

type FeedbackState = {
  title: string;
  description: string;
  variant: AlertVariant;
};

type ApplicationState = "created" | "existing";

const initialForm = {
  title: "",
  description: "",
  category: "",
  lookingFor: ""
};

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "Não foi possível conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

function applicationBadge(state?: ApplicationState): { label: string; variant: BadgeVariant } | null {
  if (state === "created") {
    return { label: "Candidatura enviada", variant: "success" };
  }

  if (state === "existing") {
    return { label: "Já candidatado", variant: "info" };
  }

  return null;
}

function excerpt(text: string, max = 180) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}...`;
}

export default function ProjetosPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [saving, setSaving] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [applicationStateById, setApplicationStateById] = useState<Record<string, ApplicationState>>({});

  async function loadIdeas() {
    setLoadingIdeas(true);

    try {
      setFeedback((previous) => (previous?.variant === "danger" ? null : previous));
      setIdeas(await apiRequest<Idea[]>("/app/projects"));
    } catch (requestError) {
      setFeedback({
        title: "Falha ao carregar ideias",
        description: normalizeApiError((requestError as Error).message),
        variant: "danger"
      });
    } finally {
      setLoadingIdeas(false);
    }
  }

  useEffect(() => {
    void loadIdeas();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      await apiRequest("/app/projects", {
        method: "POST",
        body: JSON.stringify(form)
      });

      setForm(initialForm);
      await loadIdeas();
      setFeedback({
        title: "Ideia publicada",
        description: "Seu projeto foi publicado e já está disponível para candidaturas.",
        variant: "success"
      });
    } catch (submitError) {
      setFeedback({
        title: "Falha ao publicar ideia",
        description: normalizeApiError((submitError as Error).message),
        variant: "danger"
      });
    } finally {
      setSaving(false);
    }
  }

  async function applyToIdea(projectId: string) {
    const targetIdea = ideas.find((idea) => idea.id === projectId);

    setApplyingId(projectId);
    setFeedback(null);

    try {
      const response = await apiRequest<{ message: string; application: { created: boolean } }>(
        `/app/projects/${projectId}/apply`,
        {
          method: "POST",
          body: JSON.stringify({})
        }
      );

      const state: ApplicationState = response.application.created ? "created" : "existing";
      setApplicationStateById((previous) => ({
        ...previous,
        [projectId]: state
      }));

      setFeedback({
        title: response.application.created ? "Candidatura enviada" : "Candidatura já registrada",
        description: response.application.created
          ? `Você se candidatou para participar de "${targetIdea?.title ?? "este projeto"}".`
          : `Sua candidatura em "${targetIdea?.title ?? "este projeto"}" já estava registrada.`,
        variant: response.application.created ? "success" : "info"
      });
    } catch (applyError) {
      setFeedback({
        title: "Falha ao enviar candidatura",
        description: normalizeApiError((applyError as Error).message),
        variant: "danger"
      });
    } finally {
      setApplyingId(null);
    }
  }

  const dashboard = useMemo(() => {
    const categories = new Set(ideas.map((idea) => idea.category.trim().toLowerCase()).filter(Boolean)).size;
    const publishedByMembers = ideas.filter((idea) => Boolean(idea.ownerName?.trim())).length;
    const applicationsInSession = Object.keys(applicationStateById).length;

    return {
      totalIdeas: ideas.length,
      categories,
      publishedByMembers,
      applicationsInSession
    };
  }, [ideas, applicationStateById]);

  const categories = useMemo(() => {
    return Array.from(new Set(ideas.map((idea) => idea.category.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [ideas]);

  const filteredIdeas = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return ideas.filter((idea) => {
      const matchesSearch =
        !normalizedSearch ||
        [idea.title, idea.category, idea.description, idea.lookingFor, idea.ownerName ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      const matchesCategory = categoryFilter === "all" || idea.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, ideas, search]);

  const featuredIdea = filteredIdeas[0] ?? ideas[0] ?? null;

  return (
    <MemberShell>
      <div style={{ display: "grid", gap: "18px" }}>
        <PageHeader
          eyebrow={<Badge variant="brand">Projetos Elo</Badge>}
          title="Ideias, oportunidades e parceria em formato de feed"
          description="O ambiente de projetos agora parece uma vitrine social de colaboração: você publica com contexto e entra em oportunidades com menos fricção."
          meta={
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <SocialStatPill label="ideias abertas" value={dashboard.totalIdeas.toLocaleString("pt-BR")} icon={<BriefcaseBusiness size={16} />} />
              <SocialStatPill label="categorias ativas" value={dashboard.categories.toLocaleString("pt-BR")} icon={<Layers3 size={16} />} />
              <SocialStatPill label="candidaturas na sessão" value={dashboard.applicationsInSession.toLocaleString("pt-BR")} icon={<UsersRound size={16} />} />
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
                "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,246,255,0.92)), radial-gradient(circle at top left, rgba(134,90,255,0.22), transparent 48%)",
              border: "1px solid rgba(134, 90, 255, 0.16)",
              boxShadow: "0 20px 44px rgba(18, 21, 32, 0.08)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <Badge variant="brand">Radar de parceria</Badge>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--elo-text-tertiary, #6B7280)",
                  fontSize: ".8rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase"
                }}
              >
                <Sparkles size={15} />
                Oportunidade em fluxo
              </span>
            </div>

            <div style={{ display: "grid", gap: "10px", maxWidth: "58ch" }}>
              <h2 style={{ margin: 0, fontSize: "clamp(1.55rem, 2.8vw, 2.35rem)", lineHeight: 0.98, maxWidth: "15ch" }}>
                As melhores parcerias começam com uma tese clara.
              </h2>
              <p style={{ margin: 0, color: "var(--elo-text-secondary, #374151)", lineHeight: 1.7 }}>
                Antes da lista completa, a tela agora mostra o estado do ecossistema: quem já publicou, quantos temas estão vivos e qual oportunidade merece seu olhar primeiro.
              </p>
            </div>

            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
              <div style={{ display: "grid", gap: "6px", padding: "14px 16px", borderRadius: "20px", background: "rgba(255,255,255,0.78)", border: "1px solid rgba(17,17,17,0.06)" }}>
                <span style={{ fontSize: ".76rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--elo-text-tertiary, #6B7280)" }}>
                  fundadores ativos
                </span>
                <strong>{dashboard.publishedByMembers.toLocaleString("pt-BR")}</strong>
                <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>
                  publicando teses e convites de colaboração
                </span>
              </div>
              <div style={{ display: "grid", gap: "6px", padding: "14px 16px", borderRadius: "20px", background: "rgba(255,255,255,0.78)", border: "1px solid rgba(17,17,17,0.06)" }}>
                <span style={{ fontSize: ".76rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--elo-text-tertiary, #6B7280)" }}>
                  temas vivos
                </span>
                <strong>{dashboard.categories.toLocaleString("pt-BR")}</strong>
                <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>
                  categorias com descoberta ativa
                </span>
              </div>
              <div style={{ display: "grid", gap: "6px", padding: "14px 16px", borderRadius: "20px", background: "rgba(19,22,32,0.96)", color: "rgba(255,255,255,0.96)" }}>
                <span style={{ fontSize: ".76rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(234,236,255,0.72)" }}>
                  tração da sessão
                </span>
                <strong style={{ fontFamily: "var(--elo-font-mono)", fontSize: "1.4rem", lineHeight: 1 }}>
                  {dashboard.applicationsInSession.toLocaleString("pt-BR")}
                </strong>
                <span style={{ color: "rgba(234,236,255,0.8)", fontSize: ".92rem" }}>
                  candidatura(s) feitas por você nesta sessão
                </span>
              </div>
            </div>
          </article>

          <Card tone="panel" title="Oportunidade em destaque" subtitle="Uma leitura editorial rápida para decidir se vale entrar agora.">
            {featuredIdea ? (
              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                  <Badge variant="brand">{featuredIdea.category}</Badge>
                  {featuredIdea.ownerName ? <Badge variant="neutral">{featuredIdea.ownerName}</Badge> : null}
                </div>
                <div style={{ display: "grid", gap: "8px" }}>
                  <strong style={{ fontSize: "1.06rem" }}>{featuredIdea.title}</strong>
                  <p style={{ margin: 0, color: "var(--elo-text-secondary, #374151)", lineHeight: 1.65 }}>
                    {excerpt(featuredIdea.description, 180)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <Badge variant="info">Buscando: {featuredIdea.lookingFor}</Badge>
                  {applicationBadge(applicationStateById[featuredIdea.id]) ? (
                    <Badge variant={applicationBadge(applicationStateById[featuredIdea.id])?.variant ?? "info"}>
                      {applicationBadge(applicationStateById[featuredIdea.id])?.label}
                    </Badge>
                  ) : null}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<BriefcaseBusiness size={18} />}
                title="Sem oportunidade em destaque"
                description="Assim que as ideias aparecerem, esta área passa a sugerir a melhor leitura de entrada."
              />
            )}
          </Card>
        </section>

        <FilterBar
          actions={<Badge variant="neutral">{filteredIdeas.length.toLocaleString("pt-BR")} oportunidade(s)</Badge>}
        >
          <label style={{ display: "grid", gap: "6px", minWidth: "240px", flex: "1 1 240px" }}>
            <span style={{ fontSize: ".8rem", fontWeight: 700, color: "var(--elo-text-tertiary, #6B7280)" }}>Buscar projeto</span>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ex.: SaaS, educação, marketplace"
              type="search"
            />
          </label>
          <label style={{ display: "grid", gap: "6px", minWidth: "220px" }}>
            <span style={{ fontSize: ".8rem", fontWeight: 700, color: "var(--elo-text-tertiary, #6B7280)" }}>Categoria</span>
            <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">Todas</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </label>
        </FilterBar>

        {loadingIdeas ? (
          <Alert variant="info" title="Carregando projetos">
            Buscando ideias abertas para candidatura.
          </Alert>
        ) : null}

        <section
          style={{
            display: "grid",
            gap: "18px",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))"
          }}
        >
          <div style={{ display: "grid", gap: "12px" }}>
            {filteredIdeas.map((idea) => {
              const applicationState = applicationStateById[idea.id];
              const applicationStatus = applicationBadge(applicationState);
              const disableApply = applyingId === idea.id || applicationState === "created" || applicationState === "existing";

              return (
                <FeedCard
                  key={idea.id}
                  eyebrow={
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                      <Badge variant="brand">{idea.category}</Badge>
                      {applicationStatus ? <Badge variant={applicationStatus.variant}>{applicationStatus.label}</Badge> : null}
                    </div>
                  }
                  title={idea.title}
                  description={
                    <div style={{ display: "grid", gap: "8px" }}>
                      <p style={{ margin: 0, lineHeight: 1.65 }}>{excerpt(idea.description, 220)}</p>
                      <p style={{ margin: 0, color: "var(--elo-text-primary, #111111)", fontWeight: 700 }}>
                        Buscando parceria em: {idea.lookingFor}
                      </p>
                    </div>
                  }
                  badges={
                    <>
                      {idea.ownerName ? <Badge variant="neutral">Responsável: {idea.ownerName}</Badge> : <Badge variant="neutral">Ideia aberta à comunidade</Badge>}
                      <Badge variant="info">Pronto para conversa</Badge>
                    </>
                  }
                  footer={
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                      <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>
                        Entre quando a tese fizer sentido e o perfil buscado bater com o seu momento.
                      </span>
                      <Button onClick={() => void applyToIdea(idea.id)} disabled={disableApply}>
                        {applyingId === idea.id
                          ? "Enviando..."
                          : applicationState === "created"
                            ? "Candidatura enviada"
                            : applicationState === "existing"
                              ? "Já candidatado"
                              : "Quero participar"}
                      </Button>
                    </div>
                  }
                  style={{ borderRadius: "24px" }}
                />
              );
            })}

            {!loadingIdeas && filteredIdeas.length === 0 ? (
              <EmptyState
                icon={<Search size={18} />}
                title="Nenhuma oportunidade encontrada"
                description="Ajuste a busca ou publique uma nova ideia para abrir espaço para colaboração."
              />
            ) : null}
          </div>

          <div style={{ display: "grid", gap: "14px", alignContent: "start" }}>
            <article
              style={{
                display: "grid",
                gap: "12px",
                padding: "20px",
                borderRadius: "24px",
                background:
                  "linear-gradient(140deg, rgba(14,16,26,0.98), rgba(34,37,52,0.96) 64%, rgba(134,90,255,0.82) 140%)",
                color: "rgba(255,255,255,0.96)",
                boxShadow: "0 24px 58px rgba(11, 14, 22, 0.22)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                <Badge variant="brand">Publish desk</Badge>
                <Sparkles size={16} />
              </div>
              <div style={{ display: "grid", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "1.45rem", lineHeight: 1.02 }}>Publique a oportunidade com tese, não só com descrição.</h3>
                <p style={{ margin: 0, color: "rgba(234,236,255,0.82)", lineHeight: 1.7 }}>
                  Diga o problema, o estágio e o perfil que falta. Quando a narrativa fica clara, as candidaturas chegam com mais aderência e menos ruído.
                </p>
              </div>
              <div style={{ display: "grid", gap: "10px" }}>
                {[
                  "Explique a tese e o estágio atual da ideia.",
                  "Seja específico sobre a parceria que procura.",
                  "Use categoria clara para melhorar descoberta e filtros."
                ].map((item) => (
                  <div key={item} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <span
                      style={{
                        width: "24px",
                        height: "24px",
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "999px",
                        background: "rgba(255,255,255,0.12)",
                        flexShrink: 0
                      }}
                    >
                      <ArrowRight size={13} />
                    </span>
                    <span style={{ color: "rgba(234,236,255,0.82)", fontSize: ".92rem" }}>{item}</span>
                  </div>
                ))}
              </div>
            </article>

            <Card title="Publicar nova ideia" subtitle="Conte o contexto, a categoria e o tipo de parceiro que você quer atrair.">
              <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
                <label style={{ display: "grid", gap: "8px" }}>
                  <span style={{ fontWeight: 700, color: "var(--elo-text-secondary, #374151)" }}>Título</span>
                  <Input
                    placeholder="Ex.: Plataforma de conexões B2B"
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    minLength={3}
                    maxLength={80}
                    required
                  />
                </label>

                <label style={{ display: "grid", gap: "8px" }}>
                  <span style={{ fontWeight: 700, color: "var(--elo-text-secondary, #374151)" }}>Categoria</span>
                  <Input
                    placeholder="Ex.: SaaS, Marketplace, Educação"
                    value={form.category}
                    onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                    minLength={3}
                    maxLength={60}
                    required
                  />
                </label>

                <label style={{ display: "grid", gap: "8px" }}>
                  <span style={{ fontWeight: 700, color: "var(--elo-text-secondary, #374151)" }}>Descrição</span>
                  <Textarea
                    placeholder="Explique problema, proposta e estágio da ideia."
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    minLength={20}
                    maxLength={2000}
                    required
                    style={{ minHeight: "120px" }}
                  />
                </label>

                <label style={{ display: "grid", gap: "8px" }}>
                  <span style={{ fontWeight: 700, color: "var(--elo-text-secondary, #374151)" }}>Busco parceria em</span>
                  <Input
                    placeholder="Ex.: cofundador tech, vendas, produto"
                    value={form.lookingFor}
                    onChange={(event) => setForm((prev) => ({ ...prev, lookingFor: event.target.value }))}
                    minLength={3}
                    maxLength={120}
                    required
                  />
                </label>

                <Button type="submit" disabled={saving} size="lg">
                  {saving ? "Publicando..." : "Publicar ideia"}
                </Button>
              </form>
            </Card>

            <Card tone="panel" title="Como ser encontrado no feed" subtitle="Pequenos ajustes que aumentam a qualidade da descoberta.">
              <div style={{ display: "grid", gap: "10px" }}>
                {[
                  "Um título bom indica a direção do projeto sem soar genérico.",
                  "Descrição curta e concreta converte mais que texto amplo demais.",
                  "Parceria ideal bem descrita evita candidaturas fora de contexto."
                ].map((item) => (
                  <div key={item} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <span
                      style={{
                        width: "24px",
                        height: "24px",
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "999px",
                        background: "rgba(134, 90, 255, 0.12)",
                        color: "var(--elo-orbit, #865AFF)",
                        flexShrink: 0
                      }}
                    >
                      <Sparkles size={12} />
                    </span>
                    <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>{item}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>
      </div>
    </MemberShell>
  );
}
