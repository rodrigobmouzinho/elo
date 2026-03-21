import { beforeEach, describe, expect, it, vi } from "vitest";

const MEMBER_A = "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e";
const MEMBER_B = "60948757-e688-41ec-b0fc-cf30cf8cc3d8";

describe("finance dashboard period and export", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    process.env.PAYMENTS_MODE = "manual_pix";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("filters overview totals by selected period", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { GET: overviewGet } = await import("../../app/api/admin/finance/overview/route");

    const membershipA = memoryStore.memberships.find((item) => item.memberId === MEMBER_A);
    const membershipB = memoryStore.memberships.find((item) => item.memberId === MEMBER_B);

    expect(membershipA).toBeTruthy();
    expect(membershipB).toBeTruthy();

    if (!membershipA || !membershipB) {
      throw new Error("Memberships de teste não encontradas");
    }

    membershipA.status = "expired";
    membershipA.expiresAt = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();
    membershipB.status = "expired";
    membershipB.expiresAt = new Date(Date.now() - 120 * 24 * 3600 * 1000).toISOString();

    memoryStore.membershipPayments.length = 0;
    memoryStore.eventPayments.length = 0;

    memoryStore.membershipPayments.push(
      {
        id: "m-paid-recent",
        membershipId: membershipA.id,
        gateway: "manual_pix",
        gatewayPaymentId: "m-paid-recent",
        externalReference: "membership:recent",
        amountCents: 100000,
        status: "paid",
        checkoutUrl: null,
        pixQrCode: null,
        gatewayPayload: null,
        paidAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: "m-paid-old",
        membershipId: membershipB.id,
        gateway: "manual_pix",
        gatewayPaymentId: "m-paid-old",
        externalReference: "membership:old",
        amountCents: 50000,
        status: "paid",
        checkoutUrl: null,
        pixQrCode: null,
        gatewayPayload: null,
        paidAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 120 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: "m-pending-recent",
        membershipId: membershipA.id,
        gateway: "manual_pix",
        gatewayPaymentId: "m-pending-recent",
        externalReference: "membership:pending",
        amountCents: 100000,
        status: "pending",
        checkoutUrl: null,
        pixQrCode: null,
        gatewayPayload: null,
        paidAt: null,
        createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
      }
    );

    memoryStore.eventPayments.push(
      {
        id: "e-paid-recent",
        eventId: "ev-2",
        memberId: MEMBER_A,
        gateway: "manual_pix",
        gatewayPaymentId: "e-paid-recent",
        externalReference: "event:recent",
        amountCents: 30000,
        status: "paid",
        checkoutUrl: null,
        pixQrCode: null,
        gatewayPayload: null,
        paidAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: "e-paid-old",
        eventId: "ev-2",
        memberId: MEMBER_B,
        gateway: "manual_pix",
        gatewayPaymentId: "e-paid-old",
        externalReference: "event:old",
        amountCents: 70000,
        status: "paid",
        checkoutUrl: null,
        pixQrCode: null,
        gatewayPayload: null,
        paidAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 120 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: "e-pending-recent",
        eventId: "ev-2",
        memberId: MEMBER_A,
        gateway: "manual_pix",
        gatewayPaymentId: "e-pending-recent",
        externalReference: "event:pending",
        amountCents: 30000,
        status: "pending",
        checkoutUrl: null,
        pixQrCode: null,
        gatewayPayload: null,
        paidAt: null,
        createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
      }
    );

    const response = await overviewGet(
      new Request("http://localhost/api/admin/finance/overview?period=30d", {
        method: "GET",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "admin"
        }
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.membershipRevenueCents).toBe(100000);
    expect(payload.data.eventRevenueCents).toBe(30000);
    expect(payload.data.pendingMembershipPayments).toBe(1);
    expect(payload.data.pendingEventPayments).toBe(1);
    expect(payload.data.overduePayments).toBe(1);
  });

  it("exports dashboard csv with summary and pending sections", async () => {
    const { GET: exportGet } = await import("../../app/api/admin/finance/export/route");

    const response = await exportGet(
      new Request("http://localhost/api/admin/finance/export?period=30d", {
        method: "GET",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "admin"
        }
      })
    );
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain("attachment;");
    expect(csv).toContain('"secao","campo","valor"');
    expect(csv).toContain('"resumo","membership_revenue_brl"');
    expect(csv).toContain('"anuidades","membership_id"');
    expect(csv).toContain('"eventos_pendentes","payment_id"');
  });
});
