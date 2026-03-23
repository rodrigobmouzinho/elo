import type {
  ProjectApplicationStatus as CoreProjectApplicationStatus,
  ProjectDocumentFile as CoreProjectDocumentFile,
  ProjectNotificationType as CoreProjectNotificationType,
  ProjectStatus as CoreProjectStatus
} from "@elo/core";

export type ProjectStatus = CoreProjectStatus;
export type ProjectApplicationStatus = CoreProjectApplicationStatus;
export type ProjectNotificationType = CoreProjectNotificationType;
export type ProjectDocumentFile = CoreProjectDocumentFile;

export type ProjectNeed = {
  title: string;
  description: string;
};

export type ProjectViewerAccess = {
  isOwner: boolean;
  isApprovedMember: boolean;
  canApply: boolean;
  canModerateApplications: boolean;
  canViewApplicants: boolean;
};

export type ProjectApplicant = {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatarUrl: string | null;
  city: string | null;
  state: string | null;
  area: string | null;
  specialty: string | null;
  status: ProjectApplicationStatus;
  createdAt: string;
  reviewedAt: string | null;
  message: string | null;
  rejectionReason: string | null;
};

export type ProjectApplicationsView = {
  projectId: string;
  viewerAccess: ProjectViewerAccess;
  pending: ProjectApplicant[];
  approved: ProjectApplicant[];
  rejected: ProjectApplicant[];
};

