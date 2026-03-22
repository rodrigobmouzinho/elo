/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Images,
  PencilLine,
  Sparkles,
  Trash2,
  UsersRound,
  X
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MemberShell } from "../../../components/member-shell";
import { apiRequest, getStoredAuth } from "../../../lib/auth-client";
import {
  normalizeApiError,
  projectApplicationLabel,
  projectStatusDescription,
  projectStatusLabel,
  type ProjectIdea,
  type ProjectApplicant,
  type ProjectApplicationsView,
  type ProjectDetail,
  type ProjectStatus
} from "../../../lib/project-ideas";
import styles from "./page.module.css";

type FeedbackTone = "danger" | "info" | "success";

type FeedbackState = {
  title: string;
  description: string;
  tone: FeedbackTone;
};

function initialsOf(value: string) {
  return (
    value
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "ME"
  );
}

function statusFlashFor(status: ProjectStatus): FeedbackState {
  if (status === "completed") {
    return {
      title: "Projeto concluido",
      description: "A vitrine continua disponivel, mas novas candidaturas foram encerradas.",
      tone: "success"
    };
  }

  if (status === "inactive") {
    return {
      title: "Projeto arquivado",
      description: "O projeto foi movido para inativo e saiu da vitrine publica.",
      tone: "success"
    };
  }

  return {
    title: "Projeto reaberto",
    description: "As candidaturas foram reativadas e o projeto voltou a aceitar novos interessados.",
    tone: "success"
  };
}

function buildApplicationBanner(project: ProjectDetail | null) {
  if (!project) return null;

  if (project.status === "completed") {
    return {
      title: "Equipe formada",
      description: "Este projeto foi concluido e nao esta aceitando novas candidaturas.",
      tone: "info" as const
    };
  }

  if (project.status === "inactive" && project.viewerAccess.isOwner) {
    return {
      title: "Projeto inativo",
      description: "Somente voce ainda consegue visualizar esta publicacao no app.",
      tone: "info" as const
    };
  }

  if (project.myApplicationStatus === "accepted") {
    return {
      title: "Voce esta na equipe",
      description: "Sua candidatura foi aprovada e esta oportunidade agora faz parte do seu circulo de colaboracao.",
      tone: "success" as const
    };
  }

  if (project.myApplicationStatus === "applied") {
    return {
      title: "Interesse enviado",
      description: "Seu interesse ja foi registrado. Agora o dono do projeto decide os proximos passos.",
      tone: "info" as const
    };
  }

  if (project.myApplicationStatus === "rejected") {
    return {
      title: "Atualizacao disponivel",
      description: "Confira o sino de notificacoes para ver a resposta privada desta candidatura.",
      tone: "info" as const
    };
  }

  return null;
}

function isMissingAdvancedProjectApi(error: unknown) {
  const message = normalizeApiError((error as Error).message);
  return message.includes("HTTP 405") || message.includes("HTTP 404");
}

function buildFallbackProjectDetail(project: ProjectIdea, viewerMemberId: string | null): ProjectDetail {
  const normalizedStatus = project.status ?? "active";
  const myApplicationStatus = project.myApplicationStatus ?? null;
  const isOwner = viewerMemberId !== null && project.ownerMemberId === viewerMemberId;
  const isApprovedMember = myApplicationStatus === "accepted";

  return {
    ...project,
    status: normalizedStatus,
    completedAt: project.completedAt ?? null,
    inactivatedAt: project.inactivatedAt ?? null,
    updatedAt: project.updatedAt ?? null,
    acceptingApplications: project.acceptingApplications ?? normalizedStatus === "active",
    myApplicationStatus,
    viewerAccess: {
      isOwner,
      isApprovedMember,
      canApply: !isOwner && normalizedStatus === "active" && myApplicationStatus === null,
      canModerateApplications: false,
      canViewApplicants: false
    }
  };
}

