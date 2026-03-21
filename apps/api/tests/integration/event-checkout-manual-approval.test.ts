import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("event checkout manual pix flow", () => {
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

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates manual pending payment and confirms after admin approval", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { POST: checkoutPost } = await import("../../app/api/app/events/[id]/checkout/route");
    const { GET: checkoutStatusGet } = await import(
      "../../app/api/app/events/[id]/checkout-status/route"
    );
    const { GET: pendingListGet } = await import("../../app/api/admin/finance/event-payments/route");
    const { POST: approvePost } = await import(
      "../../app/api/admin/finance/event-payments/[id]/approve/route"
    );

    const memberHeaders = {
      authorization: "Bearer mock-token",
      "x-dev-role": "member",
      "content-type": "application/json"
    };
    const adminHeaders = {
      authorization: "Bearer mock-token",
      "x-dev-role": "admin",
      "content-type": "application/json"
    };

    const checkoutResponse = await checkoutPost(
      new Request("http://localhost/api/app/events/ev-2/checkout", {
        method: "POST",
        headers: memberHeaders,
        body: JSON.stringify({})
      }),
      {
        params: Promise.resolve({ id: "ev-2" })
      }
    );
    const checkoutPayload = await checkoutResponse.json();

    expect(checkoutResponse.status).toBe(200);
    expect(checkoutPayload.success).toBe(true);
    expect(checkoutPayload.data.gateway).toBe("manual_pix");
    expect(checkoutPayload.data.checkoutUrl).toBeNull();
    expect(checkoutPayload.data.manualPayment.pixKey).toBe("financeiro@elonetworking.com");
    expect(checkoutPayload.data.manualPayment.txId).toBeTruthy();
    expect(checkoutPayload.data.manualPayment.pixCopyPaste).toContain("BR.GOV.BCB.PIX");
    expect(checkoutPayload.data.manualPayment.pixQrCodeImage).toMatch(/^data:image\/png;base64,/);
    expect(checkoutPayload.data.pixQrCode).toBe(checkoutPayload.data.manualPayment.pixCopyPaste);
    expect(checkoutPayload.data.paymentStatus).toBe("pending");
    expect(fetchMock).toHaveBeenCalledTimes(0);

    const checkoutReuseResponse = await checkoutPost(
      new Request("http://localhost/api/app/events/ev-2/checkout", {
        method: "POST",
        headers: memberHeaders,
        body: JSON.stringify({})
      }),
      {
        params: Promise.resolve({ id: "ev-2" })
      }
    );
    const checkoutReusePayload = await checkoutReuseResponse.json();

    expect(checkoutReuseResponse.status).toBe(200);
    expect(checkoutReusePayload.data.reused).toBe(true);
    expect(checkoutReusePayload.data.gatewayPaymentId).toBe(checkoutPayload.data.gatewayPaymentId);
    expect(checkoutReusePayload.data.manualPayment.txId).toBe(checkoutPayload.data.manualPayment.txId);
    expect(checkoutReusePayload.data.manualPayment.pixCopyPaste).toBe(
      checkoutPayload.data.manualPayment.pixCopyPaste
    );

    const beforeApprovalResponse = await checkoutStatusGet(
      new Request("http://localhost/api/app/events/ev-2/checkout-status", {
        method: "GET",
        headers: memberHeaders
      }),
      {
        params: Promise.resolve({ id: "ev-2" })
      }
    );
    const beforeApprovalPayload = await beforeApprovalResponse.json();

    expect(beforeApprovalResponse.status).toBe(200);
    expect(beforeApprovalPayload.data.paymentStatus).toBe("pending");
    expect(beforeApprovalPayload.data.presenceConfirmed).toBe(false);

    const pendingListResponse = await pendingListGet(
      new Request("http://localhost/api/admin/finance/event-payments", {
        method: "GET",
        headers: adminHeaders
      })
    );
    const pendingListPayload = await pendingListResponse.json();
    const pendingPayment = pendingListPayload.data[0];

    expect(pendingListResponse.status).toBe(200);
    expect(Array.isArray(pendingListPayload.data)).toBe(true);
    expect(pendingPayment.status).toBe("pending");

    const approveResponse = await approvePost(
      new Request(`http://localhost/api/admin/finance/event-payments/${pendingPayment.paymentId}/approve`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ note: "Comprovante validado" })
      }),
      {
        params: Promise.resolve({ id: pendingPayment.paymentId })
      }
    );
    const approvePayload = await approveResponse.json();

    expect(approveResponse.status).toBe(200);
    expect(approvePayload.success).toBe(true);
    expect(approvePayload.data.status).toBe("paid");

    const afterApprovalResponse = await checkoutStatusGet(
      new Request("http://localhost/api/app/events/ev-2/checkout-status", {
        method: "GET",
        headers: memberHeaders
      }),
      {
        params: Promise.resolve({ id: "ev-2" })
      }
    );
    const afterApprovalPayload = await afterApprovalResponse.json();

    expect(afterApprovalResponse.status).toBe(200);
    expect(afterApprovalPayload.data.paymentStatus).toBe("paid");
    expect(afterApprovalPayload.data.presenceConfirmed).toBe(true);
  });
});
