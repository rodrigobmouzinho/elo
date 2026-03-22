import type {
  EventSummary,
  Member,
  PaymentStatus,
  ProjectApplicationStatus,
  ProjectNotificationType,
  ProjectStatus,
  SeasonRankingEntry
} from "@elo/core";
import type { z } from "zod";
import {
  eventSchema,
  memberSchema,
  pointsLaunchSchema,
  projectStatusUpdateSchema,
  seasonSchema
} from "@elo/core";
import {
  buildProjectDbPayload,
  PROJECT_DOCUMENTATION_SELECT,
  buildProjectLifecycleDbPayload,
  isMissingProjectDocumentationColumnsError,
  isMissingProjectEnhancedColumnsError,
  isMissingProjectLifecycleColumnsError,
  normalizeProjectRow,
  PROJECT_LIST_SELECT_BASE,
  PROJECT_LIST_SELECT_WITH_ENHANCED,
  PROJECT_LIST_SELECT_WITH_ENHANCED_AND_LIFECYCLE,
  PROJECT_LIST_SELECT_WITH_LIFECYCLE,
  toProjectInput
} from "./project-ideas";
import type {
  ProjectInput,
  ProjectLifecycleState,
  ProjectRow
} from "./project-ideas";
import { memoryStore } from "./store";
import { hasSupabase, supabaseAdmin } from "./supabase";

type MemberInput = z.infer<typeof memberSchema>;
type MemberPatchInput = Partial<Omit<MemberInput, "membershipExpiresAt">> & {
  active?: boolean;
};
type EventInput = z.infer<typeof eventSchema>;
type EventPatchInput = Partial<EventInput>;
type PointsInput = z.infer<typeof pointsLaunchSchema>;
type SeasonInput = z.infer<typeof seasonSchema>;
type EventRow = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at?: string | null;
  location: string;
  online_url?: string | null;
  access_type: EventSummary["accessType"];
  price_cents: number | null;
  hero_image_url: string | null;
  gallery_image_urls: string[] | null;
};
type EventRowMaybeGallery = Omit<EventRow, "gallery_image_urls"> & {
  gallery_image_urls?: string[] | null;
};
type MemberRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  city: string;
  state: string;
  area: string;
  bio: string | null;
  specialty: string | null;
  avatar_url: string | null;
  active: boolean;
};
type ProjectOwnerRow = {
  id: string;
  owner_member_id: string;
  status?: ProjectStatus | null;
  completed_at?: string | null;
  inactivated_at?: string | null;
  updated_at?: string | null;
};
type ProjectApplicationRow = {
  id: string;
  project_id: string;
  applicant_member_id: string;
  status: ProjectApplicationStatus;
  message: string | null;
  reviewed_at?: string | null;
  reviewed_by_member_id?: string | null;
  rejection_reason?: string | null;
  created_at: string;
};
type MemberNotificationRow = {
  id: string;
  member_id: string;
  type: ProjectNotificationType;
  title: string;
  body: string;
  metadata: unknown;
  read_at: string | null;
  created_at: string;
};
type MembershipPaymentRow = {
  id: string;
  gateway: string;
  status: PaymentStatus;
  amount_cents: number;
  created_at: string;
};
type MembershipFinanceDbRow = {
  id: string;
  member_id: string;
  status: "active" | "expired" | "canceled";
  expires_at: string;
  member_profiles: { full_name: string } | Array<{ full_name: string }> | null;
  membership_payments: MembershipPaymentRow[] | null;
};
type PaymentMetricRow = {
  status: PaymentStatus;
  amount_cents: number | null;
  created_at: string;
};
type MembershipStatusMetricRow = {
  status: "active" | "expired" | "canceled";
  expires_at: string;
};
type SeasonRow = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  active: boolean;
  created_at: string;
};
type SeasonHistoryRow = {
  id: string;
  name: string;
  ends_at: string;
};
type BadgeRow = {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
};
type EventPaymentStatusRow = {
  id: string;
  gateway: string;
  status: PaymentStatus;
  gateway_payment_id: string | null;
  external_reference: string | null;
  checkout_url: string | null;
  pix_qr_code: string | null;
  gateway_payload: unknown;
  paid_at: string | null;
  created_at: string;
};

type PendingEventPaymentDbRow = {
  id: string;
  event_id: string;
  member_id: string;
  amount_cents: number;
  status: PaymentStatus;
  gateway: string;
  gateway_payment_id: string | null;
  external_reference: string | null;
  created_at: string;
  events: { title: string } | Array<{ title: string }> | null;
  member_profiles: { full_name: string } | Array<{ full_name: string }> | null;
};

export type MembershipFinanceRow = {
  membershipId: string;
  memberId: string;
  memberName: string;
  status: "active" | "expired" | "canceled";
  expiresAt: string;
  latestPaymentId: string | null;
  latestPaymentGateway: string | null;
  latestPaymentStatus: PaymentStatus | "none";
  latestPaymentAmountCents: number;
};

export type FinanceOverview = {
  membershipRevenueCents: number;
  eventRevenueCents: number;
  pendingMembershipPayments: number;
  pendingEventPayments: number;
  overduePayments: number;
};

export type FinanceDateRange = {
  startAt?: string;
  endAt?: string;
};

export type EventCheckoutStatus = {
  paymentStatus: PaymentStatus | "none";
  presenceConfirmed: boolean;
  gateway: string | null;
  gatewayPaymentId: string | null;
  checkoutUrl: string | null;
  pixQrCode: string | null;
  statusUpdatedAt: string | null;
};

export type EventPaymentRecord = {
  id: string;
  gateway: string;
  status: PaymentStatus;
  gatewayPaymentId: string | null;
  externalReference: string | null;
  checkoutUrl: string | null;
  pixQrCode: string | null;
  gatewayPayload: Record<string, unknown> | null;
  paidAt: string | null;
  createdAt: string;
};

export type PendingEventPaymentRow = {
  paymentId: string;
  eventId: string;
  eventTitle: string;
  memberId: string;
  memberName: string;
  amountCents: number;
  gateway: string;
  gatewayPaymentId: string | null;
  externalReference: string | null;
  status: PaymentStatus;
  createdAt: string;
};

export type SeasonSummary = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
  createdAt?: string;
};

export type SeasonChampionHistory = {
  seasonId: string;
  season: string;
  champion: string;
  classification: SeasonRankingEntry[];
};

export type BadgeGrantResult = {
  seasonId: string | null;
  seasonName: string | null;
  processedAt: string;
  grantedCount: number;
  grants: Array<{
    memberId: string;
    memberName: string;
    badgeName: string;
    rank: number;
  }>;
};

export type ProjectViewerAccess = {
  isOwner: boolean;
  isApprovedMember: boolean;
  canApply: boolean;
  canModerateApplications: boolean;
  canViewApplicants: boolean;
};

export type ProjectDetail = Awaited<ReturnType<typeof listProjects>>[number] & {
  viewerAccess: ProjectViewerAccess;
};

export type ProjectApplicantView = {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatarUrl: string | null;
  city: string | null;
  state: string | null;
  area: string | null;
  specialty: string | null;
  status: ProjectApplicationStatus;
  createdAt: string;
  reviewedAt: string | null;
  message: string | null;
  rejectionReason: string | null;
};

export type ProjectApplicationsView = {
  projectId: string;
  viewerAccess: ProjectViewerAccess;
  pending: ProjectApplicantView[];
  approved: ProjectApplicantView[];
  rejected: ProjectApplicantView[];
};

export type MemberNotification = {
  id: string;
  memberId: string;
  type: ProjectNotificationType;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

export type MemberNotificationsFeed = {
  items: MemberNotification[];
  unreadCount: number;
};

const EVENT_IMAGE_FALLBACK = "/event-placeholder.svg";
const SEASON_BADGE_RULES = [
  { rank: 1, badgeName: "ouro", description: "Top 1 da temporada ativa" },
  { rank: 2, badgeName: "prata", description: "Top 2 da temporada ativa" },
  { rank: 3, badgeName: "bronze", description: "Top 3 da temporada ativa" }
] as const;
const MEMBERSHIP_RENEWAL_DAYS = (() => {
  const parsed = Number(process.env.MEMBERSHIP_RENEWAL_DAYS ?? "365");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 365;
  }
  return Math.trunc(parsed);
})();
let eventGalleryColumnSupported: boolean | null = null;
let eventGalleryColumnSupportProbe: Promise<boolean> | null = null;
let projectEnhancedColumnsSupported: boolean | null = null;
let projectEnhancedColumnsSupportProbe: Promise<boolean> | null = null;
let projectLifecycleColumnsSupported: boolean | null = null;
let projectLifecycleColumnsSupportProbe: Promise<boolean> | null = null;
let projectDocumentationColumnsSupported: boolean | null = null;
let projectDocumentationColumnsSupportProbe: Promise<boolean> | null = null;
let projectApplicationReviewColumnsSupported: boolean | null = null;
let projectApplicationReviewColumnsSupportProbe: Promise<boolean> | null = null;
let memberNotificationsSupported: boolean | null = null;
let memberNotificationsSupportProbe: Promise<boolean> | null = null;

const EVENT_LIST_SELECT_BASE =
  "id, title, description, starts_at, location, online_url, access_type, price_cents, hero_image_url";
const EVENT_LIST_SELECT_WITH_GALLERY = `${EVENT_LIST_SELECT_BASE}, gallery_image_urls`;
const EVENT_DETAIL_SELECT_BASE = `${EVENT_LIST_SELECT_BASE}, ends_at`;
const EVENT_DETAIL_SELECT_WITH_GALLERY = `${EVENT_DETAIL_SELECT_BASE}, gallery_image_urls`;

function assertSupabase() {
  if (!hasSupabase || !supabaseAdmin) {
    throw new Error("Supabase não configurado");
  }
  return supabaseAdmin;
}

function isMissingGalleryColumnError(error: unknown) {
  const code = (error as { code?: string })?.code ?? "";
  const message = ((error as { message?: string })?.message ?? "").toLowerCase();

  return code === "42703" || message.includes("gallery_image_urls");
}

async function ensureEventGalleryColumnSupport() {
  if (!hasSupabase) {
    return true;
  }

  if (eventGalleryColumnSupported !== null) {
    return eventGalleryColumnSupported;
  }

  if (!eventGalleryColumnSupportProbe) {
    eventGalleryColumnSupportProbe = (async () => {
      const supabase = assertSupabase();
      const { error } = await supabase.from("events").select("gallery_image_urls").limit(1);

      if (error) {
        if (isMissingGalleryColumnError(error)) {
          eventGalleryColumnSupported = false;
          return false;
        }

        throw error;
      }

      eventGalleryColumnSupported = true;
      return true;
    })().finally(() => {
      eventGalleryColumnSupportProbe = null;
    });
  }

  return eventGalleryColumnSupportProbe;
}

async function ensureProjectEnhancedColumnsSupport() {
  if (!hasSupabase) {
    return true;
  }

  if (projectEnhancedColumnsSupported !== null) {
    return projectEnhancedColumnsSupported;
  }

  if (!projectEnhancedColumnsSupportProbe) {
    projectEnhancedColumnsSupportProbe = (async () => {
      const supabase = assertSupabase();
      const { error } = await supabase
        .from("projects")
        .select("summary, business_areas, vision, needs, gallery_image_urls")
        .limit(1);

      if (error) {
        if (isMissingProjectEnhancedColumnsError(error)) {
          projectEnhancedColumnsSupported = false;
          return false;
        }

        throw error;
      }

      projectEnhancedColumnsSupported = true;
      return true;
    })().finally(() => {
      projectEnhancedColumnsSupportProbe = null;
    });
  }

  return projectEnhancedColumnsSupportProbe;
}

async function ensureProjectLifecycleColumnsSupport() {
  if (!hasSupabase) {
    return true;
  }

  if (projectLifecycleColumnsSupported !== null) {
    return projectLifecycleColumnsSupported;
  }

  if (!projectLifecycleColumnsSupportProbe) {
    projectLifecycleColumnsSupportProbe = (async () => {
      const supabase = assertSupabase();
      const { error } = await supabase
        .from("projects")
        .select("status, completed_at, inactivated_at, updated_at")
        .limit(1);

      if (error) {
        if (isMissingProjectLifecycleColumnsError(error)) {
          projectLifecycleColumnsSupported = false;
          return false;
        }

        throw error;
      }

      projectLifecycleColumnsSupported = true;
      return true;
    })().finally(() => {
      projectLifecycleColumnsSupportProbe = null;
    });
  }

  return projectLifecycleColumnsSupportProbe;
}

async function ensureProjectDocumentationColumnsSupport() {
  if (!hasSupabase) {
    return true;
  }

  if (projectDocumentationColumnsSupported !== null) {
    return projectDocumentationColumnsSupported;
  }

  if (!projectDocumentationColumnsSupportProbe) {
    projectDocumentationColumnsSupportProbe = (async () => {
      const supabase = assertSupabase();
      const { error } = await supabase.from("projects").select("documentation_files").limit(1);

      if (error) {
        if (isMissingProjectDocumentationColumnsError(error)) {
          projectDocumentationColumnsSupported = false;
          return false;
        }

        throw error;
      }

      projectDocumentationColumnsSupported = true;
      return true;
    })().finally(() => {
      projectDocumentationColumnsSupportProbe = null;
    });
  }

  return projectDocumentationColumnsSupportProbe;
}

function isMissingProjectApplicationReviewColumnsError(error: unknown) {
  const code = (error as { code?: string })?.code ?? "";
  const message = ((error as { message?: string })?.message ?? "").toLowerCase();

  if (code === "42703") {
    return true;
  }

  return (
    message.includes("reviewed_at") ||
    message.includes("reviewed_by_member_id") ||
    message.includes("rejection_reason")
  );
}

async function ensureProjectApplicationReviewColumnsSupport() {
  if (!hasSupabase) {
    return true;
  }

  if (projectApplicationReviewColumnsSupported !== null) {
    return projectApplicationReviewColumnsSupported;
  }

  if (!projectApplicationReviewColumnsSupportProbe) {
    projectApplicationReviewColumnsSupportProbe = (async () => {
      const supabase = assertSupabase();
      const { error } = await supabase
        .from("project_applications")
        .select("reviewed_at, reviewed_by_member_id, rejection_reason")
        .limit(1);

      if (error) {
        if (isMissingProjectApplicationReviewColumnsError(error)) {
          projectApplicationReviewColumnsSupported = false;
          return false;
        }

        throw error;
      }

      projectApplicationReviewColumnsSupported = true;
      return true;
    })().finally(() => {
      projectApplicationReviewColumnsSupportProbe = null;
    });
  }

  return projectApplicationReviewColumnsSupportProbe;
}

function isMissingMemberNotificationsTableError(error: unknown) {
  const code = (error as { code?: string })?.code ?? "";
  const message = ((error as { message?: string })?.message ?? "").toLowerCase();

  return code === "42P01" || message.includes("member_notifications");
}

