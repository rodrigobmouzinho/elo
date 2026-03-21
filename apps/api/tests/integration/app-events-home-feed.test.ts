import { beforeEach, describe, expect, it, vi } from "vitest";

describe("app events home feed", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("returns published events with date, location and image data for home cards", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { GET: appEventsGet } = await import("../../app/api/app/events/route");

    memoryStore.events = [
      {
        id: "ev-home-1",
        title: "Elo Experience",
        summary: "Encontro presencial para networking e trocas de experiencia entre membros.",
        startsAt: "2026-05-12T19:30:00.000Z",
        location: "Joao Pessoa - PB",
        accessType: "free_members",
        heroImageUrl: "https://images.elo.app/events/experience.jpg"
      },
      {
        id: "ev-home-2",
        title: "Growth Live",
        summary: "Evento online com foco em crescimento e canais digitais.",
        startsAt: "2026-06-01T18:00:00.000Z",
        location: "Online",
        accessType: "paid_members",
        priceCents: 9900
      }
    ];

    const response = await appEventsGet(
      new Request("http://localhost/api/app/events", {
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
    expect(payload.data).toHaveLength(2);
    expect(payload.data[0]).toMatchObject({
      id: "ev-home-1",
      startsAt: "2026-05-12T19:30:00.000Z",
      location: "Joao Pessoa - PB",
      heroImageUrl: "https://images.elo.app/events/experience.jpg"
    });
    expect(payload.data[1]).toMatchObject({
      id: "ev-home-2",
      startsAt: "2026-06-01T18:00:00.000Z",
      location: "Online"
    });
  });
});
