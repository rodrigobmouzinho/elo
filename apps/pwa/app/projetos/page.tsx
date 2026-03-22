"use client";

import {
  BrainCircuit,
  CirclePlus,
  HeartPulse,
  Layers3,
  Leaf,
  Rocket,
  Search,
  Sparkles,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { MemberShell } from "../../components/member-shell";
import { apiRequest } from "../../lib/auth-client";
import styles from "./page.module.css";

type Idea = {
  id: string;
  title: string;
  category: string;
  description: string;
  lookingFor: string;
  ownerName?: string;
};

type FeedbackTone = "danger" | "info" | "success";

type FeedbackState = {
  title: string;
  description: string;
  tone: FeedbackTone;
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
    return "Nao foi possivel conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function excerpt(text: string, max = 140) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}...`;
}

function initials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function ideaIndex(idea: Idea) {
  return normalizeSearchValue([idea.title, idea.category, idea.description, idea.lookingFor, idea.ownerName ?? ""].join(" "));
}

function applicationLabel(state?: ApplicationState) {
  if (state === "created") return "Candidatura enviada";
  if (state === "existing") return "Ja candidatado";
  return null;
}

function actionLabel(index: number, state: ApplicationState | undefined, applyingId: string | null, ideaId: string) {
  if (applyingId === ideaId) return "Enviando...";
  if (state === "created") return "Candidatura enviada";
  if (state === "existing") return "Ja candidatado";
  if (index === 0) return "Participar";
  if (index % 3 === 0) return "Investir";
  return "Apoiar";
}

function iconForIdea(idea: Idea, index: number) {
  const normalized = normalizeSearchValue(idea.category);

  if (normalized.includes("health")) return <HeartPulse size={18} strokeWidth={2.1} />;
  if (normalized.includes("fin")) return <Rocket size={18} strokeWidth={2.1} />;
  if (normalized.includes("green") || normalized.includes("sustent")) return <Leaf size={18} strokeWidth={2.1} />;
  if (normalized.includes("ia") || normalized.includes("ai") || normalized.includes("neural")) {
    return <BrainCircuit size={18} strokeWidth={2.1} />;
  }

  return index % 3 === 0 ? <Sparkles size={18} strokeWidth={2.1} /> : <Layers3 size={18} strokeWidth={2.1} />;
}

export default function ProjetosPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [saving, setSaving] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [applicationStateById, setApplicationStateById] = useState<Record<string, ApplicationState>>({});
  const composerRef = useRef<HTMLElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  async function loadIdeas() {
    setLoadingIdeas(true);

    try {
      setFeedback((previous) => (previous?.tone === "danger" ? null : previous));
      setIdeas(await apiRequest<Idea[]>("/app/projects"));
    } catch (requestError) {
      setFeedback({
        title: "Falha ao carregar ideias",
        description: normalizeApiError((requestError as Error).message),
        tone: "danger"
      });
    } finally {
      setLoadingIdeas(false);
    }
  }

  useEffect(() => {
    void loadIdeas();
  }, []);

  useEffect(() => {
    if (!composerOpen) return;

    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    const timer = window.setTimeout(() => {
      titleInputRef.current?.focus();
    }, 180);

    return () => {
      window.clearTimeout(timer);
    };
  }, [composerOpen]);

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
      setComposerOpen(false);
      await loadIdeas();
      setFeedback({
        title: "Ideia publicada",
        description: "Seu projeto ja esta disponivel para novas candidaturas.",
        tone: "success"
      });
    } catch (submitError) {
      setFeedback({
        title: "Falha ao publicar ideia",
        description: normalizeApiError((submitError as Error).message),
        tone: "danger"
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
      const response = await apiRequest<{ message: string; application: { created: boolean } }>(`/app/projects/${projectId}/apply`, {
        method: "POST",
        body: JSON.stringify({})
      });

      const state: ApplicationState = response.application.created ? "created" : "existing";
      setApplicationStateById((previous) => ({
        ...previous,
        [projectId]: state
      }));

      setFeedback({
        title: response.application.created ? "Candidatura enviada" : "Candidatura ja registrada",
        description: response.application.created
          ? `Voce se candidatou para participar de "${targetIdea?.title ?? "este projeto"}".`
          : `Sua candidatura em "${targetIdea?.title ?? "este projeto"}" ja estava registrada.`,
        tone: response.application.created ? "success" : "info"
      });
    } catch (applyError) {
      setFeedback({
        title: "Falha ao enviar candidatura",
        description: normalizeApiError((applyError as Error).message),
        tone: "danger"
      });
    } finally {
      setApplyingId(null);
    }
  }

  const filteredIdeas = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(search.trim());

    return ideas.filter((idea) => normalizedSearch === "" || ideaIndex(idea).includes(normalizedSearch));
  }, [ideas, search]);

  const orbitIdeas = useMemo(() => filteredIdeas.slice(0, 3), [filteredIdeas]);

  return (
    <MemberShell>
      <div className={styles.page}>
        {feedback ? (
          <section
            className={`${styles.statusCard} ${feedback.tone === "danger" ? styles.statusDanger : ""}`}
            role={feedback.tone === "danger" ? "alert" : "status"}
            aria-live="polite"
          >
            <h2 className={styles.statusTitle}>{feedback.title}</h2>
            <p className={styles.statusText}>{feedback.description}</p>
          </section>
        ) : null}

        <section className={styles.hero}>
          <h2 className={styles.title}>
            Projetos
            <br />
            &amp; Ideias
          </h2>
        </section>

        <label className={styles.searchField}>
          <Search size={18} strokeWidth={2.1} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar ideias e projetos..."
            type="search"
          />
        </label>

        <section className={styles.ctaCard}>
          <div className={styles.ctaAura} aria-hidden="true" />
          <div className={styles.ctaContent}>
            <h3 className={styles.ctaTitle}>Construa o futuro</h3>
            <p className={styles.ctaText}>Tem um conceito que precisa de asas? Submeta sua ideia para a comunidade Elo.</p>
            <button className={styles.primaryButton} type="button" onClick={() => setComposerOpen(true)}>
              Cadastrar Ideia
              <CirclePlus size={16} strokeWidth={2.1} />
            </button>
          </div>
        </section>

        {composerOpen ? (
          <section ref={composerRef} className={styles.composerCard}>
            <div className={styles.composerHeader}>
              <div>
                <p className={styles.composerEyebrow}>Publish Desk</p>
                <h3 className={styles.composerTitle}>Cadastre uma nova ideia</h3>
              </div>
              <button className={styles.iconButton} type="button" onClick={() => setComposerOpen(false)} aria-label="Fechar cadastro">
                <X size={17} strokeWidth={2.1} />
              </button>
            </div>

            <form className={styles.formStack} onSubmit={handleSubmit}>
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Titulo</span>
                <input
                  ref={titleInputRef}
                  className={styles.fieldControl}
                  placeholder="Ex.: Plataforma de conexoes B2B"
                  value={form.title}
                  onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
                  minLength={3}
                  maxLength={80}
                  required
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Categoria</span>
                <input
                  className={styles.fieldControl}
                  placeholder="Ex.: SaaS, Marketplace, Educacao"
                  value={form.category}
                  onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value }))}
                  minLength={3}
                  maxLength={60}
                  required
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Descricao</span>
                <textarea
                  className={styles.storyInput}
                  placeholder="Explique problema, proposta e estagio da ideia."
                  value={form.description}
                  onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
                  minLength={20}
                  maxLength={2000}
                  required
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Busco parceria em</span>
                <input
                  className={styles.fieldControl}
                  placeholder="Ex.: cofundador tech, vendas, produto"
                  value={form.lookingFor}
                  onChange={(event) => setForm((previous) => ({ ...previous, lookingFor: event.target.value }))}
                  minLength={3}
                  maxLength={120}
                  required
                />
              </label>

              <div className={styles.formActions}>
                <button className={styles.primaryButton} type="submit" disabled={saving}>
                  {saving ? "Publicando..." : "Publicar ideia"}
                </button>
                <button className={styles.secondaryButton} type="button" onClick={() => setComposerOpen(false)} disabled={saving}>
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {loadingIdeas ? (
          <section className={styles.statusCard} aria-live="polite">
            <h2 className={styles.statusTitle}>Carregando projetos</h2>
            <p className={styles.statusText}>Buscando ideias abertas para candidatura e colaboracao.</p>
          </section>
        ) : null}

        {!loadingIdeas && filteredIdeas.length === 0 ? (
          <section className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>Nenhuma oportunidade encontrada</h3>
            <p className={styles.emptyText}>Ajuste a busca ou publique uma nova ideia para abrir espaco para colaboracao.</p>
          </section>
        ) : null}

        <section className={styles.feedGrid}>
          {filteredIdeas.map((idea, index) => {
            const applicationState = applicationStateById[idea.id];
            const applicationStatus = applicationLabel(applicationState);
            const largeCard = index % 3 === 0;
            const featuredCard = index === 0;
            const disableApply = applyingId === idea.id || applicationState === "created" || applicationState === "existing";
            const cardIcon = iconForIdea(idea, index);

            return (
              <article
                key={idea.id}
                className={`${styles.projectCard} ${largeCard ? styles.projectCardLarge : styles.projectCardCompact} ${
                  featuredCard ? styles.projectCardFeatured : ""
                }`}
              >
                <div className={styles.cardHeader}>
                  <span className={`${styles.categoryBadge} ${featuredCard ? styles.categoryBadgeAccent : ""}`}>{idea.category}</span>
                  {featuredCard ? (
                    <div className={styles.avatarStack} aria-hidden="true">
                      {orbitIdeas.map((orbitIdea) => (
                        <span key={orbitIdea.id} className={styles.avatarToken}>
                          {initials(orbitIdea.ownerName || orbitIdea.title)}
                        </span>
                      ))}
                    </div>
                  ) : applicationStatus ? (
                    <span className={styles.stateBadge}>{applicationStatus}</span>
                  ) : null}
                </div>

                {largeCard ? (
                  <>
                    <h3 className={styles.cardTitleLarge}>{idea.title}</h3>
                    <p className={styles.cardDescriptionLarge}>{excerpt(idea.description, featuredCard ? 180 : 160)}</p>

                    <div className={styles.cardFooterLarge}>
                      <div className={styles.cardMeta}>
                        <Sparkles size={14} strokeWidth={2.1} />
                        <span>{idea.lookingFor}</span>
                      </div>
                      <button className={styles.secondaryButton} type="button" onClick={() => void applyToIdea(idea.id)} disabled={disableApply}>
                        {actionLabel(index, applicationState, applyingId, idea.id)}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.iconTile}>{cardIcon}</div>
                    <h3 className={styles.cardTitleSmall}>{idea.title}</h3>
                    <p className={styles.cardDescriptionSmall}>{excerpt(idea.description, 92)}</p>
                    <button className={styles.compactButton} type="button" onClick={() => void applyToIdea(idea.id)} disabled={disableApply}>
                      {actionLabel(index, applicationState, applyingId, idea.id)}
                    </button>
                  </>
                )}
              </article>
            );
          })}
        </section>

      </div>
    </MemberShell>
  );
}
