import { requireAuth } from "../../../../lib/auth";
import { fail, ok } from "../../../../lib/http";
import {
  listMemberApplications,
  listMemberApplicationStatuses
} from "../../../../lib/member-applications";

export async function GET(request: Request) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const [items, statuses] = await Promise.all([
      listMemberApplications(),
      listMemberApplicationStatuses()
    ]);

    return ok({
      items,
      statuses
    });
  } catch (error) {
    return fail(`Falha ao listar solicitacoes de adesao: ${(error as Error).message}`, 500);
  }
}
