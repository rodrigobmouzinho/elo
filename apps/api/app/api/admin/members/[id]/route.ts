import { memberSchema } from "@elo/core";
import { z } from "zod";
import { requireAuth } from "../../../../../lib/auth";
import {
  assertBrazilCityBelongsToState,
  BrazilLocationsServiceError,
  BrazilLocationValidationError
} from "../../../../../lib/brazil-locations";
import { fail, ok, parseJson } from "../../../../../lib/http";
import { setMemberActive, updateMember } from "../../../../../lib/repositories";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const memberPatchSchema = memberSchema
  .omit({ membershipExpiresAt: true })
  .partial()
  .extend({
    active: z.boolean().optional()
  })
  .refine((payload) => Object.values(payload).some((value) => value !== undefined), {
    message: "Informe ao menos um campo para atualizar"
  });

function mapMemberError(error: unknown, fallbackMessage: string) {
  const code = (error as { code?: string })?.code;
  const message = (error as { message?: string })?.message ?? "erro desconhecido";

  if (code === "23505") {
    return fail("Ja existe membro com este e-mail", 409);
  }

  if (code === "22P02") {
    return fail("Identificador de membro inválido", 400);
  }

  return fail(`${fallbackMessage}: ${message}`, 500);
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

  const parsed = memberPatchSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload inválido", 422);
  }

  try {
    if (parsed.data.city !== undefined && parsed.data.state !== undefined) {
      await assertBrazilCityBelongsToState(parsed.data.state, parsed.data.city);
    }

    const updated = await updateMember(id, parsed.data);

    if (!updated) {
      return fail("Membro não encontrado", 404);
    }

    return ok(updated);
  } catch (error) {
    if (error instanceof BrazilLocationValidationError) {
      return fail(error.message, 422);
    }

    if (error instanceof BrazilLocationsServiceError) {
      return fail(error.message, 503);
    }

    return mapMemberError(error, "Falha ao atualizar membro");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAuth(_request, ["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const updated = await setMemberActive(id, false);

    if (!updated) {
      return fail("Membro não encontrado", 404);
    }

    return ok({
      message: "Membro inativado com sucesso",
      member: updated
    });
  } catch (error) {
    return mapMemberError(error, "Falha ao inativar membro");
  }
}
