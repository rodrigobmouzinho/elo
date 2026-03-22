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
export type MemberApplicationStatusCode =
  | "new_request"
  | "awaiting_whatsapp_contact"
  | "awaiting_payment"
  | "under_review"
  | "approved"
  | "rejected"
  | (string & {});

export type MemberApplicationStatus = {
  id: string;
  code: MemberApplicationStatusCode;
  label: string;
  isFinal: boolean;
  isSystem: boolean;
  active: boolean;
  sortOrder: number;
};

export type MemberApplication = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  whatsapp: string;
  city: string;
  state: string;
  area: string;
  bio?: string;
  specialty?: string;
  avatarUrl?: string;
  internalNotes?: string;
  rejectionReason?: string;
  approvedMemberId?: string | null;
  approvedAuthUserId?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  status: MemberApplicationStatus;
};

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
  authUserId?: string | null;
  mustChangePassword?: boolean;
  onboardingApplicationId?: string | null;
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
