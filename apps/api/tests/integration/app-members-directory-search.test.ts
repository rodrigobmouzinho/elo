import { beforeEach, describe, expect, it, vi } from "vitest";

describe("app members directory search", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("filters active members by name query", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { GET: appMembersGet } = await import("../../app/api/app/members/route");

    memoryStore.members[0].fullName = "Ana Costa";
    memoryStore.members[0].active = true;
    memoryStore.members[1].fullName = "Joao Pedro";
    memoryStore.members[1].active = true;
    memoryStore.members.push({
      id: "member-inactive-search",
      fullName: "Ana Inativa",
      email: "ana.inativa@elo.com",
      phone: "83999998888",
      whatsapp: "83999998888",
      city: "Joao Pessoa",
      state: "PB",
      area: "operacoes",
      active: false,
      authUserId: null,
      mustChangePassword: false,
      onboardingApplicationId: null
    });

    const headers = {
      authorization: "Bearer mock-token",
      "x-dev-role": "member"
    };

    const searchAnaResponse = await appMembersGet(
      new Request("http://localhost/api/app/members?search=ana", {
        method: "GET",
        headers
      })
    );
    const searchAnaPayload = await searchAnaResponse.json();

    expect(searchAnaResponse.status).toBe(200);
    expect(searchAnaPayload.success).toBe(true);
    expect(searchAnaPayload.data).toHaveLength(1);
    expect(searchAnaPayload.data[0]).toMatchObject({
      fullName: "Ana Costa",
      active: true
    });

    const searchJoaoResponse = await appMembersGet(
      new Request("http://localhost/api/app/members?search=joao", {
        method: "GET",
        headers
      })
    );
    const searchJoaoPayload = await searchJoaoResponse.json();

    expect(searchJoaoResponse.status).toBe(200);
    expect(searchJoaoPayload.success).toBe(true);
    expect(searchJoaoPayload.data).toHaveLength(1);
    expect(searchJoaoPayload.data[0]).toMatchObject({
      fullName: "Joao Pedro",
      active: true
    });
  });
});
