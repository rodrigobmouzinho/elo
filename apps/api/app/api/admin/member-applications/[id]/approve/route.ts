import { memberApplicationApproveSchema } from "@elo/core";
import { requireAuth } from "../../../../../../lib/auth";
import { fail, ok, parseJson } from "../../../../../../lib/http";
import {
  approveMemberApplication,
  MemberApplicationsSchemaNotReadyError,
  normalizeMemberApplicationsError
} from "../../../../../../lib/member-applications";

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
    return fail("Payload inv\u00e1lido", 400);
  }

  const parsed = memberApplicationApproveSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload inv\u00e1lido", 422);
  }

  try {
    const { id } = await context.params;
    const result = await approveMemberApplication(id, {
      actorUserId: auth.auth.userId,
      membershipExpiresAt: parsed.data.membershipExpiresAt,
      internalNotes: parsed.data.internalNotes
    });

    return ok(result);
  } catch (error) {
    const normalizedError = normalizeMemberApplicationsError(error);
    const message = normalizedError.message;

    if (normalizedError instanceof MemberApplicationsSchemaNotReadyError) {
      return fail(message, 503);
    }

    if (message.includes("Solicitacao nao encontrada")) {
      return fail(message, 404);
    }

    if (message.includes("Solicitacao ja finalizada")) {
      return fail(message, 422);
    }

    return fail(`Falha ao aprovar solicitacao: ${message}`, 500);
  }
}
