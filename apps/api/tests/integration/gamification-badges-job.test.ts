import { beforeEach, describe, expect, it, vi } from "vitest";

const MEMBER_ONE_ID = "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e";
const MEMBER_TWO_ID = "60948757-e688-41ec-b0fc-cf30cf8cc3d8";

describe("gamification badges automation job", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("grants badges for achieved ranking rules and remains idempotent", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { POST: processBadgesPost } = await import(
      "../../app/api/admin/gamification/badges/process/route"
    );

    const activeSeason = memoryStore.seasons.find((item) => item.active);
    expect(activeSeason).toBeTruthy();

    if (!activeSeason) {
      throw new Error("Temporada ativa não encontrada");
    }

    memoryStore.pointsLedger = [
      {
        id: "pts-1",
        seasonId: activeSeason.id,
        memberId: MEMBER_ONE_ID,
        points: 200,
        reason: "Participação ativa",
        createdAt: new Date().toISOString()
      },
      {
        id: "pts-2",
        seasonId: activeSeason.id,
        memberId: MEMBER_TWO_ID,
        points: 140,
        reason: "Mentoria concluída",
        createdAt: new Date().toISOString()
      }
    ];
    memoryStore.memberBadges = [];

    const headers = {
      authorization: "Bearer mock-token",
      "x-dev-role": "admin",
      "content-type": "application/json"
    };

    const firstRunResponse = await processBadgesPost(
      new Request("http://localhost/api/admin/gamification/badges/process", {
        method: "POST",
        headers,
        body: JSON.stringify({})
      })
    );
    const firstRunPayload = await firstRunResponse.json();

    expect(firstRunResponse.status).toBe(200);
    expect(firstRunPayload.success).toBe(true);
    expect(firstRunPayload.data.grantedCount).toBe(2);
    expect(firstRunPayload.data.seasonId).toBe(activeSeason.id);
    expect(firstRunPayload.data.grants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ memberId: MEMBER_ONE_ID, badgeName: "ouro", rank: 1 }),
        expect.objectContaining({ memberId: MEMBER_TWO_ID, badgeName: "prata", rank: 2 })
      ])
    );

    const badgesAfterFirstRun = memoryStore.memberBadges.filter(
      (item) => item.seasonId === activeSeason.id
    );
    expect(badgesAfterFirstRun).toHaveLength(2);

    const secondRunResponse = await processBadgesPost(
      new Request("http://localhost/api/admin/gamification/badges/process", {
        method: "POST",
        headers,
        body: JSON.stringify({})
      })
    );
    const secondRunPayload = await secondRunResponse.json();

    expect(secondRunResponse.status).toBe(200);
    expect(secondRunPayload.success).toBe(true);
    expect(secondRunPayload.data.grantedCount).toBe(0);

    const badgesAfterSecondRun = memoryStore.memberBadges.filter(
      (item) => item.seasonId === activeSeason.id
    );
    expect(badgesAfterSecondRun).toHaveLength(2);
  });
});