async function loadProjectDetail(projectId: string, viewerMemberId: string | null) {
  try {
    const project = await apiRequest<ProjectDetail>(`/app/projects/${projectId}`);
    return {
      project,
      usingFallback: false
    };
  } catch (requestError) {
    if (!isMissingAdvancedProjectApi(requestError)) {
      throw requestError;
    }

    const projects = await apiRequest<ProjectIdea[]>("/app/projects");
    const targetProject = projects.find((project) => project.id === projectId);

    if (!targetProject) {
      throw requestError;
    }

    return {
      project: buildFallbackProjectDetail(targetProject, viewerMemberId),
      usingFallback: true
    };
  }
}

export function ProjectDetailClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [idea, setIdea] = useState<ProjectDetail | null>(null);
  const [applications, setApplications] = useState<ProjectApplicationsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [statusAction, setStatusAction] = useState<ProjectStatus | null>(null);
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [advancedProjectApiAvailable, setAdvancedProjectApiAvailable] = useState(true);
  const [applicationsApiAvailable, setApplicationsApiAvailable] = useState(true);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProject() {
      setLoading(true);

      try {
        const viewerMemberId = getStoredAuth()?.user.memberId ?? null;
        const { project, usingFallback } = await loadProjectDetail(projectId, viewerMemberId);
        if (!active) return;

        setAdvancedProjectApiAvailable(!usingFallback);
        setIdea(project);

        if (project.viewerAccess.canViewApplicants && !usingFallback) {
          try {
            const nextApplications = await apiRequest<ProjectApplicationsView>(
              `/app/projects/${projectId}/applications`
            );
            if (!active) return;
            setApplications(nextApplications);
            setApplicationsApiAvailable(true);
          } catch (applicationsError) {
            if (!active) return;
            setApplications(null);
            setApplicationsApiAvailable(false);
            setFeedback((current) =>
              current?.tone === "danger"
                ? current
                : {
                    title: "Moderacao indisponivel no momento",
                    description: normalizeApiError((applicationsError as Error).message),
                    tone: "info"
                  }
            );
          }
        } else if (active) {
          setApplications(null);
          setApplicationsApiAvailable(usingFallback ? false : true);
        }
      } catch (requestError) {
        if (!active) return;

        setIdea(null);
        setApplications(null);
        setAdvancedProjectApiAvailable(false);
        setApplicationsApiAvailable(false);
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

    void loadProject();

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

  useEffect(() => {
    if (activeGalleryIndex === null || typeof window === "undefined") {
      return;
    }

    const previousOverflow = window.document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (!idea || idea.galleryImageUrls.length === 0) return;

      if (event.key === "Escape") {
        setActiveGalleryIndex(null);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveGalleryIndex((current) => {
          if (current === null) return current;
          return current === 0 ? idea.galleryImageUrls.length - 1 : current - 1;
        });
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveGalleryIndex((current) => {
          if (current === null) return current;
          return current === idea.galleryImageUrls.length - 1 ? 0 : current + 1;
        });
      }
    }

    window.document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeGalleryIndex, idea]);

  async function refreshProject() {
    const viewerMemberId = getStoredAuth()?.user.memberId ?? null;
    const { project, usingFallback } = await loadProjectDetail(projectId, viewerMemberId);
    setIdea(project);
    setAdvancedProjectApiAvailable(!usingFallback);

    if (project.viewerAccess.canViewApplicants && !usingFallback) {
      try {
        const nextApplications = await apiRequest<ProjectApplicationsView>(
          `/app/projects/${projectId}/applications`
        );
        setApplications(nextApplications);
        setApplicationsApiAvailable(true);
      } catch (applicationsError) {
        setApplications(null);
        setApplicationsApiAvailable(false);
        setFeedback((current) =>
          current?.tone === "danger"
            ? current
            : {
                title: "Moderacao indisponivel no momento",
                description: normalizeApiError((applicationsError as Error).message),
                tone: "info"
              }
        );
      }
    } else {
      setApplications(null);
      setApplicationsApiAvailable(usingFallback ? false : true);
    }
  }

  async function applyToIdea() {
    if (!idea || !idea.viewerAccess.canApply) return;

    setApplying(true);
    setFeedback(null);

    try {
      await apiRequest(`/app/projects/${idea.id}/apply`, {
        method: "POST",
        body: JSON.stringify({})
      });

      await refreshProject();
      setFeedback({
        title: "Interesse registrado",
        description: `Seu interesse em "${idea.title}" foi enviado ao dono do projeto.`,
        tone: "success"
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

  async function handleStatusChange(nextStatus: ProjectStatus) {
    if (!idea) return;

    const confirmed =
      nextStatus === "inactive"
        ? window.confirm(
            "Arquivar este projeto o remove da vitrine publica. Deseja continuar?"
          )
        : nextStatus === "completed"
          ? window.confirm(
              "Concluir este projeto encerra novas candidaturas. Deseja continuar?"
            )
          : true;

    if (!confirmed) {
      return;
    }

    setStatusAction(nextStatus);
    setFeedback(null);

    try {
      await apiRequest(`/app/projects/${idea.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });

      if (nextStatus === "inactive") {
        window.sessionStorage.setItem(
          "elo-project-flash",
          JSON.stringify(statusFlashFor(nextStatus))
        );
        router.replace("/projetos");
        return;
      }

      await refreshProject();
      setFeedback(statusFlashFor(nextStatus));
    } catch (statusError) {
      setFeedback({
        title: "Falha ao atualizar projeto",
        description: normalizeApiError((statusError as Error).message),
        tone: "danger"
      });
    } finally {
      setStatusAction(null);
    }
  }

  async function handleApprove(applicationId: string) {
    if (!idea) return;

    setModeratingId(applicationId);
    setFeedback(null);

    try {
      await apiRequest(`/app/projects/${idea.id}/applications/${applicationId}/approve`, {
        method: "POST"
      });

      await refreshProject();
      setRejectingId(null);
      setFeedback({
        title: "Membro aprovado",
        description: "A candidatura foi aprovada e o membro agora faz parte da equipe deste projeto.",
        tone: "success"
      });
    } catch (approveError) {
      setFeedback({
        title: "Falha ao aprovar candidatura",
        description: normalizeApiError((approveError as Error).message),
        tone: "danger"
      });
    } finally {
      setModeratingId(null);
    }
  }

  async function handleReject(event: FormEvent<HTMLFormElement>, applicationId: string) {
    event.preventDefault();
    if (!idea) return;

    const reason = rejectReasons[applicationId]?.trim() ?? "";
    if (!reason) {
      setFeedback({
        title: "Justificativa obrigatoria",
        description: "Escreva um motivo objetivo antes de recusar a candidatura.",
        tone: "danger"
      });
      return;
    }

    setModeratingId(applicationId);
    setFeedback(null);

    try {
      await apiRequest(`/app/projects/${idea.id}/applications/${applicationId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason })
      });

      await refreshProject();
      setRejectingId(null);
      setRejectReasons((current) => ({
        ...current,
        [applicationId]: ""
      }));
      setFeedback({
        title: "Candidatura recusada",
        description: "A resposta privada foi enviada ao membro e ficou registrada no projeto.",
        tone: "success"
      });
    } catch (rejectError) {
      setFeedback({
        title: "Falha ao recusar candidatura",
        description: normalizeApiError((rejectError as Error).message),
        tone: "danger"
      });
    } finally {
      setModeratingId(null);
    }
  }

  const applicationBanner = buildApplicationBanner(idea);
  const businessAreas = useMemo(() => idea?.businessAreas.slice(0, 4) ?? [], [idea]);
  const documentationFiles = idea?.documentationFiles ?? [];
  const galleryImages = idea?.galleryImageUrls ?? [];
  const isOwner = idea?.viewerAccess.isOwner ?? false;
  const canApply = idea?.viewerAccess.canApply ?? false;
  const hasApplicantRoster = Boolean(idea?.viewerAccess.canViewApplicants && applications);
  const detailHeaderTitle = idea?.title ?? "Detalhes do Projeto";
  const activeGalleryImage =
    activeGalleryIndex !== null ? galleryImages[activeGalleryIndex] ?? null : null;
  const currentGalleryIndex = activeGalleryIndex ?? 0;

  function openGallery(index: number) {
    if (galleryImages.length === 0) return;
    setActiveGalleryIndex(index);
  }

  function closeGallery() {
    setActiveGalleryIndex(null);
  }

  function showPreviousGalleryImage() {
    setActiveGalleryIndex((current) => {
      if (current === null || galleryImages.length === 0) return current;
      return current === 0 ? galleryImages.length - 1 : current - 1;
    });
  }

  function showNextGalleryImage() {
    setActiveGalleryIndex((current) => {
      if (current === null || galleryImages.length === 0) return current;
      return current === galleryImages.length - 1 ? 0 : current + 1;
    });
  }

  function renderApplicantCard(applicant: ProjectApplicant, group: "pending" | "approved" | "rejected") {
    const isRejecting = rejectingId === applicant.id;
    const isBusy = moderatingId === applicant.id;

    return (
      <article key={applicant.id} className={styles.applicantCard}>
        <div className={styles.applicantHeader}>
          <div className={styles.applicantIdentity}>
            {applicant.memberAvatarUrl ? (
              <img
                src={applicant.memberAvatarUrl}
                alt={applicant.memberName}
                className={styles.applicantAvatar}
              />
            ) : (
              <div className={styles.applicantAvatarFallback}>
                {initialsOf(applicant.memberName)}
              </div>
            )}

            <div className={styles.applicantCopy}>
              <h5 className={styles.applicantName}>{applicant.memberName}</h5>
              <p className={styles.applicantMeta}>
                {[applicant.area, applicant.specialty, applicant.city, applicant.state]
                  .filter(Boolean)
                  .join(" • ") || "Membro Elo"}
              </p>
            </div>
          </div>

          <span
            className={`${styles.applicantState} ${
              group === "approved"
                ? styles.applicantStateApproved
                : group === "rejected"
                  ? styles.applicantStateRejected
                  : styles.applicantStatePending
            }`}
          >
            {group === "approved" ? "Aprovado" : group === "rejected" ? "Recusado" : "Pendente"}
          </span>
        </div>

        {applicant.message ? (
          <p className={styles.applicantMessage}>Mensagem privada: {applicant.message}</p>
        ) : null}

        {applicant.rejectionReason ? (
          <p className={styles.applicantReason}>Justificativa privada: {applicant.rejectionReason}</p>
        ) : null}

        {group === "pending" && isOwner ? (
          <div className={styles.applicantActions}>
            <button
              className={styles.approveButton}
              type="button"
              onClick={() => void handleApprove(applicant.id)}
              disabled={isBusy}
            >
              {isBusy ? "Aprovando..." : "Aprovar"}
              <Check size={15} strokeWidth={2.1} />
            </button>

            <button
              className={styles.rejectButton}
              type="button"
              onClick={() => setRejectingId((current) => (current === applicant.id ? null : applicant.id))}
              disabled={isBusy}
            >
              Negar
              <Ban size={15} strokeWidth={2.1} />
            </button>
          </div>
        ) : null}

        {group === "pending" && isOwner && isRejecting ? (
          <form className={styles.rejectForm} onSubmit={(event) => void handleReject(event, applicant.id)}>
            <label className={styles.rejectField}>
              <span className={styles.rejectLabel}>Justificativa da recusa</span>
              <textarea
                className={styles.rejectTextarea}
                value={rejectReasons[applicant.id] ?? ""}
                onChange={(event) =>
                  setRejectReasons((current) => ({
                    ...current,
                    [applicant.id]: event.target.value
                  }))
                }
                maxLength={500}
                placeholder="Explique de forma objetiva por que este perfil nao foi aprovado nesta fase."
              />
            </label>

            <div className={styles.rejectActions}>
              <button className={styles.confirmRejectButton} type="submit" disabled={isBusy}>
                {isBusy ? "Salvando..." : "Confirmar recusa"}
              </button>
              <button
                className={styles.cancelRejectButton}
                type="button"
                onClick={() => setRejectingId(null)}
                disabled={isBusy}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : null}
      </article>
    );
  }

  return (
    <MemberShell detailHeader={{ title: detailHeaderTitle, backHref: "/projetos" }}>
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

        {applicationBanner ? (
          <section className={styles.infoCard} aria-live="polite">
            <h2 className={styles.infoTitle}>{applicationBanner.title}</h2>
            <p className={styles.infoText}>{applicationBanner.description}</p>
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
            <p className={styles.emptyText}>
              Esta oportunidade nao esta mais disponivel ou precisa ser recarregada.
            </p>
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
                  <img
                    src={idea.ownerAvatarUrl}
                    alt={idea.ownerName ?? "Membro Elo"}
                    className={styles.avatarImage}
                  />
                ) : (
                  <div className={styles.avatarFallback}>
                    {initialsOf(idea.ownerName ?? "Membro Elo")}
                  </div>
                )}
              </div>

              <div className={styles.founderCopy}>
                <p className={styles.eyebrow}>Fundado por</p>
                <h2 className={styles.founderName}>{idea.ownerName ?? "Membro Elo"}</h2>
              </div>
            </section>

            <section className={styles.heroSection}>
              <div className={styles.heroHeader}>
                <h3 className={styles.heroTitle}>{idea.title}</h3>
                <span
                  className={`${styles.lifecycleBadge} ${
                    idea.status === "active"
                      ? styles.lifecycleBadgeActive
                      : idea.status === "completed"
                        ? styles.lifecycleBadgeCompleted
                        : styles.lifecycleBadgeInactive
                  }`}
                >
                  {projectStatusLabel(idea.status)}
                </span>
              </div>

              <div className={styles.badgeRow}>
                {businessAreas.map((businessArea, index) => (
                  <span
                    key={`${businessArea}-${index}`}
                    className={`${styles.categoryBadge} ${
                      index === 1 ? styles.categoryBadgeSecondary : ""
                    }`}
                  >
                    {businessArea}
                  </span>
                ))}
              </div>

              <p className={styles.leadText}>{idea.summary}</p>
              <p className={styles.statusHint}>{projectStatusDescription(idea.status)}</p>
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
                      <span
                        className={`${styles.needDot} ${
                          index === 1 ? styles.needDotSecondary : ""
                        }`}
                        aria-hidden="true"
                      />
                      <div className={styles.needCopy}>
                        <p className={styles.needTitle}>{need.title}</p>
                        <p className={styles.needText}>{need.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className={styles.documentationSection}>
              <h4 className={styles.galleryTitle}>
                <FileText size={16} strokeWidth={2.1} />
                Documentacao do Projeto
              </h4>

              {documentationFiles.length > 0 ? (
                <div className={styles.documentationList}>
                  {documentationFiles.map((file) => (
                    <a
                      key={`${file.url}-${file.name}`}
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.documentationCard}
                    >
                      <div className={styles.documentationCopy}>
                        <p className={styles.documentationName}>{file.name}</p>
                        <p className={styles.documentationMeta}>
                          PDF • {Math.max(1, Math.round(file.sizeBytes / 1024))} KB
                        </p>
                      </div>
                      <span className={styles.documentationAction}>
                        Abrir
                        <ArrowUpRight size={15} strokeWidth={2.1} />
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <article className={styles.galleryCardPlaceholder}>
                  <span className={styles.placeholderBadge}>Sem documentacao ainda</span>
                  <p className={styles.placeholderText}>
                    Este projeto ainda nao publicou PDFs de apoio. A leitura segue concentrada
                    na tese, nas necessidades e na galeria visual.
                  </p>
                </article>
              )}
            </section>

            <section className={styles.gallerySection}>
              <div className={styles.galleryHeader}>
                <h4 className={styles.galleryTitle}>Galeria &amp; Mockups</h4>
                {galleryImages.length > 0 ? (
                  <button
                    className={styles.galleryActionButton}
                    type="button"
                    onClick={() => openGallery(0)}
                  >
                    Ver todas
                    <Images size={15} strokeWidth={2.1} />
                  </button>
                ) : null}
              </div>

              <div className={styles.galleryTrack}>
                {galleryImages.length > 0 ? (
                  galleryImages.map((imageUrl, index) => (
                    <button
                      key={`${imageUrl}-${index}`}
                      type="button"
                      className={styles.galleryCard}
                      onClick={() => openGallery(index)}
                    >
                      <img
                        src={imageUrl}
                        alt="Imagem de apoio do projeto"
                        className={styles.galleryImage}
                      />
                      <span className={styles.galleryCardOverlay}>
                        Visualizar
                        <Eye size={15} strokeWidth={2.1} />
                      </span>
                    </button>
                  ))
                ) : (
                  <article className={styles.galleryCardPlaceholder}>
                    <span className={styles.placeholderBadge}>Sem mockups ainda</span>
                    <p className={styles.placeholderText}>
                      Este projeto ainda nao publicou materiais visuais. A leitura principal
                      segue concentrada na tese e nas necessidades.
                    </p>
                  </article>
                )}
              </div>
            </section>

            {isOwner ? (
              <section className={styles.managementCard}>
                <div className={styles.managementHeader}>
                  <div>
                    <p className={styles.eyebrow}>Painel do dono</p>
                    <h4 className={styles.managementTitle}>Gerencie o ciclo deste projeto</h4>
                  </div>
                </div>

                {!applicationsApiAvailable ? (
                  <p className={styles.managementHint}>
                    A listagem de interessados ainda depende da migration mais nova do Supabase.
                    As acoes principais do projeto continuam disponiveis.
                  </p>
                ) : null}

                <div className={styles.managementActions}>
                  <Link href={`/projetos/${idea.id}/editar`} className={styles.primaryActionLink}>
                    Editar projeto
                    <PencilLine size={16} strokeWidth={2.1} />
                  </Link>

                  {advancedProjectApiAvailable ? (
                    <>
                      {idea.status === "completed" ? (
                        <button
                          className={styles.secondaryActionButton}
                          type="button"
                          onClick={() => void handleStatusChange("active")}
                          disabled={statusAction === "active"}
                        >
                          {statusAction === "active" ? "Reabrindo..." : "Reabrir projeto"}
                        </button>
                      ) : (
                        <button
                          className={styles.secondaryActionButton}
                          type="button"
                          onClick={() => void handleStatusChange("completed")}
                          disabled={statusAction === "completed" || idea.status !== "active"}
                        >
                          {statusAction === "completed" ? "Concluindo..." : "Concluir projeto"}
                        </button>
                      )}

                      <button
                        className={styles.dangerActionButton}
                        type="button"
                        onClick={() => void handleStatusChange("inactive")}
                        disabled={statusAction === "inactive" || idea.status === "inactive"}
                      >
                        {statusAction === "inactive" ? "Arquivando..." : "Excluir projeto"}
                        <Trash2 size={16} strokeWidth={2.1} />
                      </button>
                    </>
                  ) : (
                    <p className={styles.managementHint}>
                      Acoes de status e moderacao ficam disponiveis assim que a versao nova do
                      elo-api for promovida.
                    </p>
                  )}
                </div>
              </section>
            ) : null}

            {hasApplicantRoster && applications ? (
              <section className={styles.teamSection}>
                <div className={styles.teamHeader}>
                  <h4 className={styles.teamTitle}>
                    <UsersRound size={16} strokeWidth={2.1} />
                    {isOwner ? "Equipe e interessados" : "Equipe do projeto"}
                  </h4>
                  <p className={styles.teamText}>
                    {isOwner
                      ? "Acompanhe pendencias, membros aprovados e o historico privado de recusas."
                      : "Como membro aprovado, voce consegue ver a equipe atual e os interessados que ainda estao em avaliacao."}
                  </p>
                </div>

                {applications.pending.length > 0 ? (
                  <div className={styles.applicantGroup}>
                    <div className={styles.groupHeader}>
                      <Clock3 size={16} strokeWidth={2.1} />
                      <h5 className={styles.groupTitle}>Pendentes</h5>
                    </div>
                    <div className={styles.applicantList}>
                      {applications.pending.map((applicant) =>
                        renderApplicantCard(applicant, "pending")
                      )}
                    </div>
                  </div>
                ) : null}

                {applications.approved.length > 0 ? (
                  <div className={styles.applicantGroup}>
                    <div className={styles.groupHeader}>
                      <BadgeCheck size={16} strokeWidth={2.1} />
                      <h5 className={styles.groupTitle}>Aprovados</h5>
                    </div>
                    <div className={styles.applicantList}>
                      {applications.approved.map((applicant) =>
                        renderApplicantCard(applicant, "approved")
                      )}
                    </div>
                  </div>
                ) : null}

                {isOwner && applications.rejected.length > 0 ? (
                  <div className={styles.applicantGroup}>
                    <div className={styles.groupHeader}>
                      <Ban size={16} strokeWidth={2.1} />
                      <h5 className={styles.groupTitle}>Recusados</h5>
                    </div>
                    <div className={styles.applicantList}>
                      {applications.rejected.map((applicant) =>
                        renderApplicantCard(applicant, "rejected")
                      )}
                    </div>
                  </div>
                ) : null}

                {applications.pending.length === 0 &&
                applications.approved.length === 0 &&
                applications.rejected.length === 0 ? (
                  <div className={styles.emptyApplicants}>
                    Ainda nao existem candidaturas registradas para este projeto.
                  </div>
                ) : null}
              </section>
            ) : null}

            {!isOwner ? (
              <footer className={styles.actionFooter}>
                {canApply ? (
                  <button
                    className={styles.primaryButton}
                    type="button"
                    onClick={() => void applyToIdea()}
                    disabled={applying}
                  >
                    {applying
                      ? "Enviando..."
                      : projectApplicationLabel(idea.myApplicationStatus ?? null)}
                    <ArrowUpRight size={16} strokeWidth={2.1} />
                  </button>
                ) : (
                  <button className={styles.secondaryFooterButton} type="button" disabled>
                    {idea.status === "active"
                      ? projectApplicationLabel(idea.myApplicationStatus ?? null)
                      : "Candidaturas encerradas"}
                  </button>
                )}
              </footer>
            ) : null}
          </>
        ) : null}

        {activeGalleryImage ? (
          <div
            className={styles.galleryModal}
            role="dialog"
            aria-modal="true"
            aria-label="Galeria de imagens do projeto"
            onClick={closeGallery}
          >
            <div className={styles.galleryModalBackdrop} aria-hidden="true" />
            <div className={styles.galleryModalCard} onClick={(event) => event.stopPropagation()}>
              <div className={styles.galleryModalHeader}>
                <div className={styles.galleryModalCopy}>
                  <p className={styles.eyebrow}>Galeria do projeto</p>
                  <p className={styles.galleryModalCounter}>
                    {currentGalleryIndex + 1} de {galleryImages.length}
                  </p>
                </div>

                <button
                  className={styles.galleryModalClose}
                  type="button"
                  onClick={closeGallery}
                  aria-label="Fechar galeria"
                >
                  <X size={18} strokeWidth={2.2} />
                </button>
              </div>

              <div className={styles.galleryModalViewport}>
                {galleryImages.length > 1 ? (
                  <button
                    className={`${styles.galleryNavButton} ${styles.galleryNavPrev}`}
                    type="button"
                    onClick={showPreviousGalleryImage}
                    aria-label="Imagem anterior"
                  >
                    <ChevronLeft size={18} strokeWidth={2.2} />
                  </button>
                ) : null}

                <img
                  src={activeGalleryImage}
                  alt={`Imagem ${currentGalleryIndex + 1} do projeto`}
                  className={styles.galleryModalImage}
                />

                {galleryImages.length > 1 ? (
                  <button
                    className={`${styles.galleryNavButton} ${styles.galleryNavNext}`}
                    type="button"
                    onClick={showNextGalleryImage}
                    aria-label="Proxima imagem"
                  >
                    <ChevronRight size={18} strokeWidth={2.2} />
                  </button>
                ) : null}
              </div>

              {galleryImages.length > 1 ? (
                <div className={styles.galleryThumbRow}>
                  {galleryImages.map((imageUrl, index) => (
                    <button
                      key={`${imageUrl}-thumb-${index}`}
                      type="button"
                      className={`${styles.galleryThumb} ${
                        index === currentGalleryIndex ? styles.galleryThumbActive : ""
                      }`}
                      onClick={() => setActiveGalleryIndex(index)}
                      aria-label={`Abrir imagem ${index + 1}`}
                    >
                      <img
                        src={imageUrl}
                        alt=""
                        className={styles.galleryThumbImage}
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </MemberShell>
  );
}
