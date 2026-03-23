"use client";

import {
  PROJECT_GALLERY_ACCEPTED_TYPES,
  PROJECT_IMAGE_MAX_DIMENSION,
  PROJECT_IMAGE_SOURCE_MAX_BYTES,
  PROJECT_IMAGE_UPLOAD_MAX_BYTES
} from "@elo/core";
import { apiRequest } from "./auth-client";

export type PreparedMemberAvatarUpload = {
  file: File;
  previewUrl: string;
  name: string;
  sizeBytes: number;
  contentType: string;
};

type UploadedMemberAvatar = {
  name: string;
  url: string;
  sizeBytes: number;
  contentType: string;
  path: string | null;
};

function replaceExtension(fileName: string, extension: string) {
  const sanitizedExtension = extension.startsWith(".") ? extension : `.${extension}`;
  return fileName.replace(/\.[^.]+$/, "") + sanitizedExtension;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Não foi possível ler a imagem ${file.name}.`));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Falha ao comprimir a imagem selecionada."));
          return;
        }

        resolve(blob);
      },
      "image/webp",
      quality
    );
  });
}

async function compressMemberAvatar(file: File) {
  if (file.size > PROJECT_IMAGE_SOURCE_MAX_BYTES) {
    throw new Error(`A imagem ${file.name} excede o limite de 10 MB antes da compressão.`);
  }

  if (!PROJECT_GALLERY_ACCEPTED_TYPES.includes(file.type as (typeof PROJECT_GALLERY_ACCEPTED_TYPES)[number])) {
    throw new Error(`A imagem ${file.name} precisa estar em JPG, PNG ou WebP.`);
  }

  const image = await loadImage(file);
  const compressionPresets = [
    { maxDimension: PROJECT_IMAGE_MAX_DIMENSION, quality: 0.82 },
    { maxDimension: 1280, quality: 0.74 },
    { maxDimension: 1120, quality: 0.68 },
    { maxDimension: 960, quality: 0.62 }
  ];

  for (const preset of compressionPresets) {
    const scale = Math.min(
      1,
      preset.maxDimension / Math.max(image.naturalWidth, image.naturalHeight)
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      break;
    }

    context.drawImage(image, 0, 0, width, height);
    const blob = await canvasToBlob(canvas, preset.quality);

    if (blob.size <= PROJECT_IMAGE_UPLOAD_MAX_BYTES) {
      return new File([blob], replaceExtension(file.name, ".webp"), {
        type: "image/webp",
        lastModified: Date.now()
      });
    }
  }

  if (file.size <= PROJECT_IMAGE_UPLOAD_MAX_BYTES) {
    return file;
  }

  throw new Error(
    `A imagem ${file.name} permanece acima de 3 MB mesmo após a compressão. Use uma versão menor.`
  );
}

export function revokePreparedMemberAvatar(upload: PreparedMemberAvatarUpload | null) {
  if (upload?.previewUrl) {
    URL.revokeObjectURL(upload.previewUrl);
  }
}

export function formatMemberAvatarSize(sizeBytes: number | null | undefined) {
  const bytes = Number(sizeBytes ?? 0);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "Tamanho não informado";
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export async function prepareMemberAvatarUpload(file: File) {
  const compressed = await compressMemberAvatar(file);

  return {
    file: compressed,
    previewUrl: URL.createObjectURL(compressed),
    name: compressed.name,
    sizeBytes: compressed.size,
    contentType: compressed.type
  } satisfies PreparedMemberAvatarUpload;
}

export async function uploadPreparedMemberAvatar(upload: PreparedMemberAvatarUpload) {
  const formData = new FormData();
  formData.append("file", upload.file);

  const response = await apiRequest<{ file: UploadedMemberAvatar }>("/app/profile/avatar-upload", {
    method: "POST",
    body: formData
  });

  return response.file;
}
