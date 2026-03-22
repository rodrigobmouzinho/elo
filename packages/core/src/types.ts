export type UserRole = "admin" | "member";

export type EventAccessType =
  | "free_members"
  | "paid_members"
  | "public_with_member_discount";

export type PaymentStatus = "pending" | "paid" | "expired" | "refunded";
export type ProjectStatus = "active" | "completed" | "inactive";
export type ProjectApplicationStatus = "applied" | "accepted" | "rejected";
export type ProjectNotificationType =
  | "project_application_accepted"
  | "project_application_rejected";
export type ProjectUploadKind = "gallery" | "documentation";

export type ProjectDocumentFile = {
  name: string;
  url: string;
  sizeBytes: number;
  contentType: "application/pdf";
  path?: string | null;
};

export type Member = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  whatsapp: string;
  city: string;
  state: string;
  area: string;
  bio?: string;
  specialty?: string;
  avatarUrl?: string;
  active: boolean;
};

export type EventSummary = {
  id: string;
  title: string;
  summary: string;
  startsAt: string;
  location: string;
  onlineUrl?: string;
  heroImageUrl?: string;
  galleryImageUrls?: string[];
  accessType: EventAccessType;
  priceCents?: number;
};

export type SeasonRankingEntry = {
  memberId: string;
  name: string;
  points: number;
  rank: number;
  medals: string[];
};
