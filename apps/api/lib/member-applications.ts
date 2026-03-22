import type { Member, MemberApplication, MemberApplicationStatus } from "@elo/core";
import { hasResendEmailProvider, sendMemberApprovalEmail } from "./email/resend";
import { memoryStore } from "./store";
import { hasSupabase, supabaseAdmin } from "./supabase";

type MemberApplicationStatusRow = {
  id: string;
  code: string;
  label: string;
  is_final: boolean;
  is_system: boolean;
  active: boolean;
  sort_order: number;
};

type MemberApplicationRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  whatsapp: string;
  city: string;
  state: string;
  area: string;
  bio: string | null;
  specialty: string | null;
  avatar_url: string | null;
  current_status_id: string;
  internal_notes: string | null;
  rejection_reason: string | null;
  approved_member_id: string | null;
  approved_auth_user_id: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
};

type MemberApplicationStatusHistoryInsert = {
  application_id: string;
  status_id: string;
  actor_user_id: string | null;
  note: string | null;
};

type MemberApplicationInput = {
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
};

type UpdateMemberApplicationInput = {
  statusId?: string;
  internalNotes?: string;
};

type ApproveMemberApplicationInput = {
  actorUserId: string;
  membershipExpiresAt: string;
  internalNotes?: string;
};

type RejectMemberApplicationInput = {
  actorUserId: string;
  reason: string;
  internalNotes?: string;
};

export type ApproveMemberApplicationResult = {
  application: MemberApplication;
  deliveryMode: "email" | "manual";
  temporaryPassword?: string;
  deliveryIssue?: string;
};

const DEFAULT_MEMBER_APPLICATION_STATUSES = [
  {
    code: "new_request",
    label: "Nova solicitacao",
    isFinal: false,
    isSystem: true,
    active: true,
    sortOrder: 10
  },
  {
    code: "awaiting_whatsapp_contact",
    label: "Aguardando contato via WhatsApp",
    isFinal: false,
    isSystem: true,
    active: true,
    sortOrder: 20
  },
  {
    code: "awaiting_payment",
    label: "Aguardando pagamento",
    isFinal: false,
    isSystem: true,
    active: true,
    sortOrder: 30
  },
  {
    code: "under_review",
    label: "Em analise",
    isFinal: false,
    isSystem: true,
    active: true,
    sortOrder: 40
  },
  {
    code: "approved",
    label: "Aprovado",
    isFinal: true,
    isSystem: true,
    active: true,
    sortOrder: 90
  },
  {
    code: "rejected",
    label: "Recusado",
    isFinal: true,
    isSystem: true,
    active: true,
    sortOrder: 100
  }
] as const;

function assertSupabase() {
  if (!hasSupabase || !supabaseAdmin) {
    throw new Error("Supabase nao configurado");
  }

  return supabaseAdmin;
}

function slugifyStatusLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

