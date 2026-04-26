import { requireAuth } from "../../../../../../lib/auth";
import {
  disabledGamificationError,
  isGamificationEnabled
} from "../../../../../../lib/gamification-visibility";
import { fail, ok } from "../../../../../../lib/http";
import { processAutomaticBadgesJob } from "../../../../../../lib/repositories";

export async function POST(request: Request) {
  if (!isGamificationEnabled()) {
    const disabled = disabledGamificationError();
    return fail(disabled.message, disabled.status);
  }

  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const result = await processAutomaticBadgesJob();

    return ok({
      message: "Job de badges processado com sucesso",
      ...result
    });
  } catch (error) {
    return fail(`Falha ao processar job de badges: ${(error as Error).message}`, 500);
  }
}
