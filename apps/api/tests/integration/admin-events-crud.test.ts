import { beforeEach, describe, expect, it, vi } from "vitest";

describe("admin events CRUD", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("creates event with fallback image, updates image/access and removes event", async () => {
    const { POST: createEventPost } = await import("../../app/api/admin/events/route");
    const { GET: getEventByIdGet, PATCH: patchEvent, DELETE: deleteEvent } = await import(
      "../../app/api/admin/events/[id]/route"
    );
    const { GET: appEventsGet } = await import("../../app/api/app/events/route");

    const adminHeaders = {
      authorization: "Bearer mock-token",
      "x-dev-role": "admin",
      "content-type": "application/json"
    };
    const memberHeaders = {
      authorization: "Bearer mock-token",
      "x-dev-role": "member"
    };

    const createResponse = await createEventPost(
      new Request("http://localhost/api/admin/events", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          title: "Demo Day Elo 2026",
          description: "Evento para apresentar resultados, conexoes e novas oportunidades da rede.",
          startsAt: "2026-04-15T19:00:00.000Z",
          location: "Joao Pessoa - PB",
          accessType: "paid_members",
          priceCents: 12900
        })
      })
    );
    const createPayload = await createResponse.json();
    const eventId = createPayload.data.id as string;

    expect(createResponse.status).toBe(201);
    expect(createPayload.success).toBe(true);
    expect(createPayload.data.heroImageUrl).toBe("/event-placeholder.svg");

    const detailsResponse = await getEventByIdGet(
      new Request(`http://localhost/api/admin/events/${eventId}`, {
        method: "GET",
        headers: adminHeaders
      }),
      {
        params: Promise.resolve({ id: eventId })
      }
    );
    const detailsPayload = await detailsResponse.json();

    expect(detailsResponse.status).toBe(200);
    expect(detailsPayload.data.id).toBe(eventId);
    expect(detailsPayload.data.heroImageUrl).toBe("/event-placeholder.svg");
    expect(detailsPayload.data.galleryImageUrls ?? []).toEqual([]);

    const patchResponse = await patchEvent(
      new Request(`http://localhost/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: adminHeaders,
        body: JSON.stringify({
          accessType: "free_members",
          onlineUrl: "https://meet.elo.com.br/demo-day-2026",
          heroImageUrl: "https://images.example.com/eventos/demo-day.jpg",
          galleryImageUrls: [
            "https://images.example.com/eventos/demo-day-1.jpg",
            "https://images.example.com/eventos/demo-day-2.jpg"
          ],
          title: "Demo Day Elo (atualizado)"
        })
      }),
      {
        params: Promise.resolve({ id: eventId })
      }
    );
    const patchPayload = await patchResponse.json();

    expect(patchResponse.status).toBe(200);
    expect(patchPayload.success).toBe(true);
    expect(patchPayload.data.accessType).toBe("free_members");
    expect(patchPayload.data.onlineUrl).toBe("https://meet.elo.com.br/demo-day-2026");
    expect(patchPayload.data.heroImageUrl).toBe("https://images.example.com/eventos/demo-day.jpg");
    expect(patchPayload.data.galleryImageUrls).toEqual([
      "https://images.example.com/eventos/demo-day-1.jpg",
      "https://images.example.com/eventos/demo-day-2.jpg"
    ]);
    expect(patchPayload.data.priceCents).toBeUndefined();

    const appEventsResponse = await appEventsGet(
      new Request("http://localhost/api/app/events", {
        method: "GET",
        headers: memberHeaders
      })
    );
    const appEventsPayload = await appEventsResponse.json();
    const eventInApp = appEventsPayload.data.find((event: { id: string }) => event.id === eventId);

    expect(appEventsResponse.status).toBe(200);
    expect(eventInApp).toBeTruthy();
    expect(eventInApp.accessType).toBe("free_members");
    expect(eventInApp.heroImageUrl).toBe("https://images.example.com/eventos/demo-day.jpg");
    expect(eventInApp.galleryImageUrls).toEqual([
      "https://images.example.com/eventos/demo-day-1.jpg",
      "https://images.example.com/eventos/demo-day-2.jpg"
    ]);
    expect(eventInApp.onlineUrl).toBe("https://meet.elo.com.br/demo-day-2026");
    expect(eventInApp.priceCents).toBeUndefined();

    const deleteResponse = await deleteEvent(
      new Request(`http://localhost/api/admin/events/${eventId}`, {
        method: "DELETE",
        headers: adminHeaders
      }),
      {
        params: Promise.resolve({ id: eventId })
      }
    );
    const deletePayload = await deleteResponse.json();

    expect(deleteResponse.status).toBe(200);
    expect(deletePayload.success).toBe(true);

    const appEventsAfterDeleteResponse = await appEventsGet(
      new Request("http://localhost/api/app/events", {
        method: "GET",
        headers: memberHeaders
      })
    );
    const appEventsAfterDeletePayload = await appEventsAfterDeleteResponse.json();
    const stillExists = appEventsAfterDeletePayload.data.some(
      (event: { id: string }) => event.id === eventId
    );

    expect(appEventsAfterDeleteResponse.status).toBe(200);
    expect(stillExists).toBe(false);
  });

  it("rejects paid event without priceCents", async () => {
    const { POST: createEventPost } = await import("../../app/api/admin/events/route");

    const response = await createEventPost(
      new Request("http://localhost/api/admin/events", {
        method: "POST",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "admin",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          title: "Evento pago sem preço",
          description: "Descrição válida com mais de vinte caracteres para passar na válidação base.",
          startsAt: "2026-04-20T18:30:00.000Z",
          location: "Online",
          accessType: "paid_members"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.success).toBe(false);
  });
});
