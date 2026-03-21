import { requireAuth } from "../../../../../lib/auth";
import { fail, ok } from "../../../../../lib/http";
import { listMembershipFinanceRows } from "../../../../../lib/repositories";

export async function GET(request: Request) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const rows = await listMembershipFinanceRows();
    return ok(rows);
  } catch (error) {
    return fail(`Falha ao listar anuidades: ${(error as Error).message}`, 500);
  }
}
