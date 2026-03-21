import { requireAuth, resolveMemberIdByAuthUser } from "../../../../lib/auth";
import { fail, ok } from "../../../../lib/http";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const memberId = await resolveMemberIdByAuthUser(auth.auth.userId);

    return ok({
      userId: auth.auth.userId,
      email: auth.auth.email,
      role: auth.auth.role,
      memberId
    });
  } catch (error) {
    return fail(`Falha ao consultar sessão: ${(error as Error).message}`, 500);
  }
}