async function ensureMemberNotificationsSupport() {
  if (!hasSupabase) {
    return true;
  }

  if (memberNotificationsSupported !== null) {
    return memberNotificationsSupported;
  }

  if (!memberNotificationsSupportProbe) {
    memberNotificationsSupportProbe = (async () => {
      const supabase = assertSupabase();
      const { error } = await supabase.from("member_notifications").select("id").limit(1);

      if (error) {
        if (isMissingMemberNotificationsTableError(error)) {
          memberNotificationsSupported = false;
          return false;
        }

        throw error;
      }

      memberNotificationsSupported = true;
      return true;
    })().finally(() => {
      memberNotificationsSupportProbe = null;
    });
  }

  return memberNotificationsSupportProbe;
}

function buildProjectListSelectClause(options: {
  enhanced: boolean;
  lifecycle: boolean;
  documentation: boolean;
}) {
  let clause = PROJECT_LIST_SELECT_BASE;

  if (options.enhanced && options.lifecycle) {
    clause = PROJECT_LIST_SELECT_WITH_ENHANCED_AND_LIFECYCLE;
  } else if (options.enhanced) {
    clause = PROJECT_LIST_SELECT_WITH_ENHANCED;
  } else if (options.lifecycle) {
    clause = PROJECT_LIST_SELECT_WITH_LIFECYCLE;
  }

  if (options.documentation) {
    clause = `${clause}, ${PROJECT_DOCUMENTATION_SELECT}`;
  }

  return clause;
}

function normalizeProjectTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  const timestamp = parsed.getTime();
  return Number.isFinite(timestamp) ? parsed.toISOString() : null;
}

function createProjectLifecycleState(
  status: ProjectStatus,
  previous?: {
    completedAt?: string | null;
    inactivatedAt?: string | null;
  }
): ProjectLifecycleState {
  const now = new Date().toISOString();

  if (status === "completed") {
    return {
      status,
      completedAt: now,
      inactivatedAt: null,
      updatedAt: now
    };
  }

  if (status === "inactive") {
    return {
      status,
      completedAt: normalizeProjectTimestamp(previous?.completedAt),
      inactivatedAt: now,
      updatedAt: now
    };
  }

  return {
    status: "active",
    completedAt: null,
    inactivatedAt: null,
    updatedAt: now
  };
}

async function recordAuditLog(payload: {
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details?: Record<string, unknown> | null;
}) {
  if (!hasSupabase) {
    memoryStore.auditLogs.unshift({
      id: crypto.randomUUID(),
      actorId: payload.actorId,
      actorRole: payload.actorRole,
      action: payload.action,
      entityType: payload.entityType,
      entityId: payload.entityId,
      payload: payload.details ?? null,
      createdAt: new Date().toISOString()
    });
    return;
  }

  const supabase = assertSupabase();
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: payload.actorId,
    actor_role: payload.actorRole,
    action: payload.action,
    entity_type: payload.entityType,
    entity_id: payload.entityId,
    payload: payload.details ?? null
  });

  if (error) {
    throw error;
  }
}

async function loadViewerApplicationStatusMap(
  projectIds: string[],
  viewerMemberId?: string | null
): Promise<Map<string, ProjectApplicationStatus>> {
  const statusByProjectId = new Map<string, ProjectApplicationStatus>();

  if (!viewerMemberId || projectIds.length === 0) {
    return statusByProjectId;
  }

  if (!hasSupabase) {
    for (const application of memoryStore.projectApplications) {
      if (
        projectIds.includes(application.projectId) &&
        application.applicantMemberId === viewerMemberId
      ) {
        statusByProjectId.set(application.projectId, application.status);
      }
    }

    return statusByProjectId;
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("project_applications")
    .select("project_id, status")
    .eq("applicant_member_id", viewerMemberId)
    .in("project_id", projectIds);

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    if (row.project_id && row.status) {
      statusByProjectId.set(row.project_id, row.status as ProjectApplicationStatus);
    }
  }

  return statusByProjectId;
}

function buildProjectViewerAccess(
  project: Awaited<ReturnType<typeof listProjects>>[number],
  viewerMemberId?: string | null
): ProjectViewerAccess {
  const myApplicationStatus = project.myApplicationStatus ?? null;
  const isOwner = Boolean(viewerMemberId && project.ownerMemberId === viewerMemberId);
  const isApprovedMember = myApplicationStatus === "accepted";

  return {
    isOwner,
    isApprovedMember,
    canApply: !isOwner && project.acceptingApplications && myApplicationStatus === null,
    canModerateApplications: isOwner,
    canViewApplicants: isOwner || isApprovedMember
  };
}

async function listProjectApplicationRows(projectId: string): Promise<ProjectApplicationRow[]> {
  if (!hasSupabase) {
    return memoryStore.projectApplications
      .filter((application) => application.projectId === projectId)
      .map((application) => ({
        id: application.id,
        project_id: application.projectId,
        applicant_member_id: application.applicantMemberId,
        status: application.status,
        message: application.message,
        reviewed_at: (application as { reviewedAt?: string | null }).reviewedAt ?? null,
        reviewed_by_member_id:
          (application as { reviewedByMemberId?: string | null }).reviewedByMemberId ?? null,
        rejection_reason:
          (application as { rejectionReason?: string | null }).rejectionReason ?? null,
        created_at: application.createdAt
      }));
  }

  const supabase = assertSupabase();
  let supportsReviewColumns = await ensureProjectApplicationReviewColumnsSupport();

  for (;;) {
    const selectClause = supportsReviewColumns
      ? "id, project_id, applicant_member_id, status, message, reviewed_at, reviewed_by_member_id, rejection_reason, created_at"
      : "id, project_id, applicant_member_id, status, message, created_at";
    const { data, error } = await (supabase
      .from("project_applications")
      .select(selectClause) as unknown as {
      eq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => Promise<{
          data: Array<Record<string, unknown>> | null;
          error: unknown;
        }>;
      };
    })
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (!error) {
      return (data ?? []).map((row) => ({
        id: row.id,
        project_id: row.project_id,
        applicant_member_id: row.applicant_member_id,
        status: row.status as ProjectApplicationStatus,
        message: row.message ?? null,
        reviewed_at: "reviewed_at" in row ? (row.reviewed_at as string | null) ?? null : null,
        reviewed_by_member_id:
          "reviewed_by_member_id" in row
            ? (row.reviewed_by_member_id as string | null) ?? null
            : null,
        rejection_reason:
          "rejection_reason" in row ? (row.rejection_reason as string | null) ?? null : null,
        created_at: row.created_at as string
      })) as ProjectApplicationRow[];
    }

    if (supportsReviewColumns && isMissingProjectApplicationReviewColumnsError(error)) {
      projectApplicationReviewColumnsSupported = false;
      supportsReviewColumns = false;
      continue;
    }

    throw error;
  }
}

async function loadProjectApplicantProfileMap(applicantIds: string[]) {
  const profileMap = new Map<
    string,
    {
      id: string;
      fullName: string;
      avatarUrl: string | null;
      city: string | null;
      state: string | null;
      area: string | null;
      specialty: string | null;
    }
  >();

  if (applicantIds.length === 0) {
    return profileMap;
  }

  if (!hasSupabase) {
    for (const member of memoryStore.members) {
      if (applicantIds.includes(member.id)) {
        profileMap.set(member.id, {
          id: member.id,
          fullName: member.fullName,
          avatarUrl: member.avatarUrl ?? null,
          city: member.city ?? null,
          state: member.state ?? null,
          area: member.area ?? null,
          specialty: member.specialty ?? null
        });
      }
    }

    return profileMap;
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("member_profiles")
    .select("id, full_name, avatar_url, city, state, area, specialty")
    .in("id", applicantIds);

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    profileMap.set(row.id, {
      id: row.id,
      fullName: row.full_name ?? "Membro Elo",
      avatarUrl: row.avatar_url ?? null,
      city: row.city ?? null,
      state: row.state ?? null,
      area: row.area ?? null,
      specialty: row.specialty ?? null
    });
  }

  return profileMap;
}

function toProjectApplicantView(
  application: ProjectApplicationRow,
  profileMap: Map<
    string,
    {
      id: string;
      fullName: string;
      avatarUrl: string | null;
      city: string | null;
      state: string | null;
      area: string | null;
      specialty: string | null;
    }
  >,
  includePrivateFields: boolean
): ProjectApplicantView {
  const profile = profileMap.get(application.applicant_member_id);

  return {
    id: application.id,
    memberId: application.applicant_member_id,
    memberName: profile?.fullName ?? "Membro Elo",
    memberAvatarUrl: profile?.avatarUrl ?? null,
    city: profile?.city ?? null,
    state: profile?.state ?? null,
    area: profile?.area ?? null,
    specialty: profile?.specialty ?? null,
    status: application.status,
    createdAt: application.created_at,
    reviewedAt: application.reviewed_at ?? null,
    message: includePrivateFields ? application.message : null,
    rejectionReason: includePrivateFields ? application.rejection_reason ?? null : null
  };
}

function toMemberNotification(row: MemberNotificationRow): MemberNotification {
  return {
    id: row.id,
    memberId: row.member_id,
    type: row.type,
    title: row.title,
    body: row.body,
    metadata: toJsonRecord(row.metadata),
    readAt: row.read_at,
    createdAt: row.created_at
  };
}

async function createMemberNotification(payload: {
  memberId: string;
  type: ProjectNotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
}) {
  const createdAt = new Date().toISOString();

  if (!hasSupabase) {
    const notification: MemberNotification = {
      id: crypto.randomUUID(),
      memberId: payload.memberId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      metadata: payload.metadata ?? null,
      readAt: null,
      createdAt
    };

    memoryStore.memberNotifications.unshift(notification);

    await recordAuditLog({
      actorId: payload.memberId,
      actorRole: "member",
      action: "member.notification_created",
      entityType: "member_notification",
      entityId: notification.id,
      details: {
        memberId: payload.memberId,
        type: payload.type,
        metadata: payload.metadata ?? null
      }
    });

    return notification;
  }

  const supported = await ensureMemberNotificationsSupport();
  if (!supported) {
    return null;
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("member_notifications")
    .insert({
      member_id: payload.memberId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      metadata: payload.metadata ?? {},
      read_at: null,
      created_at: createdAt
    })
    .select("id, member_id, type, title, body, metadata, read_at, created_at")
    .single();

  if (error) {
    if (isMissingMemberNotificationsTableError(error)) {
      memberNotificationsSupported = false;
      return null;
    }

    throw error;
  }

  const notification = toMemberNotification(data as MemberNotificationRow);

  await recordAuditLog({
    actorId: payload.memberId,
    actorRole: "member",
    action: "member.notification_created",
    entityType: "member_notification",
    entityId: notification.id,
    details: {
      memberId: payload.memberId,
      type: payload.type,
      metadata: payload.metadata ?? null
    }
  });

  return notification;
}

function withGalleryFallback<T extends EventRowMaybeGallery>(
  row: T
): Omit<T, "gallery_image_urls"> & { gallery_image_urls: string[] } {
  return {
    ...row,
    gallery_image_urls: Array.isArray(row.gallery_image_urls) ? row.gallery_image_urls : []
  };
}

function toEventSummary(row: EventRow): EventSummary {
  return {
    id: row.id,
    title: row.title,
    summary: String(row.description ?? "").slice(0, 90),
    startsAt: row.starts_at,
    location: row.location,
    onlineUrl: row.online_url ?? undefined,
    accessType: row.access_type,
    priceCents: row.price_cents ?? undefined,
    heroImageUrl: row.hero_image_url ?? undefined,
    galleryImageUrls: row.gallery_image_urls ?? undefined
  };
}

function toSeasonSummary(row: SeasonRow): SeasonSummary {
  return {
    id: row.id,
    name: row.name,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    active: row.active,
    createdAt: row.created_at
  };
}

function toRankingEntryMedals(rank: number) {
  return SEASON_BADGE_RULES.filter((rule) => rule.rank === rank).map((rule) => rule.badgeName);
}

function buildRankingFromTotals(totals: Map<string, { points: number; name: string }>) {
  return [...totals.entries()]
    .map(([memberId, total]) => ({ memberId, name: total.name, points: total.points }))
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      medals: toRankingEntryMedals(index + 1)
    }));
}

function buildSeasonChampionHistory(
  seasons: Array<{ id: string; name: string; endsAt: string }>,
  totalsBySeason: Map<string, Map<string, { points: number; name: string }>>
): SeasonChampionHistory[] {
  return [...seasons]
    .filter((season) => {
      const endsAtMs = new Date(season.endsAt).getTime();
      return Number.isFinite(endsAtMs) && endsAtMs < Date.now();
    })
    .sort((a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime())
    .map((season) => {
      const classification = buildRankingFromTotals(totalsBySeason.get(season.id) ?? new Map()).slice(
        0,
        3
      );

      return {
        seasonId: season.id,
        season: season.name,
        champion: classification[0]?.name ?? "Sem campeao",
        classification
      };
    });
}

function resolveHeroImageUrl(value: string | undefined | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : EVENT_IMAGE_FALLBACK;
}

function resolveGalleryImageUrls(value: string[] | undefined | null) {
  const sanitized = (value ?? [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return sanitized.slice(0, 8);
}

function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    city: row.city,
    state: row.state,
    area: row.area,
    bio: row.bio ?? undefined,
    specialty: row.specialty ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    active: row.active
  };
}

function toJsonRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function isMembershipExpired(expiresAt: string, referenceDate = new Date()) {
  const expiresAtMs = new Date(expiresAt).getTime();
  return Number.isFinite(expiresAtMs) && expiresAtMs <= referenceDate.getTime();
}

function buildRenewedMembershipExpiration(expiresAt: string | null | undefined, referenceDate = new Date()) {
  const currentMs = expiresAt ? new Date(expiresAt).getTime() : Number.NaN;
  const baseMs =
    Number.isFinite(currentMs) && currentMs > referenceDate.getTime()
      ? currentMs
      : referenceDate.getTime();

  return new Date(baseMs + MEMBERSHIP_RENEWAL_DAYS * 24 * 3600 * 1000).toISOString();
}

function getLatestMockMembershipByMemberId(memberId: string) {
  return (
    memoryStore.memberships
      .filter((membership) => membership.memberId === memberId)
      .sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime())[0] ?? null
  );
}

async function syncMockMembershipValidity(memberId?: string) {
  const now = new Date();
  const memberships = memberId
    ? memoryStore.memberships.filter((item) => item.memberId === memberId)
    : memoryStore.memberships;
  const targetMemberIds = new Set<string>();

  for (const membership of memberships) {
    targetMemberIds.add(membership.memberId);
    if (membership.status === "active" && isMembershipExpired(membership.expiresAt, now)) {
      membership.status = "expired";
    }
  }

  for (const targetMemberId of targetMemberIds) {
    const member = memoryStore.members.find((item) => item.id === targetMemberId);
    if (!member) continue;

    const latestMembership = getLatestMockMembershipByMemberId(targetMemberId);
    if (!latestMembership || latestMembership.status !== "active") {
      member.active = false;
    }
  }
}

