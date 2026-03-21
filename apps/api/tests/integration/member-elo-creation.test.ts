import { beforeEach, describe, expect, it, vi } from "vitest";

const LOGGED_MEMBER_ID = "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e";
const TARGET_MEMBER_ID = "60948757-e688-41ec-b0fc-cf30cf8cc3d8";

describe("member elo creation", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("creates and persists elo link with idempotent behavior", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { POST: createEloPost } = await import("../../app/api/app/members/[id]/elo/route");

    memoryStore.memberLinks = [];
    memoryStore.members[0].id = LOGGED_MEMBER_ID;
    memoryStore.members[0].active = true;
    memoryStore.members[1].id = TARGET_MEMBER_ID;
    memoryStore.members[1].active = true;

    const headers = {
      authorization: "Bearer mock-token",
      "x-dev-role": "member",
      "content-type": "application/json"
    };

    const firstResponse = await createEloPost(
      new Request(`http://localhost/api/app/members/${TARGET_MEMBER_ID}/elo`, {
        method: "POST",
        headers,
        body: JSON.stringify({})
      }),
      {
        params: Promise.resolve({ id: TARGET_MEMBER_ID })
      }
    );
    const firstPayload = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstPayload.success).toBe(true);
    expect(firstPayload.data.created).toBe(true);
    expect(firstPayload.data.message).toBe("Elo criado com sucesso");
    expect(memoryStore.memberLinks).toHaveLength(1);
    expect(memoryStore.memberLinks[0]).toMatchObject({
      followerMemberId: LOGGED_MEMBER_ID,
      followedMemberId: TARGET_MEMBER_ID
    });

    const secondResponse = await createEloPost(
      new Request(`http://localhost/api/app/members/${TARGET_MEMBER_ID}/elo`, {
        method: "POST",
        headers,
        body: JSON.stringify({})
      }),
      {
        params: Promise.resolve({ id: TARGET_MEMBER_ID })
      }
    );
    const secondPayload = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondPayload.success).toBe(true);
    expect(secondPayload.data.created).toBe(false);
    expect(secondPayload.data.message).toBe("Elo ja existente");
    expect(memoryStore.memberLinks).toHaveLength(1);
  });

  it("blocks self elo creation", async () => {
    const { POST: createEloPost } = await import("../../app/api/app/members/[id]/elo/route");

    const response = await createEloPost(
      new Request(`http://localhost/api/app/members/${LOGGED_MEMBER_ID}/elo`, {
        method: "POST",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "member",
          "content-type": "application/json"
        },
        body: JSON.stringify({})
      }),
      {
        params: Promise.resolve({ id: LOGGED_MEMBER_ID })
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain("próprio perfil");
  });
});
