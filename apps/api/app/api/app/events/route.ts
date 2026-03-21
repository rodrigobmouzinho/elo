import { requireAuth } from "../../../../lib/auth";
import { fail, ok } from "../../../../lib/http";
import { listEvents } from "../../../../lib/repositories";

export async function GET(request: Request) {
  const auth = await requireAuth(request, ["member"]);
  if (!auth.ok) return auth.response;

  try {
    const events = await listEvents();
    return ok(events);
  } catch (error) {
    return fail(`Falha ao listar eventos: ${(error as Error).message}`, 500);
  }
}
