"use client";

import {
  PROJECT_DOCUMENT_MAX_BYTES,
  PROJECT_DOCUMENT_MAX_FILES,
  PROJECT_GALLERY_ACCEPTED_TYPES,
  PROJECT_GALLERY_MAX_FILES,
  PROJECT_IMAGE_MAX_DIMENSION,
  PROJECT_IMAGE_SOURCE_MAX_BYTES,
  PROJECT_IMAGE_UPLOAD_MAX_BYTES,
  type ProjectUploadKind
} from "@elo/core";
import { apiRequest } from "./auth-client";
import { createDraftAsset, type ProjectDraftAsset } from "./project-ideas";

type UploadedAsset = {
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
      reject(new Error(`Nao foi possivel ler a imagem ${file.name}.`));
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

async function compressProjectImage(file: File) {
  if (file.size > PROJECT_IMAGE_SOURCE_MAX_BYTES) {
    throw new Error(`A imagem ${file.name} excede o limite de 10 MB antes da compressao.`);
  }

  if (!PROJECT_GALLERY_ACCEPTED_TYPES.includes(file.type as (typeof PROJECT_GALLERY_ACCEPTED_TYPES)[number])) {
    throw new Error(`A imagem ${file.name} precisa estar em JPG, PNG ou WebP.`);
  }

  const image = await loadImage(file);
  const compressionPresets = [
    { maxDimension: PROJECT_IMAGE_MAX_DIMENSION, quality: 0.82 },
    { maxDimension: 1440, quality: 0.74 },
    { maxDimension: 1280, quality: 0.68 },
    { maxDimension: 1120, quality: 0.62 }
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
    `A imagem ${file.name} permanece acima de 3 MB mesmo apos a compressao. Use uma versao menor.`
  );
}

function createPendingDraftAsset(file: File, previewUrl: string | null) {
  return createDraftAsset({
    name: file.name,
    sizeBytes: file.size,
    contentType: file.type,
    file,
    previewUrl
  });
}

export function revokeDraftAssetPreview(asset: ProjectDraftAsset) {
  if (asset.file && asset.previewUrl) {
    URL.revokeObjectURL(asset.previewUrl);
  }
}

export function formatProjectFileSize(sizeBytes: number | null | undefined) {
  const bytes = Number(sizeBytes ?? 0);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "Tamanho nao informado";
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export async function prepareGalleryDraftAssets(files: FileList | File[], remainingSlots: number) {
  const selectedFiles = Array.from(files);

  if (selectedFiles.length > remainingSlots) {
    throw new Error(`A galeria aceita no maximo ${PROJECT_GALLERY_MAX_FILES} imagens.`);
  }

  const compressedFiles: ProjectDraftAsset[] = [];

  for (const file of selectedFiles) {
    const compressed = await compressProjectImage(file);
    const previewUrl = URL.createObjectURL(compressed);
    compressedFiles.push(createPendingDraftAsset(compressed, previewUrl));
  }

  return compressedFiles;
}

export async function prepareDocumentationDraftAssets(
  files: FileList | File[],
  remainingSlots: number
) {
  const selectedFiles = Array.from(files);

  if (selectedFiles.length > remainingSlots) {
    throw new Error(`A documentacao aceita no maximo ${PROJECT_DOCUMENT_MAX_FILES} PDFs.`);
  }

  return selectedFiles.map((file) => {
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      throw new Error("Envie apenas arquivos PDF na documentacao do projeto.");
    }

    if (file.size <= 0) {
      throw new Error(`O arquivo ${file.name} esta vazio ou invalido.`);
    }

    if (file.size > PROJECT_DOCUMENT_MAX_BYTES) {
      throw new Error(`O arquivo ${file.name} excede o limite de 10 MB.`);
    }

    return createPendingDraftAsset(file, null);
  });
}

export async function uploadProjectDraftAssets(
  kind: ProjectUploadKind,
  files: ProjectDraftAsset[]
) {
  const pendingFiles = files.map((item) => item.file).filter((file): file is File => file instanceof File);

  if (pendingFiles.length === 0) {
    return [] as ProjectDraftAsset[];
  }

  const formData = new FormData();
  formData.append("kind", kind);

  for (const file of pendingFiles) {
    formData.append("files", file);
  }

  const response = await apiRequest<{ files: UploadedAsset[] }>("/app/projects/uploads", {
    method: "POST",
    body: formData
  });

  return response.files.map((file) =>
    createDraftAsset({
      name: file.name,
      url: file.url,
      sizeBytes: file.sizeBytes,
      contentType: file.contentType,
      path: file.path ?? null,
      previewUrl: kind === "gallery" ? file.url : null
    })
  );
}
