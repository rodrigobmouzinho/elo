import { loginSchema } from "@elo/core";
import { getMemberById } from "../../../../lib/repositories";
import { fail, ok, parseJson } from "../../../../lib/http";
import { hasSupabaseAuthClient, supabaseAuthClient } from "../../../../lib/supabase";
import { resolveMemberIdByAuthUser, requireAuth } from "../../../../lib/auth";

export async function POST(request: Request) {
  const payload = await parseJson<unknown>(request);
  const parsed = loginSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload inválido", 422);
  }

  if (!hasSupabaseAuthClient || !supabaseAuthClient) {
    if (process.env.ALLOW_MOCK_AUTH === "true") {
      const isAdmin = parsed.data.email.includes("admin");

      return ok({
        session: {
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          expiresAt: Date.now() + 3600 * 1000
        },
        user: {
          userId: isAdmin
            ? "00000000-0000-0000-0000-000000000010"
            : "00000000-0000-0000-0000-000000000020",
          email: parsed.data.email,
          role: isAdmin ? "admin" : "member",
          memberId: isAdmin ? null : "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e",
          displayName: isAdmin ? "Admin Elo" : "Membro Elo"
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

  const memberId = await resolveMemberIdByAuthUser(data.user.id);
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
      displayName: memberProfile?.fullName ?? (auth.auth.role === "admin" ? "Admin Elo" : "Membro Elo")
    }
  });
}
