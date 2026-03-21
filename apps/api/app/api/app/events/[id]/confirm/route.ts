import { requireAuth, resolveMemberIdByAuthUser } from "../../../../../../lib/auth";
import { fail, ok } from "../../../../../../lib/http";
import { confirmPresence, getEventById, getMemberById } from "../../../../../../lib/repositories";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, ["member"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const memberId = await resolveMemberIdByAuthUser(auth.auth.userId);

    if (!memberId) {
      return fail("Usuário autenticado sem vínculo de membro", 403);
    }

    const member = await getMemberById(memberId);

    if (!member) {
      return fail("Membro não encontrado", 404);
    }

    if (!member.active) {
      return fail("Membro inativo não pode confirmar presença", 403);
    }

    const event = await getEventById(id);

    if (!event) {
      return fail("Evento não encontrado", 404);
    }

    if (event.access_type !== "free_members" && Number(event.price_cents ?? 0) > 0) {
      return fail("Este evento exige pagamento. Use o checkout.", 402);
    }

    const result = await confirmPresence(id, memberId);

    return ok({
      message: "Presença confirmada",
      ...result
    });
  } catch (error) {
    return fail(`Falha ao confirmar presença: ${(error as Error).message}`, 500);
  }
}
