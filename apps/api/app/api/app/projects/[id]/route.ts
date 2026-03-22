import { projectIdeaSchema } from "@elo/core";
import { requireAuth, resolveMemberIdByAuthUser } from "../../../../../lib/auth";
import { fail, ok, parseJson } from "../../../../../lib/http";
import { updateProject } from "../../../../../lib/repositories";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, ["member"]);
  if (!auth.ok) return auth.response;

  const payload = await parseJson<unknown>(request);
  const parsed = projectIdeaSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload invalido", 422);
  }

  try {
    const memberId = await resolveMemberIdByAuthUser(auth.auth.userId);

    if (!memberId) {
      return fail("Usuario autenticado sem vinculo de membro", 403);
    }

    const { id: projectId } = await context.params;
    const result = await updateProject(projectId, parsed.data, memberId);

    return ok(result);
  } catch (error) {
    const errorMessage = (error as Error).message;

    if (errorMessage.includes("Projeto nao encontrado")) {
      return fail(errorMessage, 404);
    }

    if (errorMessage.includes("Somente o dono pode editar o projeto")) {
      return fail(errorMessage, 422);
    }

    return fail(`Falha ao atualizar projeto: ${(error as Error).message}`, 500);
  }
}
