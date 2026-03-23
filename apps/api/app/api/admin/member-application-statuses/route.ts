import { memberApplicationStatusCreateSchema } from "@elo/core";
import { requireAuth } from "../../../../lib/auth";
import { fail, ok, parseJson } from "../../../../lib/http";
import {
  createMemberApplicationStatus,
  listMemberApplicationStatuses
} from "../../../../lib/member-applications";

export async function GET(request: Request) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const statuses = await listMemberApplicationStatuses();
    return ok(statuses);
  } catch (error) {
    return fail(`Falha ao listar status de adesão: ${(error as Error).message}`, 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  let payload: unknown;

  try {
    payload = await parseJson<unknown>(request);
  } catch {
    return fail("Payload inválido", 400);
  }

  const parsed = memberApplicationStatusCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload inválido", 422);
  }

  try {
    const status = await createMemberApplicationStatus(parsed.data.label);
    return ok(status, 201);
  } catch (error) {
    const message = (error as Error).message;

    if (message.includes("Já existe")) {
      return fail(message, 409);
    }

    return fail(`Falha ao criar status de adesão: ${message}`, 500);
  }
}
