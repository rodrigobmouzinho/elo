import { beforeEach, describe, expect, it, vi } from "vitest";

describe("e2e critical finance checkout", () => {
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

  it("executes login, event checkout, admin approval and paid status confirmation", async () => {
    const { POST: loginPost } = await import("../../app/api/auth/login/route");
    const { GET: meGet } = await import("../../app/api/auth/me/route");
    const { POST: checkoutPost } = await import("../../app/api/app/events/[id]/checkout/route");
    const { GET: checkoutStatusGet } = await import(
      "../../app/api/app/events/[id]/checkout-status/route"
    );
    const { GET: pendingPaymentsGet } = await import(
      "../../app/api/admin/finance/event-payments/route"
    );
    const { POST: approvePaymentPost } = await import(
      "../../app/api/admin/finance/event-payments/[id]/approve/route"
    );

    const memberLoginResponse = await loginPost(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "membro@elonetworking.com",
          password: "supersecret1"
        })
      })
    );
    const memberLoginPayload = await memberLoginResponse.json();

    expect(memberLoginResponse.status).toBe(200);
    expect(memberLoginPayload.success).toBe(true);
    expect(memberLoginPayload.data.user.role).toBe("member");

    const adminLoginResponse = await loginPost(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "admin@elonetworking.com",
          password: "supersecret1"
        })
      })
    );
    const adminLoginPayload = await adminLoginResponse.json();

    expect(adminLoginResponse.status).toBe(200);
    expect(adminLoginPayload.success).toBe(true);
    expect(adminLoginPayload.data.user.role).toBe("admin");

    const memberToken = memberLoginPayload.data.session.accessToken as string;
    const adminToken = adminLoginPayload.data.session.accessToken as string;

    const memberHeaders = {
      authorization: `Bearer ${memberToken}`,
      "x-dev-role": "member",
      "content-type": "application/json"
    };
    const adminHeaders = {
      authorization: `Bearer ${adminToken}`,
      "x-dev-role": "admin",
      "content-type": "application/json"
    };

    const meResponse = await meGet(
      new Request("http://localhost/api/auth/me", {
        method: "GET",
        headers: memberHeaders
      })
    );
    const mePayload = await meResponse.json();

    expect(meResponse.status).toBe(200);
    expect(mePayload.success).toBe(true);
    expect(mePayload.data.role).toBe("member");
    expect(mePayload.data.memberId).toBeTruthy();

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
    expect(checkoutPayload.data.paymentStatus).toBe("pending");
    expect(checkoutPayload.data.gateway).toBe("manual_pix");
    expect(checkoutPayload.data.manualPayment.pixQrCodeImage).toMatch(/^data:image\/png;base64,/);
    expect(checkoutPayload.data.manualPayment.pixCopyPaste).toContain("BR.GOV.BCB.PIX");

    const pendingPaymentsResponse = await pendingPaymentsGet(
      new Request("http://localhost/api/admin/finance/event-payments", {
        method: "GET",
        headers: adminHeaders
      })
    );
    const pendingPaymentsPayload = await pendingPaymentsResponse.json();

    expect(pendingPaymentsResponse.status).toBe(200);
    expect(pendingPaymentsPayload.success).toBe(true);
    expect(Array.isArray(pendingPaymentsPayload.data)).toBe(true);
    expect(pendingPaymentsPayload.data).toHaveLength(1);

    const paymentId = pendingPaymentsPayload.data[0].paymentId as string;

    const approveResponse = await approvePaymentPost(
      new Request(`http://localhost/api/admin/finance/event-payments/${paymentId}/approve`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ note: "Aprovado no fluxo e2e" })
      }),
      {
        params: Promise.resolve({ id: paymentId })
      }
    );
    const approvePayload = await approveResponse.json();

    expect(approveResponse.status).toBe(200);
    expect(approvePayload.success).toBe(true);
    expect(approvePayload.data.status).toBe("paid");

    const statusResponse = await checkoutStatusGet(
      new Request("http://localhost/api/app/events/ev-2/checkout-status", {
        method: "GET",
        headers: memberHeaders
      }),
      {
        params: Promise.resolve({ id: "ev-2" })
      }
    );
    const statusPayload = await statusResponse.json();

    expect(statusResponse.status).toBe(200);
    expect(statusPayload.success).toBe(true);
    expect(statusPayload.data.paymentStatus).toBe("paid");
    expect(statusPayload.data.presenceConfirmed).toBe(true);
  });
});
