import { requireAuth, resolveMemberIdByAuthUser } from "../../../../../../lib/auth";
import { fail, ok } from "../../../../../../lib/http";
import { createElo, getMemberById } from "../../../../../../lib/repositories";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, ["member"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const followerMemberId = await resolveMemberIdByAuthUser(auth.auth.userId);

    if (!followerMemberId) {
      return fail("Usuário autenticado sem vínculo de membro", 403);
    }

    if (followerMemberId === id) {
      return fail("Não é permitido criar elo com o próprio perfil", 422);
    }

    const followedMember = await getMemberById(id);
    if (!followedMember) {
      return fail("Membro alvo não encontrado", 404);
    }
    if (!followedMember.active) {
      return fail("Membro inativo não pode receber elo", 422);
    }

    const result = await createElo(followerMemberId, id);

    return ok({
      message: result.created ? "Elo criado com sucesso" : "Elo ja existente",
      ...result
    });
  } catch (error) {
    return fail(`Falha ao criar elo: ${(error as Error).message}`, 500);
  }
}
