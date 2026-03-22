/* eslint-disable @next/next/no-img-element */
"use client";

import {
  PROJECT_DOCUMENT_MAX_FILES,
  PROJECT_GALLERY_MAX_FILES
} from "@elo/core";
import Link from "next/link";
import {
  CirclePlus,
  FilePlus2,
  ImagePlus,
  Sparkles,
  Trash2,
  Upload
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MemberShell } from "../../../../components/member-shell";
import { apiRequest, getStoredAuth } from "../../../../lib/auth-client";
import {
  createEmptyProjectNeed,
  normalizeApiError,
  projectDraftFromIdea,
  projectPayloadFromDraft,
  type ProjectDraft,
  type ProjectDraftAsset,
  type ProjectIdea
} from "../../../../lib/project-ideas";
import {
  formatProjectFileSize,
  prepareDocumentationDraftAssets,
  prepareGalleryDraftAssets,
  revokeDraftAssetPreview,
  uploadProjectDraftAssets
} from "../../../../lib/project-upload-client";
import styles from "../../cadastrar/page.module.css";

type FeedbackTone = "danger" | "success";

type FeedbackState = {
  title: string;
  description: string;
  tone: FeedbackTone;
};

function releaseDraftAssets(assets: ProjectDraftAsset[]) {
  for (const asset of assets) {
    revokeDraftAssetPreview(asset);
  }
}

