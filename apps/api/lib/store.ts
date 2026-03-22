import { mockEvents, mockMembers, mockRanking } from "@elo/core";

type MockMember = (typeof mockMembers)[number] & {
  authUserId: string | null;
  mustChangePassword: boolean;
  onboardingApplicationId: string | null;
};

type MockProjectIdea = {
  id: string;
  title: string;
  summary: string;
  category: string;
  businessAreas: string[];
  vision: string;
  needs: Array<{
    title: string;
    description: string;
  }>;
  galleryImageUrls: string[];
  documentationFiles?: Array<{
    name: string;
    url: string;
    sizeBytes: number;
    contentType: "application/pdf";
    path?: string | null;
  }>;
  description: string;
  lookingFor: string;
  ownerName: string;
  ownerAvatarUrl?: string | null;
  ownerMemberId?: string;
  status?: "active" | "completed" | "inactive";
  completedAt?: string | null;
  inactivatedAt?: string | null;
  updatedAt?: string | null;
};

const now = Date.now();

const projectIdeas: MockProjectIdea[] = [
  {
    id: "project-1",
    title: "SaaS para RH",
    summary: "Operacao de RH com automacao e analytics para PMEs.",
    category: "B2B SaaS",
    businessAreas: ["B2B SaaS", "People Ops"],
    vision:
      "Construir uma plataforma de RH para PMEs que combine automacao operacional, acompanhamento de performance e inteligencia de dados para liderancas.",
    needs: [
      {
        title: "Cofounder tecnico",
        description: "Experiencia em produto SaaS para liderar arquitetura e entregas do MVP."
      }
    ],
    galleryImageUrls: [],
    documentationFiles: [],
    description:
      "Operacao de RH com automacao e analytics para PMEs.\n\nConstruir uma plataforma de RH para PMEs que combine automacao operacional, acompanhamento de performance e inteligencia de dados para liderancas.",
    lookingFor: "Cofounder tecnico",
    ownerName: "Ana Costa",
    ownerMemberId: "60948757-e688-41ec-b0fc-cf30cf8cc3d8",
    status: "active",
    completedAt: null,
    inactivatedAt: null,
    updatedAt: new Date(now - 24 * 3600 * 1000).toISOString()
  }
];

type MockProjectApplication = {
  id: string;
  projectId: string;
  ownerMemberId: string;
  applicantMemberId: string;
  message: string | null;
  status: "applied" | "accepted" | "rejected";
  reviewedAt?: string | null;
  reviewedByMemberId?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
};

