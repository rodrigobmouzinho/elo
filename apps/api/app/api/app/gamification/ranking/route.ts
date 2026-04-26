import { requireAuth } from "../../../../../lib/auth";
import {
  disabledGamificationError,
  isGamificationEnabled
} from "../../../../../lib/gamification-visibility";
import { fail, ok } from "../../../../../lib/http";
import { getRanking } from "../../../../../lib/repositories";

export async function GET(request: Request) {
  if (!isGamificationEnabled()) {
    const disabled = disabledGamificationError();
    return fail(disabled.message, disabled.status);
  }

  const auth = await requireAuth(request, ["admin", "member"]);
  if (!auth.ok) return auth.response;

  try {
    return ok(await getRanking());
  } catch (error) {
    return fail(`Falha ao consultar ranking: ${(error as Error).message}`, 500);
  }
}
