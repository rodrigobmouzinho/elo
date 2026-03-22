import {
  type ProjectDocumentFile,
  projectIdeaSchema,
  type ProjectApplicationStatus,
  type ProjectStatus
} from "@elo/core";
import type { z } from "zod";

const PROJECT_META_MARKER = "\n[[elo-project-v2]]";

export type ProjectInput = z.infer<typeof projectIdeaSchema>;
export type ProjectNeed = ProjectInput["needs"][number];
export type ProjectLifecycleState = {
  status: ProjectStatus;
  completedAt: string | null;
  inactivatedAt: string | null;
  updatedAt: string | null;
};

type ProjectMeta = {
  summary: string;
  businessAreas: string[];
  vision: string;
  needs: ProjectNeed[];
  galleryImageUrls: string[];
  documentationFiles: ProjectDocumentFile[];
  status?: ProjectStatus;
  completedAt?: string | null;
  inactivatedAt?: string | null;
  updatedAt?: string | null;
};

type ProjectOwnerProfileRow = {
  full_name: string;
  avatar_url: string | null;
};

export type ProjectRow = {
  id: string;
  title: string;
  category: string;
  description: string;
  looking_for: string;
  summary?: string | null;
  business_areas?: string[] | null;
  vision?: string | null;
  needs?: unknown;
  gallery_image_urls?: string[] | null;
  documentation_files?: unknown;
  owner_member_id?: string | null;
  member_profiles?: ProjectOwnerProfileRow | ProjectOwnerProfileRow[] | null;
  status?: string | null;
  completed_at?: string | null;
  inactivated_at?: string | null;
  updated_at?: string | null;
};

export type NormalizedProjectIdea = {
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
  documentationFiles: ProjectDocumentFile[];
  ownerName: string;
  ownerAvatarUrl: string | null;
  ownerMemberId: string | null;
  status: ProjectStatus;
  completedAt: string | null;
  inactivatedAt: string | null;
  updatedAt: string | null;
  acceptingApplications: boolean;
  myApplicationStatus?: ProjectApplicationStatus | null;
};

export const PROJECT_LIST_SELECT_BASE =
  "id, title, category, description, looking_for, owner_member_id, member_profiles(full_name, avatar_url)";
export const PROJECT_LIST_SELECT_WITH_ENHANCED = `${PROJECT_LIST_SELECT_BASE}, summary, business_areas, vision, needs, gallery_image_urls`;
export const PROJECT_LIST_SELECT_WITH_LIFECYCLE = `${PROJECT_LIST_SELECT_BASE}, status, completed_at, inactivated_at, updated_at`;
export const PROJECT_LIST_SELECT_WITH_ENHANCED_AND_LIFECYCLE = `${PROJECT_LIST_SELECT_WITH_ENHANCED}, status, completed_at, inactivated_at, updated_at`;
export const PROJECT_DOCUMENTATION_SELECT = "documentation_files";

function trimText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function trimOptionalIso(value: string | null | undefined) {
  const trimmed = trimText(value);
  return trimmed.length > 0 ? trimmed : null;
}