async function syncSupabaseMembershipValidity(memberId?: string) {
  const supabase = assertSupabase();
  const nowIso = new Date().toISOString();
  const expiredMemberIds = new Set<string>();

  let expireQuery = supabase
    .from("memberships")
    .update({ status: "expired" })
    .eq("status", "active")
    .lte("expires_at", nowIso)
    .select("member_id");

  if (memberId) {
    expireQuery = expireQuery.eq("member_id", memberId);
  }

  const { data: expiredRows, error: expireError } = await expireQuery;
  if (expireError) throw expireError;

  for (const row of expiredRows ?? []) {
    if (row.member_id) {
      expiredMemberIds.add(row.member_id);
    }
  }

  if (memberId) {
    expiredMemberIds.add(memberId);
  }

  for (const expiredMemberId of expiredMemberIds) {
    const { data: activeMemberships, error: activeMembershipsError } = await supabase
      .from("memberships")
      .select("id")
      .eq("member_id", expiredMemberId)
      .eq("status", "active")
      .gt("expires_at", nowIso)
      .limit(1);

    if (activeMembershipsError) throw activeMembershipsError;

    if ((activeMemberships ?? []).length === 0) {
      const { error: memberError } = await supabase
        .from("member_profiles")
        .update({ active: false })
        .eq("id", expiredMemberId)
        .eq("active", true);

      if (memberError) throw memberError;
    }
  }
}

async function syncMembershipValidity(memberId?: string) {
  if (!hasSupabase) {
    await syncMockMembershipValidity(memberId);
    return;
  }

  await syncSupabaseMembershipValidity(memberId);
}

function toDateRange(range?: FinanceDateRange) {
  const startAtMs = range?.startAt ? new Date(range.startAt).getTime() : Number.NaN;
  const endAtMs = range?.endAt ? new Date(range.endAt).getTime() : Number.NaN;

  return {
    startAtMs: Number.isFinite(startAtMs) ? startAtMs : null,
    endAtMs: Number.isFinite(endAtMs) ? endAtMs : null
  };
}

function inDateRange(isoDate: string, range?: FinanceDateRange) {
  const targetMs = new Date(isoDate).getTime();
  if (!Number.isFinite(targetMs)) return false;

  const normalized = toDateRange(range);
  if (normalized.startAtMs !== null && targetMs < normalized.startAtMs) return false;
  if (normalized.endAtMs !== null && targetMs > normalized.endAtMs) return false;

  return true;
}

