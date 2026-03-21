import { z } from "zod";
import { requireAuth } from "../../../../../../../lib/auth";
import { fail, ok, parseJson } from "../../../../../../../lib/http";
import {
  buildManualPaymentRequest
} from "../../../../../../../lib/payments/mode";
import {
  createMembershipPaymentRecord,
  getMemberById,
  getMembershipById
} from "../../../../../../../lib/repositories";

const chargeSchema = z.object({
  amountCents: z.number().int().positive()
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const payload = await parseJson<unknown>(request);
  const parsed = chargeSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload inválido", 422);
  }

  try {
    const membership = await getMembershipById(id);

    if (!membership) {
      return fail("Anuidade não encontrada", 404);
    }

    const member = await getMemberById(membership.member_id);

    if (!member) {
      return fail("Membro da anuidade não encontrado", 404);
    }

    const externalReference = `membership:${membership.id}:member:${membership.member_id}`;
    const manualPaymentId = `manual_mem_${crypto.randomUUID()}`;
    const { manualPayment, snapshot } = await buildManualPaymentRequest({
      amountCents: parsed.data.amountCents,
      gatewayPaymentId: manualPaymentId,
      externalReference
    });

    await createMembershipPaymentRecord({
      membershipId: membership.id,
      amountCents: parsed.data.amountCents,
      gateway: "manual_pix",
      gatewayPaymentId: manualPaymentId,
      externalReference,
      checkoutUrl: null,
      pixQrCode: manualPayment.pixCopyPaste,
      status: "pending",
      gatewayPayload: {
        source: "manual_pix",
        paymentRequest: snapshot,
        createdAt: new Date().toISOString()
      }
    });

    return ok({
      membershipId: membership.id,
      gateway: "manual_pix",
      gatewayPaymentId: manualPaymentId,
      checkoutUrl: null,
      pixQrCode: manualPayment.pixCopyPaste,
      manualPayment,
      dueDate: null,
      value: Number((parsed.data.amountCents / 100).toFixed(2)),
      paymentStatus: "pending"
    });
  } catch (error) {
    return fail(`Falha ao gerar cobranca: ${(error as Error).message}`, 500);
  }
}
