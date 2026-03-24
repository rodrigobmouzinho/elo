"use client";

import Link from "next/link";
import { CirclePlus, PencilLine, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MemberShell } from "../../components/member-shell";
import { apiRequest, getStoredAuth } from "../../lib/auth-client";
import {
  buildProjectSearchIndex,
  normalizeApiError,
  normalizeSearchValue,
  projectStatusDescription,
  projectStatusLabel,
  type ProjectIdea
} from "../../lib/project-ideas";
import styles from "./page.module.css";

type ProjectFilter = "all" | "mine";

type FeedbackTone = "danger" | "success";

type FeedbackState = {
  title: string;
  description: string;
  tone: FeedbackTone;
};

export default function ProjetosPage() {
  const [ideas, setIdeas] = useState<ProjectIdea[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ProjectFilter>("all");
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  async function loadIdeas() {
    setLoadingIdeas(true);

    try {
      setFeedback((previous) => (previous?.tone === "danger" ? null : previous));
      setIdeas(await apiRequest<ProjectIdea[]>("/app/projects"));
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
    setCurrentMemberId(getStoredAuth()?.user.memberId ?? null);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const managementFlash = window.sessionStorage.getItem("elo-project-flash");
    const flash = window.sessionStorage.getItem("elo-project-created");
    const updatedFlash = window.sessionStorage.getItem("elo-project-updated");

    if (managementFlash) {
      window.sessionStorage.removeItem("elo-project-flash");

      try {
        const parsed = JSON.parse(managementFlash) as FeedbackState;
        setFeedback(parsed);
        return;
      } catch {
        // Ignore malformed flash payload.
      }
    }

    if (flash === "1") {
      window.sessionStorage.removeItem("elo-project-created");
      setFeedback({
        title: "Projeto publicado",
        description: "Seu projeto já está disponível para novas visualizações e candidaturas.",
        tone: "success"
      });
      return;
    }

    if (updatedFlash) {
      window.sessionStorage.removeItem("elo-project-updated");
      setFeedback({
        title: "Projeto atualizado",
        description: "As alterações do seu projeto já foram publicadas.",
        tone: "success"
      });
    }
  }, []);

  const filteredIdeas = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(search.trim());

    return ideas.filter((idea) => {
      const matchesFilter =
        activeFilter === "mine"
          ? currentMemberId !== null && idea.ownerMemberId === currentMemberId
          : idea.status !== "inactive";
      const matchesSearch =
        normalizedSearch === "" || buildProjectSearchIndex(idea).includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, currentMemberId, ideas, search]);

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
            placeholder="Pesquisar startups e ideias..."
            type="search"
          />
        </label>

        {currentMemberId ? (
          <section className={styles.filterBar} aria-label="Filtros de projetos">
            <button
              className={`${styles.filterChip} ${activeFilter === "all" ? styles.filterChipActive : ""}`}
              type="button"
              onClick={() => setActiveFilter("all")}
            >
              Todos
            </button>
            <button
              className={`${styles.filterChip} ${activeFilter === "mine" ? styles.filterChipActive : ""}`}
              type="button"
              onClick={() => setActiveFilter("mine")}
            >
              Meus projetos
            </button>
          </section>
        ) : null}

        <section className={styles.ctaCard}>
          <div className={styles.ctaAura} aria-hidden="true" />
          <div className={styles.ctaContent}>
            <h3 className={styles.ctaTitle}>Construa o futuro</h3>
            <p className={styles.ctaText}>Tem uma nova tese de negócio? Publique sua ideia e abra espaço para conexões qualificadas.</p>
            <Link href="/projetos/cadastrar" className={styles.primaryButton}>
              Cadastrar Projeto
              <CirclePlus size={16} strokeWidth={2.1} />
            </Link>
          </div>
        </section>

        {loadingIdeas ? (
          <section className={styles.statusCard} aria-live="polite">
            <h2 className={styles.statusTitle}>Carregando projetos</h2>
            <p className={styles.statusText}>Buscando ideias abertas para visualização e candidatura.</p>
          </section>
        ) : null}

        {!loadingIdeas && filteredIdeas.length === 0 ? (
          <section className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>Nenhuma oportunidade encontrada</h3>
            <p className={styles.emptyText}>
              {activeFilter === "mine"
                ? "Você ainda não publicou projetos com esse critério. Publique uma nova ideia para aparecer aqui."
                : "Ajuste a busca ou publique uma nova ideia para abrir espaço para colaboração."}
            </p>
          </section>
        ) : null}

        <section className={styles.feedGrid}>
          {filteredIdeas.map((idea) => {
            const isOwner = currentMemberId !== null && idea.ownerMemberId === currentMemberId;
            const isClosed = idea.status !== "active";
            const businessAreas = idea.businessAreas.length > 0 ? idea.businessAreas : [idea.category];

            return (
              <article
                key={idea.id}
                className={`${styles.projectCard} ${idea.status === "inactive" ? styles.projectCardMuted : ""}`}
              >
                <div className={styles.cardMeta}>
                  <div className={styles.badgeRow}>
                    {businessAreas.map((businessArea, index) => (
                      <span key={`${idea.id}-${businessArea}-${index}`} className={styles.categoryBadge}>
                        {businessArea}
                      </span>
                    ))}
                  </div>
                  {isClosed ? (
                    <span
                      className={`${styles.stateBadge} ${
                        idea.status === "completed" ? styles.stateBadgeCompleted : styles.stateBadgeInactive
                      }`}
                    >
                      {projectStatusLabel(idea.status)}
                    </span>
                  ) : null}
                </div>

                <h3 className={styles.cardTitle}>{idea.title}</h3>
                <p className={styles.cardPitch}>{idea.summary}</p>
                {isClosed ? <p className={styles.cardStateText}>{projectStatusDescription(idea.status)}</p> : null}

                <div className={styles.cardFooter}>
                  {isOwner ? (
                    <Link href={`/projetos/${idea.id}/editar`} className={styles.editButton}>
                      <PencilLine size={14} strokeWidth={2.1} />
                      Editar
                    </Link>
                  ) : null}

                  <Link href={`/projetos/${idea.id}`} className={styles.viewButton}>
                    Visualizar
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </MemberShell>
  );
}
