/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { ArrowUpRight, Eye, PencilLine, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MemberShell } from "../../../components/member-shell";
import { apiRequest, getStoredAuth } from "../../../lib/auth-client";
import { normalizeApiError, type ProjectIdea } from "../../../lib/project-ideas";
import styles from "./page.module.css";

type FeedbackTone = "danger" | "info" | "success";
type ApplicationState = "created" | "existing";

type FeedbackState = {
  title: string;
  description: string;
  tone: FeedbackTone;
};

function applicationLabel(state?: ApplicationState) {
  if (state === "created") return "Interesse enviado";
  if (state === "existing") return "Interesse ja registrado";
  return "Tenho Interesse / Participar";
}

function initialsOf(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "ME";
}

export function ProjectDetailClient({ projectId }: { projectId: string }) {
  const [idea, setIdea] = useState<ProjectIdea | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applicationState, setApplicationState] = useState<ApplicationState | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentMemberId(getStoredAuth()?.user.memberId ?? null);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadIdea() {
      setLoading(true);

      try {
        const projects = await apiRequest<ProjectIdea[]>("/app/projects");
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const flash = window.sessionStorage.getItem("elo-project-updated");
    if (flash !== projectId) return;

    window.sessionStorage.removeItem("elo-project-updated");
    setFeedback({
      title: "Projeto atualizado",
      description: "As alteracoes deste projeto foram salvas com sucesso.",
      tone: "success"
    });
  }, [projectId]);

  async function applyToIdea() {
    if (!idea) return;

    setApplying(true);
    setFeedback(null);

    try {
      const response = await apiRequest<{ message: string; application: { created: boolean } }>(
        `/app/projects/${idea.id}/apply`,
        {
          method: "POST",
          body: JSON.stringify({})
        }
      );

      const nextState: ApplicationState = response.application.created ? "created" : "existing";
      setApplicationState(nextState);
      setFeedback({
        title: response.application.created ? "Interesse registrado" : "Interesse ja existente",
        description: response.application.created
          ? `Seu interesse em "${idea.title}" foi enviado ao fundador.`
          : `Seu interesse em "${idea.title}" ja constava para o time responsavel.`,
        tone: response.application.created ? "success" : "info"
      });
    } catch (applyError) {
      setFeedback({
        title: "Falha ao registrar interesse",
        description: normalizeApiError((applyError as Error).message),
        tone: "danger"
      });
    } finally {
      setApplying(false);
    }
  }

  const isOwner = currentMemberId !== null && idea?.ownerMemberId === currentMemberId;
  const disableApply = applying || applicationState === "created" || applicationState === "existing";
  const businessAreas = useMemo(() => idea?.businessAreas.slice(0, 4) ?? [], [idea]);

  return (
    <MemberShell detailHeader={{ title: "Detalhes do Projeto", backHref: "/projetos" }}>
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
              Voltar para projetos
            </Link>
          </section>
        ) : null}

        {idea ? (
          <>
            <section className={styles.founderSection}>
              <div className={styles.avatarOrbit}>
                <div className={styles.avatarGlow} aria-hidden="true" />
                {idea.ownerAvatarUrl ? (
                  <img src={idea.ownerAvatarUrl} alt={idea.ownerName ?? "Membro Elo"} className={styles.avatarImage} />
                ) : (
                  <div className={styles.avatarFallback}>{initialsOf(idea.ownerName ?? "Membro Elo")}</div>
                )}
              </div>

              <div className={styles.founderCopy}>
                <p className={styles.eyebrow}>Fundado por</p>
                <h2 className={styles.founderName}>{idea.ownerName ?? "Membro Elo"}</h2>
              </div>
            </section>

            <section className={styles.heroSection}>
              <h3 className={styles.heroTitle}>{idea.title}</h3>

              <div className={styles.badgeRow}>
                {businessAreas.map((businessArea, index) => (
                  <span
                    key={`${businessArea}-${index}`}
                    className={`${styles.categoryBadge} ${index === 1 ? styles.categoryBadgeSecondary : ""}`}
                  >
                    {businessArea}
                  </span>
                ))}
              </div>

              <p className={styles.leadText}>{idea.summary}</p>
            </section>

            <div className={styles.contentGrid}>
              <section className={styles.detailCard}>
                <h4 className={styles.sectionTitle}>
                  <Eye size={16} strokeWidth={2.1} />
                  Visao do Projeto
                </h4>
                <p className={styles.bodyText}>{idea.vision}</p>
              </section>

              <section className={styles.detailCard}>
                <h4 className={`${styles.sectionTitle} ${styles.sectionTitleSecondary}`}>
                  <Sparkles size={16} strokeWidth={2.1} />
                  O que precisamos
                </h4>

                <ul className={styles.needsList}>
                  {idea.needs.map((need, index) => (
                    <li key={`${need.title}-${index}`} className={styles.needItem}>
                      <span className={`${styles.needDot} ${index === 1 ? styles.needDotSecondary : ""}`} aria-hidden="true" />
                      <div className={styles.needCopy}>
                        <p className={styles.needTitle}>{need.title}</p>
                        <p className={styles.needText}>{need.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className={styles.gallerySection}>
              <h4 className={styles.galleryTitle}>Galeria &amp; Mockups</h4>

              <div className={styles.galleryTrack}>
                {idea.galleryImageUrls.length > 0 ? (
                  idea.galleryImageUrls.map((imageUrl) => (
                    <article key={imageUrl} className={styles.galleryCard}>
                      <img src={imageUrl} alt="Imagem de apoio do projeto" className={styles.galleryImage} />
                    </article>
                  ))
                ) : (
                  <article className={styles.galleryCardPlaceholder}>
                    <span className={styles.placeholderBadge}>Sem mockups ainda</span>
                    <p className={styles.placeholderText}>
                      Este projeto ainda nao publicou materiais visuais. A leitura principal segue concentrada na tese e nas necessidades.
                    </p>
                  </article>
                )}
              </div>
            </section>

            <footer className={styles.actionFooter}>
              {isOwner ? (
                <Link href={`/projetos/${idea.id}/editar`} className={styles.primaryButton}>
                  Editar projeto
                  <PencilLine size={16} strokeWidth={2.1} />
                </Link>
              ) : (
                <button className={styles.primaryButton} type="button" onClick={() => void applyToIdea()} disabled={disableApply}>
                  {applying ? "Enviando..." : applicationLabel(applicationState ?? undefined)}
                  <ArrowUpRight size={16} strokeWidth={2.1} />
                </button>
              )}
            </footer>
          </>
        ) : null}
      </div>
    </MemberShell>
  );
}
