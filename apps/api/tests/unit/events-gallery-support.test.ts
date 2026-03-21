import { beforeEach, describe, expect, it, vi } from "vitest";

describe("events repository legacy gallery support", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("falls back to the legacy events schema before listing events", async () => {
    const fromMock = vi.fn((table: string) => {
      expect(table).toBe("events");

      return {
        select(selection: string) {
          if (selection === "gallery_image_urls") {
            return {
              limit: vi.fn().mockResolvedValue({
                data: null,
                error: {
                  code: "42703",
                  message: 'column events.gallery_image_urls does not exist'
                }
              })
            };
          }

          if (selection.includes("id, title, description, starts_at, location, online_url, access_type, price_cents, hero_image_url")) {
            return {
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "ev-legacy-1",
                    title: "Legacy Elo Meetup",
                    description: "Evento compatível com schema legado para testar fallback de galeria.",
                    starts_at: "2026-06-10T19:00:00.000Z",
                    location: "Joao Pessoa - PB",
                    online_url: null,
                    access_type: "free_members",
                    price_cents: null,
                    hero_image_url: "/event-placeholder.svg"
                  }
                ],
                error: null
              })
            };
          }

          throw new Error(`Unexpected selection: ${selection}`);
        }
      };
    });

    vi.doMock("../../lib/supabase", () => ({
      hasSupabase: true,
      supabaseAdmin: {
        from: fromMock
      }
    }));

    const { listEvents } = await import("../../lib/repositories");
    const events = await listEvents();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: "ev-legacy-1",
      title: "Legacy Elo Meetup",
      heroImageUrl: "/event-placeholder.svg",
      galleryImageUrls: []
    });
    expect(fromMock).toHaveBeenCalledTimes(2);
  });
});
