import { z } from "zod";
import { requireAuth } from "../../../../../../../lib/auth";
import { fail, ok, parseJson } from "../../../../../../../lib/http";
import { approveLatestMembershipPayment } from "../../../../../../../lib/repositories";

const approveSchema = z.object({
  note: z.string().trim().max(500).optional()
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  const { id: membershipId } = await context.params;

  let payload: unknown = {};

  try {
    payload = await parseJson<unknown>(request);
  } catch {
    payload = {};
  }

  const parsed = approveSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload inválido", 422);
  }

  try {
    const approval = await approveLatestMembershipPayment(membershipId, {
      approvedBy: auth.auth.userId,
      note: parsed.data.note ?? null
    });

    if (!approval) {
      return fail("Não existe pagamento pendente para esta anuidade", 404);
    }

    return ok(approval);
  } catch (error) {
    return fail(`Falha ao aprovar anuidade manualmente: ${(error as Error).message}`, 500);
  }
}
