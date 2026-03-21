import { z } from "zod";
import { requireAuth, resolveMemberIdByAuthUser } from "../../../../../../lib/auth";
import { fail, ok, parseJson } from "../../../../../../lib/http";
import { applyToProject } from "../../../../../../lib/repositories";

const applySchema = z.object({
  message: z.string().max(500).optional()
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, ["member"]);
  if (!auth.ok) return auth.response;

  const payload = await parseJson<unknown>(request);
  const parsed = applySchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload inválido", 422);
  }

  try {
    const memberId = await resolveMemberIdByAuthUser(auth.auth.userId);

    if (!memberId) {
      return fail("Usuário autenticado sem vínculo de membro", 403);
    }

    const { id: projectId } = await context.params;
    const result = await applyToProject(projectId, memberId, parsed.data.message);

    return ok({
      message: result.created ? "Candidatura enviada" : "Candidatura ja enviada",
      application: result
    });
  } catch (error) {
    const errorMessage = (error as Error).message;

    if (errorMessage.includes("Projeto não encontrado")) {
      return fail(errorMessage, 404);
    }

    if (errorMessage.includes("próprio projeto")) {
      return fail(errorMessage, 422);
    }

    return fail(`Falha ao candidatar no projeto: ${(error as Error).message}`, 500);
  }
}
