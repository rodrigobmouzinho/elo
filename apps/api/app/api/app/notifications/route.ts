import { requireAuth, resolveMemberIdByAuthUser } from "../../../../lib/auth";
import { fail, ok } from "../../../../lib/http";
import { listMemberNotifications } from "../../../../lib/repositories";

export async function GET(request: Request) {
  const auth = await requireAuth(request, ["member"]);
  if (!auth.ok) return auth.response;

  try {
    const memberId = await resolveMemberIdByAuthUser(auth.auth.userId);

    if (!memberId) {
      return fail("Usuario autenticado sem vinculo de membro", 403);
    }

    const notifications = await listMemberNotifications(memberId);
    return ok(notifications);
  } catch (error) {
    return fail(`Falha ao listar notificacoes: ${(error as Error).message}`, 500);
  }
}
