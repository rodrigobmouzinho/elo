"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MemberShell } from "../../../components/member-shell";
import { apiRequest } from "../../../lib/auth-client";
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
type ApplicationState = "created" | "existing";

type FeedbackState = {
  title: string;
  description: string;
  tone: FeedbackTone;
};

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "Nao foi possivel conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

function extractPitch(description: string) {
  const firstLine = description
    .split(/\n+/)
    .map((part) => part.trim())
    .find(Boolean);

  return firstLine ?? description;
}

function extractDescriptionBody(description: string) {
  return description
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(1);
}

function applicationLabel(state?: ApplicationState) {
  if (state === "created") return "Candidatura enviada";
  if (state === "existing") return "Ja candidatado";
  return "Quero participar";
}

export function ProjectDetailClient({ projectId }: { projectId: string }) {
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applicationState, setApplicationState] = useState<ApplicationState | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  useEffect(() => {
    let active = true;

    async function loadIdea() {
      setLoading(true);

      try {
        const projects = await apiRequest<Idea[]>("/app/projects");
        const targetIdea = projects.find((project) => project.id === projectId);

        if (!targetIdea) {
          throw new Error("Projeto nao encontrado.");
        }

        if (!active) return;
        setIdea(targetIdea);
      } catch (requestError) {
        if (!active) return;

        setFeedback({
          title: "Falha ao carregar projeto",
          description: normalizeApiError((requestError as Error).message),
          tone: "danger"
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadIdea();

    return () => {
      active = false;
    };
  }, [projectId]);

  async function applyToIdea() {
    if (!idea) return;

    setApplying(true);
    setFeedback(null);

    try {
      const response = await apiRequest<{ message: string; application: { created: boolean } }>(`/app/projects/${idea.id}/apply`, {
        method: "POST",
        body: JSON.stringify({})
      });

      const nextState: ApplicationState = response.application.created ? "created" : "existing";
      setApplicationState(nextState);
      setFeedback({
        title: response.application.created ? "Candidatura enviada" : "Candidatura ja registrada",
        description: response.application.created
          ? `Voce se candidatou para participar de "${idea.title}".`
          : `Sua candidatura em "${idea.title}" ja estava registrada.`,
        tone: response.application.created ? "success" : "info"
      });
    } catch (applyError) {
      setFeedback({
        title: "Falha ao enviar candidatura",
        description: normalizeApiError((applyError as Error).message),
        tone: "danger"
      });
    } finally {
      setApplying(false);
    }
  }

  const pitch = useMemo(() => (idea ? extractPitch(idea.description) : ""), [idea]);
  const detailParagraphs = useMemo(() => (idea ? extractDescriptionBody(idea.description) : []), [idea]);
  const disableApply = applying || applicationState === "created" || applicationState === "existing";

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

        {loading ? (
          <section className={styles.statusCard} aria-live="polite">
            <h2 className={styles.statusTitle}>Carregando projeto</h2>
            <p className={styles.statusText}>Preparando os detalhes desta oportunidade para voce.</p>
          </section>
        ) : null}

        {!loading && !idea ? (
          <section className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>Projeto nao encontrado</h2>
            <p className={styles.emptyText}>Esta oportunidade nao esta mais disponivel ou precisa ser recarregada.</p>
            <Link href="/projetos" className={styles.backButton}>
              <ArrowLeft size={16} strokeWidth={2.1} />
              Voltar para projetos
            </Link>
          </section>
        ) : null}

        {idea ? (
          <>
            <section className={styles.heroCard}>
              <span className={styles.categoryBadge}>{idea.category}</span>
              <h2 className={styles.title}>{idea.title}</h2>
              <p className={styles.pitch}>{pitch}</p>

              <div className={styles.heroMeta}>
                <span className={styles.metaPill}>
                  <Sparkles size={14} strokeWidth={2.1} />
                  {idea.lookingFor}
                </span>
              </div>
            </section>

            <section className={styles.detailCard}>
              <h3 className={styles.sectionTitle}>Sobre a ideia</h3>

              <div className={styles.bodyStack}>
                {(detailParagraphs.length > 0 ? detailParagraphs : [pitch]).map((paragraph) => (
                  <p key={paragraph} className={styles.bodyText}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            <section className={styles.actionRow}>
              <Link href="/projetos" className={styles.backButton}>
                <ArrowLeft size={16} strokeWidth={2.1} />
                Voltar
              </Link>

              <button className={styles.primaryButton} type="button" onClick={() => void applyToIdea()} disabled={disableApply}>
                {applying ? "Enviando..." : applicationLabel(applicationState ?? undefined)}
                <ArrowUpRight size={16} strokeWidth={2.1} />
              </button>
            </section>
          </>
        ) : null}
      </div>
    </MemberShell>
  );
}
