import { beforeEach, describe, expect, it, vi } from "vitest";

const MEMBER_ONE_ID = "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e";
const MEMBER_TWO_ID = "60948757-e688-41ec-b0fc-cf30cf8cc3d8";
const EVENT_ID = "ev-1";

describe("gamification seasons activation", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("creates a season, activates it and recalculates ranking by active period", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { GET: seasonsGet, POST: seasonsPost } = await import(
      "../../app/api/admin/gamification/seasons/route"
    );
    const { POST: activateSeasonPost } = await import(
      "../../app/api/admin/gamification/seasons/[id]/activate/route"
    );
    const { POST: launchPointsPost } = await import(
      "../../app/api/admin/gamification/points/route"
    );
    const { GET: rankingGet } = await import("../../app/api/app/gamification/ranking/route");

    memoryStore.pointsLedger = [];
    memoryStore.eventRegistrations = [
      {
        eventId: EVENT_ID,
        memberId: MEMBER_ONE_ID,
        status: "confirmed",
        createdAt: new Date().toISOString()
      },
      {
        eventId: EVENT_ID,
        memberId: MEMBER_TWO_ID,
        status: "confirmed",
        createdAt: new Date().toISOString()
      }
    ];

    const adminHeaders = {
      authorization: "Bearer mock-token",
      "x-dev-role": "admin",
      "content-type": "application/json"
    };

    const activeSeasonsResponse = await seasonsGet(
      new Request("http://localhost/api/admin/gamification/seasons", {
        method: "GET",
        headers: adminHeaders
      })
    );
    const activeSeasonsPayload = await activeSeasonsResponse.json();
    const currentActiveSeason = activeSeasonsPayload.data.find((item: { active: boolean }) => item.active);

    expect(activeSeasonsResponse.status).toBe(200);
    expect(currentActiveSeason).toBeTruthy();

    const createSeasonResponse = await seasonsPost(
      new Request("http://localhost/api/admin/gamification/seasons", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          name: "Temporada 2026.2",
          startsAt: "2026-07-01T00:00:00.000Z",
          endsAt: "2026-12-31T23:59:59.000Z"
        })
      })
    );
    const createSeasonPayload = await createSeasonResponse.json();
    const createdSeasonId = createSeasonPayload.data.id as string;

    expect(createSeasonResponse.status).toBe(201);
    expect(createSeasonPayload.success).toBe(true);
    expect(createSeasonPayload.data.active).toBe(false);

    const launchCurrentSeasonPointsResponse = await launchPointsPost(
      new Request("http://localhost/api/admin/gamification/points", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          memberId: MEMBER_ONE_ID,
          eventId: EVENT_ID,
          seasonId: currentActiveSeason.id,
          points: 100,
          reason: "Networking qualificado"
        })
      })
    );

    expect(launchCurrentSeasonPointsResponse.status).toBe(200);

    const launchCreatedSeasonPointsResponse = await launchPointsPost(
      new Request("http://localhost/api/admin/gamification/points", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          memberId: MEMBER_TWO_ID,
          eventId: EVENT_ID,
          seasonId: createdSeasonId,
          points: 250,
          reason: "Mentoria entregue"
        })
      })
    );

    expect(launchCreatedSeasonPointsResponse.status).toBe(200);

    const rankingBeforeActivationResponse = await rankingGet(
      new Request("http://localhost/api/app/gamification/ranking", {
        method: "GET",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "member"
        }
      })
    );
    const rankingBeforeActivationPayload = await rankingBeforeActivationResponse.json();

    expect(rankingBeforeActivationResponse.status).toBe(200);
    expect(rankingBeforeActivationPayload.data.season).toBe(currentActiveSeason.name);
    expect(
      rankingBeforeActivationPayload.data.ranking.some(
        (entry: { memberId: string }) => entry.memberId === MEMBER_ONE_ID
      )
    ).toBe(true);
    expect(
      rankingBeforeActivationPayload.data.ranking.some(
        (entry: { memberId: string }) => entry.memberId === MEMBER_TWO_ID
      )
    ).toBe(false);

    const activateResponse = await activateSeasonPost(
      new Request(`http://localhost/api/admin/gamification/seasons/${createdSeasonId}/activate`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({})
      }),
      {
        params: Promise.resolve({ id: createdSeasonId })
      }
    );
    const activatePayload = await activateResponse.json();

    expect(activateResponse.status).toBe(200);
    expect(activatePayload.success).toBe(true);
    expect(activatePayload.data.season.id).toBe(createdSeasonId);
    expect(activatePayload.data.season.active).toBe(true);

    const seasonsAfterActivationResponse = await seasonsGet(
      new Request("http://localhost/api/admin/gamification/seasons", {
        method: "GET",
        headers: adminHeaders
      })
    );
    const seasonsAfterActivationPayload = await seasonsAfterActivationResponse.json();
    const activeSeasons = seasonsAfterActivationPayload.data.filter(
      (item: { active: boolean }) => item.active
    );

    expect(seasonsAfterActivationResponse.status).toBe(200);
    expect(activeSeasons).toHaveLength(1);
    expect(activeSeasons[0].id).toBe(createdSeasonId);

    const rankingAfterActivationResponse = await rankingGet(
      new Request("http://localhost/api/app/gamification/ranking", {
        method: "GET",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "member"
        }
      })
    );
    const rankingAfterActivationPayload = await rankingAfterActivationResponse.json();

    expect(rankingAfterActivationResponse.status).toBe(200);
    expect(rankingAfterActivationPayload.data.season).toBe("Temporada 2026.2");
    expect(
      rankingAfterActivationPayload.data.ranking.some(
        (entry: { memberId: string; points: number }) =>
          entry.memberId === MEMBER_TWO_ID && entry.points === 250
      )
    ).toBe(true);
    expect(
      rankingAfterActivationPayload.data.ranking.some(
        (entry: { memberId: string }) => entry.memberId === MEMBER_ONE_ID
      )
    ).toBe(false);
  });
});
