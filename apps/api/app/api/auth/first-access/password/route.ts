import { firstAccessPasswordSchema } from "@elo/core";
import { requireAuth } from "../../../../../lib/auth";
import { fail, ok, parseJson } from "../../../../../lib/http";
import { completeMemberFirstAccess } from "../../../../../lib/member-applications";

export async function POST(request: Request) {
  const auth = await requireAuth(request, ["member"]);
  if (!auth.ok) return auth.response;

  let payload: unknown;

  try {
    payload = await parseJson<unknown>(request);
  } catch {
    return fail("Payload inválido", 400);
  }

  const parsed = firstAccessPasswordSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload inválido", 422);
  }

  try {
    const member = await completeMemberFirstAccess(auth.auth.userId, parsed.data.password);

    return ok({
      member,
      mustChangePassword: false
    });
  } catch (error) {
    const message = (error as Error).message;

    if (message.includes("Membro não encontrado")) {
      return fail(message, 404);
    }

    return fail(`Falha ao concluir primeiro acesso: ${message}`, 500);
  }
}