function sanitizeOptionalString(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeMemberApplicationInput(input: MemberApplicationInput) {
  return {
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: sanitizeOptionalString(input.phone),
    whatsapp: input.whatsapp.trim(),
    city: input.city.trim(),
    state: input.state.trim().toUpperCase(),
    area: input.area.trim(),
    bio: sanitizeOptionalString(input.bio),
    specialty: sanitizeOptionalString(input.specialty),
    avatarUrl: sanitizeOptionalString(input.avatarUrl)
  };
}

function toStatus(input: {
  id: string;
  code: string;
  label: string;
  isFinal: boolean;
  isSystem: boolean;
  active: boolean;
  sortOrder: number;
}): MemberApplicationStatus {
  return {
    id: input.id,
    code: input.code,
    label: input.label,
    isFinal: input.isFinal,
    isSystem: input.isSystem,
    active: input.active,
    sortOrder: input.sortOrder
  };
}

function toStatusFromRow(row: MemberApplicationStatusRow): MemberApplicationStatus {
  return toStatus({
    id: row.id,
    code: row.code,
    label: row.label,
    isFinal: row.is_final,
    isSystem: row.is_system,
    active: row.active,
    sortOrder: row.sort_order
  });
}

function toApplication(
  row: MemberApplicationRow | (typeof memoryStore.memberApplications)[number],
  statusMap: Map<string, MemberApplicationStatus>
): MemberApplication {
  const status = statusMap.get("current_status_id" in row ? row.current_status_id : row.currentStatusId);

  if (!status) {
    throw new Error("Status da solicitacao nao encontrado");
  }

  return {
    id: row.id,
    fullName: "full_name" in row ? row.full_name : row.fullName,
    email: row.email,
    phone: row.phone ?? undefined,
    whatsapp: row.whatsapp,
    city: row.city,
    state: row.state,
    area: row.area,
    bio: row.bio ?? undefined,
    specialty: row.specialty ?? undefined,
    avatarUrl: ("avatar_url" in row ? row.avatar_url : row.avatarUrl) ?? undefined,
    internalNotes: ("internal_notes" in row ? row.internal_notes : row.internalNotes) ?? undefined,
    rejectionReason:
      ("rejection_reason" in row ? row.rejection_reason : row.rejectionReason) ?? undefined,
    approvedMemberId:
      "approved_member_id" in row ? row.approved_member_id : row.approvedMemberId,
    approvedAuthUserId:
      "approved_auth_user_id" in row ? row.approved_auth_user_id : row.approvedAuthUserId,
    approvedAt: "approved_at" in row ? row.approved_at : row.approvedAt,
    rejectedAt: "rejected_at" in row ? row.rejected_at : row.rejectedAt,
    createdAt: "created_at" in row ? row.created_at : row.createdAt,
    updatedAt: "updated_at" in row ? row.updated_at : row.updatedAt,
    status
  };
}

function generateTemporaryPassword() {
  const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowers = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "@#$%&*!?";
  const all = `${uppers}${lowers}${numbers}${symbols}`;

  const required = [
    uppers[Math.floor(Math.random() * uppers.length)],
    lowers[Math.floor(Math.random() * lowers.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)]
  ];

  while (required.length < 12) {
    required.push(all[Math.floor(Math.random() * all.length)]);
  }

  return required
    .sort(() => Math.random() - 0.5)
    .join("");
}

function isMembershipExpired(expiresAt: string) {
  const expiresAtMs = new Date(expiresAt).getTime();
  return Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now();
}

function resolveLoginUrl() {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3001";

  try {
    const parsed = new URL(baseUrl);
    parsed.pathname = "/login";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "http://localhost:3001/login";
  }
}

async function recordAuditLog(payload: {
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityId: string | null;
  details?: Record<string, unknown> | null;
}) {
  if (!hasSupabase) {
    memoryStore.auditLogs.unshift({
      id: crypto.randomUUID(),
      actorId: payload.actorId,
      actorRole: payload.actorRole,
      action: payload.action,
      entityType: "member_application",
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
    entity_type: "member_application",
    entity_id: payload.entityId,
    payload: payload.details ?? null
  });

  if (error) {
    throw error;
  }
}

async function ensureDefaultStatuses() {
  if (!hasSupabase) {
    return;
  }

  const supabase = assertSupabase();
  const { error } = await supabase.from("member_application_statuses").upsert(
    DEFAULT_MEMBER_APPLICATION_STATUSES.map((status) => ({
      code: status.code,
      label: status.label,
      is_final: status.isFinal,
      is_system: status.isSystem,
      active: status.active,
      sort_order: status.sortOrder
    })),
    {
      onConflict: "code"
    }
  );

  if (error) {
    throw error;
  }
}

async function insertStatusHistory(
  payload: MemberApplicationStatusHistoryInsert,
  createdAt = new Date().toISOString()
) {
  if (!hasSupabase) {
    memoryStore.memberApplicationStatusHistory.unshift({
      id: crypto.randomUUID(),
      applicationId: payload.application_id,
      statusId: payload.status_id,
      actorUserId: payload.actor_user_id,
      note: payload.note,
      createdAt
    });
    return;
  }

  const supabase = assertSupabase();
  const { error } = await supabase.from("member_application_status_history").insert({
    application_id: payload.application_id,
    status_id: payload.status_id,
    actor_user_id: payload.actor_user_id,
    note: payload.note
  });

  if (error) {
    throw error;
  }
}

async function listMemberProfileConflicts(email: string, whatsapp: string) {
  if (!hasSupabase) {
    return memoryStore.members.filter(
      (member) =>
        member.email.trim().toLowerCase() === email || member.whatsapp.trim() === whatsapp
    );
  }

  const supabase = assertSupabase();
  const [emailQuery, whatsappQuery] = await Promise.all([
    supabase.from("member_profiles").select("id").eq("email", email),
    supabase.from("member_profiles").select("id").eq("whatsapp", whatsapp)
  ]);

  if (emailQuery.error) throw emailQuery.error;
  if (whatsappQuery.error) throw whatsappQuery.error;

  return [...(emailQuery.data ?? []), ...(whatsappQuery.data ?? [])];
}

async function loadApplicationConflictRows(email: string, whatsapp: string) {
  if (!hasSupabase) {
    return memoryStore.memberApplications.filter(
      (application) => application.email === email || application.whatsapp === whatsapp
    );
  }

  const supabase = assertSupabase();
  const [emailQuery, whatsappQuery] = await Promise.all([
    supabase
      .from("member_applications")
      .select("id, current_status_id")
      .eq("email", email),
    supabase
      .from("member_applications")
      .select("id, current_status_id")
      .eq("whatsapp", whatsapp)
  ]);

  if (emailQuery.error) throw emailQuery.error;
  if (whatsappQuery.error) throw whatsappQuery.error;

  return [...(emailQuery.data ?? []), ...(whatsappQuery.data ?? [])];
}

async function loadApplicationRowById(applicationId: string) {
  if (!hasSupabase) {
    return memoryStore.memberApplications.find((application) => application.id === applicationId) ?? null;
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("member_applications")
    .select(
      "id, full_name, email, phone, whatsapp, city, state, area, bio, specialty, avatar_url, current_status_id, internal_notes, rejection_reason, approved_member_id, approved_auth_user_id, approved_at, rejected_at, created_at, updated_at"
    )
    .eq("id", applicationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as MemberApplicationRow | null) ?? null;
}

async function resolveStatusMap() {
  const statuses = await listMemberApplicationStatuses();
  return new Map(statuses.map((status) => [status.id, status]));
}

function extractCurrentStatusId(
  row:
    | Pick<MemberApplicationRow, "current_status_id">
    | Pick<(typeof memoryStore.memberApplications)[number], "currentStatusId">
) {
  return "current_status_id" in row ? row.current_status_id : row.currentStatusId;
}

function isStatusFinal(
  row:
    | Pick<MemberApplicationRow, "current_status_id">
    | Pick<(typeof memoryStore.memberApplications)[number], "currentStatusId">
    | { current_status_id?: string | null; currentStatusId?: string | null },
  statusMap: Map<string, MemberApplicationStatus>
) {
  const statusId = "current_status_id" in row ? row.current_status_id : row.currentStatusId;
  if (!statusId) return false;
  return Boolean(statusMap.get(statusId)?.isFinal);
}

export async function listMemberApplicationStatuses(): Promise<MemberApplicationStatus[]> {
  if (!hasSupabase) {
    return [...memoryStore.memberApplicationStatuses]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
      .map((status) => toStatus(status));
  }

  await ensureDefaultStatuses();

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("member_application_statuses")
    .select("id, code, label, is_final, is_system, active, sort_order")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => toStatusFromRow(row as MemberApplicationStatusRow));
}

export async function createMemberApplicationStatus(label: string): Promise<MemberApplicationStatus> {
  const normalizedLabel = label.trim();

  if (normalizedLabel.length < 3) {
    throw new Error("Informe um status com ao menos 3 caracteres");
  }

  const existingStatuses = await listMemberApplicationStatuses();
  const normalizedCode = slugifyStatusLabel(normalizedLabel);

  if (!normalizedCode) {
    throw new Error("Nao foi possivel gerar o codigo do status");
  }

  const duplicated = existingStatuses.find(
    (status) =>
      status.code === normalizedCode ||
      status.label.trim().toLowerCase() === normalizedLabel.toLowerCase()
  );

  if (duplicated) {
    throw new Error("Ja existe um status com este nome");
  }

  const nextSortOrder =
    existingStatuses
      .filter((status) => !status.isFinal)
      .reduce((highest, status) => Math.max(highest, status.sortOrder), 0) + 10;

  if (!hasSupabase) {
    const status = toStatus({
      id: crypto.randomUUID(),
      code: normalizedCode,
      label: normalizedLabel,
      isFinal: false,
      isSystem: false,
      active: true,
      sortOrder: nextSortOrder
    });

    memoryStore.memberApplicationStatuses.push(status);
    memoryStore.memberApplicationStatuses.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)
    );

    return status;
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("member_application_statuses")
    .insert({
      code: normalizedCode,
      label: normalizedLabel,
      is_final: false,
      is_system: false,
      active: true,
      sort_order: nextSortOrder
    })
    .select("id, code, label, is_final, is_system, active, sort_order")
    .single();

  if (error) {
    throw error;
  }

  return toStatusFromRow(data as MemberApplicationStatusRow);
}

export async function createPublicMemberApplication(input: MemberApplicationInput) {
  const payload = normalizeMemberApplicationInput(input);
  const statuses = await listMemberApplicationStatuses();
  const statusMap = new Map(statuses.map((status) => [status.id, status]));
  const initialStatus = statuses.find((status) => status.code === "new_request");

  if (!initialStatus) {
    throw new Error("Status inicial de solicitacao nao encontrado");
  }

  const memberConflicts = await listMemberProfileConflicts(payload.email, payload.whatsapp);
  if (memberConflicts.length > 0) {
    throw new Error("Ja existe um membro com este e-mail ou WhatsApp");
  }

  const applicationConflicts = await loadApplicationConflictRows(payload.email, payload.whatsapp);
  const hasOpenApplication = applicationConflicts.some((row) => !isStatusFinal(row, statusMap));

  if (hasOpenApplication) {
    throw new Error("Ja existe uma solicitacao em andamento com este e-mail ou WhatsApp");
  }

  const now = new Date().toISOString();

  if (!hasSupabase) {
    const application = {
      id: crypto.randomUUID(),
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone ?? null,
      whatsapp: payload.whatsapp,
      city: payload.city,
      state: payload.state,
      area: payload.area,
      bio: payload.bio ?? null,
      specialty: payload.specialty ?? null,
      avatarUrl: payload.avatarUrl ?? null,
      currentStatusId: initialStatus.id,
      internalNotes: null,
      rejectionReason: null,
      approvedMemberId: null,
      approvedAuthUserId: null,
      approvedAt: null,
      rejectedAt: null,
      createdAt: now,
      updatedAt: now
    };

    memoryStore.memberApplications.unshift(application);
    await insertStatusHistory({
      application_id: application.id,
      status_id: initialStatus.id,
      actor_user_id: null,
      note: "Solicitacao criada pelo formulario publico"
    }, now);
    await recordAuditLog({
      actorId: null,
      actorRole: "public",
      action: "member_application.created",
      entityId: application.id,
      details: {
        email: application.email,
        whatsapp: application.whatsapp
      }
    });

    return toApplication(application, statusMap);
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("member_applications")
    .insert({
      full_name: payload.fullName,
      email: payload.email,
      phone: payload.phone ?? null,
      whatsapp: payload.whatsapp,
      city: payload.city,
      state: payload.state,
      area: payload.area,
      bio: payload.bio ?? null,
      specialty: payload.specialty ?? null,
      avatar_url: payload.avatarUrl ?? null,
      current_status_id: initialStatus.id
    })
    .select(
      "id, full_name, email, phone, whatsapp, city, state, area, bio, specialty, avatar_url, current_status_id, internal_notes, rejection_reason, approved_member_id, approved_auth_user_id, approved_at, rejected_at, created_at, updated_at"
    )
    .single();

  if (error) {
    throw error;
  }

  const application = data as MemberApplicationRow;
  await insertStatusHistory({
    application_id: application.id,
    status_id: initialStatus.id,
    actor_user_id: null,
    note: "Solicitacao criada pelo formulario publico"
  });
  await recordAuditLog({
    actorId: null,
    actorRole: "public",
    action: "member_application.created",
    entityId: application.id,
    details: {
      email: application.email,
      whatsapp: application.whatsapp
    }
  });

  return toApplication(application, statusMap);
}

export async function listMemberApplications(): Promise<MemberApplication[]> {
  const statusMap = await resolveStatusMap();

  if (!hasSupabase) {
    return [...memoryStore.memberApplications]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((application) => toApplication(application, statusMap));
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("member_applications")
    .select(
      "id, full_name, email, phone, whatsapp, city, state, area, bio, specialty, avatar_url, current_status_id, internal_notes, rejection_reason, approved_member_id, approved_auth_user_id, approved_at, rejected_at, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => toApplication(row as MemberApplicationRow, statusMap));
}

export async function getMemberApplicationById(applicationId: string): Promise<MemberApplication | null> {
  const statusMap = await resolveStatusMap();
  const row = await loadApplicationRowById(applicationId);

  if (!row) {
    return null;
  }

  return toApplication(row, statusMap);
}

export async function updateMemberApplication(
  applicationId: string,
  actorUserId: string,
  input: UpdateMemberApplicationInput
) {
  const application = await loadApplicationRowById(applicationId);

  if (!application) {
    throw new Error("Solicitacao nao encontrada");
  }

  const statuses = await listMemberApplicationStatuses();
  const statusMap = new Map(statuses.map((status) => [status.id, status]));
  const currentStatusId = extractCurrentStatusId(application);
  const currentStatus = statusMap.get(currentStatusId);

  if (!currentStatus) {
    throw new Error("Status atual da solicitacao nao encontrado");
  }

  let nextStatus = currentStatus;
  if (input.statusId) {
    const status = statusMap.get(input.statusId);

    if (!status) {
      throw new Error("Status informado nao encontrado");
    }

    if (status.isFinal) {
      throw new Error("Use as acoes finais de aprovar ou recusar para encerrar a solicitacao");
    }

    if (currentStatus.isFinal) {
      throw new Error("Solicitacoes finalizadas nao podem mudar de status");
    }

    nextStatus = status;
  }

  const nextNotes =
    input.internalNotes !== undefined ? sanitizeOptionalString(input.internalNotes) ?? null : undefined;
  const statusChanged = nextStatus.id !== currentStatus.id;
  const now = new Date().toISOString();

  if (!hasSupabase) {
    const memoryApplication = memoryStore.memberApplications.find((entry) => entry.id === applicationId);

    if (!memoryApplication) {
      throw new Error("Solicitacao nao encontrada");
    }

    memoryApplication.currentStatusId = nextStatus.id;
    if (nextNotes !== undefined) {
      memoryApplication.internalNotes = nextNotes;
    }
    memoryApplication.updatedAt = now;

    if (statusChanged) {
      await insertStatusHistory(
        {
          application_id: applicationId,
          status_id: nextStatus.id,
          actor_user_id: actorUserId,
          note: nextNotes ?? null
        },
        now
      );
    }

    await recordAuditLog({
      actorId: actorUserId,
      actorRole: "admin",
      action: statusChanged ? "member_application.status_updated" : "member_application.notes_updated",
      entityId: applicationId,
      details: {
        fromStatusCode: currentStatus.code,
        toStatusCode: nextStatus.code,
        internalNotes: nextNotes ?? memoryApplication.internalNotes
      }
    });

    return toApplication(memoryApplication, statusMap);
  }

  const supabase = assertSupabase();
  const updatePayload: Record<string, unknown> = {
    updated_at: now
  };

  if (statusChanged) {
    updatePayload.current_status_id = nextStatus.id;
  }

  if (nextNotes !== undefined) {
    updatePayload.internal_notes = nextNotes;
  }

  const { data, error } = await supabase
    .from("member_applications")
    .update(updatePayload)
    .eq("id", applicationId)
    .select(
      "id, full_name, email, phone, whatsapp, city, state, area, bio, specialty, avatar_url, current_status_id, internal_notes, rejection_reason, approved_member_id, approved_auth_user_id, approved_at, rejected_at, created_at, updated_at"
    )
    .single();

  if (error) {
    throw error;
  }

  if (statusChanged) {
    await insertStatusHistory({
      application_id: applicationId,
      status_id: nextStatus.id,
      actor_user_id: actorUserId,
      note: nextNotes ?? null
    });
  }

  await recordAuditLog({
    actorId: actorUserId,
    actorRole: "admin",
    action: statusChanged ? "member_application.status_updated" : "member_application.notes_updated",
    entityId: applicationId,
    details: {
      fromStatusCode: currentStatus.code,
      toStatusCode: nextStatus.code,
      internalNotes: nextNotes ?? ("internal_notes" in data ? data.internal_notes : null)
    }
  });

  return toApplication(data as MemberApplicationRow, statusMap);
}

function toMemberOutput(
  row:
    | Member
    | {
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
        avatar_url?: string | null;
        active: boolean;
        auth_user_id?: string | null;
        must_change_password?: boolean | null;
        onboarding_application_id?: string | null;
      }
): Member {
  if ("fullName" in row) {
    return row;
  }

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
    active: row.active,
    authUserId: row.auth_user_id ?? null,
    mustChangePassword: Boolean(row.must_change_password),
    onboardingApplicationId: row.onboarding_application_id ?? null
  };
}

export async function approveMemberApplication(
  applicationId: string,
  input: ApproveMemberApplicationInput
): Promise<ApproveMemberApplicationResult> {
  const applicationRow = await loadApplicationRowById(applicationId);

  if (!applicationRow) {
    throw new Error("Solicitacao nao encontrada");
  }

  const statuses = await listMemberApplicationStatuses();
  const statusMap = new Map(statuses.map((status) => [status.id, status]));
  const currentStatus = statusMap.get(extractCurrentStatusId(applicationRow));
  const approvedStatus = statuses.find((status) => status.code === "approved");

  if (!currentStatus || !approvedStatus) {
    throw new Error("Status de aprovacao nao encontrado");
  }

  if (currentStatus.isFinal) {
    throw new Error("Solicitacao ja finalizada");
  }

  const application = toApplication(applicationRow, statusMap);
  const temporaryPassword = generateTemporaryPassword();
  const membershipStatus = isMembershipExpired(input.membershipExpiresAt) ? "expired" : "active";
  const memberIsActive = membershipStatus === "active";
  const now = new Date().toISOString();
  const nextNotes =
    input.internalNotes !== undefined ? sanitizeOptionalString(input.internalNotes) ?? null : undefined;

  let deliveryMode: "email" | "manual" = "manual";
  let deliveryIssue: string | undefined;

  if (!hasSupabase) {
    const authUserId = crypto.randomUUID();
    const member = {
      id: crypto.randomUUID(),
      fullName: application.fullName,
      email: application.email,
      phone: application.phone ?? application.whatsapp,
      whatsapp: application.whatsapp,
      city: application.city,
      state: application.state,
      area: application.area,
      bio: application.bio,
      specialty: application.specialty,
      avatarUrl: application.avatarUrl,
      active: memberIsActive,
      authUserId,
      mustChangePassword: true,
      onboardingApplicationId: application.id
    };

    memoryStore.members.unshift(member);
    memoryStore.memberships.unshift({
      id: `membership-${member.id}`,
      memberId: member.id,
      startedAt: now,
      expiresAt: input.membershipExpiresAt,
      status: membershipStatus,
      createdAt: now
    });

    const memoryApplication = memoryStore.memberApplications.find((entry) => entry.id === applicationId);
    if (!memoryApplication) {
      throw new Error("Solicitacao nao encontrada");
    }

    memoryApplication.currentStatusId = approvedStatus.id;
    memoryApplication.internalNotes =
      nextNotes !== undefined ? nextNotes : memoryApplication.internalNotes;
    memoryApplication.rejectionReason = null;
    memoryApplication.approvedMemberId = member.id;
    memoryApplication.approvedAuthUserId = authUserId;
    memoryApplication.approvedAt = now;
    memoryApplication.rejectedAt = null;
    memoryApplication.updatedAt = now;

    await insertStatusHistory(
      {
        application_id: applicationId,
        status_id: approvedStatus.id,
        actor_user_id: input.actorUserId,
        note: nextNotes ?? null
      },
      now
    );

    await recordAuditLog({
      actorId: input.actorUserId,
      actorRole: "admin",
      action: "member_application.approved",
      entityId: applicationId,
      details: {
        memberId: member.id,
        authUserId,
        membershipExpiresAt: input.membershipExpiresAt
      }
    });

    if (hasResendEmailProvider()) {
      try {
        await sendMemberApprovalEmail({
          to: member.email,
          fullName: member.fullName,
          temporaryPassword,
          loginUrl: resolveLoginUrl()
        });
        deliveryMode = "email";
      } catch (error) {
        deliveryIssue = (error as Error).message;
      }
    }

    return {
      application: toApplication(memoryApplication, statusMap),
      deliveryMode,
      temporaryPassword: deliveryMode === "manual" ? temporaryPassword : undefined,
      deliveryIssue
    };
  }

  const supabase = assertSupabase();
  let createdAuthUserId: string | null = null;
  let createdMemberId: string | null = null;

  try {
    const authResult = await supabase.auth.admin.createUser({
      email: application.email,
      password: temporaryPassword,
      email_confirm: true,
      app_metadata: {
        role: "member"
      },
      user_metadata: {
        full_name: application.fullName
      }
    });

    if (authResult.error || !authResult.data.user) {
      throw authResult.error ?? new Error("Falha ao criar usuario de autenticacao");
    }

    createdAuthUserId = authResult.data.user.id;

    const { error: roleError } = await supabase.from("user_roles").upsert(
      {
        user_id: createdAuthUserId,
        role: "member"
      },
      { onConflict: "user_id" }
    );

    if (roleError) {
      throw roleError;
    }

    const { data: memberData, error: memberError } = await supabase
      .from("member_profiles")
      .insert({
        full_name: application.fullName,
        email: application.email,
        phone: application.phone ?? application.whatsapp,
        whatsapp: application.whatsapp,
        city: application.city,
        state: application.state,
        area: application.area,
        bio: application.bio ?? null,
        specialty: application.specialty ?? null,
        avatar_url: application.avatarUrl ?? null,
        active: memberIsActive,
        auth_user_id: createdAuthUserId,
        must_change_password: true,
        onboarding_application_id: application.id
      })
      .select(
        "id, full_name, email, phone, whatsapp, city, state, area, bio, specialty, avatar_url, active, auth_user_id, must_change_password, onboarding_application_id"
      )
      .single();

    if (memberError) {
      throw memberError;
    }

    createdMemberId = memberData.id;

    const { error: membershipError } = await supabase.from("memberships").insert({
      member_id: createdMemberId,
      started_at: now,
      expires_at: input.membershipExpiresAt,
      status: membershipStatus
    });

    if (membershipError) {
      throw membershipError;
    }

    const { data: approvedRow, error: approvalError } = await supabase
      .from("member_applications")
      .update({
        current_status_id: approvedStatus.id,
        internal_notes: nextNotes !== undefined ? nextNotes : application.internalNotes ?? null,
        rejection_reason: null,
        approved_member_id: createdMemberId,
        approved_auth_user_id: createdAuthUserId,
        approved_at: now,
        rejected_at: null,
        updated_at: now
      })
      .eq("id", applicationId)
      .select(
        "id, full_name, email, phone, whatsapp, city, state, area, bio, specialty, avatar_url, current_status_id, internal_notes, rejection_reason, approved_member_id, approved_auth_user_id, approved_at, rejected_at, created_at, updated_at"
      )
      .single();

    if (approvalError) {
      throw approvalError;
    }

    await insertStatusHistory({
      application_id: applicationId,
      status_id: approvedStatus.id,
      actor_user_id: input.actorUserId,
      note: nextNotes ?? null
    });

    await recordAuditLog({
      actorId: input.actorUserId,
      actorRole: "admin",
      action: "member_application.approved",
      entityId: applicationId,
      details: {
        memberId: createdMemberId,
        authUserId: createdAuthUserId,
        membershipExpiresAt: input.membershipExpiresAt
      }
    });

    if (hasResendEmailProvider()) {
      try {
        await sendMemberApprovalEmail({
          to: application.email,
          fullName: application.fullName,
          temporaryPassword,
          loginUrl: resolveLoginUrl()
        });
        deliveryMode = "email";
      } catch (error) {
        deliveryIssue = (error as Error).message;
      }
    }

    return {
      application: toApplication(approvedRow as MemberApplicationRow, statusMap),
      deliveryMode,
      temporaryPassword: deliveryMode === "manual" ? temporaryPassword : undefined,
      deliveryIssue
    };
  } catch (error) {
    if (createdMemberId) {
      await supabase.from("memberships").delete().eq("member_id", createdMemberId);
      await supabase.from("member_profiles").delete().eq("id", createdMemberId);
    }

    if (createdAuthUserId) {
      await supabase.from("user_roles").delete().eq("user_id", createdAuthUserId);
      await supabase.auth.admin.deleteUser(createdAuthUserId);
    }

    throw error;
  }
}

export async function rejectMemberApplication(
  applicationId: string,
  input: RejectMemberApplicationInput
) {
  const applicationRow = await loadApplicationRowById(applicationId);

  if (!applicationRow) {
    throw new Error("Solicitacao nao encontrada");
  }

  const statuses = await listMemberApplicationStatuses();
  const statusMap = new Map(statuses.map((status) => [status.id, status]));
  const currentStatus = statusMap.get(extractCurrentStatusId(applicationRow));
  const rejectedStatus = statuses.find((status) => status.code === "rejected");

  if (!currentStatus || !rejectedStatus) {
    throw new Error("Status de recusa nao encontrado");
  }

  if (currentStatus.isFinal) {
    throw new Error("Solicitacao ja finalizada");
  }

  const now = new Date().toISOString();
  const nextNotes =
    input.internalNotes !== undefined ? sanitizeOptionalString(input.internalNotes) ?? null : undefined;

  if (!hasSupabase) {
    const memoryApplication = memoryStore.memberApplications.find((entry) => entry.id === applicationId);

    if (!memoryApplication) {
      throw new Error("Solicitacao nao encontrada");
    }

    memoryApplication.currentStatusId = rejectedStatus.id;
    memoryApplication.internalNotes =
      nextNotes !== undefined ? nextNotes : memoryApplication.internalNotes;
    memoryApplication.rejectionReason = input.reason.trim();
    memoryApplication.rejectedAt = now;
    memoryApplication.updatedAt = now;

    await insertStatusHistory(
      {
        application_id: applicationId,
        status_id: rejectedStatus.id,
        actor_user_id: input.actorUserId,
        note: input.reason.trim()
      },
      now
    );

    await recordAuditLog({
      actorId: input.actorUserId,
      actorRole: "admin",
      action: "member_application.rejected",
      entityId: applicationId,
      details: {
        reason: input.reason.trim()
      }
    });

    return toApplication(memoryApplication, statusMap);
  }

  const supabase = assertSupabase();
  const { data, error } = await supabase
    .from("member_applications")
    .update({
      current_status_id: rejectedStatus.id,
      internal_notes:
        nextNotes !== undefined
          ? nextNotes
          : "internal_notes" in applicationRow
            ? applicationRow.internal_notes ?? null
            : applicationRow.internalNotes ?? null,
      rejection_reason: input.reason.trim(),
      rejected_at: now,
      updated_at: now
    })
    .eq("id", applicationId)
    .select(
      "id, full_name, email, phone, whatsapp, city, state, area, bio, specialty, avatar_url, current_status_id, internal_notes, rejection_reason, approved_member_id, approved_auth_user_id, approved_at, rejected_at, created_at, updated_at"
    )
    .single();

  if (error) {
    throw error;
  }

  await insertStatusHistory({
    application_id: applicationId,
    status_id: rejectedStatus.id,
    actor_user_id: input.actorUserId,
    note: input.reason.trim()
  });

  await recordAuditLog({
    actorId: input.actorUserId,
    actorRole: "admin",
    action: "member_application.rejected",
    entityId: applicationId,
    details: {
      reason: input.reason.trim()
    }
  });

  return toApplication(data as MemberApplicationRow, statusMap);
}

export async function completeMemberFirstAccess(authUserId: string, password: string): Promise<Member> {
  if (!hasSupabase) {
    const member = memoryStore.members.find((entry) => entry.authUserId === authUserId) ?? null;

    if (!member) {
      throw new Error("Membro nao encontrado para concluir primeiro acesso");
    }

    if (!member.mustChangePassword) {
      return member;
    }

    member.mustChangePassword = false;
    return member;
  }

  const supabase = assertSupabase();
  const { data: memberData, error: lookupError } = await supabase
    .from("member_profiles")
    .select(
      "id, full_name, email, phone, whatsapp, city, state, area, bio, specialty, avatar_url, active, auth_user_id, must_change_password, onboarding_application_id"
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (!memberData) {
    throw new Error("Membro nao encontrado para concluir primeiro acesso");
  }

  if (!memberData.must_change_password) {
    return toMemberOutput(memberData);
  }

  const { error: authError } = await supabase.auth.admin.updateUserById(authUserId, {
    password
  });

  if (authError) {
    throw authError;
  }

  const { data, error } = await supabase
    .from("member_profiles")
    .update({
      must_change_password: false,
      updated_at: new Date().toISOString()
    })
    .eq("id", memberData.id)
    .select(
      "id, full_name, email, phone, whatsapp, city, state, area, bio, specialty, avatar_url, active, auth_user_id, must_change_password, onboarding_application_id"
    )
    .single();

  if (error) {
    throw error;
  }

  await recordAuditLog({
    actorId: authUserId,
    actorRole: "member",
    action: "member.first_access_completed",
    entityId: memberData.id,
    details: null
  });

  return toMemberOutput(data);
}
