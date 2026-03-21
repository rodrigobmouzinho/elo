import { beforeEach, describe, expect, it, vi } from "vitest";

const MEMBER_ID = "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e";

describe("member event presence confirmation", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("confirms presence for open event and keeps registration idempotent", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { POST: confirmPost } = await import("../../app/api/app/events/[id]/confirm/route");
    const { GET: checkoutStatusGet } = await import(
      "../../app/api/app/events/[id]/checkout-status/route"
    );

    const memberHeaders = {
      authorization: "Bearer mock-token",
      "x-dev-role": "member",
      "content-type": "application/json"
    };

    const firstConfirmResponse = await confirmPost(
      new Request("http://localhost/api/app/events/ev-1/confirm", {
        method: "POST",
        headers: memberHeaders,
        body: JSON.stringify({})
      }),
      {
        params: Promise.resolve({ id: "ev-1" })
      }
    );
    const firstConfirmPayload = await firstConfirmResponse.json();

    expect(firstConfirmResponse.status).toBe(200);
    expect(firstConfirmPayload.success).toBe(true);
    expect(firstConfirmPayload.data.eventId).toBe("ev-1");
    expect(firstConfirmPayload.data.memberId).toBe(MEMBER_ID);
    expect(firstConfirmPayload.data.status).toBe("confirmed");

    const secondConfirmResponse = await confirmPost(
      new Request("http://localhost/api/app/events/ev-1/confirm", {
        method: "POST",
        headers: memberHeaders,
        body: JSON.stringify({})
      }),
      {
        params: Promise.resolve({ id: "ev-1" })
      }
    );

    expect(secondConfirmResponse.status).toBe(200);

    const registrations = memoryStore.eventRegistrations.filter(
      (entry) => entry.eventId === "ev-1" && entry.memberId === MEMBER_ID && entry.status === "confirmed"
    );
    expect(registrations).toHaveLength(1);

    const checkoutStatusResponse = await checkoutStatusGet(
      new Request("http://localhost/api/app/events/ev-1/checkout-status", {
        method: "GET",
        headers: memberHeaders
      }),
      {
        params: Promise.resolve({ id: "ev-1" })
      }
    );
    const checkoutStatusPayload = await checkoutStatusResponse.json();

    expect(checkoutStatusResponse.status).toBe(200);
    expect(checkoutStatusPayload.success).toBe(true);
    expect(checkoutStatusPayload.data.paymentStatus).toBe("none");
    expect(checkoutStatusPayload.data.presenceConfirmed).toBe(true);
  });

  it("blocks direct confirmation for paid events", async () => {
    const { POST: confirmPost } = await import("../../app/api/app/events/[id]/confirm/route");

    const response = await confirmPost(
      new Request("http://localhost/api/app/events/ev-2/confirm", {
        method: "POST",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "member",
          "content-type": "application/json"
        },
        body: JSON.stringify({})
      }),
      {
        params: Promise.resolve({ id: "ev-2" })
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(402);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain("exige pagamento");
  });

  it("blocks inactive members from confirming presence", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { POST: confirmPost } = await import("../../app/api/app/events/[id]/confirm/route");

    const member = memoryStore.members.find((entry) => entry.id === MEMBER_ID);
    expect(member).toBeTruthy();

    if (!member) {
      throw new Error("Membro de teste não encontrado");
    }

    member.active = false;

    const response = await confirmPost(
      new Request("http://localhost/api/app/events/ev-1/confirm", {
        method: "POST",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "member",
          "content-type": "application/json"
        },
        body: JSON.stringify({})
      }),
      {
        params: Promise.resolve({ id: "ev-1" })
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain("Membro inativo");
  });
});