export function ProjectEditClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [form, setForm] = useState<ProjectDraft | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [idea, setIdea] = useState<ProjectIdea | null>(null);
  const [loadingIdea, setLoadingIdea] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingGallery, setProcessingGallery] = useState(false);
  const [processingDocumentation, setProcessingDocumentation] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const documentationInputRef = useRef<HTMLInputElement | null>(null);
  const assetsRef = useRef<ProjectDraftAsset[]>([]);

  useEffect(() => {
    setCurrentMemberId(getStoredAuth()?.user.memberId ?? null);
  }, []);

  useEffect(() => {
    assetsRef.current = [...(form?.galleryFiles ?? []), ...(form?.documentationFiles ?? [])];
  }, [form]);

  useEffect(() => {
    return () => {
      releaseDraftAssets(assetsRef.current);
    };
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

  function removeGalleryAsset(assetId: string) {
    setForm((current) => {
      if (!current) return current;
      const target = current.galleryFiles.find((asset) => asset.id === assetId);
      if (target) {
        revokeDraftAssetPreview(target);
      }

      return {
        ...current,
        galleryFiles: current.galleryFiles.filter((asset) => asset.id !== assetId)
      };
    });
  }

  function removeDocumentationAsset(assetId: string) {
    setForm((current) => {
      if (!current) return current;
      return {
        ...current,
        documentationFiles: current.documentationFiles.filter((asset) => asset.id !== assetId)
      };
    });
  }

  async function handleGallerySelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = event.target.files;
    event.target.value = "";

    if (!selectedFiles || selectedFiles.length === 0 || !form) {
      return;
    }

    setProcessingGallery(true);
    setFeedback(null);

    try {
      const preparedAssets = await prepareGalleryDraftAssets(
        selectedFiles,
        PROJECT_GALLERY_MAX_FILES - form.galleryFiles.length
      );

      setForm((current) =>
        current
          ? {
              ...current,
              galleryFiles: [...current.galleryFiles, ...preparedAssets]
            }
          : current
      );
    } catch (selectionError) {
      setFeedback({
        title: "Falha ao preparar imagens",
        description: normalizeApiError((selectionError as Error).message),
        tone: "danger"
      });
    } finally {
      setProcessingGallery(false);
    }
  }

  async function handleDocumentationSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = event.target.files;
    event.target.value = "";

    if (!selectedFiles || selectedFiles.length === 0 || !form) {
      return;
    }

    setProcessingDocumentation(true);
    setFeedback(null);

    try {
      const preparedAssets = await prepareDocumentationDraftAssets(
        selectedFiles,
        PROJECT_DOCUMENT_MAX_FILES - form.documentationFiles.length
      );

      setForm((current) =>
        current
          ? {
              ...current,
              documentationFiles: [...current.documentationFiles, ...preparedAssets]
            }
          : current
      );
    } catch (selectionError) {
      setFeedback({
        title: "Falha ao preparar documentacao",
        description: normalizeApiError((selectionError as Error).message),
        tone: "danger"
      });
    } finally {
      setProcessingDocumentation(false);
    }
  }

  async function resolveDraftUploads(currentForm: ProjectDraft) {
    const storedGalleryFiles = currentForm.galleryFiles.filter((asset) => !asset.file && asset.url);
    const pendingGalleryFiles = currentForm.galleryFiles.filter((asset) => asset.file);
    const storedDocumentationFiles = currentForm.documentationFiles.filter(
      (asset) => !asset.file && asset.url
    );
    const pendingDocumentationFiles = currentForm.documentationFiles.filter((asset) => asset.file);

    const uploadedGalleryFiles = await uploadProjectDraftAssets("gallery", pendingGalleryFiles);
    const uploadedDocumentationFiles = await uploadProjectDraftAssets(
      "documentation",
      pendingDocumentationFiles
    );

    return {
      ...currentForm,
      galleryFiles: [...storedGalleryFiles, ...uploadedGalleryFiles],
      documentationFiles: [...storedDocumentationFiles, ...uploadedDocumentationFiles]
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!idea || !isOwner || !form) return;

    if (processingGallery || processingDocumentation) {
      setFeedback({
        title: "Aguarde os arquivos",
        description: "Finalize o preparo das imagens e PDFs antes de salvar.",
        tone: "danger"
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      let resolvedForm = form;
      let payload = projectPayloadFromDraft(form);

      if (payload.businessAreas.length === 0) {
        throw new Error("Adicione ao menos uma area de negocio.");
      }

      if (payload.needs.length === 0) {
        throw new Error("Descreva pelo menos uma necessidade do projeto.");
      }

      resolvedForm = await resolveDraftUploads(form);
      setForm(resolvedForm);
      payload = projectPayloadFromDraft(resolvedForm);

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

        {!loadingIdea && idea && isOwner && form ? (
          <>
            <section className={styles.formCard}>
              <div className={styles.header}>
                <div className={styles.headerAccent} aria-hidden="true" />
                <h2 className={styles.title}>Editar Projetos &amp; Ideias</h2>
                <p className={styles.subtitle}>
                  Atualize tese, documentacao e galeria do projeto sem depender de URLs manuais.
                </p>
              </div>

              <form className={styles.formStack} onSubmit={handleSubmit}>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Titulo do Projeto</span>
                  <input
                    className={styles.fieldControl}
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => (current ? { ...current, title: event.target.value } : current))
                    }
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
                    onChange={(event) =>
                      setForm((current) => (current ? { ...current, summary: event.target.value } : current))
                    }
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
                    onChange={(event) =>
                      setForm((current) => (current ? { ...current, vision: event.target.value } : current))
                    }
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
                      <p className={styles.fieldLabel}>Documentacao do Projeto</p>
                      <p className={styles.sectionText}>
                        PDFs reais do projeto. Ate {PROJECT_DOCUMENT_MAX_FILES} arquivos de 10 MB cada.
                      </p>
                    </div>
                    <button
                      className={styles.inlineAddButton}
                      type="button"
                      onClick={() => documentationInputRef.current?.click()}
                      disabled={
                        processingDocumentation ||
                        form.documentationFiles.length >= PROJECT_DOCUMENT_MAX_FILES
                      }
                    >
                      <FilePlus2 size={15} strokeWidth={2.1} />
                      {processingDocumentation ? "Preparando..." : "Selecionar PDFs"}
                    </button>
                  </div>

                  <input
                    ref={documentationInputRef}
                    className={styles.hiddenInput}
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={(event) => void handleDocumentationSelection(event)}
                  />

                  {form.documentationFiles.length > 0 ? (
                    <div className={styles.assetList}>
                      {form.documentationFiles.map((file) => (
                        <article key={file.id} className={styles.assetCard}>
                          <div className={styles.assetCopy}>
                            <p className={styles.assetTitle}>{file.name || "Documento PDF"}</p>
                            <p className={styles.assetMeta}>
                              {formatProjectFileSize(file.sizeBytes)}{" "}
                              {file.file ? "• aguardando upload" : "• pronto"}
                            </p>
                          </div>
                          <button
                            className={styles.inlineRemoveButton}
                            type="button"
                            onClick={() => removeDocumentationAsset(file.id)}
                            aria-label={`Remover documento ${file.name || "PDF"}`}
                          >
                            <Trash2 size={15} strokeWidth={2.1} />
                          </button>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.emptyUploadState}>
                      <Upload size={16} strokeWidth={2.1} className={styles.emptyUploadIcon} />
                      <p className={styles.emptyUploadText}>
                        Nenhum PDF selecionado ainda. A documentacao sera enviada junto com o salvar.
                      </p>
                    </div>
                  )}
                </section>

                <section className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <p className={styles.fieldLabel}>Galeria de Imagens e Mockups</p>
                      <p className={styles.sectionText}>
                        Ate {PROJECT_GALLERY_MAX_FILES} imagens. O app comprime antes do envio para manter a galeria leve.
                      </p>
                    </div>
                    <button
                      className={styles.inlineAddButton}
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={processingGallery || form.galleryFiles.length >= PROJECT_GALLERY_MAX_FILES}
                    >
                      <ImagePlus size={15} strokeWidth={2.1} />
                      {processingGallery ? "Preparando..." : "Selecionar imagens"}
                    </button>
                  </div>

                  <input
                    ref={galleryInputRef}
                    className={styles.hiddenInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(event) => void handleGallerySelection(event)}
                  />

                  {form.galleryFiles.length > 0 ? (
                    <div className={styles.previewGrid}>
                      {form.galleryFiles.map((file) => (
                        <div key={file.id} className={styles.previewTile}>
                          {file.previewUrl || file.url ? (
                            <img
                              src={file.previewUrl ?? file.url ?? ""}
                              alt={file.name || "Preview do mockup do projeto"}
                              className={styles.previewImage}
                            />
                          ) : null}
                          <div className={styles.previewOverlay}>
                            <div className={styles.previewCopy}>
                              <p className={styles.previewName}>{file.name || "Imagem"}</p>
                              <p className={styles.previewMeta}>
                                {formatProjectFileSize(file.sizeBytes)}{" "}
                                {file.file ? "• aguardando upload" : "• pronta"}
                              </p>
                            </div>
                            <button
                              className={styles.previewRemoveButton}
                              type="button"
                              onClick={() => removeGalleryAsset(file.id)}
                              aria-label={`Remover imagem ${file.name || "da galeria"}`}
                            >
                              <Trash2 size={15} strokeWidth={2.1} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.emptyUploadState}>
                      <Upload size={16} strokeWidth={2.1} className={styles.emptyUploadIcon} />
                      <p className={styles.emptyUploadText}>
                        Nenhuma imagem selecionada ainda. O app aceita JPG, PNG e WebP e faz compressao no envio.
                      </p>
                    </div>
                  )}
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
                  Atualizacoes visuais e documentacao objetiva ajudam a elevar a confianca
                  no detalhe do projeto.
                </p>
              </article>
            </section>
          </>
        ) : null}
      </div>
    </MemberShell>
  );
}
