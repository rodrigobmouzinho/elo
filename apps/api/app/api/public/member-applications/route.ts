import { memberApplicationSchema } from "@elo/core";
import { fail, ok, parseJson } from "../../../../lib/http";
import { createPublicMemberApplication } from "../../../../lib/member-applications";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await parseJson<unknown>(request);
  } catch {
    return fail("Payload invalido", 400);
  }

  const parsed = memberApplicationSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload invalido", 422);
  }

  try {
    const application = await createPublicMemberApplication(parsed.data);
    return ok(application, 201);
  } catch (error) {
    const message = (error as Error).message;

    if (
      message.includes("Ja existe um membro") ||
      message.includes("Ja existe uma solicitacao em andamento")
    ) {
      return fail(message, 409);
    }

    return fail(`Falha ao registrar solicitacao: ${message}`, 500);
  }
}
