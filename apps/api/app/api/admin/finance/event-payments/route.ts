import { requireAuth } from "../../../../../lib/auth";
import { fail, ok } from "../../../../../lib/http";
import { listPendingEventPayments } from "../../../../../lib/repositories";

export async function GET(request: Request) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const rows = await listPendingEventPayments(100);
    return ok(rows);
  } catch (error) {
    return fail(`Falha ao listar pagamentos pendentes: ${(error as Error).message}`, 500);
  }
}
