import { memberApplicationStatusCreateSchema } from "@elo/core";
import { requireAuth } from "../../../../lib/auth";
import { fail, ok, parseJson } from "../../../../lib/http";
import {
  createMemberApplicationStatus,
  listMemberApplicationStatuses,
  MemberApplicationsSchemaNotReadyError,
  normalizeMemberApplicationsError
} from "../../../../lib/member-applications";

export async function GET(request: Request) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const statuses = await listMemberApplicationStatuses();
    return ok(statuses);
  } catch (error) {
    const normalizedError = normalizeMemberApplicationsError(error);
    const status = normalizedError instanceof MemberApplicationsSchemaNotReadyError ? 503 : 500;
    return fail(`Falha ao listar status de adesao: ${normalizedError.message}`, status);
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  let payload: unknown;

  try {
    payload = await parseJson<unknown>(request);
  } catch {
    return fail("Payload inv\u00e1lido", 400);
  }

  const parsed = memberApplicationStatusCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload inv\u00e1lido", 422);
  }

  try {
    const status = await createMemberApplicationStatus(parsed.data.label);
    return ok(status, 201);
  } catch (error) {
    const normalizedError = normalizeMemberApplicationsError(error);
    const message = normalizedError.message;

    if (normalizedError instanceof MemberApplicationsSchemaNotReadyError) {
      return fail(message, 503);
    }

    if (message.includes("Ja existe")) {
      return fail(message, 409);
    }

    return fail(`Falha ao criar status de adesao: ${message}`, 500);
  }
}
