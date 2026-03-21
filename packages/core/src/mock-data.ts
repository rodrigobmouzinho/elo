import type { EventSummary, Member, SeasonRankingEntry } from "./types";

export const mockEvents: EventSummary[] = [
  {
    id: "ev-1",
    title: "Elo Founders Night",
    summary: "Encontro presencial para troca de experiencias entre founders.",
    startsAt: "2026-04-05T19:00:00.000Z",
    location: "Joao Pessoa - PB",
    accessType: "free_members",
    heroImageUrl: "/event-placeholder.svg"
  },
  {
    id: "ev-2",
    title: "Pitch & Growth Sprint",
    summary: "Evento com dinamicas e trilha de crescimento para startups.",
    startsAt: "2026-04-20T18:30:00.000Z",
    location: "Online",
    accessType: "paid_members",
    priceCents: 7900,
    heroImageUrl: "/event-placeholder.svg"
  }
];

export const mockMembers: Member[] = [
  {
    id: "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e",
    fullName: "Ana Costa",
    email: "ana@elo.com",
    phone: "83999990000",
    whatsapp: "83999990000",
    city: "Joao Pessoa",
    state: "PB",
    area: "tecnologia",
    bio: "Construindo produtos digitais para SMBs.",
    specialty: "produto e growth",
    active: true
  },
  {
    id: "60948757-e688-41ec-b0fc-cf30cf8cc3d8",
    fullName: "Pedro Nunes",
    email: "pedro@elo.com",
    phone: "83988887777",
    whatsapp: "83988887777",
    city: "Recife",
    state: "PE",
    area: "vendas",
    bio: "Escalo operacoes comerciais B2B.",
    specialty: "inside sales",
    active: true
  }
];

export const mockRanking: SeasonRankingEntry[] = [
  {
    memberId: "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e",
    name: "Ana Costa",
    points: 1240,
    rank: 1,
    medals: ["ouro", "networker"]
  },
  {
    memberId: "60948757-e688-41ec-b0fc-cf30cf8cc3d8",
    name: "Pedro Nunes",
    points: 1160,
    rank: 2,
    medals: ["prata"]
  }
];
