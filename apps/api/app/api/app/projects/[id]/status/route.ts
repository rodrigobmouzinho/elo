import { projectStatusUpdateSchema } from "@elo/core";
import { requireAuth, resolveMemberIdByAuthUser } from "../../../../../../lib/auth";
import { fail, ok, parseJson } from "../../../../../../lib/http";
import { updateProjectStatus } from "../../../../../../lib/repositories";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, ["member"]);
  if (!auth.ok) return auth.response;

  const payload = await parseJson<unknown>(request);
  const parsed = projectStatusUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload invalido", 422);
  }

  try {
    const memberId = await resolveMemberIdByAuthUser(auth.auth.userId);

    if (!memberId) {
      return fail("Usuario autenticado sem vinculo de membro", 403);
    }

    const { id: projectId } = await context.params;
    const project = await updateProjectStatus(projectId, parsed.data.status, memberId);

    return ok(project);
  } catch (error) {
    const errorMessage = (error as Error).message;

    if (errorMessage.includes("Projeto nao encontrado")) {
      return fail(errorMessage, 404);
    }

    if (
      errorMessage.includes("Somente o dono") ||
      errorMessage.includes("Projeto inativo nao pode ser reaberto")
    ) {
      return fail(errorMessage, 422);
    }

    return fail(`Falha ao atualizar status do projeto: ${(error as Error).message}`, 500);
  }
}
