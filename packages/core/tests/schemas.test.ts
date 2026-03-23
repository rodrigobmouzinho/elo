import { describe, expect, it } from "vitest";
import {
  eventSchema,
  firstAccessPasswordSchema,
  loginSchema,
  memberApplicationSchema,
  memberSchema,
  projectIdeaSchema
} from "../src/schemas";

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
      phone: "+55 (83) 91111-2222",
      whatsapp: "(83) 91111-2222",
      city: "Joao Pessoa",
      state: "PB",
      area: "tecnologia",
      membershipExpiresAt: "2027-03-14T12:00:00.000Z"
    };

    const parsed = memberSchema.safeParse(payload);

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.phone).toBe("83911112222");
    expect(parsed.success && parsed.data.whatsapp).toBe("83911112222");
  });

  it("validates member application payload", () => {
    const payload = {
      fullName: "Rodrigo Mouzinho",
      email: "rodrigo@elo.com",
      whatsapp: "+55 (83) 99988-7766",
      city: "Joao Pessoa",
      state: "PB",
      area: "Tecnologia",
      specialty: "Produto e crescimento",
      bio: "Construo produtos e comunidades com foco em conexao de negocio."
    };

    const parsed = memberApplicationSchema.safeParse(payload);

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.whatsapp).toBe("83999887766");
  });

  it("rejects invalid WhatsApp payload", () => {
    const payload = {
      fullName: "Rodrigo Mouzinho",
      email: "rodrigo@elo.com",
      whatsapp: "(83) 3333-4444",
      city: "Joao Pessoa",
      state: "PB",
      area: "Tecnologia"
    };

    expect(memberApplicationSchema.safeParse(payload).success).toBe(false);
  });

  it("enforces strong password policy on first access", () => {
    expect(
      firstAccessPasswordSchema.safeParse({
        password: "SenhaForte@2026"
      }).success
    ).toBe(true);

    expect(
      firstAccessPasswordSchema.safeParse({
        password: "fraca"
      }).success
    ).toBe(false);
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
      title: "Evento pago sem preco",
      description: "Descricao valida para garantir que o erro seja apenas de regra de acesso e preco.",
      startsAt: "2026-04-21T19:30:00.000Z",
      location: "Online",
      accessType: "paid_members"
    };

    expect(eventSchema.safeParse(payload).success).toBe(false);
  });

  it("validates project payload with uploaded documentation metadata", () => {
    const payload = {
      title: "Plataforma de conexoes B2B",
      summary: "Produto para aproximar founders e investidores com networking validado.",
      businessAreas: ["Marketplace", "B2B"],
      vision:
        "Criar um ambiente de conexoes de negocio que ajude founders e investidores a se encontrarem com mais contexto, afinidade estrategica e velocidade.",
      needs: [
        {
          title: "Cofounder de tecnologia",
          description: "Experiencia com produto digital e arquitetura de marketplace B2B."
        }
      ],
      galleryImageUrls: [
        "https://example.com/mockup-1.webp",
        "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IC4AAADQAgCdASoCAAIALmk0mk0iIiIi"
      ],
      documentationFiles: [
        {
          name: "pitch-deck.pdf",
          url: "https://example.com/pitch-deck.pdf",
          sizeBytes: 820000,
          contentType: "application/pdf",
          path: "projects/member/documentation/pitch-deck.pdf"
        }
      ]
    };

    expect(projectIdeaSchema.safeParse(payload).success).toBe(true);
  });
});
