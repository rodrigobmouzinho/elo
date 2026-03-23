import { z } from "zod";
import {
  PROJECT_DOCUMENT_ACCEPTED_TYPES,
  PROJECT_DOCUMENT_MAX_BYTES,
  PROJECT_DOCUMENT_MAX_FILES,
  PROJECT_GALLERY_MAX_FILES
} from "./constants";
import {
  formatBrazilianPhoneInput,
  isBrazilStateCode,
  isValidBrazilianMobile,
  isValidBrazilianPhone,
  normalizeBrazilianPhone
} from "./brazil";

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

export const strongPasswordSchema = z
  .string()
  .min(10, "A senha precisa ter ao menos 10 caracteres")
  .max(72, "A senha deve ter no maximo 72 caracteres")
  .regex(/[a-z]/, "A senha precisa ter ao menos uma letra minuscula")
  .regex(/[A-Z]/, "A senha precisa ter ao menos uma letra maiuscula")
  .regex(/[0-9]/, "A senha precisa ter ao menos um numero")
  .regex(/[^A-Za-z0-9]/, "A senha precisa ter ao menos um caractere especial");

export const firstAccessPasswordSchema = z.object({
  password: strongPasswordSchema
});

const eventImageSchema = z
  .string()
  .trim()
  .refine((value) => isAssetUrl(value), {
    message: "URL de arquivo deve ser valida, data URL ou caminho local iniciado com /"
  });

export const brazilStateSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => isBrazilStateCode(value), {
    message: "Selecione uma UF válida"
  });

export const brazilCitySchema = z
  .string()
  .trim()
  .min(2, "Selecione uma cidade")
  .max(80, "Selecione uma cidade válida");

export const brazilPhoneSchema = z
  .string()
  .trim()
  .transform((value) => normalizeBrazilianPhone(value))
  .refine((value) => isValidBrazilianPhone(value), {
    message: `Informe um celular válido, como ${formatBrazilianPhoneInput("11912345678")}`
  });

export const brazilWhatsappSchema = z
  .string()
  .trim()
  .transform((value) => normalizeBrazilianPhone(value))
  .refine((value) => isValidBrazilianMobile(value), {
    message: `Informe um WhatsApp válido, como ${formatBrazilianPhoneInput("11912345678")}`
  });

const optionalTrimmedString = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    schema.optional()
  );

export const memberSchema = z.object({
  fullName: z.string().min(3),
  email: z.email(),
  phone: brazilPhoneSchema,
  whatsapp: brazilWhatsappSchema,
  city: brazilCitySchema,
  state: brazilStateSchema,
  area: z.string().min(2).max(40),
  bio: z.string().max(500).optional(),
  specialty: z.string().max(120).optional(),
  membershipExpiresAt: z.string().datetime()
});

export const memberApplicationSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: z.email(),
  phone: optionalTrimmedString(brazilPhoneSchema),
  whatsapp: brazilWhatsappSchema,
  city: brazilCitySchema,
  state: brazilStateSchema,
  area: z.string().trim().min(2).max(40),
  bio: z.string().trim().max(500).optional(),
  specialty: z.string().trim().max(120).optional(),
  avatarUrl: z.url().optional()
});

export const memberApplicationStatusCreateSchema = z.object({
  label: z.string().trim().min(3).max(50)
});

export const memberApplicationUpdateSchema = z
  .object({
    statusId: z.uuid().optional(),
    internalNotes: z.string().trim().max(1000).optional()
  })
  .refine((payload) => payload.statusId !== undefined || payload.internalNotes !== undefined, {
    message: "Informe ao menos um campo para atualizar"
  });

export const memberApplicationApproveSchema = z.object({
  membershipExpiresAt: z.string().datetime(),
  internalNotes: z.string().trim().max(1000).optional()
});

export const memberApplicationRejectSchema = z.object({
  reason: z.string().trim().min(3).max(500),
  internalNotes: z.string().trim().max(1000).optional()
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
