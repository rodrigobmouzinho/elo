import { memberApplicationSchema } from "@elo/core";
import {
  assertBrazilCityBelongsToState,
  BrazilLocationsServiceError,
  BrazilLocationValidationError
} from "../../../../lib/brazil-locations";
import { fail, ok, parseJson } from "../../../../lib/http";
import {
  createPublicMemberApplication,
  MemberApplicationsSchemaNotReadyError,
  normalizeMemberApplicationsError
} from "../../../../lib/member-applications";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await parseJson<unknown>(request);
  } catch {
    return fail("Payload inv\u00e1lido", 400);
  }

  const parsed = memberApplicationSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload inv\u00e1lido", 422);
  }

  try {
    await assertBrazilCityBelongsToState(parsed.data.state, parsed.data.city);
  } catch (error) {
    if (error instanceof BrazilLocationValidationError) {
      return fail(error.message, 422);
    }

    if (error instanceof BrazilLocationsServiceError) {
      return fail(error.message, 503);
    }

    return fail(`Falha ao validar cidade e UF: ${(error as Error).message}`, 500);
  }

  try {
    const application = await createPublicMemberApplication(parsed.data);
    return ok(application, 201);
  } catch (error) {
    const normalizedError = normalizeMemberApplicationsError(error);
    const message = normalizedError.message;

    if (normalizedError instanceof MemberApplicationsSchemaNotReadyError) {
      return fail(message, 503);
    }

    if (
      message.includes("Ja existe um membro") ||
      message.includes("Ja existe uma solicitacao em andamento")
    ) {
      return fail(message, 409);
    }

    return fail(`Falha ao registrar solicitacao: ${message}`, 500);
  }
}
