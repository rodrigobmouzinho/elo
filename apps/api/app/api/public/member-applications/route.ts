import { memberApplicationSchema } from "@elo/core";
import {
  assertBrazilCityBelongsToState,
  BrazilLocationsServiceError,
  BrazilLocationValidationError
} from "../../../../lib/brazil-locations";
import { fail, ok, parseJson } from "../../../../lib/http";
import { createPublicMemberApplication } from "../../../../lib/member-applications";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await parseJson<unknown>(request);
  } catch {
    return fail("Payload inválido", 400);
  }

  const parsed = memberApplicationSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload inválido", 422);
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
    const message = (error as Error).message;

    if (
      message.includes("Já existe um membro") ||
      message.includes("Já existe uma solicitação em andamento")
    ) {
      return fail(message, 409);
    }

    return fail(`Falha ao registrar solicitação: ${message}`, 500);
  }
}
