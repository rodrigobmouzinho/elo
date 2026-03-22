import { memberApplicationRejectSchema } from "@elo/core";
import { requireAuth } from "../../../../../../lib/auth";
import { fail, ok, parseJson } from "../../../../../../lib/http";
import { rejectMemberApplication } from "../../../../../../lib/member-applications";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  let payload: unknown;

  try {
    payload = await parseJson<unknown>(request);
  } catch {
    return fail("Payload invalido", 400);
  }

  const parsed = memberApplicationRejectSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload invalido", 422);
  }

  try {
    const { id } = await context.params;
    const application = await rejectMemberApplication(id, {
      actorUserId: auth.auth.userId,
      reason: parsed.data.reason,
      internalNotes: parsed.data.internalNotes
    });

    return ok(application);
  } catch (error) {
    const message = (error as Error).message;

    if (message.includes("Solicitacao nao encontrada")) {
      return fail(message, 404);
    }

    if (message.includes("Solicitacao ja finalizada")) {
      return fail(message, 422);
    }

    return fail(`Falha ao recusar solicitacao: ${message}`, 500);
  }
}
