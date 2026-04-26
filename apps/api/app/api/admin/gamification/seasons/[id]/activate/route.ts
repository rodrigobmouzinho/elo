import { requireAuth } from "../../../../../../../lib/auth";
import {
  disabledGamificationError,
  isGamificationEnabled
} from "../../../../../../../lib/gamification-visibility";
import { fail, ok } from "../../../../../../../lib/http";
import { activateSeason } from "../../../../../../../lib/repositories";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  if (!isGamificationEnabled()) {
    const disabled = disabledGamificationError();
    return fail(disabled.message, disabled.status);
  }

  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const season = await activateSeason(id);

    if (!season) {
      return fail("Temporada não encontrada", 404);
    }

    return ok({
      message: "Temporada ativada com sucesso",
      season
    });
  } catch (error) {
    return fail(`Falha ao ativar temporada: ${(error as Error).message}`, 500);
  }
}
