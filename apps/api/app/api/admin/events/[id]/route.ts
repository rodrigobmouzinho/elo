import { eventBaseSchema, eventSchema } from "@elo/core";
import { requireAuth } from "../../../../../lib/auth";
import { deleteEvent, getEventById, updateEvent } from "../../../../../lib/repositories";
import { fail, ok, parseJson } from "../../../../../lib/http";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const eventPatchSchema = eventBaseSchema.partial().refine((payload) => Object.keys(payload).length > 0, {
  message: "Informe ao menos um campo para atualizar"
});

function mapEventError(error: unknown, fallbackMessage: string) {
  const code = (error as { code?: string })?.code;
  const message = (error as { message?: string })?.message ?? "erro desconhecido";

  if (code === "22P02") {
    return fail("Identificador de evento inválido", 400);
  }

  return fail(`${fallbackMessage}: ${message}`, 500);
}

function toEventPayload(rawEvent: Record<string, unknown>) {
  const startsAt = String(rawEvent.starts_at ?? rawEvent.startsAt ?? "");
  const endsAt = (rawEvent.ends_at ?? rawEvent.endsAt ?? undefined) as string | undefined;
  const onlineUrl = (rawEvent.online_url ?? rawEvent.onlineUrl ?? undefined) as string | undefined;
  const accessType = (rawEvent.access_type ??
    rawEvent.accessType ??
    "free_members") as "free_members" | "paid_members" | "public_with_member_discount";
  const priceCents = (rawEvent.price_cents ?? rawEvent.priceCents ?? undefined) as number | undefined;
  const heroImageUrl = (rawEvent.hero_image_url ?? rawEvent.heroImageUrl ?? "/event-placeholder.svg") as string;
  const gallerySource = (rawEvent.gallery_image_urls ??
    rawEvent.galleryImageUrls ??
    []) as unknown;
  const galleryImageUrls = Array.isArray(gallerySource) ? gallerySource.map((item) => String(item)) : [];

  return {
    id: String(rawEvent.id),
    title: String(rawEvent.title),
    description: String(rawEvent.description ?? rawEvent.summary ?? ""),
    startsAt,
    endsAt,
    location: String(rawEvent.location),
    onlineUrl,
    accessType,
    priceCents,
    heroImageUrl,
    galleryImageUrls
  };
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const event = await getEventById(id);

    if (!event) {
      return fail("Evento não encontrado", 404);
    }

    return ok(toEventPayload(event as Record<string, unknown>));
  } catch (error) {
    return mapEventError(error, "Falha ao carregar evento");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  let payload: unknown;

  try {
    payload = await parseJson<unknown>(request);
  } catch {
    return fail("Payload inválido", 400);
  }

  const parsedPatch = eventPatchSchema.safeParse(payload);

  if (!parsedPatch.success) {
    return fail(parsedPatch.error.issues[0]?.message ?? "Payload inválido", 422);
  }

  try {
    const existing = await getEventById(id);

    if (!existing) {
      return fail("Evento não encontrado", 404);
    }

    const currentPayload = toEventPayload(existing as Record<string, unknown>);
    const mergedPayload = {
      title: currentPayload.title,
      description: currentPayload.description,
      startsAt: currentPayload.startsAt,
      endsAt: currentPayload.endsAt,
      location: currentPayload.location,
      onlineUrl: currentPayload.onlineUrl,
      accessType: currentPayload.accessType,
      priceCents: currentPayload.priceCents,
      heroImageUrl: currentPayload.heroImageUrl,
      galleryImageUrls: currentPayload.galleryImageUrls,
      ...parsedPatch.data
    };

    if (mergedPayload.accessType === "free_members") {
      mergedPayload.priceCents = undefined;
    }

    const parsedMerged = eventSchema.safeParse(mergedPayload);

    if (!parsedMerged.success) {
      return fail(parsedMerged.error.issues[0]?.message ?? "Payload inválido", 422);
    }

    const updated = await updateEvent(id, parsedPatch.data);

    if (!updated) {
      return fail("Evento não encontrado", 404);
    }

    return ok(updated);
  } catch (error) {
    return mapEventError(error, "Falha ao atualizar evento");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const removed = await deleteEvent(id);

    if (!removed) {
      return fail("Evento não encontrado", 404);
    }

    return ok({ message: "Evento removido com sucesso" });
  } catch (error) {
    return mapEventError(error, "Falha ao remover evento");
  }
}
