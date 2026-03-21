import { beforeEach, describe, expect, it, vi } from "vitest";

const TARGET_MEMBER_ID = "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e";

describe("membership validity control", () => {
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

  it("inactivates member access when membership expires", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { GET: appMembersGet } = await import("../../app/api/app/members/route");
    const { GET: membershipsGet } = await import("../../app/api/admin/finance/memberships/route");
    const { POST: checkoutPost } = await import("../../app/api/app/events/[id]/checkout/route");

    const membership = memoryStore.memberships.find((item) => item.memberId === TARGET_MEMBER_ID);
    const member = memoryStore.members.find((item) => item.id === TARGET_MEMBER_ID);

    expect(membership).toBeTruthy();
    expect(member).toBeTruthy();

    if (!membership || !member) {
      throw new Error("Membro de teste não encontrado");
    }

    membership.status = "active";
    membership.expiresAt = new Date(Date.now() - 60 * 1000).toISOString();
    member.active = true;

    const adminHeaders = {
      authorization: "Bearer mock-token",
      "x-dev-role": "admin",
      "content-type": "application/json"
    };

    const memberHeaders = {
      authorization: "Bearer mock-token",
      "x-dev-role": "member",
      "content-type": "application/json"
    };

    const membershipsResponse = await membershipsGet(
      new Request("http://localhost/api/admin/finance/memberships", {
        method: "GET",
        headers: adminHeaders
      })
    );
    const membershipsPayload = await membershipsResponse.json();
    const financeMembership = membershipsPayload.data.find(
      (item: { memberId: string }) => item.memberId === TARGET_MEMBER_ID
    );

    expect(membershipsResponse.status).toBe(200);
    expect(financeMembership.status).toBe("expired");

    const appMembersResponse = await appMembersGet(
      new Request("http://localhost/api/app/members", {
        method: "GET",
        headers: memberHeaders
      })
    );
    const appMembersPayload = await appMembersResponse.json();
    const memberIsVisible = appMembersPayload.data.some(
      (item: { id: string }) => item.id === TARGET_MEMBER_ID
    );

    expect(appMembersResponse.status).toBe(200);
    expect(memberIsVisible).toBe(false);

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

    expect(checkoutResponse.status).toBe(403);
    expect(checkoutPayload.success).toBe(false);
    expect(checkoutPayload.error).toContain("Membro inativo");
  });

  it("reactivates access and renews expiration after manual approval", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { GET: membershipsGet } = await import("../../app/api/admin/finance/memberships/route");
    const { GET: appMembersGet } = await import("../../app/api/app/members/route");
    const { POST: chargePost } = await import(
      "../../app/api/admin/finance/memberships/[id]/charge/route"
    );
    const { POST: approvePost } = await import(
      "../../app/api/admin/finance/memberships/[id]/approve-payment/route"
    );
    const { POST: checkoutPost } = await import("../../app/api/app/events/[id]/checkout/route");

    const membership = memoryStore.memberships.find((item) => item.memberId === TARGET_MEMBER_ID);
    const member = memoryStore.members.find((item) => item.id === TARGET_MEMBER_ID);

    expect(membership).toBeTruthy();
    expect(member).toBeTruthy();

    if (!membership || !member) {
      throw new Error("Membro de teste não encontrado");
    }

    membership.status = "active";
    membership.expiresAt = new Date(Date.now() - 60 * 1000).toISOString();
    member.active = true;

    const adminHeaders = {
      authorization: "Bearer mock-token",
      "x-dev-role": "admin",
      "content-type": "application/json"
    };

    const memberHeaders = {
      authorization: "Bearer mock-token",
      "x-dev-role": "member",
      "content-type": "application/json"
    };

    const chargeResponse = await chargePost(
      new Request(`http://localhost/api/admin/finance/memberships/${membership.id}/charge`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ amountCents: 100000 })
      }),
      {
        params: Promise.resolve({ id: membership.id })
      }
    );

    expect(chargeResponse.status).toBe(200);

    const approveResponse = await approvePost(
      new Request(`http://localhost/api/admin/finance/memberships/${membership.id}/approve-payment`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ note: "Renovado" })
      }),
      {
        params: Promise.resolve({ id: membership.id })
      }
    );
    const approvePayload = await approveResponse.json();

    expect(approveResponse.status).toBe(200);
    expect(approvePayload.success).toBe(true);
    expect(approvePayload.data.status).toBe("paid");

    const membershipsResponse = await membershipsGet(
      new Request("http://localhost/api/admin/finance/memberships", {
        method: "GET",
        headers: adminHeaders
      })
    );
    const membershipsPayload = await membershipsResponse.json();
    const financeMembership = membershipsPayload.data.find(
      (item: { memberId: string }) => item.memberId === TARGET_MEMBER_ID
    );

    expect(membershipsResponse.status).toBe(200);
    expect(financeMembership.status).toBe("active");
    expect(new Date(financeMembership.expiresAt).getTime()).toBeGreaterThan(Date.now());

    const appMembersResponse = await appMembersGet(
      new Request("http://localhost/api/app/members", {
        method: "GET",
        headers: memberHeaders
      })
    );
    const appMembersPayload = await appMembersResponse.json();
    const memberIsVisible = appMembersPayload.data.some(
      (item: { id: string }) => item.id === TARGET_MEMBER_ID
    );

    expect(appMembersResponse.status).toBe(200);
    expect(memberIsVisible).toBe(true);

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
  });
});