type MockAuditLog = {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

type MockMemberNotification = {
  id: string;
  memberId: string;
  type: "project_application_accepted" | "project_application_rejected";
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

type MockMemberApplicationStatus = {
  id: string;
  code: string;
  label: string;
  isFinal: boolean;
  isSystem: boolean;
  active: boolean;
  sortOrder: number;
};

type MockMemberApplication = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  whatsapp: string;
  city: string;
  state: string;
  area: string;
  bio: string | null;
  specialty: string | null;
  avatarUrl: string | null;
  currentStatusId: string;
  internalNotes: string | null;
  rejectionReason: string | null;
  approvedMemberId: string | null;
  approvedAuthUserId: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type MockMemberApplicationStatusHistory = {
  id: string;
  applicationId: string;
  statusId: string;
  actorUserId: string | null;
  note: string | null;
  createdAt: string;
};

type MockEventPayment = {
  id: string;
  eventId: string;
  memberId: string;
  gateway: string;
  gatewayPaymentId: string;
  externalReference: string;
  amountCents: number;
  status: "pending" | "paid" | "expired" | "refunded";
  checkoutUrl: string | null;
  pixQrCode: string | null;
  gatewayPayload: Record<string, unknown> | null;
  paidAt: string | null;
  createdAt: string;
};

type MockEventRegistration = {
  eventId: string;
  memberId: string;
  status: "confirmed" | "canceled";
  createdAt: string;
};

type MockMembershipPayment = {
  id: string;
  membershipId: string;
  gateway: string;
  gatewayPaymentId: string;
  externalReference: string;
  amountCents: number;
  status: "pending" | "paid" | "expired" | "refunded";
  checkoutUrl: string | null;
  pixQrCode: string | null;
  gatewayPayload: Record<string, unknown> | null;
  paidAt: string | null;
  createdAt: string;
};

type MockMembership = {
  id: string;
  memberId: string;
  startedAt: string;
  expiresAt: string;
  status: "active" | "expired" | "canceled";
  createdAt: string;
};

type MockSeason = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
  createdAt: string;
};

type MockPointsLedgerEntry = {
  id: string;
  seasonId: string;
  memberId: string;
  points: number;
  reason: string;
  createdAt: string;
};

type MockBadge = {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  createdAt: string;
};

type MockMemberBadge = {
  id: string;
  memberId: string;
  badgeId: string;
  seasonId: string | null;
  grantedAt: string;
};

type MockMemberLink = {
  id: string;
  followerMemberId: string;
  followedMemberId: string;
  createdAt: string;
};

const defaultMemberships: MockMembership[] = mockMembers.map((member) => ({
  id: `membership-${member.id}`,
  memberId: member.id,
  startedAt: new Date(now - 30 * 24 * 3600 * 1000).toISOString(),
  expiresAt: new Date(now + 30 * 24 * 3600 * 1000).toISOString(),
  status: "active",
  createdAt: new Date(now - 30 * 24 * 3600 * 1000).toISOString()
}));

const defaultMemberApplicationStatuses: MockMemberApplicationStatus[] = [
  {
    id: "member-status-new-request",
    code: "new_request",
    label: "Nova solicitacao",
    isFinal: false,
    isSystem: true,
    active: true,
    sortOrder: 10
  },
  {
    id: "member-status-awaiting-whatsapp",
    code: "awaiting_whatsapp_contact",
    label: "Aguardando contato via WhatsApp",
    isFinal: false,
    isSystem: true,
    active: true,
    sortOrder: 20
  },
  {
    id: "member-status-awaiting-payment",
    code: "awaiting_payment",
    label: "Aguardando pagamento",
    isFinal: false,
    isSystem: true,
    active: true,
    sortOrder: 30
  },
  {
    id: "member-status-under-review",
    code: "under_review",
    label: "Em analise",
    isFinal: false,
    isSystem: true,
    active: true,
    sortOrder: 40
  },
  {
    id: "member-status-approved",
    code: "approved",
    label: "Aprovado",
    isFinal: true,
    isSystem: true,
    active: true,
    sortOrder: 90
  },
  {
    id: "member-status-rejected",
    code: "rejected",
    label: "Recusado",
    isFinal: true,
    isSystem: true,
    active: true,
    sortOrder: 100
  }
];

const defaultSeasons: MockSeason[] = [
  {
    id: "7b2b6d8b-2d68-47f1-b56c-a2d28383887d",
    name: "Temporada 2026.1",
    startsAt: "2026-01-10T00:00:00.000Z",
    endsAt: "2026-06-30T23:59:59.000Z",
    active: true,
    createdAt: new Date(now - 40 * 24 * 3600 * 1000).toISOString()
  }
];

const defaultPointsLedger: MockPointsLedgerEntry[] = mockRanking.map((entry, index) => ({
  id: `points-seed-${index + 1}`,
  seasonId: defaultSeasons[0].id,
  memberId: entry.memberId,
  points: entry.points,
  reason: "Seed inicial da temporada",
  createdAt: new Date(now - (index + 1) * 3600 * 1000).toISOString()
}));

const defaultBadges: MockBadge[] = [
  {
    id: "badge-ouro",
    name: "ouro",
    description: "Top 1 da temporada ativa",
    iconUrl: null,
    createdAt: new Date(now - 24 * 3600 * 1000).toISOString()
  },
  {
    id: "badge-prata",
    name: "prata",
    description: "Top 2 da temporada ativa",
    iconUrl: null,
    createdAt: new Date(now - 24 * 3600 * 1000).toISOString()
  },
  {
    id: "badge-bronze",
    name: "bronze",
    description: "Top 3 da temporada ativa",
    iconUrl: null,
    createdAt: new Date(now - 24 * 3600 * 1000).toISOString()
  }
];

export const memoryStore = {
  members: mockMembers.map((member) => ({
    ...member,
    authUserId:
      member.id === "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e"
        ? "00000000-0000-0000-0000-000000000020"
        : null,
    mustChangePassword: false,
    onboardingApplicationId: null
  })) as MockMember[],
  memberships: [...defaultMemberships],
  seasons: [...defaultSeasons],
  pointsLedger: [...defaultPointsLedger],
  badges: [...defaultBadges],
  memberBadges: [] as MockMemberBadge[],
  memberLinks: [] as MockMemberLink[],
  events: [...mockEvents],
  ranking: [...mockRanking],
  projectIdeas,
  projectApplications: [] as MockProjectApplication[],
  memberNotifications: [] as MockMemberNotification[],
  memberApplicationStatuses: [...defaultMemberApplicationStatuses],
  memberApplications: [] as MockMemberApplication[],
  memberApplicationStatusHistory: [] as MockMemberApplicationStatusHistory[],
  auditLogs: [] as MockAuditLog[],
  membershipPayments: [] as MockMembershipPayment[],
  eventPayments: [] as MockEventPayment[],
  eventRegistrations: [] as MockEventRegistration[]
};
