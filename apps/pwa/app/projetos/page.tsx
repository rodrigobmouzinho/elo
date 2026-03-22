"use client";

import Link from "next/link";
import { CirclePlus, PencilLine, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MemberShell } from "../../components/member-shell";
import { apiRequest, getStoredAuth } from "../../lib/auth-client";
import styles from "./page.module.css";

type Idea = {
  id: string;
  title: string;
  category: string;
  description: string;
  lookingFor: string;
  ownerMemberId?: string | null;
  ownerName?: string;
};

type ProjectFilter = "all" | "mine";

type FeedbackTone = "danger" | "success";

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

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function excerpt(text: string, max = 110) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}...`;
}

function extractPitch(description: string) {
  const firstLine = description
    .split(/\n+/)
    .map((part) => part.trim())
    .find(Boolean);

  return excerpt(firstLine ?? description, 118);
}

function ideaIndex(idea: Idea) {
  return normalizeSearchValue([idea.title, idea.category, extractPitch(idea.description), idea.description, idea.lookingFor].join(" "));
}

export default function ProjetosPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ProjectFilter>("all");
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

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
    setCurrentMemberId(getStoredAuth()?.user.memberId ?? null);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const flash = window.sessionStorage.getItem("elo-project-created");
    const updatedFlash = window.sessionStorage.getItem("elo-project-updated");

    if (flash === "1") {
      window.sessionStorage.removeItem("elo-project-created");
      setFeedback({
        title: "Ideia publicada",
        description: "Seu projeto ja esta disponivel para novas visualizacoes e candidaturas.",
        tone: "success"
      });
      return;
    }

    if (updatedFlash === "1") {
      window.sessionStorage.removeItem("elo-project-updated");
      setFeedback({
        title: "Projeto atualizado",
        description: "As alteracoes do seu projeto ja foram publicadas.",
        tone: "success"
      });
    }
  }, []);

  const filteredIdeas = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(search.trim());

    return ideas.filter((idea) => {
      const matchesFilter =
        activeFilter === "all" || (currentMemberId !== null && idea.ownerMemberId === currentMemberId);
      const matchesSearch = normalizedSearch === "" || ideaIndex(idea).includes(normalizedSearch);

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
            <p className={styles.ctaText}>Tem uma nova tese de negocio? Publique sua ideia e abra espaco para conexoes qualificadas.</p>
            <Link href="/projetos/cadastrar" className={styles.primaryButton}>
              Cadastrar Ideia
              <CirclePlus size={16} strokeWidth={2.1} />
            </Link>
          </div>
        </section>

        {loadingIdeas ? (
          <section className={styles.statusCard} aria-live="polite">
            <h2 className={styles.statusTitle}>Carregando projetos</h2>
            <p className={styles.statusText}>Buscando ideias abertas para visualizacao e candidatura.</p>
          </section>
        ) : null}

        {!loadingIdeas && filteredIdeas.length === 0 ? (
          <section className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>Nenhuma oportunidade encontrada</h3>
            <p className={styles.emptyText}>
              {activeFilter === "mine"
                ? "Voce ainda nao publicou projetos com esse criterio. Publique uma nova ideia para aparecer aqui."
                : "Ajuste a busca ou publique uma nova ideia para abrir espaco para colaboracao."}
            </p>
          </section>
        ) : null}

        <section className={styles.feedGrid}>
          {filteredIdeas.map((idea) => {
            const isOwner = currentMemberId !== null && idea.ownerMemberId === currentMemberId;

            return (
              <article key={idea.id} className={styles.projectCard}>
                <div className={styles.cardHeader}>
                  <span className={styles.categoryBadge}>{idea.category}</span>
                </div>

                <h3 className={styles.cardTitle}>{idea.title}</h3>
                <p className={styles.cardPitch}>{extractPitch(idea.description)}</p>

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
