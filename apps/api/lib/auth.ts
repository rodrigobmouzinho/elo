import type { UserRole } from "@elo/core";
import type { NextResponse } from "next/server";
import { fail } from "./http";
import { memoryStore } from "./store";
import { hasSupabase, supabaseAdmin } from "./supabase";

type AuthContext = {
  userId: string;
  email: string;
  role: UserRole;
};

type AuthResult =
  | { ok: true; auth: AuthContext }
  | { ok: false; response: NextResponse };

function isMissingColumnError(error: unknown, columnName: string) {
  const message = ((error as { message?: string })?.message ?? "").toLowerCase();
  return message.includes(columnName.toLowerCase()) && message.includes("does not exist");
}

function extractBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice(7).trim();
}

function parseMockAuthToken(token: string | null): AuthContext | null {
  if (!token?.startsWith("mock:")) {
    return null;
  }

  const [, role, userId, encodedEmail] = token.split(":");

  if ((role !== "admin" && role !== "member") || !userId || !encodedEmail) {
    return null;
  }

  try {
    return {
      userId,
      email: Buffer.from(encodedEmail, "base64url").toString("utf8"),
      role
    };
  } catch {
    return null;
  }
}

export function buildMockAuthToken(input: { role: UserRole; userId: string; email: string }) {
  return `mock:${input.role}:${input.userId}:${Buffer.from(input.email).toString("base64url")}`;
}

async function resolveRole(userId: string, userRoleFromMetadata?: string): Promise<UserRole | null> {
  if (userRoleFromMetadata === "admin" || userRoleFromMetadata === "member") {
    return userRoleFromMetadata;
  }

  if (!hasSupabase || !supabaseAdmin) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.role) {
    return null;
  }

  return data.role as UserRole;
}

export async function requireAuth(request: Request, allowedRoles?: UserRole[]): Promise<AuthResult> {
  const token = extractBearerToken(request);

  if (!token) {
    return { ok: false, response: fail("Token de acesso ausente", 401) };
  }

  if (!hasSupabase || !supabaseAdmin) {
    if (process.env.ALLOW_MOCK_AUTH === "true") {
      const tokenAuth = parseMockAuthToken(token);
      const devRoleHeader = request.headers.get("x-dev-role");
      const devRole = devRoleHeader === "admin" || devRoleHeader === "member" ? devRoleHeader : "member";
      const mockAuth =
        tokenAuth ??
        ({
          userId:
            devRole === "admin"
              ? "00000000-0000-0000-0000-000000000010"
              : "00000000-0000-0000-0000-000000000020",
          email: devRole === "admin" ? "admin@elo.local" : "member@elo.local",
          role: devRole
        } satisfies AuthContext);

      if (allowedRoles && !allowedRoles.includes(mockAuth.role)) {
        return { ok: false, response: fail("Nao autorizado para este recurso", 403) };
      }

      return {
        ok: true,
        auth: mockAuth
      };
    }

    return { ok: false, response: fail("Supabase nao configurado para autenticacao", 503) };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return { ok: false, response: fail("Token invalido ou expirado", 401) };
  }

  const role = await resolveRole(data.user.id, String(data.user.app_metadata?.role ?? ""));

  if (!role) {
    return { ok: false, response: fail("Perfil sem role atribuida", 403) };
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return { ok: false, response: fail("Nao autorizado para este recurso", 403) };
  }

  return {
    ok: true,
    auth: {
      userId: data.user.id,
      email: data.user.email ?? "",
      role
    }
  };
}

export async function resolveMemberIdByAuthUser(authUserId: string): Promise<string | null> {
  if (!hasSupabase || !supabaseAdmin) {
    if (process.env.ALLOW_MOCK_AUTH !== "true") {
      return null;
    }

    const member = memoryStore.members.find((entry) => entry.authUserId === authUserId);

    if (member) {
      return member.id;
    }

    return authUserId === "00000000-0000-0000-0000-000000000020"
      ? "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e"
      : null;
  }

  const { data, error } = await supabaseAdmin
    .from("member_profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

export async function resolveMemberPasswordStateByAuthUser(authUserId: string): Promise<{
  memberId: string | null;
  mustChangePassword: boolean;
}> {
  if (!hasSupabase || !supabaseAdmin) {
    const memberId = await resolveMemberIdByAuthUser(authUserId);
    const member = memberId
      ? memoryStore.members.find((entry) => entry.id === memberId) ?? null
      : null;

    return {
      memberId,
      mustChangePassword: Boolean(member?.mustChangePassword)
    };
  }

  const { data, error } = await supabaseAdmin
    .from("member_profiles")
    .select("id, must_change_password")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error && isMissingColumnError(error, "must_change_password")) {
    const fallback = await supabaseAdmin
      .from("member_profiles")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (fallback.error) {
      throw fallback.error;
    }

    return {
      memberId: fallback.data?.id ?? null,
      mustChangePassword: false
    };
  }

  if (error) {
    throw error;
  }

  return {
    memberId: data?.id ?? null,
    mustChangePassword: Boolean(data?.must_change_password)
  };
}
