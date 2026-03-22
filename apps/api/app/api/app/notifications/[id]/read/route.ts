import { requireAuth, resolveMemberIdByAuthUser } from "../../../../../../lib/auth";
import { fail, ok } from "../../../../../../lib/http";
import { markMemberNotificationRead } from "../../../../../../lib/repositories";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, ["member"]);
  if (!auth.ok) return auth.response;

  try {
    const memberId = await resolveMemberIdByAuthUser(auth.auth.userId);

    if (!memberId) {
      return fail("Usuario autenticado sem vinculo de membro", 403);
    }

    const { id: notificationId } = await context.params;
    const notification = await markMemberNotificationRead(notificationId, memberId);

    if (!notification) {
      return fail("Notificacao nao encontrada", 404);
    }

    return ok(notification);
  } catch (error) {
    return fail(`Falha ao marcar notificacao como lida: ${(error as Error).message}`, 500);
  }
}
