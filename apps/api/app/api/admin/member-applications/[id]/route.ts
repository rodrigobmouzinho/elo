import { memberApplicationUpdateSchema } from "@elo/core";
import { requireAuth } from "../../../../../lib/auth";
import { fail, ok, parseJson } from "../../../../../lib/http";
import {
  getMemberApplicationById,
  MemberApplicationsSchemaNotReadyError,
  normalizeMemberApplicationsError,
  updateMemberApplication
} from "../../../../../lib/member-applications";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const application = await getMemberApplicationById(id);

    if (!application) {
      return fail("Solicitacao nao encontrada", 404);
    }

    return ok(application);
  } catch (error) {
    const normalizedError = normalizeMemberApplicationsError(error);
    const status = normalizedError instanceof MemberApplicationsSchemaNotReadyError ? 503 : 500;
    return fail(`Falha ao carregar solicitacao: ${normalizedError.message}`, status);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  let payload: unknown;

  try {
    payload = await parseJson<unknown>(request);
  } catch {
    return fail("Payload inv\u00e1lido", 400);
  }

  const parsed = memberApplicationUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload inv\u00e1lido", 422);
  }

  try {
    const { id } = await context.params;
    const application = await updateMemberApplication(id, auth.auth.userId, parsed.data);

    return ok(application);
  } catch (error) {
    const normalizedError = normalizeMemberApplicationsError(error);
    const message = normalizedError.message;

    if (normalizedError instanceof MemberApplicationsSchemaNotReadyError) {
      return fail(message, 503);
    }

    if (message.includes("Solicitacao nao encontrada")) {
      return fail(message, 404);
    }

    if (
      message.includes("Status informado nao encontrado") ||
      message.includes("Use as acoes finais") ||
      message.includes("Solicitacoes finalizadas")
    ) {
      return fail(message, 422);
    }

    return fail(`Falha ao atualizar solicitacao: ${message}`, 500);
  }
}
