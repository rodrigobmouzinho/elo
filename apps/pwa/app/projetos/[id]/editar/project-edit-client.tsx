"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MemberShell } from "../../../../components/member-shell";
import { apiRequest, getStoredAuth } from "../../../../lib/auth-client";
import styles from "../../cadastrar/page.module.css";

type Idea = {
  id: string;
  title: string;
  category: string;
  description: string;
  lookingFor: string;
  ownerMemberId?: string | null;
};

type FeedbackTone = "danger" | "success";

type FeedbackState = {
  title: string;
  description: string;
  tone: FeedbackTone;
};

type IdeaForm = {
  title: string;
  pitch: string;
  category: string;
  partnerProfiles: string;
  description: string;
};

const emptyForm: IdeaForm = {
  title: "",
  pitch: "",
  category: "",
  partnerProfiles: "",
  description: ""
};

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "Nao foi possivel conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

function buildLookingFor(partnerProfiles: string) {
  if (partnerProfiles.length <= 120) return partnerProfiles;
  return `${partnerProfiles.slice(0, 117).trimEnd()}...`;
}

function splitDescription(description: string) {
  const parts = description
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    pitch: parts[0] ?? "",
    description: parts.slice(1).join("\n\n")
  };
}

export function ProjectEditClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [form, setForm] = useState<IdeaForm>(emptyForm);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loadingIdea, setLoadingIdea] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  useEffect(() => {
    setCurrentMemberId(getStoredAuth()?.user.memberId ?? null);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadIdea() {
      setLoadingIdea(true);

      try {
        const projects = await apiRequest<Idea[]>("/app/projects");
        const targetIdea = projects.find((project) => project.id === projectId);

        if (!targetIdea) {
          throw new Error("Projeto nao encontrado.");
        }

        if (!active) return;

        const parsed = splitDescription(targetIdea.description);
        setIdea(targetIdea);
        setForm({
          title: targetIdea.title,
          pitch: parsed.pitch,
          category: targetIdea.category,
          partnerProfiles: targetIdea.lookingFor,
          description: parsed.description
        });
      } catch (requestError) {
        if (!active) return;

        setFeedback({
          title: "Falha ao carregar projeto",
          description: normalizeApiError((requestError as Error).message),
          tone: "danger"
        });
      } finally {
        if (active) {
          setLoadingIdea(false);
        }
      }
    }

    void loadIdea();

    return () => {
      active = false;
    };
  }, [projectId]);

  const isOwner = useMemo(
    () => currentMemberId !== null && idea?.ownerMemberId === currentMemberId,
    [currentMemberId, idea]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!idea || !isOwner) return;

    setSaving(true);
    setFeedback(null);

    try {
      const payload = {
        title: form.title.trim(),
        category: form.category.trim(),
        description: `${form.pitch.trim()}\n\n${form.description.trim()}`.trim(),
        lookingFor: buildLookingFor(form.partnerProfiles.trim())
      };

      await apiRequest(`/app/projects/${idea.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });

      window.sessionStorage.setItem("elo-project-updated", idea.id);
      router.replace(`/projetos/${idea.id}`);
    } catch (submitError) {
      setFeedback({
        title: "Falha ao atualizar projeto",
        description: normalizeApiError((submitError as Error).message),
        tone: "danger"
      });
      setSaving(false);
    }
  }

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

        {loadingIdea ? (
          <section className={styles.statusCard} aria-live="polite">
            <h2 className={styles.statusTitle}>Carregando projeto</h2>
            <p className={styles.statusText}>Preparando os dados para edicao.</p>
          </section>
        ) : null}

        {!loadingIdea && !idea ? (
          <section className={styles.statusCard}>
            <h2 className={styles.statusTitle}>Projeto nao encontrado</h2>
            <p className={styles.statusText}>Essa oportunidade nao foi localizada para edicao.</p>
            <Link href="/projetos" className={styles.secondaryButton}>
              Voltar para projetos
            </Link>
          </section>
        ) : null}

        {!loadingIdea && idea && !isOwner ? (
          <section className={styles.statusCard}>
            <h2 className={styles.statusTitle}>Edicao indisponivel</h2>
            <p className={styles.statusText}>Somente o dono do projeto pode editar essa publicacao.</p>
            <Link href={`/projetos/${idea.id}`} className={styles.secondaryButton}>
              Voltar ao projeto
            </Link>
          </section>
        ) : null}

        {!loadingIdea && idea && isOwner ? (
          <>
            <section className={styles.formCard}>
              <div className={styles.header}>
                <div className={styles.headerAccent} aria-hidden="true" />
                <h2 className={styles.title}>Editar Projeto</h2>
                <p className={styles.subtitle}>Atualize o posicionamento da sua ideia e refine os perfis buscados.</p>
              </div>

              <form className={styles.formStack} onSubmit={handleSubmit}>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Nome da Startup</span>
                  <input
                    className={styles.fieldControl}
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    minLength={3}
                    maxLength={80}
                    required
                  />
                </label>

                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Pitch em uma frase</span>
                  <input
                    className={styles.fieldControl}
                    value={form.pitch}
                    onChange={(event) => setForm((current) => ({ ...current, pitch: event.target.value }))}
                    minLength={3}
                    maxLength={100}
                    required
                  />
                </label>

                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Industria</span>
                  <input
                    className={styles.fieldControl}
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                    minLength={3}
                    maxLength={80}
                    required
                  />
                </label>

                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Perfis de parceiros buscados</span>
                  <input
                    className={styles.fieldControl}
                    value={form.partnerProfiles}
                    onChange={(event) => setForm((current) => ({ ...current, partnerProfiles: event.target.value }))}
                    minLength={3}
                    maxLength={120}
                    required
                  />
                </label>

                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Descricao da Ideia</span>
                  <textarea
                    className={styles.storyInput}
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    minLength={20}
                    maxLength={1800}
                    required
                  />
                </label>

                <div className={styles.actions}>
                  <button className={styles.primaryButton} type="submit" disabled={saving}>
                    {saving ? "Salvando..." : "Salvar alteracoes"}
                  </button>
                  <Link href={`/projetos/${idea.id}`} className={styles.secondaryButton}>
                    Cancelar
                  </Link>
                </div>
              </form>
            </section>
          </>
        ) : null}
      </div>
    </MemberShell>
  );
}
