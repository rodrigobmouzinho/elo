import { beforeEach, describe, expect, it, vi } from "vitest";

const MEMBER_ID = "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e";

describe("app profile whatsapp contact", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("returns whatsapp field for one-tap conversation link on profile", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { GET: profileGet } = await import("../../app/api/app/profile/route");

    memoryStore.members[0].id = MEMBER_ID;
    memoryStore.members[0].whatsapp = "(83) 99888-7766";

    const response = await profileGet(
      new Request("http://localhost/api/app/profile", {
        method: "GET",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "member"
        }
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.id).toBe(MEMBER_ID);
    expect(payload.data.whatsapp).toBe("(83) 99888-7766");
  });
});