function truncateText(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3).trimEnd()}...`;
}

function sanitizeBusinessAreas(value: string[] | null | undefined) {
  const cleaned = (value ?? [])
    .map((entry) => trimText(entry))
    .filter(Boolean);

  return [...new Set(cleaned)].slice(0, 5);
}

function sanitizeGalleryImageUrls(value: string[] | null | undefined) {
  const cleaned = (value ?? [])
    .map((entry) => trimText(entry))
    .filter(Boolean);

  return cleaned.slice(0, 8);
}

function sanitizeDocumentationFiles(value: unknown): ProjectDocumentFile[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map<ProjectDocumentFile | null>((entry) => {
      if (!entry || typeof entry !== "object") return null;

      const name = trimText((entry as { name?: string }).name);
      const url = trimText((entry as { url?: string }).url);
      const sizeBytes = Number((entry as { sizeBytes?: number }).sizeBytes ?? 0);
      const contentType = trimText((entry as { contentType?: string }).contentType);
      const path = trimText((entry as { path?: string | null }).path ?? "");

      if (!name || !url || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
        return null;
      }

      if (contentType !== "application/pdf") {
        return null;
      }

      return {
        name: truncateText(name, 180),
        url,
        sizeBytes: Math.trunc(sizeBytes),
        contentType: "application/pdf" as const,
        path: path || undefined
      };
    })
    .filter((entry): entry is ProjectDocumentFile => entry !== null)
    .slice(0, 3);
}

function sanitizeProjectStatus(value: unknown): ProjectStatus {
  if (value === "completed" || value === "inactive") {
    return value;
  }

  return "active";
}

function sanitizeNeeds(value: unknown): ProjectNeed[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;

      const title = trimText((entry as { title?: string }).title);
      const description = trimText((entry as { description?: string }).description);

      if (!title || !description) return null;

      return {
        title: truncateText(title, 60),
        description: truncateText(description, 180)
      };
    })
    .filter((entry): entry is ProjectNeed => entry !== null)
    .slice(0, 6);
}

function buildNeedsSummary(needs: ProjectNeed[]) {
  const summary = needs
    .map((need) => need.title.trim())
    .filter(Boolean)
    .join(" • ");

  return truncateText(summary, 180);
}

function buildLegacyDescription(summary: string, vision: string) {
  return `${summary.trim()}\n\n${vision.trim()}`.trim();
}

function decodeProjectMeta(rawLookingFor: string | null | undefined): ProjectMeta | null {
  const raw = rawLookingFor ?? "";
  const markerIndex = raw.indexOf(PROJECT_META_MARKER);

  if (markerIndex === -1) {
    return null;
  }

  const jsonPayload = raw.slice(markerIndex + PROJECT_META_MARKER.length).trim();

  try {
    const parsed = JSON.parse(jsonPayload) as Partial<ProjectMeta>;

    return {
      summary: trimText(parsed.summary),
      businessAreas: sanitizeBusinessAreas(parsed.businessAreas),
      vision: trimText(parsed.vision),
      needs: sanitizeNeeds(parsed.needs),
      galleryImageUrls: sanitizeGalleryImageUrls(parsed.galleryImageUrls),
      documentationFiles: sanitizeDocumentationFiles(parsed.documentationFiles),
      status: sanitizeProjectStatus(parsed.status),
      completedAt: trimOptionalIso(parsed.completedAt),
      inactivatedAt: trimOptionalIso(parsed.inactivatedAt),
      updatedAt: trimOptionalIso(parsed.updatedAt)
    };
  } catch {
    return null;
  }
}

function stripProjectMeta(rawLookingFor: string | null | undefined) {
  const raw = rawLookingFor ?? "";
  const markerIndex = raw.indexOf(PROJECT_META_MARKER);

  if (markerIndex === -1) {
    return raw.trim();
  }

  return raw.slice(0, markerIndex).trim();
}

function splitBusinessAreasFromCategory(category: string) {
  const cleaned = trimText(category);
  if (!cleaned) return [];

  return sanitizeBusinessAreas(cleaned.split(/\s*(?:,|\/|\||•)\s*/));
}

function splitDescription(description: string) {
  const parts = description
    .split(/\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return {
    summary: parts[0] ?? "",
    vision: parts.slice(1).join("\n\n")
  };
}

function fallbackNeedsFromLookingFor(lookingFor: string): ProjectNeed[] {
  const cleaned = stripProjectMeta(lookingFor);
  if (!cleaned) return [];

  return cleaned
    .split(/\s*(?:\||;|,)\s*/)
    .map((entry) => trimText(entry))
    .filter(Boolean)
    .slice(0, 6)
    .map((entry) => ({
      title: truncateText(entry, 60),
      description: "Perfil buscado para acelerar a evolucao desta oportunidade."
    }));
}

function resolveOwnerProfile(
  value: ProjectRow["member_profiles"]
): { ownerName: string; ownerAvatarUrl: string | null } {
  const profile = Array.isArray(value) ? value[0] : value;

  return {
    ownerName: trimText(profile?.full_name) || "Membro Elo",
    ownerAvatarUrl: profile?.avatar_url ?? null
  };
}

export function normalizeProjectRow(row: ProjectRow): NormalizedProjectIdea {
  const decodedMeta = decodeProjectMeta(row.looking_for);
  const descriptionParts = splitDescription(row.description);
  const summary = trimText(row.summary) || decodedMeta?.summary || descriptionParts.summary || row.title;
  const projectBusinessAreas = sanitizeBusinessAreas(row.business_areas);
  const businessAreas =
    projectBusinessAreas.length > 0
      ? projectBusinessAreas
      : (decodedMeta?.businessAreas ?? splitBusinessAreasFromCategory(row.category));
  const normalizedAreas = businessAreas.length > 0 ? businessAreas : ["Negocios"];
  const vision =
    trimText(row.vision) ||
    decodedMeta?.vision ||
    descriptionParts.vision ||
    descriptionParts.summary ||
    "Em breve, mais detalhes sobre esta oportunidade.";
  const projectNeeds = sanitizeNeeds(row.needs);
  const needs =
    projectNeeds.length > 0 ? projectNeeds : (decodedMeta?.needs ?? fallbackNeedsFromLookingFor(row.looking_for));
  const normalizedNeeds =
    needs.length > 0
      ? needs
      : [
          {
            title: "Parceiro estrategico",
            description: "Conexao de negocio buscada para destravar a proxima fase do projeto."
          }
        ];
  const projectGallery = sanitizeGalleryImageUrls(row.gallery_image_urls);
  const galleryImageUrls =
    projectGallery.length > 0 ? projectGallery : (decodedMeta?.galleryImageUrls ?? []);
  const projectDocumentation = sanitizeDocumentationFiles(row.documentation_files);
  const documentationFiles =
    projectDocumentation.length > 0
      ? projectDocumentation
      : (decodedMeta?.documentationFiles ?? []);
  const ownerProfile = resolveOwnerProfile(row.member_profiles);
  const status = sanitizeProjectStatus(row.status ?? decodedMeta?.status);
  const completedAt = trimOptionalIso(row.completed_at) ?? decodedMeta?.completedAt ?? null;
  const inactivatedAt = trimOptionalIso(row.inactivated_at) ?? decodedMeta?.inactivatedAt ?? null;
  const updatedAt = trimOptionalIso(row.updated_at) ?? decodedMeta?.updatedAt ?? null;

  return {
    id: row.id,
    title: trimText(row.title) || "Projeto Elo",
    summary,
    category: normalizedAreas[0],
    description: buildLegacyDescription(summary, vision),
    lookingFor: buildNeedsSummary(normalizedNeeds),
    businessAreas: normalizedAreas,
    vision,
    needs: normalizedNeeds,
    galleryImageUrls,
    documentationFiles,
    ownerName: ownerProfile.ownerName,
    ownerAvatarUrl: ownerProfile.ownerAvatarUrl,
    ownerMemberId: row.owner_member_id ?? null,
    status,
    completedAt,
    inactivatedAt,
    updatedAt,
    acceptingApplications: status === "active"
  };
}

export function toProjectInput(project: Pick<
  NormalizedProjectIdea,
  | "title"
  | "summary"
  | "businessAreas"
  | "vision"
  | "needs"
  | "galleryImageUrls"
  | "documentationFiles"
>): ProjectInput {
  return {
    title: project.title,
    summary: project.summary,
    businessAreas: project.businessAreas,
    vision: project.vision,
    needs: project.needs,
    galleryImageUrls: project.galleryImageUrls,
    documentationFiles: project.documentationFiles.map((file) => ({
      name: file.name,
      url: file.url,
      sizeBytes: file.sizeBytes,
      contentType: file.contentType,
      ...(file.path ? { path: file.path } : {})
    }))
  };
}

function encodeProjectMeta(payload: ProjectInput, lifecycle?: Partial<ProjectLifecycleState>) {
  const summary = buildNeedsSummary(payload.needs);
  const meta: ProjectMeta = {
    summary: payload.summary.trim(),
    businessAreas: sanitizeBusinessAreas(payload.businessAreas),
    vision: payload.vision.trim(),
    needs: sanitizeNeeds(payload.needs),
    galleryImageUrls: sanitizeGalleryImageUrls(payload.galleryImageUrls),
    documentationFiles: sanitizeDocumentationFiles(payload.documentationFiles),
    status: sanitizeProjectStatus(lifecycle?.status),
    completedAt: lifecycle?.completedAt ?? null,
    inactivatedAt: lifecycle?.inactivatedAt ?? null,
    updatedAt: lifecycle?.updatedAt ?? null
  };

  return `${summary}${PROJECT_META_MARKER}${JSON.stringify(meta)}`;
}

export function buildProjectDbPayload(
  payload: ProjectInput,
  enhancedColumnsSupported: boolean,
  lifecycle?: Partial<ProjectLifecycleState>,
  documentationColumnsSupported = false
) {
  const businessAreas = sanitizeBusinessAreas(payload.businessAreas);
  const needs = sanitizeNeeds(payload.needs);
  const galleryImageUrls = sanitizeGalleryImageUrls(payload.galleryImageUrls);
  const documentationFiles = sanitizeDocumentationFiles(payload.documentationFiles);
  const summary = payload.summary.trim();
  const vision = payload.vision.trim();

  const basePayload = {
    title: payload.title.trim(),
    description: buildLegacyDescription(summary, vision),
    category: businessAreas[0] ?? "Negocios",
    looking_for: encodeProjectMeta(payload, lifecycle)
  };

  if (!enhancedColumnsSupported) {
    return basePayload;
  }

  const enhancedPayload = {
    ...basePayload,
    summary,
    business_areas: businessAreas,
    vision,
    needs,
    gallery_image_urls: galleryImageUrls
  };

  if (!documentationColumnsSupported) {
    return enhancedPayload;
  }

  return {
    ...enhancedPayload,
    documentation_files: documentationFiles
  };
}

export function buildProjectLifecycleDbPayload(lifecycle: ProjectLifecycleState) {
  return {
    status: lifecycle.status,
    completed_at: lifecycle.completedAt,
    inactivated_at: lifecycle.inactivatedAt,
    updated_at: lifecycle.updatedAt
  };
}

export function isMissingProjectEnhancedColumnsError(error: unknown) {
  const code = (error as { code?: string })?.code ?? "";
  const message = ((error as { message?: string })?.message ?? "").toLowerCase();

  if (code === "42703") {
    return true;
  }

  return (
    message.includes("summary") ||
    message.includes("business_areas") ||
    message.includes("vision") ||
    message.includes("gallery_image_urls") ||
    message.includes("column projects.needs does not exist") ||
    message.includes("column \"needs\" does not exist")
  );
}

export function isMissingProjectLifecycleColumnsError(error: unknown) {
  const code = (error as { code?: string })?.code ?? "";
  const message = ((error as { message?: string })?.message ?? "").toLowerCase();

  if (code === "42703") {
    return true;
  }

  return (
    message.includes("status") ||
    message.includes("completed_at") ||
    message.includes("inactivated_at") ||
    message.includes("updated_at")
  );
}

export function isMissingProjectDocumentationColumnsError(error: unknown) {
  const code = (error as { code?: string })?.code ?? "";
  const message = ((error as { message?: string })?.message ?? "").toLowerCase();

  if (code === "42703") {
    return true;
  }

  return (
    message.includes("documentation_files") ||
    message.includes("column projects.documentation_files does not exist")
  );
}
