import { beforeEach, describe, expect, it, vi } from "vitest";

describe("membership charge manual pix flow", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    process.env.PAYMENTS_MODE = "manual_pix";
    process.env.MANUAL_PIX_KEY = "financeiro@elonetworking.com";
    process.env.MANUAL_PIX_KEY_TYPE = "email";
    process.env.MANUAL_PIX_BENEFICIARY = "Elo Networking";
    process.env.MANUAL_PAYMENT_PROOF_CONTACT = "WhatsApp +55 83 99860-9019";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("creates manual membership charge with dynamic pix and approves in admin", async () => {
    const { GET: membershipsGet } = await import("../../app/api/admin/finance/memberships/route");
    const { POST: chargePost } = await import(
      "../../app/api/admin/finance/memberships/[id]/charge/route"
    );
    const { POST: approvePost } = await import(
      "../../app/api/admin/finance/memberships/[id]/approve-payment/route"
    );

    const adminHeaders = {
      authorization: "Bearer mock-token",
      "x-dev-role": "admin",
      "content-type": "application/json"
    };

    const membershipsResponse = await membershipsGet(
      new Request("http://localhost/api/admin/finance/memberships", {
        method: "GET",
        headers: adminHeaders
      })
    );
    const membershipsPayload = await membershipsResponse.json();
    const membershipId = membershipsPayload.data[0]?.membershipId as string;

    expect(membershipsResponse.status).toBe(200);
    expect(membershipId).toBeTruthy();

    const initialMembership = membershipsPayload.data.find(
      (item: { membershipId: string }) => item.membershipId === membershipId
    );
    expect(initialMembership.latestPaymentStatus).toBe("none");

    const chargeResponse = await chargePost(
      new Request(`http://localhost/api/admin/finance/memberships/${membershipId}/charge`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ amountCents: 100000 })
      }),
      {
        params: Promise.resolve({ id: membershipId })
      }
    );
    const chargePayload = await chargeResponse.json();

    expect(chargeResponse.status).toBe(200);
    expect(chargePayload.success).toBe(true);
    expect(chargePayload.data.gateway).toBe("manual_pix");
    expect(chargePayload.data.manualPayment.pixKey).toBe("financeiro@elonetworking.com");
    expect(chargePayload.data.manualPayment.txId).toBeTruthy();
    expect(chargePayload.data.manualPayment.pixCopyPaste).toContain("BR.GOV.BCB.PIX");
    expect(chargePayload.data.manualPayment.pixQrCodeImage).toMatch(/^data:image\/png;base64,/);
    expect(chargePayload.data.paymentStatus).toBe("pending");

    const afterChargeResponse = await membershipsGet(
      new Request("http://localhost/api/admin/finance/memberships", {
        method: "GET",
        headers: adminHeaders
      })
    );
    const afterChargePayload = await afterChargeResponse.json();
    const afterChargeMembership = afterChargePayload.data.find(
      (item: { membershipId: string }) => item.membershipId === membershipId
    );

    expect(afterChargeResponse.status).toBe(200);
    expect(afterChargeMembership.latestPaymentStatus).toBe("pending");
    expect(afterChargeMembership.latestPaymentAmountCents).toBe(100000);

    const approveResponse = await approvePost(
      new Request(`http://localhost/api/admin/finance/memberships/${membershipId}/approve-payment`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ note: "Comprovante aprovado no financeiro" })
      }),
      {
        params: Promise.resolve({ id: membershipId })
      }
    );
    const approvePayload = await approveResponse.json();

    expect(approveResponse.status).toBe(200);
    expect(approvePayload.success).toBe(true);
    expect(approvePayload.data.status).toBe("paid");

    const afterApprovalResponse = await membershipsGet(
      new Request("http://localhost/api/admin/finance/memberships", {
        method: "GET",
        headers: adminHeaders
      })
    );
    const afterApprovalPayload = await afterApprovalResponse.json();
    const afterApprovalMembership = afterApprovalPayload.data.find(
      (item: { membershipId: string }) => item.membershipId === membershipId
    );

    expect(afterApprovalResponse.status).toBe(200);
    expect(afterApprovalMembership.latestPaymentStatus).toBe("paid");
    expect(afterApprovalMembership.latestPaymentAmountCents).toBe(100000);
  });
});
