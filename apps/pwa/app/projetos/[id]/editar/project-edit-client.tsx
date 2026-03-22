/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { CirclePlus, ImagePlus, Sparkles, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MemberShell } from "../../../../components/member-shell";
import { apiRequest, getStoredAuth } from "../../../../lib/auth-client";
import {
  createEmptyProjectNeed,
  normalizeApiError,
  projectDraftFromIdea,
  projectPayloadFromDraft,
  type ProjectDraft,
  type ProjectIdea
} from "../../../../lib/project-ideas";
import styles from "../../cadastrar/page.module.css";

type FeedbackTone = "danger" | "success";

type FeedbackState = {
  title: string;
  description: string;
  tone: FeedbackTone;
};

function isValidImageUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

export function ProjectEditClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [form, setForm] = useState<ProjectDraft | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [idea, setIdea] = useState<ProjectIdea | null>(null);
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
        const projects = await apiRequest<ProjectIdea[]>("/app/projects");
        const targetIdea = projects.find((project) => project.id === projectId);

        if (!targetIdea) {
          throw new Error("Projeto nao encontrado.");
        }

        if (!active) return;

        setIdea(targetIdea);
        setForm(projectDraftFromIdea(targetIdea));
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

  function updateBusinessArea(index: number, value: string) {
    setForm((current) => {
      if (!current) return current;
      const businessAreas = [...current.businessAreas];
      businessAreas[index] = value;
      return { ...current, businessAreas };
    });
  }

  function addBusinessArea() {
    setForm((current) => {
      if (!current) return current;
      return {
        ...current,
        businessAreas: [...current.businessAreas, ""].slice(0, 5)
      };
    });
  }

  function removeBusinessArea(index: number) {
    setForm((current) => {
      if (!current) return current;
      const businessAreas = current.businessAreas.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        businessAreas: businessAreas.length > 0 ? businessAreas : [""]
      };
    });
  }

  function updateNeed(index: number, field: keyof ProjectDraft["needs"][number], value: string) {
    setForm((current) => {
      if (!current) return current;
      const needs = [...current.needs];
      needs[index] = {
        ...needs[index],
        [field]: value
      };
      return { ...current, needs };
    });
  }

  function addNeed() {
    setForm((current) => {
      if (!current) return current;
      return {
        ...current,
        needs: [...current.needs, createEmptyProjectNeed()].slice(0, 6)
      };
    });
  }

  function removeNeed(index: number) {
    setForm((current) => {
      if (!current) return current;
      const needs = current.needs.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        needs: needs.length > 0 ? needs : [createEmptyProjectNeed()]
      };
    });
  }

  function updateGalleryImage(index: number, value: string) {
    setForm((current) => {
      if (!current) return current;
      const galleryImageUrls = [...current.galleryImageUrls];
      galleryImageUrls[index] = value;
      return { ...current, galleryImageUrls };
    });
  }

  function addGalleryImage() {
    setForm((current) => {
      if (!current) return current;
      return {
        ...current,
        galleryImageUrls: [...current.galleryImageUrls, ""].slice(0, 8)
      };
    });
  }

  function removeGalleryImage(index: number) {
    setForm((current) => {
      if (!current) return current;
      const galleryImageUrls = current.galleryImageUrls.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        galleryImageUrls: galleryImageUrls.length > 0 ? galleryImageUrls : [""]
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!idea || !isOwner || !form) return;

    setSaving(true);
    setFeedback(null);

    try {
      const payload = projectPayloadFromDraft(form);

      if (payload.businessAreas.length === 0) {
        throw new Error("Adicione ao menos uma area de negocio.");
      }

      if (payload.needs.length === 0) {
        throw new Error("Descreva pelo menos uma necessidade do projeto.");
      }

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

  const galleryPreview =
    form?.galleryImageUrls.map((value) => value.trim()).filter((value) => isValidImageUrl(value)) ?? [];

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

        {!loadingIdea && idea && isOwner && form ? (
          <>
            <section className={styles.formCard}>
              <div className={styles.header}>
                <div className={styles.headerAccent} aria-hidden="true" />
                <h2 className={styles.title}>Editar Projetos &amp; Ideias</h2>
                <p className={styles.subtitle}>
                  Refine a tese, ajuste as necessidades e renove a galeria para fortalecer a leitura do detalhe.
                </p>
              </div>

              <form className={styles.formStack} onSubmit={handleSubmit}>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Titulo do Projeto</span>
                  <input
                    className={styles.fieldControl}
                    value={form.title}
                    onChange={(event) => setForm((current) => (current ? { ...current, title: event.target.value } : current))}
                    minLength={3}
                    maxLength={80}
                    required
                  />
                </label>

                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Pitch em uma frase</span>
                  <input
                    className={styles.fieldControl}
                    value={form.summary}
                    onChange={(event) => setForm((current) => (current ? { ...current, summary: event.target.value } : current))}
                    minLength={3}
                    maxLength={140}
                    required
                  />
                </label>

                <section className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <p className={styles.fieldLabel}>Areas de Negocio</p>
                      <p className={styles.sectionText}>Atualize as tags principais que aparecem na leitura do detalhe.</p>
                    </div>
                    <button
                      className={styles.inlineAddButton}
                      type="button"
                      onClick={addBusinessArea}
                      disabled={form.businessAreas.length >= 5}
                    >
                      <CirclePlus size={15} strokeWidth={2.1} />
                      Adicionar area
                    </button>
                  </div>

                  <div className={styles.dynamicStack}>
                    {form.businessAreas.map((businessArea, index) => (
                      <div key={`business-area-${index}`} className={styles.inlineFieldRow}>
                        <input
                          className={styles.fieldControl}
                          value={businessArea}
                          onChange={(event) => updateBusinessArea(index, event.target.value)}
                          maxLength={40}
                        />
                        <button
                          className={styles.inlineRemoveButton}
                          type="button"
                          onClick={() => removeBusinessArea(index)}
                          aria-label={`Remover area ${index + 1}`}
                        >
                          <Trash2 size={15} strokeWidth={2.1} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Visao do Projeto</span>
                  <textarea
                    className={styles.storyInput}
                    value={form.vision}
                    onChange={(event) => setForm((current) => (current ? { ...current, vision: event.target.value } : current))}
                    minLength={20}
                    maxLength={2000}
                    required
                  />
                </label>

                <section className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <p className={styles.fieldLabel}>O que Precisamos</p>
                      <p className={styles.sectionText}>Mantenha cada necessidade objetiva, clara e acionavel.</p>
                    </div>
                    <button
                      className={styles.inlineAddButton}
                      type="button"
                      onClick={addNeed}
                      disabled={form.needs.length >= 6}
                    >
                      <CirclePlus size={15} strokeWidth={2.1} />
                      Adicionar necessidade
                    </button>
                  </div>

                  <div className={styles.dynamicStack}>
                    {form.needs.map((need, index) => (
                      <article key={`need-${index}`} className={styles.dynamicCard}>
                        <div className={styles.dynamicCardHeader}>
                          <span className={styles.dynamicCardTitle}>Necessidade {index + 1}</span>
                          <button
                            className={styles.inlineRemoveButton}
                            type="button"
                            onClick={() => removeNeed(index)}
                            aria-label={`Remover necessidade ${index + 1}`}
                          >
                            <Trash2 size={15} strokeWidth={2.1} />
                          </button>
                        </div>

                        <label className={styles.fieldGroup}>
                          <span className={styles.fieldLabel}>Perfil</span>
                          <input
                            className={styles.fieldControl}
                            value={need.title}
                            onChange={(event) => updateNeed(index, "title", event.target.value)}
                            maxLength={60}
                          />
                        </label>

                        <label className={styles.fieldGroup}>
                          <span className={styles.fieldLabel}>Breve descritivo</span>
                          <textarea
                            className={styles.compactTextarea}
                            value={need.description}
                            onChange={(event) => updateNeed(index, "description", event.target.value)}
                            maxLength={180}
                          />
                        </label>
                      </article>
                    ))}
                  </div>
                </section>

                <section className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <p className={styles.fieldLabel}>Galeria de Imagens e Mockups</p>
                      <p className={styles.sectionText}>Atualize URLs publicas de telas, mockups ou materiais visuais.</p>
                    </div>
                    <button
                      className={styles.inlineAddButton}
                      type="button"
                      onClick={addGalleryImage}
                      disabled={form.galleryImageUrls.length >= 8}
                    >
                      <ImagePlus size={15} strokeWidth={2.1} />
                      Adicionar imagem
                    </button>
                  </div>

                  <div className={styles.dynamicStack}>
                    {form.galleryImageUrls.map((imageUrl, index) => (
                      <div key={`gallery-${index}`} className={styles.inlineFieldRow}>
                        <input
                          className={styles.fieldControl}
                          type="url"
                          value={imageUrl}
                          onChange={(event) => updateGalleryImage(index, event.target.value)}
                        />
                        <button
                          className={styles.inlineRemoveButton}
                          type="button"
                          onClick={() => removeGalleryImage(index)}
                          aria-label={`Remover imagem ${index + 1}`}
                        >
                          <Trash2 size={15} strokeWidth={2.1} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {galleryPreview.length > 0 ? (
                    <div className={styles.previewGrid}>
                      {galleryPreview.map((imageUrl) => (
                        <div key={imageUrl} className={styles.previewTile}>
                          <img src={imageUrl} alt="Preview do mockup do projeto" className={styles.previewImage} />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>

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

            <section className={styles.tipGrid}>
              <article className={styles.tipCard}>
                <Sparkles size={16} strokeWidth={2.1} className={styles.tipIconPrimary} />
                <p className={styles.tipText}>
                  Atualizacoes visuais e necessidades mais precisas ajudam a elevar a taxa de interesse no detalhe.
                </p>
              </article>
            </section>
          </>
        ) : null}
      </div>
    </MemberShell>
  );
}
