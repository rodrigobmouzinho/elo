import {
  PROJECT_ASSET_BUCKET,
  PROJECT_GALLERY_ACCEPTED_TYPES,
  PROJECT_IMAGE_UPLOAD_MAX_BYTES
} from "@elo/core";
import { hasSupabase, supabaseAdmin } from "./supabase";

export type UploadedMemberAvatar = {
  name: string;
  url: string;
  sizeBytes: number;
  contentType: string;
  path: string | null;
};

let memberAvatarBucketEnsured = false;

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

function isAllowedAvatarContentType(file: File) {
  const contentType = file.type.toLowerCase();
  const extension = getExtensionFromName(file.name);

  return (
    PROJECT_GALLERY_ACCEPTED_TYPES.includes(
      contentType as (typeof PROJECT_GALLERY_ACCEPTED_TYPES)[number]
    ) || [".jpg", ".jpeg", ".png", ".webp"].includes(extension)
  );
}

function buildMockDataUrl(file: File, buffer: ArrayBuffer) {
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${file.type || "application/octet-stream"};base64,${base64}`;
}

function buildStoragePath(memberId: string, fileName: string) {
  const extension = getExtensionFromName(fileName);
  const normalizedName = sanitizeFileName(fileName.replace(/\.[^.]+$/, ""));
  const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;

  return `members/${memberId}/avatar/${uniqueSuffix}-${normalizedName}${extension}`;
}

function isBucketAlreadyAvailableError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    message.includes("already exists") ||
    message.includes("duplicate") ||
    message.includes("the resource already exists")
  );
}

function isBucketMissingError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes("bucket not found");
}

async function ensureMemberAvatarBucket() {
  if (!hasSupabase || !supabaseAdmin || memberAvatarBucketEnsured) {
    return;
  }

  const { error } = await supabaseAdmin.storage.createBucket(PROJECT_ASSET_BUCKET, {
    public: true,
    fileSizeLimit: PROJECT_IMAGE_UPLOAD_MAX_BYTES,
    allowedMimeTypes: [...PROJECT_GALLERY_ACCEPTED_TYPES]
  });

  if (error && !isBucketAlreadyAvailableError(error)) {
    throw error;
  }

  memberAvatarBucketEnsured = true;
}

export async function uploadMemberAvatarFile(payload: {
  file: File;
  memberId: string;
}): Promise<UploadedMemberAvatar> {
  const { file, memberId } = payload;

  if (!isAllowedAvatarContentType(file)) {
    throw new Error("Envie uma imagem JPG, PNG ou WebP.");
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new Error(`O arquivo ${file.name} está vazio ou inválido.`);
  }

  if (file.size > PROJECT_IMAGE_UPLOAD_MAX_BYTES) {
    throw new Error(`O arquivo ${file.name} excede o limite de 3 MB.`);
  }

  const arrayBuffer = await file.arrayBuffer();

  if (!hasSupabase || !supabaseAdmin) {
    return {
      name: file.name,
      url: buildMockDataUrl(file, arrayBuffer),
      sizeBytes: file.size,
      contentType: file.type || "application/octet-stream",
      path: `mock/avatar/${sanitizeFileName(file.name)}`
    };
  }

  await ensureMemberAvatarBucket();

  const storagePath = buildStoragePath(memberId, file.name);
  let { error } = await supabaseAdmin.storage
    .from(PROJECT_ASSET_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type || undefined,
      upsert: false,
      cacheControl: "3600"
    });

  if (isBucketMissingError(error)) {
    memberAvatarBucketEnsured = false;
    await ensureMemberAvatarBucket();
    ({ error } = await supabaseAdmin.storage.from(PROJECT_ASSET_BUCKET).upload(storagePath, arrayBuffer, {
      contentType: file.type || undefined,
      upsert: false,
      cacheControl: "3600"
    }));
  }

  if (error) {
    throw error;
  }

  const { data } = supabaseAdmin.storage.from(PROJECT_ASSET_BUCKET).getPublicUrl(storagePath);

  return {
    name: file.name,
    url: data.publicUrl,
    sizeBytes: file.size,
    contentType: file.type || "application/octet-stream",
    path: storagePath
  };
}
