import { beforeEach, describe, expect, it, vi } from "vitest";

const MEMBER_ID = "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e";

describe("app profile edit restrictions", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("updates allowed profile fields without changing email and phone", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { PATCH: profilePatch } = await import("../../app/api/app/profile/route");

    memoryStore.members[0].id = MEMBER_ID;
    memoryStore.members[0].email = "membro@elo.com";
    memoryStore.members[0].phone = "83999990000";
    memoryStore.members[0].whatsapp = "83999990000";
    memoryStore.members[0].fullName = "Membro Original";
    memoryStore.members[0].city = "Joao Pessoa";

    const response = await profilePatch(
      new Request("http://localhost/api/app/profile", {
        method: "PATCH",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "member",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          fullName: "Membro Atualizado",
          city: "Recife",
          area: "produto",
          email: "alterado@elo.com",
          phone: "83911112222",
          whatsapp: "83933334444"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.fullName).toBe("Membro Atualizado");
    expect(payload.data.city).toBe("Recife");
    expect(payload.data.email).toBe("membro@elo.com");
    expect(payload.data.phone).toBe("83999990000");
    expect(payload.data.whatsapp).toBe("83999990000");
  });
});