export type ProjectNotification = {
  id: string;
  memberId: string;
  type: ProjectNotificationType;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

export type ProjectNotificationsFeed = {
  items: ProjectNotification[];
  unreadCount: number;
};

export type ProjectIdea = {
  id: string;
  title: string;
  summary: string;
  category: string;
  description: string;
  lookingFor: string;
  businessAreas: string[];
  vision: string;
  needs: ProjectNeed[];
  galleryImageUrls: string[];
  documentationFiles?: ProjectDocumentFile[];
  ownerName?: string;
  ownerAvatarUrl?: string | null;
  ownerMemberId?: string | null;
  status: ProjectStatus;
  completedAt: string | null;
  inactivatedAt: string | null;
  updatedAt: string | null;
  acceptingApplications: boolean;
  myApplicationStatus?: ProjectApplicationStatus | null;
};

export type ProjectDetail = ProjectIdea & {
  viewerAccess: ProjectViewerAccess;
};

export type ProjectDraftAsset = {
  id: string;
  name: string;
  url: string | null;
  sizeBytes: number | null;
  contentType: string | null;
  path?: string | null;
  file: File | null;
  previewUrl: string | null;
};

export type ProjectDraft = {
  title: string;
  summary: string;
  businessAreas: string[];
  vision: string;
  needs: ProjectNeed[];
  galleryFiles: ProjectDraftAsset[];
  documentationFiles: ProjectDraftAsset[];
};

function cleanString(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export function createEmptyProjectNeed(): ProjectNeed {
  return {
    title: "",
    description: ""
  };
}

export function createDraftAsset(input?: Partial<ProjectDraftAsset>): ProjectDraftAsset {
  return {
    id: input?.id ?? crypto.randomUUID(),
    name: input?.name ?? "",
    url: input?.url ?? null,
    sizeBytes: input?.sizeBytes ?? null,
    contentType: input?.contentType ?? null,
    path: input?.path ?? null,
    file: input?.file ?? null,
    previewUrl: input?.previewUrl ?? null
  };
}

export function createStoredDraftAssetFromUrl(url: string): ProjectDraftAsset {
  return createDraftAsset({
    name: extractFileNameFromUrl(url),
    url,
    previewUrl: url
  });
}

export function createStoredDraftAssetFromDocument(file: ProjectDocumentFile): ProjectDraftAsset {
  return createDraftAsset({
    name: file.name,
    url: file.url,
    sizeBytes: file.sizeBytes,
    contentType: file.contentType,
    path: file.path ?? null
  });
}

export function createEmptyProjectDraft(): ProjectDraft {
  return {
    title: "",
    summary: "",
    businessAreas: [""],
    vision: "",
    needs: [createEmptyProjectNeed()],
    galleryFiles: [],
    documentationFiles: []
  };
}

export function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "Não foi possível conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

export function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function excerpt(value: string, max = 120) {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}...`;
}

export function projectStatusLabel(status: ProjectStatus) {
  if (status === "completed") return "Concluído";
  if (status === "inactive") return "Inativo";
  return "Ativo";
}

export function projectStatusDescription(status: ProjectStatus) {
  if (status === "completed") {
    return "Equipe formada. Novas candidaturas estão encerradas.";
  }

  if (status === "inactive") {
    return "Projeto arquivado pelo dono e oculto da vitrine pública.";
  }

  return "Aceitando novas candidaturas.";
}

export function projectApplicationLabel(status: ProjectApplicationStatus | null | undefined) {
  if (status === "accepted") return "Você já faz parte da equipe";
  if (status === "rejected") return "Sua candidatura não foi aprovada";
  if (status === "applied") return "Interesse já enviado";
  return "Tenho Interesse / Participar";
}

function cleanStringList(value: string[], max: number) {
  const cleaned = value
    .map((entry) => entry.trim())
    .filter(Boolean);

  return [...new Set(cleaned)].slice(0, max);
}

function cleanNeeds(needs: ProjectNeed[]) {
  return needs
    .map((need) => ({
      title: need.title.trim(),
      description: need.description.trim()
    }))
    .filter((need) => need.title.length > 0 && need.description.length > 0)
    .slice(0, 6);
}

function cleanGalleryUrls(files: ProjectDraftAsset[]) {
  return [...new Set(files.map((file) => cleanString(file.url)).filter(Boolean))].slice(0, 8);
}

function cleanDocumentationFiles(files: ProjectDraftAsset[]): ProjectDocumentFile[] {
  return files
    .map((file) => ({
      name: cleanString(file.name),
      url: cleanString(file.url),
      sizeBytes: file.sizeBytes ?? 0,
      contentType: cleanString(file.contentType) || "application/pdf",
      path: cleanString(file.path ?? "") || undefined
    }))
    .filter((file) => file.name.length > 0 && file.url.length > 0 && file.sizeBytes > 0)
    .slice(0, 3)
    .map((file) => ({
      name: file.name,
      url: file.url,
      sizeBytes: file.sizeBytes,
      contentType: "application/pdf",
      path: file.path
    }));
}

export function buildProjectSearchIndex(project: ProjectIdea) {
  return normalizeSearchValue(
    [
      project.title,
      project.summary,
      project.category,
      project.businessAreas.join(" "),
      project.vision,
      project.lookingFor,
      (project.documentationFiles ?? []).map((file) => file.name).join(" "),
      project.needs.map((need) => `${need.title} ${need.description}`).join(" ")
    ].join(" ")
  );
}

export function extractFileNameFromUrl(url: string) {
  const cleanedUrl = cleanString(url);

  if (!cleanedUrl) {
    return "arquivo";
  }

  if (cleanedUrl.startsWith("data:")) {
    return "arquivo";
  }

  try {
    const parsed = new URL(cleanedUrl);
    const lastPathSegment = parsed.pathname.split("/").filter(Boolean).pop();
    return decodeURIComponent(lastPathSegment ?? "arquivo");
  } catch {
    const lastPathSegment = cleanedUrl.split("/").filter(Boolean).pop();
    return lastPathSegment ?? "arquivo";
  }
}

export function projectDraftFromIdea(project: ProjectIdea): ProjectDraft {
  return {
    title: project.title,
    summary: project.summary,
    businessAreas: project.businessAreas.length > 0 ? [...project.businessAreas] : [project.category],
    vision: project.vision,
    needs: project.needs.length > 0 ? project.needs.map((need) => ({ ...need })) : [createEmptyProjectNeed()],
    galleryFiles:
      project.galleryImageUrls.length > 0
        ? project.galleryImageUrls.map((url) => createStoredDraftAssetFromUrl(url))
        : [],
    documentationFiles:
      (project.documentationFiles ?? []).length > 0
        ? (project.documentationFiles ?? []).map((file) => createStoredDraftAssetFromDocument(file))
        : []
  };
}

export function projectPayloadFromDraft(draft: ProjectDraft) {
  return {
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    businessAreas: cleanStringList(draft.businessAreas, 5),
    vision: draft.vision.trim(),
    needs: cleanNeeds(draft.needs),
    galleryImageUrls: cleanGalleryUrls(draft.galleryFiles),
    documentationFiles: cleanDocumentationFiles(draft.documentationFiles)
  };
}
