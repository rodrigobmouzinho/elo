import { eventSchema } from "@elo/core";
import { requireAuth } from "../../../../lib/auth";
import { fail, ok, parseJson } from "../../../../lib/http";
import { createEvent, listEvents } from "../../../../lib/repositories";

function mapEventError(error: unknown, fallbackMessage: string) {
  const code = (error as { code?: string })?.code;
  const message = (error as { message?: string })?.message ?? "erro desconhecido";

  if (code === "22P02") {
    return fail("Identificador de evento inválido", 400);
  }

  return fail(`${fallbackMessage}: ${message}`, 500);
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const data = await listEvents();
    return ok(data);
  } catch (error) {
    return fail(`Falha ao listar eventos: ${(error as Error).message}`, 500);
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

  const parsed = eventSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload inválido", 422);
  }

  try {
    const record = await createEvent(parsed.data);
    return ok(record, 201);
  } catch (error) {
    return mapEventError(error, "Falha ao criar evento");
  }
}
