import { pointsLaunchSchema } from "@elo/core";
import { requireAuth } from "../../../../../lib/auth";
import { fail, ok, parseJson } from "../../../../../lib/http";
import {
  getEventById,
  isEventParticipationValidated,
  launchPoints
} from "../../../../../lib/repositories";

export async function POST(request: Request) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  const payload = await parseJson<unknown>(request);
  const parsed = pointsLaunchSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload inválido", 422);
  }

  try {
    const event = await getEventById(parsed.data.eventId);

    if (!event) {
      return fail("Evento informado não encontrado", 404);
    }

    const participationValidated = await isEventParticipationValidated(
      parsed.data.eventId,
      parsed.data.memberId
    );

    if (!participationValidated) {
      return fail("Participação ainda não validada para este membro no evento informado", 422);
    }

    const launched = await launchPoints(parsed.data);

    return ok({
      message: "Pontuação registrada com sucesso",
      launched
    });
  } catch (error) {
    return fail(`Falha ao registrar pontuação: ${(error as Error).message}`, 500);
  }
}
