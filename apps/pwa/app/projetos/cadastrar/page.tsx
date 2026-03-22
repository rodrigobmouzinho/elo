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
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MemberShell } from "../../../components/member-shell";
import { apiRequest } from "../../../lib/auth-client";
import {
  createEmptyProjectDraft,
  createEmptyProjectNeed,
  normalizeApiError,
  projectPayloadFromDraft,
  type ProjectDraft,
  type ProjectDraftAsset
} from "../../../lib/project-ideas";
import {
  formatProjectFileSize,
  prepareDocumentationDraftAssets,
  prepareGalleryDraftAssets,
  revokeDraftAssetPreview,
  uploadProjectDraftAssets
} from "../../../lib/project-upload-client";
import styles from "./page.module.css";

type FeedbackTone = "danger" | "info" | "success";

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

export default function CadastrarIdeiaPage() {
  const router = useRouter();
  const [form, setForm] = useState<ProjectDraft>(createEmptyProjectDraft());
  const [saving, setSaving] = useState(false);
  const [processingGallery, setProcessingGallery] = useState(false);
  const [processingDocumentation, setProcessingDocumentation] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const assetsRef = useRef<ProjectDraftAsset[]>([]);

  useEffect(() => {
    assetsRef.current = [...form.galleryFiles, ...form.documentationFiles];
  }, [form.documentationFiles, form.galleryFiles]);

  useEffect(() => {
    return () => {
      releaseDraftAssets(assetsRef.current);
    };
  }, []);

  function updateBusinessArea(index: number, value: string) {
    setForm((current) => {
      const businessAreas = [...current.businessAreas];
      businessAreas[index] = value;
      return { ...current, businessAreas };
    });
  }

  function addBusinessArea() {
    setForm((current) => ({
      ...current,
      businessAreas: [...current.businessAreas, ""].slice(0, 5)
    }));
  }

  function removeBusinessArea(index: number) {
    setForm((current) => {
      const businessAreas = current.businessAreas.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        businessAreas: businessAreas.length > 0 ? businessAreas : [""]
      };
    });
  }

  function updateNeed(index: number, field: keyof ProjectDraft["needs"][number], value: string) {
    setForm((current) => {
      const needs = [...current.needs];
      needs[index] = {
        ...needs[index],
        [field]: value
      };
      return { ...current, needs };
    });
  }

  function addNeed() {
    setForm((current) => ({
      ...current,
      needs: [...current.needs, createEmptyProjectNeed()].slice(0, 6)
    }));
  }

  function removeNeed(index: number) {
    setForm((current) => {
      const needs = current.needs.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        needs: needs.length > 0 ? needs : [createEmptyProjectNeed()]
      };
    });
  }

  function removeGalleryAsset(assetId: string) {
    setForm((current) => {
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
    setForm((current) => ({
      ...current,
      documentationFiles: current.documentationFiles.filter((asset) => asset.id !== assetId)
    }));
  }

  async function handleGallerySelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (selectedFiles.length === 0) {
      return;
    }

    setProcessingGallery(true);
    setFeedback(null);

    try {
      const preparedAssets = await prepareGalleryDraftAssets(
        selectedFiles,
        PROJECT_GALLERY_MAX_FILES - form.galleryFiles.length
      );

      setForm((current) => ({
        ...current,
        galleryFiles: [...current.galleryFiles, ...preparedAssets]
      }));
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
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (selectedFiles.length === 0) {
      return;
    }

    setProcessingDocumentation(true);
    setFeedback(null);

    try {
      const preparedAssets = await prepareDocumentationDraftAssets(
        selectedFiles,
        PROJECT_DOCUMENT_MAX_FILES - form.documentationFiles.length
      );

      setForm((current) => ({
        ...current,
        documentationFiles: [...current.documentationFiles, ...preparedAssets]
      }));
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

    if (processingGallery || processingDocumentation) {
      setFeedback({
        title: "Aguarde os arquivos",
        description: "Finalize o preparo das imagens e PDFs antes de publicar.",
        tone: "info"
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

      await apiRequest("/app/projects", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      window.sessionStorage.setItem("elo-project-created", "1");
      router.replace("/projetos");
    } catch (submitError) {
      setFeedback({
        title: "Falha ao publicar projeto",
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

        <section className={styles.formCard}>
          <div className={styles.header}>
            <div className={styles.headerAccent} aria-hidden="true" />
            <h2 className={styles.title}>Cadastrar Projetos &amp; Ideias</h2>
            <p className={styles.subtitle}>
              Estruture a oportunidade como ela sera vista no detalhe: tese, areas,
              necessidades, documentacao e prova visual.
            </p>
          </div>

          <form className={styles.formStack} onSubmit={handleSubmit}>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Titulo do Projeto</span>
              <input
                className={styles.fieldControl}
                placeholder="ex: Nexus IA"
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
                placeholder="A infraestrutura que conecta varejistas a operacao autonoma."
                value={form.summary}
                onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                minLength={3}
                maxLength={140}
                required
              />
            </label>

            <section className={styles.sectionBlock}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.fieldLabel}>Areas de Negocio</p>
                  <p className={styles.sectionText}>Use tags curtas como Fintech, IA, Varejo ou Healthtech.</p>
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
                      placeholder="ex: Fintech"
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
                placeholder="Explique a transformacao que esse projeto pretende gerar e por que ele importa agora."
                value={form.vision}
                onChange={(event) => setForm((current) => ({ ...current, vision: event.target.value }))}
                minLength={20}
                maxLength={2000}
                required
              />
            </label>

            <section className={styles.sectionBlock}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.fieldLabel}>O que Precisamos</p>
                  <p className={styles.sectionText}>Cada bloco deve trazer o perfil buscado e um breve descritivo.</p>
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
                        placeholder="ex: Socio comercial"
                        value={need.title}
                        onChange={(event) => updateNeed(index, "title", event.target.value)}
                        maxLength={60}
                      />
                    </label>

                    <label className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>Breve descritivo</span>
                      <textarea
                        className={styles.compactTextarea}
                        placeholder="ex: Experiencia em expansao B2B e parcerias estrategicas."
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
                <label
                  className={`${styles.inlineAddButton} ${
                    processingDocumentation ||
                    form.documentationFiles.length >= PROJECT_DOCUMENT_MAX_FILES
                      ? styles.inlineAddButtonDisabled
                      : ""
                  }`}
                  htmlFor="project-documentation-upload"
                  aria-disabled={
                    processingDocumentation ||
                    form.documentationFiles.length >= PROJECT_DOCUMENT_MAX_FILES
                  }
                >
                  <FilePlus2 size={15} strokeWidth={2.1} />
                  {processingDocumentation ? "Preparando..." : "Selecionar PDFs"}
                </label>
              </div>

              <input
                id="project-documentation-upload"
                className={styles.fileInput}
                type="file"
                accept="application/pdf"
                multiple
                onChange={(event) => void handleDocumentationSelection(event)}
                disabled={
                  processingDocumentation ||
                  form.documentationFiles.length >= PROJECT_DOCUMENT_MAX_FILES
                }
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
                    Nenhum PDF selecionado ainda. A documentacao sera enviada junto com a publicacao.
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
                <label
                  className={`${styles.inlineAddButton} ${
                    processingGallery || form.galleryFiles.length >= PROJECT_GALLERY_MAX_FILES
                      ? styles.inlineAddButtonDisabled
                      : ""
                  }`}
                  htmlFor="project-gallery-upload"
                  aria-disabled={processingGallery || form.galleryFiles.length >= PROJECT_GALLERY_MAX_FILES}
                >
                  <ImagePlus size={15} strokeWidth={2.1} />
                  {processingGallery ? "Preparando..." : "Selecionar imagens"}
                </label>
              </div>

              <input
                id="project-gallery-upload"
                className={styles.fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => void handleGallerySelection(event)}
                disabled={processingGallery || form.galleryFiles.length >= PROJECT_GALLERY_MAX_FILES}
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
                {saving ? "Publicando..." : "Publicar Projeto"}
              </button>
              <Link href="/projetos" className={styles.secondaryButton}>
                Cancelar
              </Link>
            </div>
          </form>
        </section>

        <section className={styles.tipGrid}>
          <article className={styles.tipCard}>
            <Sparkles size={16} strokeWidth={2.1} className={styles.tipIconPrimary} />
            <p className={styles.tipText}>
              Imagens claras, PDFs objetivos e necessidades precisas tornam o detalhe do projeto
              mais confiavel para novos parceiros.
            </p>
          </article>
        </section>
      </div>
    </MemberShell>
  );
}
