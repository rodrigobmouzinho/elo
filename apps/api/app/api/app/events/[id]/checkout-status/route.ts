import { requireAuth, resolveMemberIdByAuthUser } from "../../../../../../lib/auth";
import { fail, ok } from "../../../../../../lib/http";
import { getEventById, getEventCheckoutStatus } from "../../../../../../lib/repositories";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, ["member"]);
  if (!auth.ok) return auth.response;

  try {
    const memberId = await resolveMemberIdByAuthUser(auth.auth.userId);

    if (!memberId) {
      return fail("Usuário autenticado sem vínculo de membro", 403);
    }

    const { id: eventId } = await context.params;
    const event = await getEventById(eventId);

    if (!event) {
      return fail("Evento não encontrado", 404);
    }

    const status = await getEventCheckoutStatus(eventId, memberId);

    return ok({
      eventId,
      ...status
    });
  } catch (error) {
    return fail(`Falha ao consultar status do checkout: ${(error as Error).message}`, 500);
  }
}
