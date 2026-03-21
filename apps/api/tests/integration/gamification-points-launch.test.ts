import { beforeEach, describe, expect, it, vi } from "vitest";

const MEMBER_CONFIRMED_ID = "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e";
const MEMBER_NOT_CONFIRMED_ID = "60948757-e688-41ec-b0fc-cf30cf8cc3d8";
const EVENT_ID = "ev-1";

describe("gamification points launch by admin", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("launches points only when participation is validated and updates ranking", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { POST: launchPointsPost } = await import("../../app/api/admin/gamification/points/route");
    const { GET: rankingGet } = await import("../../app/api/app/gamification/ranking/route");

    const activeSeason = memoryStore.seasons.find((item) => item.active);
    expect(activeSeason).toBeTruthy();

    if (!activeSeason) {
      throw new Error("Temporada ativa não encontrada");
    }

    memoryStore.pointsLedger = [];
    memoryStore.eventRegistrations = [
      {
        eventId: EVENT_ID,
        memberId: MEMBER_CONFIRMED_ID,
        status: "confirmed",
        createdAt: new Date().toISOString()
      }
    ];

    const adminHeaders = {
      authorization: "Bearer mock-token",
      "x-dev-role": "admin",
      "content-type": "application/json"
    };

    const launchSuccessResponse = await launchPointsPost(
      new Request("http://localhost/api/admin/gamification/points", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          memberId: MEMBER_CONFIRMED_ID,
          eventId: EVENT_ID,
          seasonId: activeSeason.id,
          points: 150,
          reason: "Participação validada no encontro"
        })
      })
    );
    const launchSuccessPayload = await launchSuccessResponse.json();

    expect(launchSuccessResponse.status).toBe(200);
    expect(launchSuccessPayload.success).toBe(true);

    const rankingAfterSuccessResponse = await rankingGet(
      new Request("http://localhost/api/app/gamification/ranking", {
        method: "GET",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "member"
        }
      })
    );
    const rankingAfterSuccessPayload = await rankingAfterSuccessResponse.json();

    expect(rankingAfterSuccessResponse.status).toBe(200);
    expect(
      rankingAfterSuccessPayload.data.ranking.some(
        (entry: { memberId: string; points: number }) =>
          entry.memberId === MEMBER_CONFIRMED_ID && entry.points === 150
      )
    ).toBe(true);

    const launchWithoutValidationResponse = await launchPointsPost(
      new Request("http://localhost/api/admin/gamification/points", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          memberId: MEMBER_NOT_CONFIRMED_ID,
          eventId: EVENT_ID,
          seasonId: activeSeason.id,
          points: 100,
          reason: "Tentativa sem presença confirmada"
        })
      })
    );
    const launchWithoutValidationPayload = await launchWithoutValidationResponse.json();

    expect(launchWithoutValidationResponse.status).toBe(422);
    expect(launchWithoutValidationPayload.success).toBe(false);
    expect(launchWithoutValidationPayload.error).toContain("Participação ainda não validada");

    const launchWithUnknownEventResponse = await launchPointsPost(
      new Request("http://localhost/api/admin/gamification/points", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          memberId: MEMBER_CONFIRMED_ID,
          eventId: "evento-inexistente",
          seasonId: activeSeason.id,
          points: 80,
          reason: "Evento não encontrado"
        })
      })
    );
    const launchWithUnknownEventPayload = await launchWithUnknownEventResponse.json();

    expect(launchWithUnknownEventResponse.status).toBe(404);
    expect(launchWithUnknownEventPayload.success).toBe(false);
    expect(launchWithUnknownEventPayload.error).toContain("Evento informado não encontrado");
  });
});
