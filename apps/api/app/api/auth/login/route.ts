import { loginSchema } from "@elo/core";
import { getMemberById } from "../../../../lib/repositories";
import { fail, ok, parseJson } from "../../../../lib/http";
import { hasSupabaseAuthClient, supabaseAuthClient } from "../../../../lib/supabase";
import {
  buildMockAuthToken,
  requireAuth,
  resolveMemberPasswordStateByAuthUser
} from "../../../../lib/auth";
import { memoryStore } from "../../../../lib/store";

export async function POST(request: Request) {
  const payload = await parseJson<unknown>(request);
  const parsed = loginSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload inválido", 422);
  }

  if (!hasSupabaseAuthClient || !supabaseAuthClient) {
    if (process.env.ALLOW_MOCK_AUTH === "true") {
      const isAdmin = parsed.data.email.includes("admin");
      const normalizedEmail = parsed.data.email.trim().toLowerCase();
      const memberProfile = !isAdmin
        ? memoryStore.members.find((member) => member.email.trim().toLowerCase() === normalizedEmail) ?? null
        : null;
      const userId = isAdmin
        ? "00000000-0000-0000-0000-000000000010"
        : memberProfile?.authUserId ?? "00000000-0000-0000-0000-000000000020";

      return ok({
        session: {
          accessToken: buildMockAuthToken({
            role: isAdmin ? "admin" : "member",
            userId,
            email: normalizedEmail
          }),
          refreshToken: "mock-refresh-token",
          expiresAt: Date.now() + 3600 * 1000
        },
        user: {
          userId,
          email: normalizedEmail,
          role: isAdmin ? "admin" : "member",
          memberId: isAdmin ? null : memberProfile?.id ?? "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e",
          displayName: isAdmin ? "Admin Elo" : memberProfile?.fullName ?? "Membro Elo",
          avatarUrl: isAdmin ? null : memberProfile?.avatarUrl ?? null,
          mustChangePassword: isAdmin ? false : Boolean(memberProfile?.mustChangePassword)
        }
      });
    }

    return fail("Supabase Auth não configurado", 503);
  }

  const { data, error } = await supabaseAuthClient.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password
  });

  if (error || !data.session || !data.user) {
    return fail("Credenciais inválidas", 401);
  }

  const fakeRequest = new Request("http://local/auth/me", {
    headers: {
      authorization: `Bearer ${data.session.access_token}`
    }
  });

  const auth = await requireAuth(fakeRequest);

  if (!auth.ok) {
    return fail("Usuário sem role autorizada", 403);
  }

  const passwordState = await resolveMemberPasswordStateByAuthUser(data.user.id);
  const memberId = passwordState.memberId;
  const memberProfile = memberId ? await getMemberById(memberId) : null;

  return ok({
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ? data.session.expires_at * 1000 : null
    },
    user: {
      userId: data.user.id,
      email: data.user.email ?? parsed.data.email,
      role: auth.auth.role,
      memberId,
      displayName: memberProfile?.fullName ?? (auth.auth.role === "admin" ? "Admin Elo" : "Membro Elo"),
      avatarUrl: memberProfile?.avatarUrl ?? null,
      mustChangePassword: passwordState.mustChangePassword
    }
  });
}
