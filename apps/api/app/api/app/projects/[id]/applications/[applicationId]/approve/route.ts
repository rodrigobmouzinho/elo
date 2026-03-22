import { requireAuth, resolveMemberIdByAuthUser } from "../../../../../../../../lib/auth";
import { fail, ok } from "../../../../../../../../lib/http";
import { approveProjectApplication } from "../../../../../../../../lib/repositories";

type RouteContext = {
  params: Promise<{ id: string; applicationId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, ["member"]);
  if (!auth.ok) return auth.response;

  try {
    const memberId = await resolveMemberIdByAuthUser(auth.auth.userId);

    if (!memberId) {
      return fail("Usuario autenticado sem vinculo de membro", 403);
    }

    const { id: projectId, applicationId } = await context.params;
    const application = await approveProjectApplication(projectId, applicationId, memberId);

    return ok(application);
  } catch (error) {
    const errorMessage = (error as Error).message;

    if (
      errorMessage.includes("Projeto nao encontrado") ||
      errorMessage.includes("Candidatura nao encontrada")
    ) {
      return fail(errorMessage, 404);
    }

    if (errorMessage.includes("Somente o dono pode moderar candidaturas")) {
      return fail(errorMessage, 403);
    }

    if (errorMessage.includes("Somente candidaturas pendentes podem ser moderadas")) {
      return fail(errorMessage, 422);
    }

    return fail(`Falha ao aprovar candidatura: ${errorMessage}`, 500);
  }
}
