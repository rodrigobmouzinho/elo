import { beforeEach, describe, expect, it, vi } from "vitest";

describe("admin members CRUD", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("creates, updates and inactivates a member", async () => {
    const { POST: createMemberPost } = await import("../../app/api/admin/members/route");
    const { PATCH: patchMember, DELETE: deleteMember } = await import(
      "../../app/api/admin/members/[id]/route"
    );
    const { GET: appMembersGet } = await import("../../app/api/app/members/route");

    const adminHeaders = {
      authorization: "Bearer mock-token",
      "x-dev-role": "admin",
      "content-type": "application/json"
    };

    const createResponse = await createMemberPost(
      new Request("http://localhost/api/admin/members", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          fullName: "Lia Duarte",
          email: "lia.duarte@elo.local",
          phone: "83999990001",
          whatsapp: "83999990001",
          city: "Joao Pessoa",
          state: "PB",
          area: "produto",
          bio: "Fundadora focada em product discovery.",
          specialty: "product management",
          membershipExpiresAt: "2027-03-30T12:00:00.000Z"
        })
      })
    );
    const createPayload = await createResponse.json();
    const memberId = createPayload.data.id as string;

    expect(createResponse.status).toBe(201);
    expect(createPayload.success).toBe(true);
    expect(memberId).toBeTruthy();

    const patchResponse = await patchMember(
      new Request(`http://localhost/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: adminHeaders,
        body: JSON.stringify({
          city: "Recife",
          area: "growth"
        })
      }),
      {
        params: Promise.resolve({ id: memberId })
      }
    );
    const patchPayload = await patchResponse.json();

    expect(patchResponse.status).toBe(200);
    expect(patchPayload.success).toBe(true);
    expect(patchPayload.data.city).toBe("Recife");
    expect(patchPayload.data.area).toBe("growth");
    expect(patchPayload.data.active).toBe(true);

    const memberHeaders = {
      authorization: "Bearer mock-token",
      "x-dev-role": "member"
    };

    const listBeforeDeleteResponse = await appMembersGet(
      new Request("http://localhost/api/app/members", {
        method: "GET",
        headers: memberHeaders
      })
    );
    const listBeforeDeletePayload = await listBeforeDeleteResponse.json();
    const isVisibleBeforeDelete = listBeforeDeletePayload.data.some(
      (member: { id: string }) => member.id === memberId
    );

    expect(listBeforeDeleteResponse.status).toBe(200);
    expect(isVisibleBeforeDelete).toBe(true);

    const deleteResponse = await deleteMember(
      new Request(`http://localhost/api/admin/members/${memberId}`, {
        method: "DELETE",
        headers: adminHeaders
      }),
      {
        params: Promise.resolve({ id: memberId })
      }
    );
    const deletePayload = await deleteResponse.json();

    expect(deleteResponse.status).toBe(200);
    expect(deletePayload.success).toBe(true);
    expect(deletePayload.data.member.active).toBe(false);

    const listAfterDeleteResponse = await appMembersGet(
      new Request("http://localhost/api/app/members", {
        method: "GET",
        headers: memberHeaders
      })
    );
    const listAfterDeletePayload = await listAfterDeleteResponse.json();
    const isVisibleAfterDelete = listAfterDeletePayload.data.some(
      (member: { id: string }) => member.id === memberId
    );

    expect(listAfterDeleteResponse.status).toBe(200);
    expect(isVisibleAfterDelete).toBe(false);
  });

  it("rejects patch with empty payload", async () => {
    const { PATCH: patchMember } = await import("../../app/api/admin/members/[id]/route");

    const response = await patchMember(
      new Request("http://localhost/api/admin/members/f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e", {
        method: "PATCH",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "admin",
          "content-type": "application/json"
        },
        body: JSON.stringify({})
      }),
      {
        params: Promise.resolve({ id: "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e" })
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.success).toBe(false);
  });

  it("blocks paid event checkout for inactive member", async () => {
    const { DELETE: deleteMember } = await import("../../app/api/admin/members/[id]/route");
    const { POST: checkoutPost } = await import("../../app/api/app/events/[id]/checkout/route");

    const targetMemberId = "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e";

    const inactivateResponse = await deleteMember(
      new Request(`http://localhost/api/admin/members/${targetMemberId}`, {
        method: "DELETE",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "admin"
        }
      }),
      {
        params: Promise.resolve({ id: targetMemberId })
      }
    );
    const inactivatePayload = await inactivateResponse.json();

    expect(inactivateResponse.status).toBe(200);
    expect(inactivatePayload.success).toBe(true);
    expect(inactivatePayload.data.member.active).toBe(false);

    const checkoutResponse = await checkoutPost(
      new Request("http://localhost/api/app/events/ev-2/checkout", {
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
    const checkoutPayload = await checkoutResponse.json();

    expect(checkoutResponse.status).toBe(403);
    expect(checkoutPayload.success).toBe(false);
    expect(checkoutPayload.error).toContain("Membro inativo");
  });
});
