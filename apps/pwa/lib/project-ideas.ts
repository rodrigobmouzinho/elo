export type ProjectStatus = "active" | "completed" | "inactive";
export type ProjectApplicationStatus = "applied" | "accepted" | "rejected";
export type ProjectNotificationType =
  | "project_application_accepted"
  | "project_application_rejected";

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

export type ProjectDraft = {
  title: string;
  summary: string;
  businessAreas: string[];
  vision: string;
  needs: ProjectNeed[];
  galleryImageUrls: string[];
};

export function createEmptyProjectNeed(): ProjectNeed {
  return {
    title: "",
    description: ""
  };
}

export function createEmptyProjectDraft(): ProjectDraft {
  return {
    title: "",
    summary: "",
    businessAreas: [""],
    vision: "",
    needs: [createEmptyProjectNeed()],
    galleryImageUrls: [""]
  };
}

export function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "Nao foi possivel conectar ao servidor. Tente novamente em instantes.";
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
  if (status === "completed") return "Concluido";
  if (status === "inactive") return "Inativo";
  return "Ativo";
}

export function projectStatusDescription(status: ProjectStatus) {
  if (status === "completed") {
    return "Equipe formada. Novas candidaturas estao encerradas.";
  }

  if (status === "inactive") {
    return "Projeto arquivado pelo dono e oculto da vitrine publica.";
  }

  return "Aceitando novas candidaturas.";
}

export function projectApplicationLabel(status: ProjectApplicationStatus | null | undefined) {
  if (status === "accepted") return "Voce ja faz parte da equipe";
  if (status === "rejected") return "Sua candidatura nao foi aprovada";
  if (status === "applied") return "Interesse ja enviado";
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

export function buildProjectSearchIndex(project: ProjectIdea) {
  return normalizeSearchValue(
    [
      project.title,
      project.summary,
      project.category,
      project.businessAreas.join(" "),
      project.vision,
      project.lookingFor,
      project.needs.map((need) => `${need.title} ${need.description}`).join(" ")
    ].join(" ")
  );
}

export function projectDraftFromIdea(project: ProjectIdea): ProjectDraft {
  return {
    title: project.title,
    summary: project.summary,
    businessAreas: project.businessAreas.length > 0 ? [...project.businessAreas] : [project.category],
    vision: project.vision,
    needs: project.needs.length > 0 ? project.needs.map((need) => ({ ...need })) : [createEmptyProjectNeed()],
    galleryImageUrls:
      project.galleryImageUrls.length > 0 ? [...project.galleryImageUrls] : [""]
  };
}

export function projectPayloadFromDraft(draft: ProjectDraft) {
  return {
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    businessAreas: cleanStringList(draft.businessAreas, 5),
    vision: draft.vision.trim(),
    needs: cleanNeeds(draft.needs),
    galleryImageUrls: cleanStringList(draft.galleryImageUrls, 8)
  };
}
