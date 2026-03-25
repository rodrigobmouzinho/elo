import { requireAuth, resolveMemberPasswordStateByAuthUser } from "../../../../lib/auth";
import { fail, ok } from "../../../../lib/http";
import { getMemberById } from "../../../../lib/repositories";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const passwordState = await resolveMemberPasswordStateByAuthUser(auth.auth.userId);
    const memberProfile = passwordState.memberId ? await getMemberById(passwordState.memberId) : null;

    return ok({
      userId: auth.auth.userId,
      email: auth.auth.email,
      role: auth.auth.role,
      memberId: passwordState.memberId,
      displayName: memberProfile?.fullName ?? (auth.auth.role === "admin" ? "Admin Elo" : "Membro Elo"),
      avatarUrl: memberProfile?.avatarUrl ?? null,
      mustChangePassword: passwordState.mustChangePassword
    });
  } catch (error) {
    return fail(`Falha ao consultar sessão: ${(error as Error).message}`, 500);
  }
}