export async function listMembers(): Promise<Member[]> {
  await syncMembershipValidity();

  if (!hasSupabase) return memoryStore.members;

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("member_profiles")
    .select(
      "id, full_name, email, phone, whatsapp, city, state, area, bio, specialty, avatar_url, active"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as MemberRow[];

  return rows.map((row) => toMember(row));
}

export async function getMemberById(memberId: string): Promise<Member | null> {
  await syncMembershipValidity(memberId);

  if (!hasSupabase) {
    return memoryStore.members.find((member) => member.id === memberId) ?? null;
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("member_profiles")
    .select(
      "id, full_name, email, phone, whatsapp, city, state, area, bio, specialty, avatar_url, active"
    )
    .eq("id", memberId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return toMember(data as MemberRow);
}

export async function createMember(payload: MemberInput) {
  const membershipStatus = isMembershipExpired(payload.membershipExpiresAt) ? "expired" : "active";
  const memberIsActive = membershipStatus === "active";

  if (!hasSupabase) {
    const record = {
      id: crypto.randomUUID(),
      active: memberIsActive,
      authUserId: null,
      mustChangePassword: false,
      onboardingApplicationId: null,
      ...payload
    };

    memoryStore.members.unshift(record);
    memoryStore.memberships.unshift({
      id: `membership-${record.id}`,
      memberId: record.id,
      startedAt: new Date().toISOString(),
      expiresAt: payload.membershipExpiresAt,
      status: membershipStatus,
      createdAt: new Date().toISOString()
    });
    return record;
  }

  const supabase = assertSupabase();

  const { data: member, error: memberError } = await supabase
    .from("member_profiles")
    .insert({
      full_name: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      whatsapp: payload.whatsapp,
      city: payload.city,
      state: payload.state,
      area: payload.area,
      bio: payload.bio ?? null,
      specialty: payload.specialty ?? null,
      active: memberIsActive
    })
    .select(
      "id, full_name, email, phone, whatsapp, city, state, area, bio, specialty, avatar_url, active"
    )
    .single();

  if (memberError) throw memberError;

  const { error: membershipError } = await supabase.from("memberships").insert({
    member_id: member.id,
    started_at: new Date().toISOString(),
    expires_at: payload.membershipExpiresAt,
    status: membershipStatus
  });

  if (membershipError) throw membershipError;

  return toMember(member as MemberRow);
}

export async function updateMember(memberId: string, patch: MemberPatchInput): Promise<Member | null> {
  if (!hasSupabase) {
    const member = memoryStore.members.find((entry) => entry.id === memberId);
    if (!member) return null;

    const next = {
      ...member,
      ...(patch.fullName !== undefined ? { fullName: patch.fullName } : {}),
      ...(patch.email !== undefined ? { email: patch.email } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.whatsapp !== undefined ? { whatsapp: patch.whatsapp } : {}),
      ...(patch.city !== undefined ? { city: patch.city } : {}),
      ...(patch.state !== undefined ? { state: patch.state } : {}),
      ...(patch.area !== undefined ? { area: patch.area } : {}),
      ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
      ...(patch.specialty !== undefined ? { specialty: patch.specialty } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {})
    };

    Object.assign(member, next);
    return member;
  }

  const supabase = assertSupabase();
  const updates: Record<string, unknown> = {};

  if (patch.fullName !== undefined) updates.full_name = patch.fullName;
  if (patch.email !== undefined) updates.email = patch.email;
  if (patch.phone !== undefined) updates.phone = patch.phone;
  if (patch.whatsapp !== undefined) updates.whatsapp = patch.whatsapp;
  if (patch.city !== undefined) updates.city = patch.city;
  if (patch.state !== undefined) updates.state = patch.state;
  if (patch.area !== undefined) updates.area = patch.area;
  if (patch.bio !== undefined) updates.bio = patch.bio || null;
  if (patch.specialty !== undefined) updates.specialty = patch.specialty || null;
  if (patch.active !== undefined) updates.active = patch.active;

  if (Object.keys(updates).length === 0) {
    return getMemberById(memberId);
  }

  const { data, error } = await supabase
    .from("member_profiles")
    .update(updates)
    .eq("id", memberId)
    .select(
      "id, full_name, email, phone, whatsapp, city, state, area, bio, specialty, avatar_url, active"
    )
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return toMember(data as MemberRow);
}

export async function setMemberActive(memberId: string, active: boolean): Promise<Member | null> {
  return updateMember(memberId, { active });
}

export async function listEvents(): Promise<EventSummary[]> {
  if (!hasSupabase) return memoryStore.events;

  const supabase = assertSupabase();
  const galleryColumnSupported = await ensureEventGalleryColumnSupport();
  const primarySelect = galleryColumnSupported ? EVENT_LIST_SELECT_WITH_GALLERY : EVENT_LIST_SELECT_BASE;
  const primaryQuery = await supabase
    .from("events")
    .select(primarySelect)
    .order("starts_at", { ascending: true });

  if (primaryQuery.error && isMissingGalleryColumnError(primaryQuery.error) && eventGalleryColumnSupported !== false) {
    eventGalleryColumnSupported = false;

    const fallbackQuery = await supabase
      .from("events")
      .select(EVENT_LIST_SELECT_BASE)
      .order("starts_at", { ascending: true });

    if (fallbackQuery.error) throw fallbackQuery.error;

    const rows = (fallbackQuery.data ?? []) as unknown as EventRowMaybeGallery[];
    return rows.map((event) => toEventSummary(withGalleryFallback(event) as EventRow));
  }

  if (primaryQuery.error) throw primaryQuery.error;

  if (eventGalleryColumnSupported === null) {
    eventGalleryColumnSupported = true;
  }

  const rows = (primaryQuery.data ?? []) as unknown as EventRow[];
  return rows.map((event) => toEventSummary(withGalleryFallback(event) as EventRow));
}

export async function getEventById(eventId: string): Promise<EventRow | null> {
  if (!hasSupabase) {
    const found = memoryStore.events.find((event) => event.id === eventId);
    if (!found) return null;

    return {
      ...found,
      description: found.summary,
      starts_at: found.startsAt,
      access_type: found.accessType,
      price_cents: found.priceCents ?? null,
      hero_image_url: found.heroImageUrl ?? null,
      gallery_image_urls: found.galleryImageUrls ?? [],
      online_url: found.onlineUrl ?? null
    };
  }

  const supabase = assertSupabase();
  const galleryColumnSupported = await ensureEventGalleryColumnSupport();
  const primarySelect = galleryColumnSupported ? EVENT_DETAIL_SELECT_WITH_GALLERY : EVENT_DETAIL_SELECT_BASE;
  const primaryQuery = await supabase
    .from("events")
    .select(primarySelect)
    .eq("id", eventId)
    .maybeSingle();

  if (primaryQuery.error && isMissingGalleryColumnError(primaryQuery.error) && eventGalleryColumnSupported !== false) {
    eventGalleryColumnSupported = false;

    const fallbackQuery = await supabase
      .from("events")
      .select(EVENT_DETAIL_SELECT_BASE)
      .eq("id", eventId)
      .maybeSingle();

    if (fallbackQuery.error) throw fallbackQuery.error;
    return fallbackQuery.data
      ? (withGalleryFallback(fallbackQuery.data as unknown as EventRowMaybeGallery) as EventRow)
      : fallbackQuery.data;
  }

  if (primaryQuery.error) throw primaryQuery.error;

  if (eventGalleryColumnSupported === null) {
    eventGalleryColumnSupported = true;
  }

  return primaryQuery.data
    ? (withGalleryFallback(primaryQuery.data as unknown as EventRow) as EventRow)
    : primaryQuery.data;
}

export async function createEvent(payload: EventInput) {
  const heroImageUrl = resolveHeroImageUrl(payload.heroImageUrl);
  const galleryImageUrls = resolveGalleryImageUrls(payload.galleryImageUrls);

  if (!hasSupabase) {
    const record = {
      id: crypto.randomUUID(),
      summary: payload.description.slice(0, 90),
      heroImageUrl,
      galleryImageUrls,
      ...payload
    };

    memoryStore.events.unshift(record);
    return record;
  }

  const supabase = assertSupabase();
  const galleryColumnSupported = await ensureEventGalleryColumnSupport();
  const baseInsert = {
    title: payload.title,
    description: payload.description,
    starts_at: payload.startsAt,
    ends_at: payload.endsAt ?? null,
    location: payload.location,
    online_url: payload.onlineUrl ?? null,
    access_type: payload.accessType,
    price_cents: payload.priceCents ?? null,
    hero_image_url: heroImageUrl
  };

  const primaryInsert = await supabase
    .from("events")
    .insert(
      !galleryColumnSupported
        ? baseInsert
        : {
            ...baseInsert,
            gallery_image_urls: galleryImageUrls
          }
    )
    .select(galleryColumnSupported ? EVENT_LIST_SELECT_WITH_GALLERY : EVENT_LIST_SELECT_BASE)
    .single();

  let data = primaryInsert.data as EventRow | Omit<EventRow, "gallery_image_urls"> | null;
  let error = primaryInsert.error;

  if (error && isMissingGalleryColumnError(error) && eventGalleryColumnSupported !== false) {
    eventGalleryColumnSupported = false;

    const fallbackInsert = await supabase.from("events").insert(baseInsert).select(EVENT_LIST_SELECT_BASE).single();
    data = fallbackInsert.data as Omit<EventRow, "gallery_image_urls"> | null;
    error = fallbackInsert.error;
  }

  if (error) throw error;

  if (eventGalleryColumnSupported === null) {
    eventGalleryColumnSupported = true;
  }

  const normalized = withGalleryFallback((data ?? {}) as EventRow);

  return {
    id: normalized.id,
    title: normalized.title,
    summary: normalized.description.slice(0, 90),
    startsAt: normalized.starts_at,
    location: normalized.location,
    onlineUrl: normalized.online_url ?? undefined,
    accessType: normalized.access_type,
    priceCents: normalized.price_cents ?? undefined,
    heroImageUrl: normalized.hero_image_url ?? undefined,
    galleryImageUrls: normalized.gallery_image_urls ?? []
  };
}

export async function updateEvent(eventId: string, patch: EventPatchInput): Promise<EventSummary | null> {
  if (!hasSupabase) {
    const event = memoryStore.events.find((entry) => entry.id === eventId);
    if (!event) return null;

    const nextPriceCents =
      patch.accessType === "free_members"
        ? undefined
        : patch.priceCents !== undefined
          ? patch.priceCents
          : event.priceCents;

    const nextHeroImage =
      patch.heroImageUrl !== undefined ? resolveHeroImageUrl(patch.heroImageUrl) : event.heroImageUrl;
    const nextGalleryImages =
      patch.galleryImageUrls !== undefined
        ? resolveGalleryImageUrls(patch.galleryImageUrls)
        : event.galleryImageUrls ?? [];

    const next = {
      ...event,
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { summary: patch.description.slice(0, 90) } : {}),
      ...(patch.startsAt !== undefined ? { startsAt: patch.startsAt } : {}),
      ...(patch.location !== undefined ? { location: patch.location } : {}),
      ...(patch.onlineUrl !== undefined ? { onlineUrl: patch.onlineUrl } : {}),
      ...(patch.accessType !== undefined ? { accessType: patch.accessType } : {}),
      ...(nextPriceCents !== undefined ? { priceCents: nextPriceCents } : { priceCents: undefined }),
      ...(nextHeroImage !== undefined ? { heroImageUrl: nextHeroImage } : {}),
      galleryImageUrls: nextGalleryImages
    };

    Object.assign(event, next);
    return event;
  }

  const supabase = assertSupabase();
  const galleryColumnSupported = await ensureEventGalleryColumnSupport();
  const updates: Record<string, unknown> = {};

  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.startsAt !== undefined) updates.starts_at = patch.startsAt;
  if (patch.endsAt !== undefined) updates.ends_at = patch.endsAt ?? null;
  if (patch.location !== undefined) updates.location = patch.location;
  if (patch.onlineUrl !== undefined) updates.online_url = patch.onlineUrl ?? null;
  if (patch.accessType !== undefined) updates.access_type = patch.accessType;
  if (patch.priceCents !== undefined) updates.price_cents = patch.priceCents;
  if (patch.heroImageUrl !== undefined) {
    updates.hero_image_url = resolveHeroImageUrl(patch.heroImageUrl);
  }
  if (patch.galleryImageUrls !== undefined && galleryColumnSupported) {
    updates.gallery_image_urls = resolveGalleryImageUrls(patch.galleryImageUrls);
  }
  if (patch.accessType === "free_members" && patch.priceCents === undefined) {
    updates.price_cents = null;
  }

  if (Object.keys(updates).length === 0) {
    const existing = await getEventById(eventId);
    return existing ? toEventSummary(existing as EventRow) : null;
  }

  const { data, error } = await supabase
    .from("events")
    .update(updates)
    .eq("id", eventId)
    .select(galleryColumnSupported ? EVENT_LIST_SELECT_WITH_GALLERY : EVENT_LIST_SELECT_BASE)
    .maybeSingle();

  if (error && isMissingGalleryColumnError(error) && eventGalleryColumnSupported !== false) {
    eventGalleryColumnSupported = false;

    const fallbackUpdates = { ...updates };
    delete fallbackUpdates.gallery_image_urls;

    const fallbackQuery = await supabase
      .from("events")
      .update(fallbackUpdates)
      .eq("id", eventId)
      .select(EVENT_LIST_SELECT_BASE)
      .maybeSingle();

    if (fallbackQuery.error) throw fallbackQuery.error;
    if (!fallbackQuery.data) return null;

    return toEventSummary(withGalleryFallback(fallbackQuery.data as unknown as EventRowMaybeGallery) as EventRow);
  }

  if (error) throw error;
  if (!data) return null;

  if (eventGalleryColumnSupported === null) {
    eventGalleryColumnSupported = true;
  }

  return toEventSummary(withGalleryFallback(data as unknown as EventRow) as EventRow);
}

export async function deleteEvent(eventId: string): Promise<boolean> {
  if (!hasSupabase) {
    const before = memoryStore.events.length;
    memoryStore.events = memoryStore.events.filter((event) => event.id !== eventId);
    return memoryStore.events.length < before;
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase.from("events").delete().eq("id", eventId).select("id").maybeSingle();

  if (error) throw error;
  return Boolean(data?.id);
}

export async function confirmPresence(eventId: string, memberId: string) {
  if (!hasSupabase) {
    const existing = memoryStore.eventRegistrations.find(
      (registration) => registration.eventId === eventId && registration.memberId === memberId
    );

    if (existing) {
      existing.status = "confirmed";
      return { eventId, memberId, status: "confirmed" };
    }

    memoryStore.eventRegistrations.unshift({
      eventId,
      memberId,
      status: "confirmed",
      createdAt: new Date().toISOString()
    });

    return { eventId, memberId, status: "confirmed" };
  }

  const supabase = assertSupabase();

  const { error } = await supabase.from("event_registrations").upsert(
    {
      event_id: eventId,
      member_id: memberId,
      status: "confirmed"
    },
    { onConflict: "event_id,member_id" }
  );

  if (error) throw error;

  return { eventId, memberId, status: "confirmed" };
}

export async function isEventParticipationValidated(eventId: string, memberId: string): Promise<boolean> {
  if (!hasSupabase) {
    return memoryStore.eventRegistrations.some(
      (item) => item.eventId === eventId && item.memberId === memberId && item.status === "confirmed"
    );
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("event_registrations")
    .select("id")
    .eq("event_id", eventId)
    .eq("member_id", memberId)
    .eq("status", "confirmed")
    .maybeSingle();

  if (error) throw error;

  return Boolean(data?.id);
}

export async function createElo(followerMemberId: string, followedMemberId: string) {
  if (followerMemberId === followedMemberId) {
    throw new Error("Não é permitido criar elo com o próprio perfil");
  }

  if (!hasSupabase) {
    const existing = memoryStore.memberLinks.find(
      (item) =>
        item.followerMemberId === followerMemberId && item.followedMemberId === followedMemberId
    );

    if (existing) {
      return { followerMemberId, followedMemberId, created: false };
    }

    memoryStore.memberLinks.unshift({
      id: crypto.randomUUID(),
      followerMemberId,
      followedMemberId,
      createdAt: new Date().toISOString()
    });

    return { followerMemberId, followedMemberId, created: true };
  }

  const supabase = assertSupabase();
  const { data: existing, error: existingError } = await supabase
    .from("member_links")
    .select("id")
    .eq("follower_member_id", followerMemberId)
    .eq("followed_member_id", followedMemberId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) {
    return { followerMemberId, followedMemberId, created: false };
  }

  const { error } = await supabase.from("member_links").insert({
    follower_member_id: followerMemberId,
    followed_member_id: followedMemberId
  });

  if (error) throw error;

  return { followerMemberId, followedMemberId, created: true };
}

export async function getProfile(memberId: string) {
  if (!hasSupabase) {
    return memoryStore.members[0];
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("member_profiles")
    .select(
      "id, full_name, email, phone, whatsapp, city, state, area, bio, specialty, avatar_url, active"
    )
    .eq("id", memberId)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    phone: data.phone,
    whatsapp: data.whatsapp,
    city: data.city,
    state: data.state,
    area: data.area,
    bio: data.bio ?? undefined,
    specialty: data.specialty ?? undefined,
    avatarUrl: data.avatar_url ?? undefined,
    active: data.active
  };
}

export async function patchProfile(
  memberId: string,
  patch: Partial<Pick<Member, "fullName" | "city" | "state" | "area" | "bio" | "specialty" | "avatarUrl">>
) {
  if (!hasSupabase) {
    const profile = memoryStore.members[0];
    Object.assign(profile, patch);
    return profile;
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("member_profiles")
    .update({
      full_name: patch.fullName,
      city: patch.city,
      state: patch.state,
      area: patch.area,
      bio: patch.bio,
      specialty: patch.specialty,
      avatar_url: patch.avatarUrl
    })
    .eq("id", memberId)
    .select(
      "id, full_name, email, phone, whatsapp, city, state, area, bio, specialty, avatar_url, active"
    )
    .single();

  if (error) throw error;

  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    phone: data.phone,
    whatsapp: data.whatsapp,
    city: data.city,
    state: data.state,
    area: data.area,
    bio: data.bio ?? undefined,
    specialty: data.specialty ?? undefined,
    avatarUrl: data.avatar_url ?? undefined,
    active: data.active
  };
}

export async function listSeasons(): Promise<SeasonSummary[]> {
  if (!hasSupabase) {
    return [...memoryStore.seasons]
      .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
      .map((season) => ({
        id: season.id,
        name: season.name,
        startsAt: season.startsAt,
        endsAt: season.endsAt,
        active: season.active,
        createdAt: season.createdAt
      }));
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("seasons")
    .select("id, name, starts_at, ends_at, active, created_at")
    .order("starts_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as SeasonRow[]).map((row) => toSeasonSummary(row));
}

export async function createSeason(payload: SeasonInput): Promise<SeasonSummary> {
  if (!hasSupabase) {
    const record = {
      id: crypto.randomUUID(),
      name: payload.name,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      active: false,
      createdAt: new Date().toISOString()
    };

    memoryStore.seasons.unshift(record);

    return {
      id: record.id,
      name: record.name,
      startsAt: record.startsAt,
      endsAt: record.endsAt,
      active: record.active,
      createdAt: record.createdAt
    };
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("seasons")
    .insert({
      name: payload.name,
      starts_at: payload.startsAt,
      ends_at: payload.endsAt,
      active: false
    })
    .select("id, name, starts_at, ends_at, active, created_at")
    .single();

  if (error) throw error;

  return toSeasonSummary(data as SeasonRow);
}

export async function activateSeason(seasonId: string): Promise<SeasonSummary | null> {
  if (!hasSupabase) {
    const target = memoryStore.seasons.find((season) => season.id === seasonId);
    if (!target) return null;

    for (const season of memoryStore.seasons) {
      season.active = season.id === seasonId;
    }

    return {
      id: target.id,
      name: target.name,
      startsAt: target.startsAt,
      endsAt: target.endsAt,
      active: target.active,
      createdAt: target.createdAt
    };
  }

  const supabase = assertSupabase();
  const { data: existing, error: existingError } = await supabase
    .from("seasons")
    .select("id")
    .eq("id", seasonId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existing) return null;

  const { error: resetError } = await supabase
    .from("seasons")
    .update({ active: false })
    .eq("active", true)
    .neq("id", seasonId);

  if (resetError) throw resetError;

  const { error: activateError } = await supabase
    .from("seasons")
    .update({ active: true })
    .eq("id", seasonId);

  if (activateError) throw activateError;

  const { data: activated, error: activatedError } = await supabase
    .from("seasons")
    .select("id, name, starts_at, ends_at, active, created_at")
    .eq("id", seasonId)
    .single();

  if (activatedError) throw activatedError;

  return toSeasonSummary(activated as SeasonRow);
}

export async function launchPoints(payload: PointsInput) {
  if (!hasSupabase) {
    const season = memoryStore.seasons.find((item) => item.id === payload.seasonId);
    if (!season) {
      throw new Error("Temporada não encontrada");
    }

    const member = memoryStore.members.find((item) => item.id === payload.memberId);
    if (!member) {
      throw new Error("Membro não encontrado");
    }

    memoryStore.pointsLedger.unshift({
      id: crypto.randomUUID(),
      seasonId: payload.seasonId,
      memberId: payload.memberId,
      points: payload.points,
      reason: payload.reason,
      createdAt: new Date().toISOString()
    });

    return payload;
  }

  const supabase = assertSupabase();

  const { error } = await supabase.from("points_ledger").insert({
    season_id: payload.seasonId,
    member_id: payload.memberId,
    points: payload.points,
    reason: payload.reason
  });

  if (error) throw error;

  return payload;
}

export async function getRanking(): Promise<{
  season: string;
  ranking: SeasonRankingEntry[];
  champions: SeasonChampionHistory[];
}> {
  if (!hasSupabase) {
    const activeSeason = memoryStore.seasons.find((item) => item.active);
    if (!activeSeason) {
      return {
        season: "Sem temporada ativa",
        ranking: [],
        champions: []
      };
    }

    const totals = new Map<string, { points: number; name: string }>();

    for (const row of memoryStore.pointsLedger.filter((item) => item.seasonId === activeSeason.id)) {
      const current = totals.get(row.memberId);
      const member = memoryStore.members.find((item) => item.id === row.memberId);

      totals.set(row.memberId, {
        points: (current?.points ?? 0) + row.points,
        name: member?.fullName ?? "Membro Elo"
      });
    }

    const ranking = buildRankingFromTotals(totals);
    const totalsBySeason = new Map<string, Map<string, { points: number; name: string }>>();

    for (const row of memoryStore.pointsLedger) {
      const seasonTotals = totalsBySeason.get(row.seasonId) ?? new Map<string, { points: number; name: string }>();
      const current = seasonTotals.get(row.memberId);
      const member = memoryStore.members.find((item) => item.id === row.memberId);

      seasonTotals.set(row.memberId, {
        points: (current?.points ?? 0) + row.points,
        name: member?.fullName ?? "Membro Elo"
      });
      totalsBySeason.set(row.seasonId, seasonTotals);
    }

    const champions = buildSeasonChampionHistory(
      memoryStore.seasons.map((season) => ({
        id: season.id,
        name: season.name,
        endsAt: season.endsAt
      })),
      totalsBySeason
    );

    return {
      season: activeSeason.name,
      ranking,
      champions
    };
  }

  const supabase = assertSupabase();

  const { data: activeSeason, error: seasonError } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("active", true)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (seasonError) throw seasonError;
  if (!activeSeason) {
    return {
      season: "Sem temporada ativa",
      ranking: [],
      champions: []
    };
  }

  const { data, error } = await supabase
    .from("points_ledger")
    .select("member_id, points, member_profiles(full_name)")
    .eq("season_id", activeSeason.id);

  if (error) throw error;

  const totals = new Map<string, { points: number; name: string }>();

  for (const row of data ?? []) {
    const key = row.member_id;
    const existing = totals.get(key);
    const fullName = (row.member_profiles as { full_name?: string } | null)?.full_name ?? "Membro Elo";

    totals.set(key, {
      name: fullName,
      points: (existing?.points ?? 0) + row.points
    });
  }

  const ranking = buildRankingFromTotals(totals);
  const { data: closedSeasons, error: closedSeasonsError } = await supabase
    .from("seasons")
    .select("id, name, ends_at")
    .lt("ends_at", new Date().toISOString())
    .order("ends_at", { ascending: false })
    .limit(10);

  if (closedSeasonsError) throw closedSeasonsError;

  const totalsBySeason = new Map<string, Map<string, { points: number; name: string }>>();
  const closedSeasonList = (closedSeasons ?? []) as SeasonHistoryRow[];

  if (closedSeasonList.length > 0) {
    const { data: historyPoints, error: historyPointsError } = await supabase
      .from("points_ledger")
      .select("season_id, member_id, points, member_profiles(full_name)")
      .in(
        "season_id",
        closedSeasonList.map((season) => season.id)
      );

    if (historyPointsError) throw historyPointsError;

    for (const row of historyPoints ?? []) {
      const seasonId = row.season_id;
      const seasonTotals =
        totalsBySeason.get(seasonId) ?? new Map<string, { points: number; name: string }>();
      const current = seasonTotals.get(row.member_id);
      const fullName = (row.member_profiles as { full_name?: string } | null)?.full_name ?? "Membro Elo";

      seasonTotals.set(row.member_id, {
        name: fullName,
        points: (current?.points ?? 0) + row.points
      });
      totalsBySeason.set(seasonId, seasonTotals);
    }
  }

  const champions = buildSeasonChampionHistory(
    closedSeasonList.map((season) => ({
      id: season.id,
      name: season.name,
      endsAt: season.ends_at
    })),
    totalsBySeason
  );

  return {
    season: activeSeason.name,
    ranking,
    champions
  };
}

export async function processAutomaticBadgesJob(): Promise<BadgeGrantResult> {
  const processedAt = new Date().toISOString();

  if (!hasSupabase) {
    const activeSeason = memoryStore.seasons.find((item) => item.active);

    if (!activeSeason) {
      return {
        seasonId: null,
        seasonName: null,
        processedAt,
        grantedCount: 0,
        grants: []
      };
    }

    const totals = new Map<string, { points: number; name: string }>();

    for (const row of memoryStore.pointsLedger.filter((item) => item.seasonId === activeSeason.id)) {
      const current = totals.get(row.memberId);
      const member = memoryStore.members.find((item) => item.id === row.memberId);

      totals.set(row.memberId, {
        points: (current?.points ?? 0) + row.points,
        name: member?.fullName ?? "Membro Elo"
      });
    }

    const ranking = buildRankingFromTotals(totals);
    const grants: BadgeGrantResult["grants"] = [];

    for (const rule of SEASON_BADGE_RULES) {
      const target = ranking.find((entry) => entry.rank === rule.rank);
      if (!target) continue;

      let badge = memoryStore.badges.find((item) => item.name === rule.badgeName);
      if (!badge) {
        badge = {
          id: `badge-${rule.badgeName}-${crypto.randomUUID()}`,
          name: rule.badgeName,
          description: rule.description,
          iconUrl: null,
          createdAt: processedAt
        };
        memoryStore.badges.unshift(badge);
      }

      const alreadyGranted = memoryStore.memberBadges.some(
        (item) =>
          item.memberId === target.memberId &&
          item.badgeId === badge.id &&
          item.seasonId === activeSeason.id
      );

      if (alreadyGranted) continue;

      memoryStore.memberBadges.unshift({
        id: `member-badge-${crypto.randomUUID()}`,
        memberId: target.memberId,
        badgeId: badge.id,
        seasonId: activeSeason.id,
        grantedAt: processedAt
      });

      grants.push({
        memberId: target.memberId,
        memberName: target.name,
        badgeName: badge.name,
        rank: target.rank
      });
    }

    return {
      seasonId: activeSeason.id,
      seasonName: activeSeason.name,
      processedAt,
      grantedCount: grants.length,
      grants
    };
  }

  const supabase = assertSupabase();
  const { data: activeSeason, error: seasonError } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("active", true)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (seasonError) throw seasonError;

  if (!activeSeason) {
    return {
      seasonId: null,
      seasonName: null,
      processedAt,
      grantedCount: 0,
      grants: []
    };
  }

  const { data: pointsRows, error: pointsError } = await supabase
    .from("points_ledger")
    .select("member_id, points, member_profiles(full_name)")
    .eq("season_id", activeSeason.id);

  if (pointsError) throw pointsError;

  const totals = new Map<string, { points: number; name: string }>();

  for (const row of pointsRows ?? []) {
    const key = row.member_id;
    const existing = totals.get(key);
    const fullName = (row.member_profiles as { full_name?: string } | null)?.full_name ?? "Membro Elo";

    totals.set(key, {
      name: fullName,
      points: (existing?.points ?? 0) + row.points
    });
  }

  const ranking = buildRankingFromTotals(totals);
  const badgeNames = SEASON_BADGE_RULES.map((rule) => rule.badgeName);
  const { data: existingBadges, error: existingBadgesError } = await supabase
    .from("badges")
    .select("id, name, description, icon_url")
    .in("name", badgeNames);

  if (existingBadgesError) throw existingBadgesError;

  const badgeByName = new Map<string, BadgeRow>();
  for (const row of (existingBadges ?? []) as BadgeRow[]) {
    badgeByName.set(row.name, row);
  }

  for (const rule of SEASON_BADGE_RULES) {
    if (badgeByName.has(rule.badgeName)) continue;

    const { data: createdBadge, error: createBadgeError } = await supabase
      .from("badges")
      .insert({
        name: rule.badgeName,
        description: rule.description,
        icon_url: null
      })
      .select("id, name, description, icon_url")
      .single();

    if (createBadgeError) throw createBadgeError;

    badgeByName.set(rule.badgeName, createdBadge as BadgeRow);
  }

  const grants: BadgeGrantResult["grants"] = [];

  for (const rule of SEASON_BADGE_RULES) {
    const target = ranking.find((entry) => entry.rank === rule.rank);
    if (!target) continue;

    const badge = badgeByName.get(rule.badgeName);
    if (!badge) continue;

    const { data: existingGrant, error: existingGrantError } = await supabase
      .from("member_badges")
      .select("id")
      .eq("member_id", target.memberId)
      .eq("badge_id", badge.id)
      .eq("season_id", activeSeason.id)
      .maybeSingle();

    if (existingGrantError) throw existingGrantError;
    if (existingGrant?.id) continue;

    const { error: insertGrantError } = await supabase.from("member_badges").insert({
      member_id: target.memberId,
      badge_id: badge.id,
      season_id: activeSeason.id,
      granted_at: processedAt
    });

    if (insertGrantError) throw insertGrantError;

    grants.push({
      memberId: target.memberId,
      memberName: target.name,
      badgeName: badge.name,
      rank: target.rank
    });
  }

  return {
    seasonId: activeSeason.id,
    seasonName: activeSeason.name,
    processedAt,
    grantedCount: grants.length,
    grants
  };
}

export async function listProjects(viewerMemberId?: string | null) {
  if (!hasSupabase) {
    const projects = memoryStore.projectIdeas
      .map((project) =>
        normalizeProjectRow({
          id: project.id,
          title: project.title,
          category: project.category,
          description: project.description,
          looking_for: project.lookingFor,
          summary: project.summary,
          business_areas: project.businessAreas,
          vision: project.vision,
          needs: project.needs,
          gallery_image_urls: project.galleryImageUrls,
          documentation_files: project.documentationFiles ?? [],
          owner_member_id: project.ownerMemberId ?? null,
          member_profiles: {
            full_name: project.ownerName,
            avatar_url: project.ownerAvatarUrl ?? null
          },
          status: project.status ?? "active",
          completed_at: project.completedAt ?? null,
          inactivated_at: project.inactivatedAt ?? null,
          updated_at: project.updatedAt ?? null
        })
      )
      .filter((project) => project.status !== "inactive" || project.ownerMemberId === viewerMemberId);
    const statusByProjectId = await loadViewerApplicationStatusMap(
      projects.map((project) => project.id),
      viewerMemberId
    );

    return projects.map((project) => ({
      ...project,
      myApplicationStatus: statusByProjectId.get(project.id) ?? null
    }));
  }

  const supabase = assertSupabase();
  let supportsEnhanced = await ensureProjectEnhancedColumnsSupport();
  let supportsLifecycle = await ensureProjectLifecycleColumnsSupport();
  let supportsDocumentation = await ensureProjectDocumentationColumnsSupport();
  let data: unknown[] | null = null;

  for (;;) {
    const selectClause = buildProjectListSelectClause({
      enhanced: supportsEnhanced,
      lifecycle: supportsLifecycle,
      documentation: supportsDocumentation
    });
    const response = await supabase
      .from("projects")
      .select(selectClause)
      .order("created_at", { ascending: false });

    if (!response.error) {
      data = response.data as unknown[] | null;
      break;
    }

    if (supportsEnhanced && isMissingProjectEnhancedColumnsError(response.error)) {
      projectEnhancedColumnsSupported = false;
      supportsEnhanced = false;
      continue;
    }

    if (supportsLifecycle && isMissingProjectLifecycleColumnsError(response.error)) {
      projectLifecycleColumnsSupported = false;
      supportsLifecycle = false;
      continue;
    }

    if (supportsDocumentation && isMissingProjectDocumentationColumnsError(response.error)) {
      projectDocumentationColumnsSupported = false;
      supportsDocumentation = false;
      continue;
    }

    throw response.error;
  }

  const rows = (data ?? []) as ProjectRow[];
  const projects = rows
    .map((project) => normalizeProjectRow(project))
    .filter((project) => project.status !== "inactive" || project.ownerMemberId === viewerMemberId);
  const statusByProjectId = await loadViewerApplicationStatusMap(
    projects.map((project) => project.id),
    viewerMemberId
  );

  return projects.map((project) => ({
    ...project,
    myApplicationStatus: statusByProjectId.get(project.id) ?? null
  }));
}

export async function createProject(payload: ProjectInput, ownerMemberId: string) {
  const lifecycle = createProjectLifecycleState("active");

  if (!hasSupabase) {
    const record = {
      id: crypto.randomUUID(),
      ownerName: "Membro Elo",
      ownerAvatarUrl: null,
      ownerMemberId,
      title: payload.title.trim(),
      summary: payload.summary.trim(),
      category: payload.businessAreas[0]?.trim() || "Negocios",
      businessAreas: payload.businessAreas.map((entry) => entry.trim()).filter(Boolean),
      vision: payload.vision.trim(),
      needs: payload.needs.map((need) => ({
        title: need.title.trim(),
        description: need.description.trim()
      })),
      galleryImageUrls: payload.galleryImageUrls.map((entry) => entry.trim()).filter(Boolean),
      documentationFiles: payload.documentationFiles.map((file) => ({
        name: file.name.trim(),
        url: file.url.trim(),
        sizeBytes: file.sizeBytes,
        contentType: file.contentType,
        path: file.path ?? null
      })),
      description: `${payload.summary.trim()}\n\n${payload.vision.trim()}`.trim(),
      lookingFor: payload.needs.map((need) => need.title.trim()).filter(Boolean).join(" | "),
      status: lifecycle.status,
      completedAt: lifecycle.completedAt,
      inactivatedAt: lifecycle.inactivatedAt,
      updatedAt: lifecycle.updatedAt
    };

    memoryStore.projectIdeas.unshift(record);
    return record;
  }

  const supabase = assertSupabase();
  let supportsEnhanced = await ensureProjectEnhancedColumnsSupport();
  let supportsLifecycle = await ensureProjectLifecycleColumnsSupport();
  let supportsDocumentation = await ensureProjectDocumentationColumnsSupport();
  let projectId: string | null = null;

  for (;;) {
    const dbPayload = buildProjectDbPayload(
      payload,
      supportsEnhanced,
      lifecycle,
      supportsDocumentation
    );
    const response = await supabase
      .from("projects")
      .insert({
        owner_member_id: ownerMemberId,
        ...dbPayload,
        ...(supportsLifecycle ? buildProjectLifecycleDbPayload(lifecycle) : {})
      })
      .select("id")
      .single();

    if (!response.error) {
      projectId = (response.data as { id: string }).id;
      break;
    }

    if (supportsEnhanced && isMissingProjectEnhancedColumnsError(response.error)) {
      projectEnhancedColumnsSupported = false;
      supportsEnhanced = false;
      continue;
    }

    if (supportsLifecycle && isMissingProjectLifecycleColumnsError(response.error)) {
      projectLifecycleColumnsSupported = false;
      supportsLifecycle = false;
      continue;
    }

    if (supportsDocumentation && isMissingProjectDocumentationColumnsError(response.error)) {
      projectDocumentationColumnsSupported = false;
      supportsDocumentation = false;
      continue;
    }

    throw response.error;
  }

  const projects = await listProjects(ownerMemberId);
  const createdProject = projects.find((project) => project.id === projectId);

  if (!createdProject) {
    throw new Error("Projeto nao encontrado");
  }

  return createdProject;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function createProjectLegacy(payload: ProjectInput, ownerMemberId: string) {
  if (!hasSupabase) {
    const record = {
      id: crypto.randomUUID(),
      ownerName: "Membro Elo",
      ownerAvatarUrl: null,
      ownerMemberId,
      title: payload.title.trim(),
      summary: payload.summary.trim(),
      category: payload.businessAreas[0]?.trim() || "Negocios",
      businessAreas: payload.businessAreas.map((entry) => entry.trim()).filter(Boolean),
      vision: payload.vision.trim(),
      needs: payload.needs.map((need) => ({
        title: need.title.trim(),
        description: need.description.trim()
      })),
      galleryImageUrls: payload.galleryImageUrls.map((entry) => entry.trim()).filter(Boolean),
      description: `${payload.summary.trim()}\n\n${payload.vision.trim()}`.trim(),
      lookingFor: payload.needs.map((need) => need.title.trim()).filter(Boolean).join(" • ")
    };

    memoryStore.projectIdeas.unshift(record);
    return record;
  }

  const supabase = assertSupabase();
  let enhancedColumnsSupported = await ensureProjectEnhancedColumnsSupport();
  let dbPayload = buildProjectDbPayload(payload, enhancedColumnsSupported);

  let { data, error } = await supabase
    .from("projects")
    .insert({
      owner_member_id: ownerMemberId,
      ...dbPayload
    })
    .select("id")
    .single();

  if (error && enhancedColumnsSupported && isMissingProjectEnhancedColumnsError(error)) {
    projectEnhancedColumnsSupported = false;
    enhancedColumnsSupported = false;
    dbPayload = buildProjectDbPayload(payload, false);
    const fallbackResponse = await supabase
      .from("projects")
      .insert({
        owner_member_id: ownerMemberId,
        ...dbPayload
      })
      .select("id")
      .single();

    data = fallbackResponse.data;
    error = fallbackResponse.error;
  }

  if (error) throw error;

  const projectId = (data as { id: string }).id;
  const projects = await listProjects();
  const createdProject = projects.find((project) => project.id === projectId);

  if (!createdProject) {
    throw new Error("Projeto nao encontrado");
  }

  return createdProject;
}

export async function updateProject(projectId: string, payload: ProjectInput, editorMemberId: string) {
  if (!hasSupabase) {
    const project = memoryStore.projectIdeas.find((item) => item.id === projectId);

    if (!project) {
      throw new Error("Projeto nao encontrado");
    }

    if (!project.ownerMemberId || project.ownerMemberId !== editorMemberId) {
      throw new Error("Somente o dono pode editar o projeto");
    }

    Object.assign(project, {
      title: payload.title.trim(),
      summary: payload.summary.trim(),
      category: payload.businessAreas[0]?.trim() || "Negocios",
      businessAreas: payload.businessAreas.map((entry) => entry.trim()).filter(Boolean),
      vision: payload.vision.trim(),
      needs: payload.needs.map((need) => ({
        title: need.title.trim(),
        description: need.description.trim()
      })),
      galleryImageUrls: payload.galleryImageUrls.map((entry) => entry.trim()).filter(Boolean),
      documentationFiles: payload.documentationFiles.map((file) => ({
        name: file.name.trim(),
        url: file.url.trim(),
        sizeBytes: file.sizeBytes,
        contentType: file.contentType,
        path: file.path ?? null
      })),
      description: `${payload.summary.trim()}\n\n${payload.vision.trim()}`.trim(),
      lookingFor: payload.needs.map((need) => need.title.trim()).filter(Boolean).join(" | "),
      updatedAt: new Date().toISOString()
    });

    return project;
  }

  const supabase = assertSupabase();
  const lifecycleColumnsSupported = await ensureProjectLifecycleColumnsSupport();
  const { data: existing, error: lookupError } = await supabase
    .from("projects")
    .select(
      lifecycleColumnsSupported
        ? "id, owner_member_id, status, completed_at, inactivated_at, updated_at"
        : "id, owner_member_id"
    )
    .eq("id", projectId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (!existing) {
    throw new Error("Projeto nao encontrado");
  }

  const projectOwner = existing as unknown as ProjectOwnerRow;

  if (!projectOwner.owner_member_id || projectOwner.owner_member_id !== editorMemberId) {
    throw new Error("Somente o dono pode editar o projeto");
  }

  const lifecycle: ProjectLifecycleState = {
    status: (projectOwner.status as ProjectStatus | null) ?? "active",
    completedAt: projectOwner.completed_at ?? null,
    inactivatedAt: projectOwner.inactivated_at ?? null,
    updatedAt: new Date().toISOString()
  };

  let supportsEnhanced = await ensureProjectEnhancedColumnsSupport();
  let supportsLifecycle = lifecycleColumnsSupported;
  let supportsDocumentation = await ensureProjectDocumentationColumnsSupport();
  let updatedProjectId: string | null = null;

  for (;;) {
    const dbPayload = buildProjectDbPayload(
      payload,
      supportsEnhanced,
      lifecycle,
      supportsDocumentation
    );
    const response = await supabase
      .from("projects")
      .update({
        ...dbPayload,
        ...(supportsLifecycle ? buildProjectLifecycleDbPayload(lifecycle) : {})
      })
      .eq("id", projectId)
      .select("id")
      .single();

    if (!response.error) {
      updatedProjectId = (response.data as { id: string }).id;
      break;
    }

    if (supportsEnhanced && isMissingProjectEnhancedColumnsError(response.error)) {
      projectEnhancedColumnsSupported = false;
      supportsEnhanced = false;
      continue;
    }

    if (supportsLifecycle && isMissingProjectLifecycleColumnsError(response.error)) {
      projectLifecycleColumnsSupported = false;
      supportsLifecycle = false;
      continue;
    }

    if (supportsDocumentation && isMissingProjectDocumentationColumnsError(response.error)) {
      projectDocumentationColumnsSupported = false;
      supportsDocumentation = false;
      continue;
    }

    throw response.error;
  }

  const projects = await listProjects(editorMemberId);
  const updatedProject = projects.find((project) => project.id === updatedProjectId);

  if (!updatedProject) {
    throw new Error("Projeto nao encontrado");
  }

  return updatedProject;
}

export async function updateProjectStatus(
  projectId: string,
  nextStatus: ProjectStatus,
  actorMemberId: string
) {
  const parsed = projectStatusUpdateSchema.parse({ status: nextStatus });

  if (!hasSupabase) {
    const project = memoryStore.projectIdeas.find((item) => item.id === projectId);

    if (!project) {
      throw new Error("Projeto nao encontrado");
    }

    if (!project.ownerMemberId || project.ownerMemberId !== actorMemberId) {
      throw new Error("Somente o dono pode alterar o status do projeto");
    }

    if ((project.status ?? "active") === "inactive" && parsed.status !== "inactive") {
      throw new Error("Projeto inativo nao pode ser reaberto pelo PWA");
    }

    const lifecycle = createProjectLifecycleState(parsed.status, {
      completedAt: project.completedAt ?? null,
      inactivatedAt: project.inactivatedAt ?? null
    });

    Object.assign(project, {
      status: lifecycle.status,
      completedAt: lifecycle.completedAt,
      inactivatedAt: lifecycle.inactivatedAt,
      updatedAt: lifecycle.updatedAt
    });

    await recordAuditLog({
      actorId: actorMemberId,
      actorRole: "member",
      action: "project.status_changed",
      entityType: "project",
      entityId: projectId,
      details: {
        status: lifecycle.status
      }
    });

    return normalizeProjectRow({
      id: project.id,
      title: project.title,
      category: project.category,
      description: project.description,
      looking_for: project.lookingFor,
      summary: project.summary,
      business_areas: project.businessAreas,
      vision: project.vision,
      needs: project.needs,
      gallery_image_urls: project.galleryImageUrls,
      documentation_files: project.documentationFiles ?? [],
      owner_member_id: project.ownerMemberId ?? null,
      member_profiles: {
        full_name: project.ownerName,
        avatar_url: project.ownerAvatarUrl ?? null
      },
      status: project.status ?? "active",
      completed_at: project.completedAt ?? null,
      inactivated_at: project.inactivatedAt ?? null,
      updated_at: project.updatedAt ?? null
    });
  }

  const supabase = assertSupabase();
  let lifecycleColumnsSupported = await ensureProjectLifecycleColumnsSupport();
  let enhancedColumnsSupported = await ensureProjectEnhancedColumnsSupport();
  let documentationColumnsSupported = await ensureProjectDocumentationColumnsSupport();
  let existing: unknown = null;

  for (;;) {
    const selectClause = buildProjectListSelectClause({
      enhanced: enhancedColumnsSupported,
      lifecycle: lifecycleColumnsSupported,
      documentation: documentationColumnsSupported
    });
    const response = await supabase
      .from("projects")
      .select(selectClause)
      .eq("id", projectId)
      .maybeSingle();

    if (!response.error) {
      existing = response.data;
      break;
    }

    if (enhancedColumnsSupported && isMissingProjectEnhancedColumnsError(response.error)) {
      projectEnhancedColumnsSupported = false;
      enhancedColumnsSupported = false;
      continue;
    }

    if (lifecycleColumnsSupported && isMissingProjectLifecycleColumnsError(response.error)) {
      projectLifecycleColumnsSupported = false;
      lifecycleColumnsSupported = false;
      continue;
    }

    if (documentationColumnsSupported && isMissingProjectDocumentationColumnsError(response.error)) {
      projectDocumentationColumnsSupported = false;
      documentationColumnsSupported = false;
      continue;
    }

    throw response.error;
  }

  if (!existing) {
    throw new Error("Projeto nao encontrado");
  }

  const normalizedProject = normalizeProjectRow(existing as unknown as ProjectRow);

  if (!normalizedProject.ownerMemberId || normalizedProject.ownerMemberId !== actorMemberId) {
    throw new Error("Somente o dono pode alterar o status do projeto");
  }

  if (normalizedProject.status === "inactive" && parsed.status !== "inactive") {
    throw new Error("Projeto inativo nao pode ser reaberto pelo PWA");
  }

  const lifecycle = createProjectLifecycleState(parsed.status, {
    completedAt: normalizedProject.completedAt,
    inactivatedAt: normalizedProject.inactivatedAt
  });
  const projectInput = toProjectInput(normalizedProject);
  const { error: updateError } = await supabase
    .from("projects")
    .update({
      looking_for: buildProjectDbPayload(projectInput, enhancedColumnsSupported, lifecycle).looking_for,
      ...(lifecycleColumnsSupported ? buildProjectLifecycleDbPayload(lifecycle) : {})
    })
    .eq("id", projectId);

  if (updateError) throw updateError;

  await recordAuditLog({
    actorId: actorMemberId,
    actorRole: "member",
    action: "project.status_changed",
    entityType: "project",
    entityId: projectId,
    details: {
      status: lifecycle.status
    }
  });

  const projects = await listProjects(actorMemberId);
  const updatedProject = projects.find((project) => project.id === projectId);

  if (!updatedProject) {
    throw new Error("Projeto nao encontrado");
  }

  return updatedProject;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function updateProjectLegacy(projectId: string, payload: ProjectInput, editorMemberId: string) {
  if (!hasSupabase) {
    const project = memoryStore.projectIdeas.find((item) => item.id === projectId);

    if (!project) {
      throw new Error("Projeto nao encontrado");
    }

    if (!project.ownerMemberId || project.ownerMemberId !== editorMemberId) {
      throw new Error("Somente o dono pode editar o projeto");
    }

    Object.assign(project, {
      title: payload.title.trim(),
      summary: payload.summary.trim(),
      category: payload.businessAreas[0]?.trim() || "Negocios",
      businessAreas: payload.businessAreas.map((entry) => entry.trim()).filter(Boolean),
      vision: payload.vision.trim(),
      needs: payload.needs.map((need) => ({
        title: need.title.trim(),
        description: need.description.trim()
      })),
      galleryImageUrls: payload.galleryImageUrls.map((entry) => entry.trim()).filter(Boolean),
      description: `${payload.summary.trim()}\n\n${payload.vision.trim()}`.trim(),
      lookingFor: payload.needs.map((need) => need.title.trim()).filter(Boolean).join(" • ")
    });

    return project;
  }

  const supabase = assertSupabase();
  const { data: existing, error: lookupError } = await supabase
    .from("projects")
    .select("id, owner_member_id")
    .eq("id", projectId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (!existing) {
    throw new Error("Projeto nao encontrado");
  }

  const projectOwner = existing as ProjectOwnerRow;

  if (!projectOwner.owner_member_id || projectOwner.owner_member_id !== editorMemberId) {
    throw new Error("Somente o dono pode editar o projeto");
  }

  let enhancedColumnsSupported = await ensureProjectEnhancedColumnsSupport();
  let dbPayload = buildProjectDbPayload(payload, enhancedColumnsSupported);

  let { data, error } = await supabase
    .from("projects")
    .update(dbPayload)
    .eq("id", projectId)
    .select("id")
    .single();

  if (error && enhancedColumnsSupported && isMissingProjectEnhancedColumnsError(error)) {
    projectEnhancedColumnsSupported = false;
    enhancedColumnsSupported = false;
    dbPayload = buildProjectDbPayload(payload, false);
    const fallbackResponse = await supabase
      .from("projects")
      .update(dbPayload)
      .eq("id", projectId)
      .select("id")
      .single();

    data = fallbackResponse.data;
    error = fallbackResponse.error;
  }

  if (error) throw error;

  const updatedProjectId = (data as { id: string }).id;
  const projects = await listProjects();
  const updatedProject = projects.find((project) => project.id === updatedProjectId);

  if (!updatedProject) {
    throw new Error("Projeto nao encontrado");
  }

  return updatedProject;
}

export async function applyToProject(projectId: string, applicantMemberId: string, message?: string) {
  const normalizedMessage = message?.trim() ? message.trim() : null;

  if (!hasSupabase) {
    const project = memoryStore.projectIdeas.find((item) => item.id === projectId);

    if (!project) {
      throw new Error("Projeto nÃ£o encontrado");
    }

    if (!project.ownerMemberId) {
      throw new Error("Projeto sem dono vinculado");
    }

    if (project.ownerMemberId === applicantMemberId) {
      throw new Error("NÃ£o Ã© permitido candidatar-se ao prÃ³prio projeto");
    }

    if ((project.status ?? "active") !== "active") {
      throw new Error("Projeto nao aceita novas candidaturas");
    }

    const existingApplication = memoryStore.projectApplications.find(
      (item) => item.projectId === projectId && item.applicantMemberId === applicantMemberId
    );

    if (existingApplication) {
      return {
        ...existingApplication,
        created: false
      };
    }

    const createdAt = new Date().toISOString();
    const application = {
      id: crypto.randomUUID(),
      projectId,
      ownerMemberId: project.ownerMemberId,
      applicantMemberId,
      message: normalizedMessage,
      status: "applied" as const,
      createdAt
    };

    memoryStore.projectApplications.unshift(application);

    return {
      ...application,
      created: true
    };
  }

  const supabase = assertSupabase();
  const lifecycleColumnsSupported = await ensureProjectLifecycleColumnsSupport();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(lifecycleColumnsSupported ? "id, owner_member_id, status" : "id, owner_member_id, looking_for")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) throw projectError;

  const projectRow = project as ProjectOwnerRow | null;

  if (!projectRow) {
    throw new Error("Projeto nÃ£o encontrado");
  }

  if (projectRow.owner_member_id === applicantMemberId) {
    throw new Error("NÃ£o Ã© permitido candidatar-se ao prÃ³prio projeto");
  }

  const projectStatus = lifecycleColumnsSupported
    ? (projectRow.status as ProjectStatus | null) ?? "active"
    : normalizeProjectRow(project as ProjectRow).status;

  if (projectStatus !== "active") {
    throw new Error("Projeto nao aceita novas candidaturas");
  }

  const { data: existingApplication, error: existingApplicationError } = await supabase
    .from("project_applications")
    .select("id, project_id, applicant_member_id, status, message, created_at")
    .eq("project_id", projectId)
    .eq("applicant_member_id", applicantMemberId)
    .maybeSingle();

  if (existingApplicationError) throw existingApplicationError;

  if (existingApplication) {
    const application = existingApplication as ProjectApplicationRow;

    return {
      id: application.id,
      projectId: application.project_id,
      ownerMemberId: projectRow.owner_member_id,
      applicantMemberId: application.applicant_member_id,
      message: application.message,
      status: application.status,
      createdAt: application.created_at,
      created: false
    };
  }

  const { data, error } = await supabase
    .from("project_applications")
    .insert({
      project_id: projectId,
      applicant_member_id: applicantMemberId,
      message: normalizedMessage,
      status: "applied"
    })
    .select("id, project_id, applicant_member_id, status, message, created_at")
    .single();

  if (error) throw error;

  const application = data as ProjectApplicationRow;

  return {
    id: application.id,
    projectId: application.project_id,
    ownerMemberId: projectRow.owner_member_id,
    applicantMemberId: application.applicant_member_id,
    message: application.message,
    status: application.status,
    createdAt: application.created_at,
    created: true
  };
}

export async function getProjectDetail(
  projectId: string,
  viewerMemberId?: string | null
): Promise<ProjectDetail | null> {
  const projects = await listProjects(viewerMemberId);
  const project = projects.find((item) => item.id === projectId);

  if (!project) {
    return null;
  }

  return {
    ...project,
    viewerAccess: buildProjectViewerAccess(project, viewerMemberId)
  };
}

export async function getProjectApplications(
  projectId: string,
  viewerMemberId?: string | null
): Promise<ProjectApplicationsView | null> {
  const project = await getProjectDetail(projectId, viewerMemberId);

  if (!project) {
    return null;
  }

  if (!project.viewerAccess.canViewApplicants) {
    throw new Error("Visualizacao de candidaturas nao permitida");
  }

  const rows = await listProjectApplicationRows(projectId);
  const profileMap = await loadProjectApplicantProfileMap(
    rows.map((row) => row.applicant_member_id)
  );

  const pending = rows
    .filter((row) => row.status === "applied")
    .map((row) => toProjectApplicantView(row, profileMap, project.viewerAccess.isOwner));
  const approved = rows
    .filter((row) => row.status === "accepted")
    .map((row) => toProjectApplicantView(row, profileMap, project.viewerAccess.isOwner));
  const rejected = project.viewerAccess.isOwner
    ? rows
        .filter((row) => row.status === "rejected")
        .map((row) => toProjectApplicantView(row, profileMap, true))
    : [];

  return {
    projectId,
    viewerAccess: project.viewerAccess,
    pending,
    approved,
    rejected
  };
}

export async function approveProjectApplication(
  projectId: string,
  applicationId: string,
  actorMemberId: string
): Promise<ProjectApplicantView> {
  const project = await getProjectDetail(projectId, actorMemberId);

  if (!project) {
    throw new Error("Projeto nao encontrado");
  }

  if (!project.viewerAccess.isOwner) {
    throw new Error("Somente o dono pode moderar candidaturas");
  }

  if (!hasSupabase) {
    const application = memoryStore.projectApplications.find(
      (item) => item.id === applicationId && item.projectId === projectId
    );

    if (!application) {
      throw new Error("Candidatura nao encontrada");
    }

    if (application.status !== "applied") {
      throw new Error("Somente candidaturas pendentes podem ser moderadas");
    }

    const reviewedAt = new Date().toISOString();
    Object.assign(application as object, {
      status: "accepted" as ProjectApplicationStatus,
      reviewedAt,
      reviewedByMemberId: actorMemberId,
      rejectionReason: null
    });

    await recordAuditLog({
      actorId: actorMemberId,
      actorRole: "member",
      action: "project.application_approved",
      entityType: "project_application",
      entityId: applicationId,
      details: {
        projectId
      }
    });

    await createMemberNotification({
      memberId: application.applicantMemberId,
      type: "project_application_accepted",
      title: `Voce entrou em ${project.title}`,
      body: `Sua candidatura para ${project.title} foi aprovada. Agora voce faz parte da equipe do projeto.`,
      metadata: {
        projectId,
        projectTitle: project.title,
        applicationId
      }
    });

    const profileMap = await loadProjectApplicantProfileMap([application.applicantMemberId]);
    return toProjectApplicantView(
      {
        id: application.id,
        project_id: application.projectId,
        applicant_member_id: application.applicantMemberId,
        status: "accepted",
        message: application.message,
        reviewed_at: reviewedAt,
        reviewed_by_member_id: actorMemberId,
        rejection_reason: null,
        created_at: application.createdAt
      },
      profileMap,
      true
    );
  }

  const supabase = assertSupabase();
  const { data: existing, error: lookupError } = await supabase
    .from("project_applications")
    .select(
      "id, project_id, applicant_member_id, status, message, reviewed_at, reviewed_by_member_id, rejection_reason, created_at"
    )
    .eq("id", applicationId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (!existing) {
    throw new Error("Candidatura nao encontrada");
  }

  const application = existing as ProjectApplicationRow;

  if (application.status !== "applied") {
    throw new Error("Somente candidaturas pendentes podem ser moderadas");
  }

  const reviewedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("project_applications")
    .update({
      status: "accepted",
      reviewed_at: reviewedAt,
      reviewed_by_member_id: actorMemberId,
      rejection_reason: null
    })
    .eq("id", applicationId)
    .eq("project_id", projectId);

  if (updateError) throw updateError;

  await recordAuditLog({
    actorId: actorMemberId,
    actorRole: "member",
    action: "project.application_approved",
    entityType: "project_application",
    entityId: applicationId,
    details: {
      projectId
    }
  });

  await createMemberNotification({
    memberId: application.applicant_member_id,
    type: "project_application_accepted",
    title: `Voce entrou em ${project.title}`,
    body: `Sua candidatura para ${project.title} foi aprovada. Agora voce faz parte da equipe do projeto.`,
    metadata: {
      projectId,
      projectTitle: project.title,
      applicationId
    }
  });

  const profileMap = await loadProjectApplicantProfileMap([application.applicant_member_id]);
  return toProjectApplicantView(
    {
      ...application,
      status: "accepted",
      reviewed_at: reviewedAt,
      reviewed_by_member_id: actorMemberId,
      rejection_reason: null
    },
    profileMap,
    true
  );
}

export async function rejectProjectApplication(
  projectId: string,
  applicationId: string,
  actorMemberId: string,
  reason: string
): Promise<ProjectApplicantView> {
  const trimmedReason = reason.trim();

  if (!trimmedReason) {
    throw new Error("Justificativa obrigatoria para recusar candidatura");
  }

  const project = await getProjectDetail(projectId, actorMemberId);

  if (!project) {
    throw new Error("Projeto nao encontrado");
  }

  if (!project.viewerAccess.isOwner) {
    throw new Error("Somente o dono pode moderar candidaturas");
  }

  if (!hasSupabase) {
    const application = memoryStore.projectApplications.find(
      (item) => item.id === applicationId && item.projectId === projectId
    );

    if (!application) {
      throw new Error("Candidatura nao encontrada");
    }

    if (application.status !== "applied") {
      throw new Error("Somente candidaturas pendentes podem ser moderadas");
    }

    const reviewedAt = new Date().toISOString();
    Object.assign(application as object, {
      status: "rejected" as ProjectApplicationStatus,
      reviewedAt,
      reviewedByMemberId: actorMemberId,
      rejectionReason: trimmedReason
    });

    await recordAuditLog({
      actorId: actorMemberId,
      actorRole: "member",
      action: "project.application_rejected",
      entityType: "project_application",
      entityId: applicationId,
      details: {
        projectId
      }
    });

    await createMemberNotification({
      memberId: application.applicantMemberId,
      type: "project_application_rejected",
      title: `Atualizacao sobre ${project.title}`,
      body: `Sua candidatura para ${project.title} nao foi aprovada. Motivo: ${trimmedReason}`,
      metadata: {
        projectId,
        projectTitle: project.title,
        applicationId,
        rejectionReason: trimmedReason
      }
    });

    const profileMap = await loadProjectApplicantProfileMap([application.applicantMemberId]);
    return toProjectApplicantView(
      {
        id: application.id,
        project_id: application.projectId,
        applicant_member_id: application.applicantMemberId,
        status: "rejected",
        message: application.message,
        reviewed_at: reviewedAt,
        reviewed_by_member_id: actorMemberId,
        rejection_reason: trimmedReason,
        created_at: application.createdAt
      },
      profileMap,
      true
    );
  }

  const supabase = assertSupabase();
  const { data: existing, error: lookupError } = await supabase
    .from("project_applications")
    .select(
      "id, project_id, applicant_member_id, status, message, reviewed_at, reviewed_by_member_id, rejection_reason, created_at"
    )
    .eq("id", applicationId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (!existing) {
    throw new Error("Candidatura nao encontrada");
  }

  const application = existing as ProjectApplicationRow;

  if (application.status !== "applied") {
    throw new Error("Somente candidaturas pendentes podem ser moderadas");
  }

  const reviewedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("project_applications")
    .update({
      status: "rejected",
      reviewed_at: reviewedAt,
      reviewed_by_member_id: actorMemberId,
      rejection_reason: trimmedReason
    })
    .eq("id", applicationId)
    .eq("project_id", projectId);

  if (updateError) throw updateError;

  await recordAuditLog({
    actorId: actorMemberId,
    actorRole: "member",
    action: "project.application_rejected",
    entityType: "project_application",
    entityId: applicationId,
    details: {
      projectId
    }
  });

  await createMemberNotification({
    memberId: application.applicant_member_id,
    type: "project_application_rejected",
    title: `Atualizacao sobre ${project.title}`,
    body: `Sua candidatura para ${project.title} nao foi aprovada. Motivo: ${trimmedReason}`,
    metadata: {
      projectId,
      projectTitle: project.title,
      applicationId,
      rejectionReason: trimmedReason
    }
  });

  const profileMap = await loadProjectApplicantProfileMap([application.applicant_member_id]);
  return toProjectApplicantView(
    {
      ...application,
      status: "rejected",
      reviewed_at: reviewedAt,
      reviewed_by_member_id: actorMemberId,
      rejection_reason: trimmedReason
    },
    profileMap,
    true
  );
}

export async function listMemberNotifications(memberId: string): Promise<MemberNotificationsFeed> {
  if (!hasSupabase) {
    const items = memoryStore.memberNotifications
      .filter((item) => item.memberId === memberId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((item) => ({
        ...item,
        metadata: item.metadata ?? null
      }));

    return {
      items,
      unreadCount: items.filter((item) => !item.readAt).length
    };
  }

  const supported = await ensureMemberNotificationsSupport();
  if (!supported) {
    return {
      items: [],
      unreadCount: 0
    };
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("member_notifications")
    .select("id, member_id, type, title, body, metadata, read_at, created_at")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingMemberNotificationsTableError(error)) {
      memberNotificationsSupported = false;
      return {
        items: [],
        unreadCount: 0
      };
    }

    throw error;
  }

  const items = (data ?? []).map((row) => toMemberNotification(row as MemberNotificationRow));

  return {
    items,
    unreadCount: items.filter((item) => !item.readAt).length
  };
}

export async function markMemberNotificationRead(notificationId: string, memberId: string) {
  if (!hasSupabase) {
    const notification = memoryStore.memberNotifications.find(
      (item) => item.id === notificationId && item.memberId === memberId
    );

    if (!notification) {
      return null;
    }

    if (!notification.readAt) {
      notification.readAt = new Date().toISOString();
    }

    return {
      ...notification,
      metadata: notification.metadata ?? null
    };
  }

  const supported = await ensureMemberNotificationsSupport();
  if (!supported) {
    return null;
  }

  const supabase = assertSupabase();
  const { data: existing, error: lookupError } = await supabase
    .from("member_notifications")
    .select("id, member_id, type, title, body, metadata, read_at, created_at")
    .eq("id", notificationId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (lookupError) {
    if (isMissingMemberNotificationsTableError(lookupError)) {
      memberNotificationsSupported = false;
      return null;
    }

    throw lookupError;
  }

  if (!existing) {
    return null;
  }

  if (existing.read_at) {
    return toMemberNotification(existing as MemberNotificationRow);
  }

  const readAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("member_notifications")
    .update({ read_at: readAt })
    .eq("id", notificationId)
    .eq("member_id", memberId)
    .select("id, member_id, type, title, body, metadata, read_at, created_at")
    .single();

  if (error) {
    if (isMissingMemberNotificationsTableError(error)) {
      memberNotificationsSupported = false;
      return null;
    }

    throw error;
  }

  return toMemberNotification(data as MemberNotificationRow);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function applyToProjectLegacy(projectId: string, applicantMemberId: string, message?: string) {
  const normalizedMessage = message?.trim() ? message.trim() : null;

  if (!hasSupabase) {
    const project = memoryStore.projectIdeas.find((item) => item.id === projectId);

    if (!project) {
      throw new Error("Projeto não encontrado");
    }

    if (!project.ownerMemberId) {
      throw new Error("Projeto sem dono vinculado");
    }

    if (project.ownerMemberId === applicantMemberId) {
      throw new Error("Não é permitido candidatar-se ao próprio projeto");
    }

    const existingApplication = memoryStore.projectApplications.find(
      (item) => item.projectId === projectId && item.applicantMemberId === applicantMemberId
    );

    if (existingApplication) {
      return {
        ...existingApplication,
        created: false
      };
    }

    const createdAt = new Date().toISOString();
    const application = {
      id: crypto.randomUUID(),
      projectId,
      ownerMemberId: project.ownerMemberId,
      applicantMemberId,
      message: normalizedMessage,
      status: "applied" as const,
      createdAt
    };

    memoryStore.projectApplications.unshift(application);

    return {
      ...application,
      created: true
    };
  }

  const supabase = assertSupabase();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, owner_member_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) throw projectError;

  const projectRow = project as ProjectOwnerRow | null;

  if (!projectRow) {
    throw new Error("Projeto não encontrado");
  }

  if (projectRow.owner_member_id === applicantMemberId) {
    throw new Error("Não é permitido candidatar-se ao próprio projeto");
  }

  const { data: existingApplication, error: existingApplicationError } = await supabase
    .from("project_applications")
    .select("id, project_id, applicant_member_id, status, message, created_at")
    .eq("project_id", projectId)
    .eq("applicant_member_id", applicantMemberId)
    .maybeSingle();

  if (existingApplicationError) throw existingApplicationError;

  if (existingApplication) {
    const application = existingApplication as ProjectApplicationRow;

    return {
      id: application.id,
      projectId: application.project_id,
      ownerMemberId: projectRow.owner_member_id,
      applicantMemberId: application.applicant_member_id,
      message: application.message,
      status: application.status,
      createdAt: application.created_at,
      created: false
    };
  }

  const { data, error } = await supabase
    .from("project_applications")
    .insert({
      project_id: projectId,
      applicant_member_id: applicantMemberId,
      message: normalizedMessage,
      status: "applied"
    })
    .select("id, project_id, applicant_member_id, status, message, created_at")
    .single();

  if (error) throw error;

  const application = data as ProjectApplicationRow;

  return {
    id: application.id,
    projectId: application.project_id,
    ownerMemberId: projectRow.owner_member_id,
    applicantMemberId: application.applicant_member_id,
    message: application.message,
    status: application.status,
    createdAt: application.created_at,
    created: true
  };
}

export async function getMembershipById(membershipId: string) {
  await syncMembershipValidity();

  if (!hasSupabase) {
    const membership = memoryStore.memberships.find((item) => item.id === membershipId);

    if (!membership) {
      return null;
    }

    const member = memoryStore.members.find((item) => item.id === membership.memberId);

    if (!member) {
      return null;
    }

    return {
      id: membership.id,
      member_id: member.id,
      expires_at: membership.expiresAt,
      status: membership.status,
      member_profiles: {
        id: member.id,
        full_name: member.fullName,
        email: member.email,
        phone: member.phone,
        whatsapp: member.whatsapp
      }
    };
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("memberships")
    .select("id, member_id, expires_at, status, member_profiles(id, full_name, email, phone, whatsapp)")
    .eq("id", membershipId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getActiveMembershipByMemberId(memberId: string) {
  await syncMembershipValidity(memberId);

  if (!hasSupabase) {
    const latestMembership = getLatestMockMembershipByMemberId(memberId);
    if (!latestMembership) return null;

    return {
      id: latestMembership.id,
      member_id: memberId,
      status: latestMembership.status,
      expires_at: latestMembership.expiresAt
    };
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("memberships")
    .select("id, member_id, status, expires_at")
    .eq("member_id", memberId)
    .in("status", ["active", "expired"])
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listMembershipFinanceRows(): Promise<MembershipFinanceRow[]> {
  await syncMembershipValidity();

  if (!hasSupabase) {
    const rows: MembershipFinanceRow[] = [];

    for (const membership of memoryStore.memberships.sort(
      (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
    )) {
      const member = memoryStore.members.find((item) => item.id === membership.memberId);
      if (!member) {
        continue;
      }

      const latestPayment =
        memoryStore.membershipPayments
          .filter((payment) => payment.membershipId === membership.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;

      rows.push({
        membershipId: membership.id,
        memberId: member.id,
        memberName: member.fullName,
        status: membership.status,
        expiresAt: membership.expiresAt,
        latestPaymentId: latestPayment?.id ?? null,
        latestPaymentGateway: latestPayment?.gateway ?? null,
        latestPaymentStatus: latestPayment?.status ?? "none",
        latestPaymentAmountCents: latestPayment?.amountCents ?? 0
      });
    }

    return rows;
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("memberships")
    .select(
      "id, member_id, status, expires_at, member_profiles(full_name), membership_payments(id, gateway, status, amount_cents, created_at)"
    )
    .order("expires_at", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as unknown as MembershipFinanceDbRow[];

  return rows.map((row) => {
    const memberProfile = Array.isArray(row.member_profiles)
      ? row.member_profiles[0]
      : row.member_profiles;

    const payments = [...(row.membership_payments ?? [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const latest = payments[0];

    return {
      membershipId: row.id,
      memberId: row.member_id,
      memberName: memberProfile?.full_name ?? "Membro Elo",
      status: row.status,
      expiresAt: row.expires_at,
      latestPaymentId: latest?.id ?? null,
      latestPaymentGateway: latest?.gateway ?? null,
      latestPaymentStatus: latest?.status ?? "none",
      latestPaymentAmountCents: latest?.amount_cents ?? 0
    } as MembershipFinanceRow;
  });
}

export async function getFinanceOverview(range?: FinanceDateRange): Promise<FinanceOverview> {
  await syncMembershipValidity();

  if (!hasSupabase) {
    const membershipRows = memoryStore.membershipPayments.filter((item) =>
      inDateRange(item.createdAt, range)
    );
    const eventRows = memoryStore.eventPayments.filter((item) => inDateRange(item.createdAt, range));
    const overdueMemberships = memoryStore.memberships.filter(
      (item) => item.status === "expired" && inDateRange(item.expiresAt, range)
    );

    return {
      membershipRevenueCents: membershipRows
        .filter((item) => item.status === "paid")
        .reduce((total, item) => total + item.amountCents, 0),
      eventRevenueCents: eventRows
        .filter((item) => item.status === "paid")
        .reduce((total, item) => total + item.amountCents, 0),
      pendingMembershipPayments: membershipRows.filter((item) => item.status === "pending").length,
      pendingEventPayments: eventRows.filter((item) => item.status === "pending").length,
      overduePayments: overdueMemberships.length
    };
  }

  const supabase = assertSupabase();

  let membershipPaymentsQuery = supabase
    .from("membership_payments")
    .select("status, amount_cents, created_at");

  if (range?.startAt) {
    membershipPaymentsQuery = membershipPaymentsQuery.gte("created_at", range.startAt);
  }
  if (range?.endAt) {
    membershipPaymentsQuery = membershipPaymentsQuery.lte("created_at", range.endAt);
  }

  const { data: membershipPayments, error: membershipError } = await membershipPaymentsQuery;

  if (membershipError) throw membershipError;

  let eventPayments: PaymentMetricRow[] = [];
  let eventPaymentsQuery = supabase
    .from("event_payments")
    .select("status, amount_cents, created_at");

  if (range?.startAt) {
    eventPaymentsQuery = eventPaymentsQuery.gte("created_at", range.startAt);
  }
  if (range?.endAt) {
    eventPaymentsQuery = eventPaymentsQuery.lte("created_at", range.endAt);
  }

  const { data: eventData, error: eventError } = await eventPaymentsQuery;

  if (!eventError) {
    eventPayments = eventData ?? [];
  }

  let membershipsQuery = supabase
    .from("memberships")
    .select("status, expires_at")
    .eq("status", "expired");

  if (range?.startAt) {
    membershipsQuery = membershipsQuery.gte("expires_at", range.startAt);
  }
  if (range?.endAt) {
    membershipsQuery = membershipsQuery.lte("expires_at", range.endAt);
  }

  const { data: overdueMembershipRows, error: overdueError } = await membershipsQuery;

  if (overdueError) throw overdueError;

  const membershipRows = (membershipPayments ?? []) as PaymentMetricRow[];
  const eventRows = eventPayments;
  const overdueRows = (overdueMembershipRows ?? []) as MembershipStatusMetricRow[];

  const membershipRevenueCents = membershipRows
    .filter((item) => item.status === "paid")
    .reduce((total: number, item) => total + Number(item.amount_cents ?? 0), 0);

  const eventRevenueCents = eventRows
    .filter((item) => item.status === "paid")
    .reduce((total: number, item) => total + Number(item.amount_cents ?? 0), 0);

  const pendingMembershipPayments = membershipRows.filter((item) => item.status === "pending").length;

  const pendingEventPayments = eventRows.filter((item) => item.status === "pending").length;

  const overduePayments = overdueRows.length;

  return {
    membershipRevenueCents,
    eventRevenueCents,
    pendingMembershipPayments,
    pendingEventPayments,
    overduePayments
  };
}

export async function getLatestEventPaymentRecord(
  eventId: string,
  memberId: string
): Promise<EventPaymentRecord | null> {
  if (!hasSupabase) {
    return (
      memoryStore.eventPayments
        .filter((payment) => payment.eventId === eventId && payment.memberId === memberId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null
    );
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("event_payments")
    .select(
      "id, gateway, status, gateway_payment_id, external_reference, checkout_url, pix_qr_code, gateway_payload, paid_at, created_at"
    )
    .eq("event_id", eventId)
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as EventPaymentStatusRow;

  return {
    id: row.id,
    gateway: row.gateway,
    status: row.status,
    gatewayPaymentId: row.gateway_payment_id,
    externalReference: row.external_reference,
    checkoutUrl: row.checkout_url,
    pixQrCode: row.pix_qr_code,
    gatewayPayload: toJsonRecord(row.gateway_payload),
    paidAt: row.paid_at,
    createdAt: row.created_at
  };
}

export async function getEventCheckoutStatus(
  eventId: string,
  memberId: string
): Promise<EventCheckoutStatus> {
  if (!hasSupabase) {
    const latestPayment =
      memoryStore.eventPayments
        .filter((payment) => payment.eventId === eventId && payment.memberId === memberId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
    const registration = memoryStore.eventRegistrations.find(
      (item) => item.eventId === eventId && item.memberId === memberId && item.status === "confirmed"
    );

    return {
      paymentStatus: latestPayment?.status ?? "none",
      presenceConfirmed: Boolean(registration),
      gateway: latestPayment?.gateway ?? null,
      gatewayPaymentId: latestPayment?.gatewayPaymentId ?? null,
      checkoutUrl: latestPayment?.checkoutUrl ?? null,
      pixQrCode: latestPayment?.pixQrCode ?? null,
      statusUpdatedAt: latestPayment?.paidAt ?? latestPayment?.createdAt ?? null
    };
  }

  const supabase = assertSupabase();
  const latestPayment = await getLatestEventPaymentRecord(eventId, memberId);

  const { data: registration, error: registrationError } = await supabase
    .from("event_registrations")
    .select("id")
    .eq("event_id", eventId)
    .eq("member_id", memberId)
    .eq("status", "confirmed")
    .maybeSingle();

  if (registrationError) throw registrationError;

  return {
    paymentStatus: latestPayment?.status ?? "none",
    presenceConfirmed: Boolean(registration?.id),
    gateway: latestPayment?.gateway ?? null,
    gatewayPaymentId: latestPayment?.gatewayPaymentId ?? null,
    checkoutUrl: latestPayment?.checkoutUrl ?? null,
    pixQrCode: latestPayment?.pixQrCode ?? null,
    statusUpdatedAt: latestPayment?.paidAt ?? latestPayment?.createdAt ?? null
  };
}

export async function listPendingEventPayments(limit = 50): Promise<PendingEventPaymentRow[]> {
  if (!hasSupabase) {
    return memoryStore.eventPayments
      .filter((payment) => payment.status === "pending")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
      .map((payment) => {
        const event = memoryStore.events.find((item) => item.id === payment.eventId);
        const member = memoryStore.members.find((item) => item.id === payment.memberId);

        return {
          paymentId: payment.id,
          eventId: payment.eventId,
          eventTitle: event?.title ?? "Evento Elo",
          memberId: payment.memberId,
          memberName: member?.fullName ?? "Membro Elo",
          amountCents: payment.amountCents,
          gateway: payment.gateway,
          gatewayPaymentId: payment.gatewayPaymentId,
          externalReference: payment.externalReference,
          status: payment.status,
          createdAt: payment.createdAt
        };
      });
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("event_payments")
    .select(
      "id, event_id, member_id, amount_cents, status, gateway, gateway_payment_id, external_reference, created_at, events(title), member_profiles(full_name)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const rows = (data ?? []) as unknown as PendingEventPaymentDbRow[];

  return rows.map((row) => {
    const event = Array.isArray(row.events) ? row.events[0] : row.events;
    const member = Array.isArray(row.member_profiles) ? row.member_profiles[0] : row.member_profiles;

    return {
      paymentId: row.id,
      eventId: row.event_id,
      eventTitle: event?.title ?? "Evento Elo",
      memberId: row.member_id,
      memberName: member?.full_name ?? "Membro Elo",
      amountCents: row.amount_cents,
      gateway: row.gateway,
      gatewayPaymentId: row.gateway_payment_id,
      externalReference: row.external_reference,
      status: row.status,
      createdAt: row.created_at
    };
  });
}

export async function approveEventPaymentManually(
  paymentId: string,
  payload?: { approvedBy?: string; note?: string | null }
) {
  const approvedAt = new Date().toISOString();
  const approvedBy = payload?.approvedBy ?? null;
  const note = payload?.note ?? null;

  if (!hasSupabase) {
    const payment = memoryStore.eventPayments.find((item) => item.id === paymentId);

    if (!payment) {
      return null;
    }

    payment.status = "paid";
    payment.paidAt = approvedAt;
    payment.gatewayPayload = {
      ...(payment.gatewayPayload ?? {}),
      source: payment.gateway,
      manualApproval: {
        approvedAt,
        approvedBy,
        note
      }
    };

    const existingRegistration = memoryStore.eventRegistrations.find(
      (item) => item.eventId === payment.eventId && item.memberId === payment.memberId
    );

    if (existingRegistration) {
      existingRegistration.status = "confirmed";
    } else {
      memoryStore.eventRegistrations.unshift({
        eventId: payment.eventId,
        memberId: payment.memberId,
        status: "confirmed",
        createdAt: approvedAt
      });
    }

    return {
      paymentId: payment.id,
      eventId: payment.eventId,
      memberId: payment.memberId,
      status: payment.status,
      approvedAt,
      mode: "mock"
    };
  }

  const supabase = assertSupabase();
  const { data: existing, error: existingError } = await supabase
    .from("event_payments")
    .select("id, event_id, member_id, status, gateway, gateway_payload")
    .eq("id", paymentId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existing) return null;

  const currentPayload = toJsonRecord(existing.gateway_payload) ?? {};
  const nextPayload = {
    ...currentPayload,
    source: existing.gateway,
    manualApproval: {
      approvedAt,
      approvedBy,
      note
    }
  };

  if (existing.status !== "paid") {
    const { error: updateError } = await supabase
      .from("event_payments")
      .update({
        status: "paid",
        paid_at: approvedAt,
        gateway_payload: nextPayload
      })
      .eq("id", existing.id);

    if (updateError) throw updateError;
  }

  const { error: registrationError } = await supabase.from("event_registrations").upsert(
    {
      event_id: existing.event_id,
      member_id: existing.member_id,
      status: "confirmed"
    },
    { onConflict: "event_id,member_id" }
  );

  if (registrationError) throw registrationError;

  return {
    paymentId: existing.id,
    eventId: existing.event_id,
    memberId: existing.member_id,
    status: "paid" as PaymentStatus,
    approvedAt
  };
}

export async function approveLatestMembershipPayment(
  membershipId: string,
  payload?: { approvedBy?: string; note?: string | null }
) {
  const approvedAt = new Date().toISOString();
  const approvedBy = payload?.approvedBy ?? null;
  const note = payload?.note ?? null;

  if (!hasSupabase) {
    const existing = memoryStore.membershipPayments
      .filter((item) => item.membershipId === membershipId && item.status === "pending")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!existing) {
      return null;
    }

    existing.status = "paid";
    existing.paidAt = approvedAt;
    existing.gatewayPayload = {
      ...(existing.gatewayPayload ?? {}),
      source: existing.gateway,
      manualApproval: {
        approvedAt,
        approvedBy,
        note
      }
    };

    const membership = memoryStore.memberships.find((item) => item.id === membershipId);
    const memberId = membership?.memberId ?? null;
    const member = memberId ? memoryStore.members.find((item) => item.id === memberId) : null;
    const renewedExpiresAt = buildRenewedMembershipExpiration(
      membership?.expiresAt ?? null,
      new Date(approvedAt)
    );

    if (membership) {
      membership.status = "active";
      membership.expiresAt = renewedExpiresAt;
    }

    if (member) {
      member.active = true;
    }

    return {
      membershipId,
      paymentId: existing.id,
      status: "paid" as PaymentStatus,
      approvedAt,
      mode: "mock"
    };
  }

  const supabase = assertSupabase();
  const { data: existing, error: existingError } = await supabase
    .from("membership_payments")
    .select("id, status, gateway, gateway_payload")
    .eq("membership_id", membershipId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existing) return null;

  const { data: membership, error: membershipLookupError } = await supabase
    .from("memberships")
    .select("id, member_id, expires_at")
    .eq("id", membershipId)
    .maybeSingle();

  if (membershipLookupError) throw membershipLookupError;
  if (!membership) throw new Error("Anuidade não encontrada");

  const renewedExpiresAt = buildRenewedMembershipExpiration(
    membership.expires_at,
    new Date(approvedAt)
  );

  const currentPayload = toJsonRecord(existing.gateway_payload) ?? {};
  const nextPayload = {
    ...currentPayload,
    source: existing.gateway,
    manualApproval: {
      approvedAt,
      approvedBy,
      note
    }
  };

  const { error: paymentError } = await supabase
    .from("membership_payments")
    .update({
      status: "paid",
      paid_at: approvedAt,
      gateway_payload: nextPayload
    })
    .eq("id", existing.id);

  if (paymentError) throw paymentError;

  const { error: membershipError } = await supabase
    .from("memberships")
    .update({
      status: "active",
      expires_at: renewedExpiresAt
    })
    .eq("id", membershipId);

  if (membershipError) throw membershipError;

  const { error: memberError } = await supabase
    .from("member_profiles")
    .update({ active: true })
    .eq("id", membership.member_id);

  if (memberError) throw memberError;

  return {
    membershipId,
    paymentId: existing.id,
    status: "paid" as PaymentStatus,
    approvedAt
  };
}

export async function createMembershipPaymentRecord(payload: {
  membershipId: string;
  amountCents: number;
  gatewayPaymentId: string;
  externalReference: string;
  checkoutUrl: string | null;
  pixQrCode: string | null;
  gateway?: string;
  gatewayPayload?: Record<string, unknown> | null;
  status?: PaymentStatus;
}) {
  if (!hasSupabase) {
    const record = {
      id: crypto.randomUUID(),
      membershipId: payload.membershipId,
      amountCents: payload.amountCents,
      gateway: payload.gateway ?? "manual_pix",
      gatewayPaymentId: payload.gatewayPaymentId,
      externalReference: payload.externalReference,
      checkoutUrl: payload.checkoutUrl,
      pixQrCode: payload.pixQrCode,
      gatewayPayload: payload.gatewayPayload ?? {
        source: payload.gateway ?? "manual_pix"
      },
      status: payload.status ?? "pending",
      paidAt: null,
      createdAt: new Date().toISOString()
    };

    memoryStore.membershipPayments.unshift(record);
    return record;
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("membership_payments")
    .insert({
      membership_id: payload.membershipId,
      gateway: payload.gateway ?? "manual_pix",
      gateway_payment_id: payload.gatewayPaymentId,
      amount_cents: payload.amountCents,
      status: payload.status ?? "pending",
      external_reference: payload.externalReference,
      checkout_url: payload.checkoutUrl,
      pix_qr_code: payload.pixQrCode,
      gateway_payload: payload.gatewayPayload ?? {
        source: payload.gateway ?? "manual_pix"
      }
    })
    .select("id, status")
    .single();

  if (error) throw error;
  return data;
}

export async function createEventPaymentRecord(payload: {
  eventId: string;
  memberId: string;
  amountCents: number;
  gatewayPaymentId: string;
  externalReference: string;
  checkoutUrl: string | null;
  pixQrCode: string | null;
  gateway?: string;
  gatewayPayload?: Record<string, unknown> | null;
  status?: PaymentStatus;
}) {
  if (!hasSupabase) {
    const record = {
      id: crypto.randomUUID(),
      eventId: payload.eventId,
      memberId: payload.memberId,
      amountCents: payload.amountCents,
      gateway: payload.gateway ?? "manual_pix",
      gatewayPaymentId: payload.gatewayPaymentId,
      externalReference: payload.externalReference,
      checkoutUrl: payload.checkoutUrl,
      pixQrCode: payload.pixQrCode,
      gatewayPayload: payload.gatewayPayload ?? {
        source: payload.gateway ?? "manual_pix"
      },
      status: payload.status ?? "pending",
      paidAt: null,
      createdAt: new Date().toISOString()
    };

    memoryStore.eventPayments.unshift(record);
    return record;
  }

  const supabase = assertSupabase();

  const { data, error } = await supabase
    .from("event_payments")
    .insert({
      event_id: payload.eventId,
      member_id: payload.memberId,
      amount_cents: payload.amountCents,
      gateway: payload.gateway ?? "manual_pix",
      gateway_payment_id: payload.gatewayPaymentId,
      external_reference: payload.externalReference,
      checkout_url: payload.checkoutUrl,
      pix_qr_code: payload.pixQrCode,
      status: payload.status ?? "pending",
      gateway_payload: payload.gatewayPayload ?? {
        source: payload.gateway ?? "manual_pix"
      }
    })
    .select("id, status")
    .single();

  if (error) throw error;
  return data;
}
