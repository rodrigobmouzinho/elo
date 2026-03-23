import { z } from "zod";
import { requireAuth, resolveMemberIdByAuthUser } from "../../../../lib/auth";
import {
  brazilCitySchema,
  brazilStateSchema
} from "@elo/core";
import {
  assertBrazilCityBelongsToState,
  BrazilLocationsServiceError,
  BrazilLocationValidationError
} from "../../../../lib/brazil-locations";
import { fail, ok, parseJson } from "../../../../lib/http";
import { getProfile, patchProfile } from "../../../../lib/repositories";

const profilePatchSchema = z.object({
  fullName: z.string().min(3).optional(),
  city: brazilCitySchema.optional(),
  state: brazilStateSchema.optional(),
  area: z.string().min(2).max(40).optional(),
  bio: z.string().max(500).optional(),
  specialty: z.string().max(120).optional(),
  avatarUrl: z.url().optional()
});

export async function GET(request: Request) {
  const auth = await requireAuth(request, ["member"]);
  if (!auth.ok) return auth.response;

  try {
    const memberId = await resolveMemberIdByAuthUser(auth.auth.userId);

    if (!memberId) {
      return fail("Usuário autenticado sem vínculo de membro", 403);
    }

    const profile = await getProfile(memberId);
    return ok(profile);
  } catch (error) {
    return fail(`Falha ao buscar perfil: ${(error as Error).message}`, 500);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuth(request, ["member"]);
  if (!auth.ok) return auth.response;

  const payload = await parseJson<unknown>(request);
  const parsed = profilePatchSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload inválido", 422);
  }

  try {
    const memberId = await resolveMemberIdByAuthUser(auth.auth.userId);

    if (!memberId) {
      return fail("Usuário autenticado sem vínculo de membro", 403);
    }

    if (parsed.data.city !== undefined && parsed.data.state !== undefined) {
      await assertBrazilCityBelongsToState(parsed.data.state, parsed.data.city);
    }

    const profile = await patchProfile(memberId, parsed.data);
    return ok(profile);
  } catch (error) {
    if (error instanceof BrazilLocationValidationError) {
      return fail(error.message, 422);
    }

    if (error instanceof BrazilLocationsServiceError) {
      return fail(error.message, 503);
    }

    return fail(`Falha ao atualizar perfil: ${(error as Error).message}`, 500);
  }
}
