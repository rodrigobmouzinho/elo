import type { UserRole } from "@elo/core";
import type { NextResponse } from "next/server";
import { fail } from "./http";
import { hasSupabase, supabaseAdmin } from "./supabase";

type AuthContext = {
  userId: string;
  email: string;
  role: UserRole;
};

type AuthResult =
  | { ok: true; auth: AuthContext }
  | { ok: false; response: NextResponse };

function extractBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice(7).trim();
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
      const devRoleHeader = request.headers.get("x-dev-role");
      const devRole = devRoleHeader === "admin" || devRoleHeader === "member" ? devRoleHeader : "member";

      if (allowedRoles && !allowedRoles.includes(devRole)) {
        return { ok: false, response: fail("Não autorizado para este recurso", 403) };
      }

      return {
        ok: true,
        auth: {
          userId: "00000000-0000-0000-0000-000000000001",
          email: "dev@elo.local",
          role: devRole
        }
      };
    }

    return { ok: false, response: fail("Supabase não configurado para autenticação", 503) };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return { ok: false, response: fail("Token inválido ou expirado", 401) };
  }

  const role = await resolveRole(data.user.id, String(data.user.app_metadata?.role ?? ""));

  if (!role) {
    return { ok: false, response: fail("Perfil sem role atribuida", 403) };
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return { ok: false, response: fail("Não autorizado para este recurso", 403) };
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
    return process.env.ALLOW_MOCK_AUTH === "true"
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
