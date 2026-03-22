import { z } from "zod";
import { requireAuth, resolveMemberIdByAuthUser } from "../../../../../../../../lib/auth";
import { fail, ok, parseJson } from "../../../../../../../../lib/http";
import { rejectProjectApplication } from "../../../../../../../../lib/repositories";

const rejectSchema = z.object({
  reason: z.string().trim().min(1).max(500)
});

type RouteContext = {
  params: Promise<{ id: string; applicationId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, ["member"]);
  if (!auth.ok) return auth.response;

  const payload = await parseJson<unknown>(request);
  const parsed = rejectSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload invalido", 422);
  }

  try {
    const memberId = await resolveMemberIdByAuthUser(auth.auth.userId);

    if (!memberId) {
      return fail("Usuario autenticado sem vinculo de membro", 403);
    }

    const { id: projectId, applicationId } = await context.params;
    const application = await rejectProjectApplication(
      projectId,
      applicationId,
      memberId,
      parsed.data.reason
    );

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

    if (
      errorMessage.includes("Somente candidaturas pendentes podem ser moderadas") ||
      errorMessage.includes("Justificativa obrigatoria")
    ) {
      return fail(errorMessage, 422);
    }

    return fail(`Falha ao recusar candidatura: ${errorMessage}`, 500);
  }
}
