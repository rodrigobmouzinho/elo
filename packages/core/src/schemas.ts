import { z } from "zod";
import {
  PROJECT_DOCUMENT_ACCEPTED_TYPES,
  PROJECT_DOCUMENT_MAX_BYTES,
  PROJECT_DOCUMENT_MAX_FILES,
  PROJECT_GALLERY_MAX_FILES
} from "./constants";

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isDataUrl(value: string) {
  return value.startsWith("data:");
}

function isAssetUrl(value: string) {
  return value.startsWith("/") || isHttpUrl(value) || isDataUrl(value);
}

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8)
});

export const resetPasswordSchema = z.object({
  email: z.email()
});

const eventImageSchema = z
  .string()
  .trim()
  .refine((value) => isAssetUrl(value), {
    message: "URL de arquivo deve ser valida, data URL ou caminho local iniciado com /"
  });

export const memberSchema = z.object({
  fullName: z.string().min(3),
  email: z.email(),
  phone: z.string().min(8),
  whatsapp: z.string().min(8),
  city: z.string().min(2),
  state: z.string().min(2).max(2),
  area: z.string().min(2).max(40),
  bio: z.string().max(500).optional(),
  specialty: z.string().max(120).optional(),
  membershipExpiresAt: z.string().datetime()
});

export const eventBaseSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(20),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  location: z.string().min(3),
  onlineUrl: z.url().optional(),
  accessType: z.enum(["free_members", "paid_members", "public_with_member_discount"]),
  priceCents: z.number().int().nonnegative().optional(),
  heroImageUrl: eventImageSchema.optional(),
  galleryImageUrls: z.array(eventImageSchema).max(8).optional()
});

export const eventSchema = eventBaseSchema.superRefine((payload, ctx) => {
  const isPaidEvent = payload.accessType !== "free_members";

  if (isPaidEvent && (!payload.priceCents || payload.priceCents <= 0)) {
    ctx.addIssue({
      code: "custom",
      path: ["priceCents"],
      message: "Eventos pagos exigem priceCents maior que zero"
    });
  }

  if (!isPaidEvent && typeof payload.priceCents === "number" && payload.priceCents > 0) {
    ctx.addIssue({
      code: "custom",
      path: ["priceCents"],
      message: "Eventos gratuitos nao devem ter preco"
    });
  }
});

export const pointsLaunchSchema = z.object({
  memberId: z.uuid(),
  seasonId: z.uuid(),
  eventId: z.string().min(3),
  points: z.number().int().min(1),
  reason: z.string().min(3).max(200)
});

export const seasonSchema = z
  .object({
    name: z.string().min(3).max(80),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime()
  })
  .superRefine((payload, ctx) => {
    const startsAt = new Date(payload.startsAt).getTime();
    const endsAt = new Date(payload.endsAt).getTime();

    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "endsAt deve ser posterior ao startsAt"
      });
    }
  });

export const projectNeedSchema = z.object({
  title: z.string().trim().min(2).max(60),
  description: z.string().trim().min(3).max(180)
});

export const projectDocumentFileSchema = z.object({
  name: z.string().trim().min(1).max(180),
  url: eventImageSchema,
  sizeBytes: z.number().int().positive().max(PROJECT_DOCUMENT_MAX_BYTES),
  contentType: z.enum(PROJECT_DOCUMENT_ACCEPTED_TYPES),
  path: z.string().trim().min(3).max(255).optional()
});

export const projectStatusSchema = z.enum(["active", "completed", "inactive"]);

export const projectStatusUpdateSchema = z.object({
  status: projectStatusSchema
});

export const projectIdeaSchema = z.object({
  title: z.string().trim().min(3).max(80),
  summary: z.string().trim().min(3).max(140),
  businessAreas: z.array(z.string().trim().min(2).max(40)).min(1).max(5),
  vision: z.string().trim().min(20).max(2000),
  needs: z.array(projectNeedSchema).min(1).max(6),
  galleryImageUrls: z.array(eventImageSchema).max(PROJECT_GALLERY_MAX_FILES).default([]),
  documentationFiles: z.array(projectDocumentFileSchema).max(PROJECT_DOCUMENT_MAX_FILES).default([])
});
