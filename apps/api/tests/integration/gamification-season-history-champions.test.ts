import { beforeEach, describe, expect, it, vi } from "vitest";

const MEMBER_ONE_ID = "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e";
const MEMBER_TWO_ID = "60948757-e688-41ec-b0fc-cf30cf8cc3d8";

describe("gamification season history champions", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    process.env.GAMIFICATION_ENABLED = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("returns champion and classification for closed seasons", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { GET: rankingGet } = await import("../../app/api/app/gamification/ranking/route");

    const activeSeason = memoryStore.seasons.find((item) => item.active);
    expect(activeSeason).toBeTruthy();

    if (!activeSeason) {
      throw new Error("Temporada ativa não encontrada");
    }

    const seasonClosedLatestId = "b6203df2-a03e-49f5-8e5d-7ea6f6587301";
    const seasonClosedOldestId = "db21bb6e-9c7d-4d88-b67e-3fe8b7dc97bb";
    const nowIso = new Date().toISOString();

    memoryStore.seasons = [
      activeSeason,
      {
        id: seasonClosedLatestId,
        name: "Temporada 2025.2",
        startsAt: "2025-07-01T00:00:00.000Z",
        endsAt: "2025-12-31T23:59:59.000Z",
        active: false,
        createdAt: nowIso
      },
      {
        id: seasonClosedOldestId,
        name: "Temporada 2025.1",
        startsAt: "2025-01-01T00:00:00.000Z",
        endsAt: "2025-06-30T23:59:59.000Z",
        active: false,
        createdAt: nowIso
      }
    ];

    memoryStore.pointsLedger = [
      {
        id: "history-1",
        seasonId: seasonClosedLatestId,
        memberId: MEMBER_ONE_ID,
        points: 320,
        reason: "Top performance 2025.2",
        createdAt: nowIso
      },
      {
        id: "history-2",
        seasonId: seasonClosedLatestId,
        memberId: MEMBER_TWO_ID,
        points: 210,
        reason: "Vice-campeao 2025.2",
        createdAt: nowIso
      },
      {
        id: "history-3",
        seasonId: seasonClosedOldestId,
        memberId: MEMBER_TWO_ID,
        points: 180,
        reason: "Top performance 2025.1",
        createdAt: nowIso
      },
      {
        id: "history-4",
        seasonId: seasonClosedOldestId,
        memberId: MEMBER_ONE_ID,
        points: 120,
        reason: "Segundo lugar 2025.1",
        createdAt: nowIso
      },
      {
        id: "active-1",
        seasonId: activeSeason.id,
        memberId: MEMBER_ONE_ID,
        points: 50,
        reason: "Pontuação da temporada ativa",
        createdAt: nowIso
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
    expect(rankingPayload.data.champions).toHaveLength(2);

    expect(rankingPayload.data.champions[0]).toMatchObject({
      seasonId: seasonClosedLatestId,
      season: "Temporada 2025.2",
      champion: "Ana Costa"
    });
    expect(rankingPayload.data.champions[0].classification).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ memberId: MEMBER_ONE_ID, rank: 1, points: 320 }),
        expect.objectContaining({ memberId: MEMBER_TWO_ID, rank: 2, points: 210 })
      ])
    );

    expect(rankingPayload.data.champions[1]).toMatchObject({
      seasonId: seasonClosedOldestId,
      season: "Temporada 2025.1",
      champion: "Pedro Nunes"
    });
    expect(rankingPayload.data.champions[1].classification).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ memberId: MEMBER_TWO_ID, rank: 1, points: 180 }),
        expect.objectContaining({ memberId: MEMBER_ONE_ID, rank: 2, points: 120 })
      ])
    );
  });
});
