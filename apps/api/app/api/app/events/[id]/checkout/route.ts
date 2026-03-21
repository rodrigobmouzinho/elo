import { requireAuth, resolveMemberIdByAuthUser } from "../../../../../../lib/auth";
import { fail, ok } from "../../../../../../lib/http";
import {
  buildManualPaymentRequest,
  readManualPaymentSnapshot
} from "../../../../../../lib/payments/mode";
import {
  createEventPaymentRecord,
  getActiveMembershipByMemberId,
  getEventById,
  getLatestEventPaymentRecord,
  getMemberById
} from "../../../../../../lib/repositories";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth(request, ["member"]);
  if (!auth.ok) return auth.response;

  try {
    const memberId = await resolveMemberIdByAuthUser(auth.auth.userId);

    if (!memberId) {
      return fail("Usuário autenticado sem vínculo de membro", 403);
    }

    const { id: eventId } = await context.params;
    const event = await getEventById(eventId);

    if (!event) {
      return fail("Evento não encontrado", 404);
    }

    if (!event.price_cents || event.price_cents <= 0) {
      return fail("Evento sem cobranca", 400);
    }

    const member = await getMemberById(memberId);

    if (!member) {
      return fail("Membro não encontrado", 404);
    }

    if (!member.active) {
      return fail("Membro inativo não pode realizar checkout", 403);
    }

    const membership = await getActiveMembershipByMemberId(memberId);
    const membershipActive = membership?.status === "active";

    if (event.access_type === "paid_members" && !membershipActive) {
      return fail("Somente membros com anuidade ativa podem pagar este evento", 403);
    }

    const discountPercent = Number(process.env.MEMBER_DISCOUNT_PERCENT ?? "20");
    const amountCents =
      event.access_type === "public_with_member_discount" && membershipActive
        ? Math.round(event.price_cents * (1 - discountPercent / 100))
        : event.price_cents;
    const externalReference = `event:${event.id}:member:${memberId}`;

    const latestPayment = await getLatestEventPaymentRecord(event.id, memberId);

    if (latestPayment?.status === "pending" && latestPayment.gateway === "manual_pix") {
      const gatewayPaymentId = latestPayment.gatewayPaymentId ?? `manual_evt_${crypto.randomUUID()}`;
      const { manualPayment } = await buildManualPaymentRequest({
        amountCents,
        gatewayPaymentId,
        externalReference: latestPayment.externalReference ?? externalReference,
        existingSnapshot: readManualPaymentSnapshot(latestPayment.gatewayPayload)
      });

      return ok({
        eventId: event.id,
        gateway: "manual_pix",
        gatewayPaymentId,
        checkoutUrl: null,
        pixQrCode: manualPayment.pixCopyPaste,
        manualPayment,
        amountCents,
        dueDate: null,
        paymentStatus: "pending",
        reused: true
      });
    }

    if (latestPayment?.status === "paid") {
      return ok({
        eventId: event.id,
        gateway: "manual_pix",
        gatewayPaymentId: latestPayment.gatewayPaymentId,
        checkoutUrl: null,
        pixQrCode: latestPayment.pixQrCode,
        manualPayment: null,
        amountCents,
        dueDate: null,
        paymentStatus: "paid",
        reused: true
      });
    }
    const manualPaymentId = `manual_evt_${crypto.randomUUID()}`;
    const { manualPayment, snapshot } = await buildManualPaymentRequest({
      amountCents,
      gatewayPaymentId: manualPaymentId,
      externalReference
    });

    await createEventPaymentRecord({
      eventId: event.id,
      memberId,
      amountCents,
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
      eventId: event.id,
      gateway: "manual_pix",
      gatewayPaymentId: manualPaymentId,
      checkoutUrl: null,
      pixQrCode: manualPayment.pixCopyPaste,
      manualPayment,
      amountCents,
      dueDate: null,
      paymentStatus: "pending",
      reused: false
    });
  } catch (error) {
    return fail(`Falha ao iniciar checkout: ${(error as Error).message}`, 500);
  }
}
