import { seasonSchema } from "@elo/core";
import { requireAuth } from "../../../../../lib/auth";
import { fail, ok, parseJson } from "../../../../../lib/http";
import { createSeason, listSeasons } from "../../../../../lib/repositories";

export async function GET(request: Request) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  try {
    return ok(await listSeasons());
  } catch (error) {
    return fail(`Falha ao listar temporadas: ${(error as Error).message}`, 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  let payload: unknown;

  try {
    payload = await parseJson<unknown>(request);
  } catch {
    return fail("Payload inválido", 400);
  }

  const parsed = seasonSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload inválido", 422);
  }

  try {
    const season = await createSeason(parsed.data);
    return ok(season, 201);
  } catch (error) {
    return fail(`Falha ao criar temporada: ${(error as Error).message}`, 500);
  }
}
