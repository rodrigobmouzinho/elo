import { beforeEach, describe, expect, it, vi } from "vitest";

const MEMBER_ONE_ID = "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e";
const MEMBER_TWO_ID = "60948757-e688-41ec-b0fc-cf30cf8cc3d8";

describe("gamification ranking on member app", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("returns active season ranking with member positions and points", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { GET: rankingGet } = await import("../../app/api/app/gamification/ranking/route");

    const activeSeason = memoryStore.seasons.find((item) => item.active);
    expect(activeSeason).toBeTruthy();

    if (!activeSeason) {
      throw new Error("Temporada ativa não encontrada");
    }

    memoryStore.pointsLedger = [
      {
        id: "ranking-points-1",
        seasonId: activeSeason.id,
        memberId: MEMBER_TWO_ID,
        points: 120,
        reason: "Participação em networking",
        createdAt: new Date().toISOString()
      },
      {
        id: "ranking-points-2",
        seasonId: activeSeason.id,
        memberId: MEMBER_ONE_ID,
        points: 260,
        reason: "Mentoria entregue",
        createdAt: new Date().toISOString()
      },
      {
        id: "ranking-points-3",
        seasonId: activeSeason.id,
        memberId: MEMBER_ONE_ID,
        points: 40,
        reason: "Conexão validada",
        createdAt: new Date().toISOString()
      }
    ];

    const rankingResponse = await rankingGet(
      new Request("http://localhost/api/app/gamification/ranking", {
        method: "GET",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "member"
        }
      })
    );
    const rankingPayload = await rankingResponse.json();

    expect(rankingResponse.status).toBe(200);
    expect(rankingPayload.success).toBe(true);
    expect(rankingPayload.data.season).toBe(activeSeason.name);
    expect(rankingPayload.data.ranking).toHaveLength(2);
    expect(rankingPayload.data.ranking[0]).toMatchObject({
      memberId: MEMBER_ONE_ID,
      rank: 1,
      points: 300
    });
    expect(rankingPayload.data.ranking[1]).toMatchObject({
      memberId: MEMBER_TWO_ID,
      rank: 2,
      points: 120
    });
  });
});
