import { beforeEach, describe, expect, it } from "vitest";
import {
  buildManualPaymentRequest,
  readManualPaymentSnapshot
} from "../../lib/payments/mode";

describe("manual pix payment builder", () => {
  beforeEach(() => {
    process.env.MANUAL_PIX_KEY = "financeiro@elonetworking.com";
    process.env.MANUAL_PIX_KEY_TYPE = "email";
    process.env.MANUAL_PIX_BENEFICIARY = "Elo Networking";
    process.env.MANUAL_PIX_CITY = "Fortaleza";
    process.env.MANUAL_PAYMENT_PROOF_CONTACT = "WhatsApp +55 83 99860-9019";
    delete process.env.MANUAL_PIX_INSTRUCTIONS;
  });

  it("builds dynamic pix payload with qr image and txId", async () => {
    const { manualPayment, snapshot } = await buildManualPaymentRequest({
      amountCents: 9900,
      gatewayPaymentId: "manual_evt_123456",
      externalReference: "event:ev-2:member:mb-1"
    });

    expect(manualPayment.txId).toBeTruthy();
    expect(manualPayment.txId.length).toBeLessThanOrEqual(25);
    expect(manualPayment.pixCopyPaste).toContain("BR.GOV.BCB.PIX");
    expect(manualPayment.pixQrCodeImage).toMatch(/^data:image\/png;base64,/);
    expect(manualPayment.amountCents).toBe(9900);
    expect(snapshot.pixCopyPaste).toBe(manualPayment.pixCopyPaste);
  });

  it("reuses snapshot data when pending payment already exists", async () => {
    const first = await buildManualPaymentRequest({
      amountCents: 15000,
      gatewayPaymentId: "manual_mem_123456",
      externalReference: "membership:ms-1:member:mb-1"
    });

    const parsedSnapshot = readManualPaymentSnapshot({
      source: "manual_pix",
      paymentRequest: first.snapshot
    });

    const reused = await buildManualPaymentRequest({
      amountCents: 15000,
      gatewayPaymentId: "manual_mem_123456",
      externalReference: "membership:ms-1:member:mb-1",
      existingSnapshot: parsedSnapshot
    });

    expect(reused.manualPayment.txId).toBe(first.manualPayment.txId);
    expect(reused.manualPayment.pixCopyPaste).toBe(first.manualPayment.pixCopyPaste);
    expect(reused.manualPayment.pixQrCodeImage).toMatch(/^data:image\/png;base64,/);
  });
});
