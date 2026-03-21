import { describe, expect, it } from "vitest";
import { eventSchema, loginSchema, memberSchema } from "../src/schemas";

describe("core schemas", () => {
  it("validates login payload", () => {
    const parsed = loginSchema.parse({
      email: "admin@elo.com",
      password: "supersecret1"
    });

    expect(parsed.email).toBe("admin@elo.com");
  });

  it("validates member payload", () => {
    const payload = {
      fullName: "Maria Silva",
      email: "maria@elo.com",
      phone: "83911112222",
      whatsapp: "83911112222",
      city: "Joao Pessoa",
      state: "PB",
      area: "tecnologia",
      membershipExpiresAt: "2027-03-14T12:00:00.000Z"
    };

    expect(memberSchema.safeParse(payload).success).toBe(true);
  });

  it("validates paid event payload with image", () => {
    const payload = {
      title: "Evento Premium Elo",
      description: "Conteudo de valor para membros com trilha premium e networking qualificado.",
      startsAt: "2026-04-21T19:30:00.000Z",
      location: "Joao Pessoa - PB",
      accessType: "paid_members",
      priceCents: 9900,
      heroImageUrl: "https://images.example.com/eventos/premium.jpg",
      galleryImageUrls: [
        "https://images.example.com/eventos/premium-1.jpg",
        "https://images.example.com/eventos/premium-2.jpg"
      ]
    };

    expect(eventSchema.safeParse(payload).success).toBe(true);
  });

  it("rejects paid event without price", () => {
    const payload = {
      title: "Evento pago sem preço",
      description: "Descrição válida para garantir que o erro seja apenas de regra de acesso e preço.",
      startsAt: "2026-04-21T19:30:00.000Z",
      location: "Online",
      accessType: "paid_members"
    };

    expect(eventSchema.safeParse(payload).success).toBe(false);
  });
});
