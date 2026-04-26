import { beforeEach, describe, expect, it, vi } from "vitest";

describe("gamification visibility flag", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    process.env.GAMIFICATION_ENABLED = "false";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("returns 404 for admin and member gamification endpoints when disabled", async () => {
    const { GET: seasonsGet } = await import("../../app/api/admin/gamification/seasons/route");
    const { POST: pointsPost } = await import("../../app/api/admin/gamification/points/route");
    const { GET: rankingGet } = await import("../../app/api/app/gamification/ranking/route");

    const [seasonsResponse, pointsResponse, rankingResponse] = await Promise.all([
      seasonsGet(
        new Request("http://localhost/api/admin/gamification/seasons", {
          headers: {
            authorization: "Bearer mock-token",
            "x-dev-role": "admin"
          }
        })
      ),
      pointsPost(
        new Request("http://localhost/api/admin/gamification/points", {
          method: "POST",
          headers: {
            authorization: "Bearer mock-token",
            "content-type": "application/json",
            "x-dev-role": "admin"
          },
          body: JSON.stringify({
            memberId: "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e",
            eventId: "434f5f2a-1bb2-43eb-b5ce-d7c9bb728d18",
            seasonId: "7b2b6d8b-2d68-47f1-b56c-a2d28383887d",
            points: 100,
            reason: "Teste de bloqueio"
          })
        })
      ),
      rankingGet(
        new Request("http://localhost/api/app/gamification/ranking", {
          headers: {
            authorization: "Bearer mock-token",
            "x-dev-role": "member"
          }
        })
      )
    ]);

    expect(seasonsResponse.status).toBe(404);
    expect(pointsResponse.status).toBe(404);
    expect(rankingResponse.status).toBe(404);
  });
});
