import {
  PROJECT_ASSET_BUCKET,
  PROJECT_DOCUMENT_ACCEPTED_TYPES,
  PROJECT_DOCUMENT_MAX_BYTES,
  PROJECT_DOCUMENT_MAX_FILES,
  PROJECT_GALLERY_ACCEPTED_TYPES,
  PROJECT_GALLERY_MAX_FILES,
  PROJECT_IMAGE_UPLOAD_MAX_BYTES,
  type ProjectUploadKind
} from "@elo/core";
import { hasSupabase, supabaseAdmin } from "./supabase";

export type ProjectUploadedAsset = {
  name: string;
  url: string;
  sizeBytes: number;
  contentType: string;
  path: string | null;
};

const PROJECT_UPLOAD_KINDS = ["gallery", "documentation"] as const;

function sanitizeFileName(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "arquivo";
}

function getExtensionFromName(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return extension ? `.${extension}` : "";
}

function isAllowedContentType(kind: ProjectUploadKind, file: File) {
  const contentType = file.type.toLowerCase();
  const extension = getExtensionFromName(file.name);

  if (kind === "gallery") {
    return (
      PROJECT_GALLERY_ACCEPTED_TYPES.includes(contentType as (typeof PROJECT_GALLERY_ACCEPTED_TYPES)[number]) ||
      [".jpg", ".jpeg", ".png", ".webp"].includes(extension)
    );
  }

  return (
    PROJECT_DOCUMENT_ACCEPTED_TYPES.includes(
      contentType as (typeof PROJECT_DOCUMENT_ACCEPTED_TYPES)[number]
    ) || extension === ".pdf"
  );
}

function getKindLimits(kind: ProjectUploadKind) {
  if (kind === "gallery") {
    return {
      maxFiles: PROJECT_GALLERY_MAX_FILES,
      maxBytes: PROJECT_IMAGE_UPLOAD_MAX_BYTES
    };
  }

  return {
    maxFiles: PROJECT_DOCUMENT_MAX_FILES,
    maxBytes: PROJECT_DOCUMENT_MAX_BYTES
  };
}

function buildMockDataUrl(file: File, buffer: ArrayBuffer) {
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${file.type || "application/octet-stream"};base64,${base64}`;
}

function buildStoragePath(kind: ProjectUploadKind, memberId: string, fileName: string) {
  const extension = getExtensionFromName(fileName);
  const normalizedName = sanitizeFileName(fileName.replace(/\.[^.]+$/, ""));
  const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;

  return `projects/${memberId}/${kind}/${uniqueSuffix}-${normalizedName}${extension}`;
}

export function isProjectUploadKind(value: FormDataEntryValue | null): value is ProjectUploadKind {
  return typeof value === "string" && PROJECT_UPLOAD_KINDS.includes(value as ProjectUploadKind);
}

export async function uploadProjectFiles(payload: {
  kind: ProjectUploadKind;
  files: File[];
  memberId: string;
}): Promise<ProjectUploadedAsset[]> {
  const { kind, files, memberId } = payload;
  const { maxFiles, maxBytes } = getKindLimits(kind);

  if (files.length === 0) {
    throw new Error("Selecione ao menos um arquivo antes de enviar");
  }

  if (files.length > maxFiles) {
    throw new Error(
      kind === "gallery"
        ? `A galeria aceita no maximo ${PROJECT_GALLERY_MAX_FILES} imagens por envio.`
        : `A documentacao aceita no maximo ${PROJECT_DOCUMENT_MAX_FILES} PDFs por envio.`
    );
  }

  const uploads: ProjectUploadedAsset[] = [];

  for (const file of files) {
    if (!isAllowedContentType(kind, file)) {
      throw new Error(
        kind === "gallery"
          ? "Envie imagens JPG, PNG ou WebP."
          : "Envie apenas arquivos PDF na documentacao."
      );
    }

    if (!Number.isFinite(file.size) || file.size <= 0) {
      throw new Error(`O arquivo ${file.name} esta vazio ou invalido.`);
    }

    if (file.size > maxBytes) {
      const maxLabel = kind === "gallery" ? "3 MB" : "10 MB";
      throw new Error(`O arquivo ${file.name} excede o limite de ${maxLabel}.`);
    }

    const arrayBuffer = await file.arrayBuffer();

    if (!hasSupabase || !supabaseAdmin) {
      uploads.push({
        name: file.name,
        url: buildMockDataUrl(file, arrayBuffer),
        sizeBytes: file.size,
        contentType: file.type || "application/octet-stream",
        path: `mock/${kind}/${sanitizeFileName(file.name)}`
      });
      continue;
    }

    const storagePath = buildStoragePath(kind, memberId, file.name);
    const { error } = await supabaseAdmin.storage
      .from(PROJECT_ASSET_BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type || undefined,
        upsert: false,
        cacheControl: "3600"
      });

    if (error) {
      throw error;
    }

    const { data } = supabaseAdmin.storage.from(PROJECT_ASSET_BUCKET).getPublicUrl(storagePath);

    uploads.push({
      name: file.name,
      url: data.publicUrl,
      sizeBytes: file.size,
      contentType: file.type || "application/octet-stream",
      path: storagePath
    });
  }

  return uploads;
}
