import { requireAuth, resolveMemberIdByAuthUser } from "../../../../../../lib/auth";
import { fail, ok } from "../../../../../../lib/http";
import { getProjectApplications } from "../../../../../../lib/repositories";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, ["member"]);
  if (!auth.ok) return auth.response;

  try {
    const memberId = await resolveMemberIdByAuthUser(auth.auth.userId);

    if (!memberId) {
      return fail("Usuario autenticado sem vinculo de membro", 403);
    }

    const { id: projectId } = await context.params;
    const applications = await getProjectApplications(projectId, memberId);

    if (!applications) {
      return fail("Projeto nao encontrado", 404);
    }

    return ok(applications);
  } catch (error) {
    const errorMessage = (error as Error).message;

    if (errorMessage.includes("Visualizacao de candidaturas nao permitida")) {
      return fail(errorMessage, 403);
    }

    return fail(`Falha ao buscar candidaturas do projeto: ${errorMessage}`, 500);
  }
}
