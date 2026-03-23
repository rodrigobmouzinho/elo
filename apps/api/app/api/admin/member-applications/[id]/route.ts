import { memberApplicationUpdateSchema } from "@elo/core";
import { requireAuth } from "../../../../../lib/auth";
import { fail, ok, parseJson } from "../../../../../lib/http";
import {
  getMemberApplicationById,
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
      return fail("Solicitação não encontrada", 404);
    }

    return ok(application);
  } catch (error) {
    return fail(`Falha ao carregar solicitação: ${(error as Error).message}`, 500);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  let payload: unknown;

  try {
    payload = await parseJson<unknown>(request);
  } catch {
    return fail("Payload inválido", 400);
  }

  const parsed = memberApplicationUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload inválido", 422);
  }

  try {
    const { id } = await context.params;
    const application = await updateMemberApplication(id, auth.auth.userId, parsed.data);

    return ok(application);
  } catch (error) {
    const message = (error as Error).message;

    if (message.includes("Solicitação não encontrada")) {
      return fail(message, 404);
    }

    if (
      message.includes("Status informado não encontrado") ||
      message.includes("Use as ações finais") ||
      message.includes("Solicitações finalizadas")
    ) {
      return fail(message, 422);
    }

    return fail(`Falha ao atualizar solicitação: ${message}`, 500);
  }
}
