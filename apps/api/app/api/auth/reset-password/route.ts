import { resetPasswordSchema } from "@elo/core";
import { fail, ok, parseJson } from "../../../../lib/http";
import { hasResendEmailProvider, sendPasswordResetEmail } from "../../../../lib/email/resend";
import {
  hasSupabase,
  hasSupabaseAuthClient,
  supabaseAdmin,
  supabaseAuthClient
} from "../../../../lib/supabase";

const GENERIC_RESET_MESSAGE = "Se o e-mail existir, enviaremos as instruções de recuperação.";

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function resolvePasswordResetRedirectUrl() {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3001";
  const rawRedirect = process.env.PASSWORD_RESET_REDIRECT_URL ?? `${baseUrl}/login?reset=1`;

  try {
    const parsed = new URL(rawRedirect);

    if (!isLocalHostname(parsed.hostname) && parsed.protocol !== "https:") {
      parsed.protocol = "https:";
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const payload = await parseJson<unknown>(request);
  const parsed = resetPasswordSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload inválido", 422);
  }

  const redirectTo = resolvePasswordResetRedirectUrl();
  if (!redirectTo) {
    return fail("URL de redirecionamento de reset inválida", 500);
  }

  if (hasResendEmailProvider() && hasSupabase && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: parsed.data.email,
      options: {
        redirectTo
      }
    });

    const actionLink = data?.properties?.action_link;
    if (!error && actionLink && actionLink.startsWith("https://")) {
      await sendPasswordResetEmail({
        to: parsed.data.email,
        resetUrl: actionLink
      });

      return ok({
        message: GENERIC_RESET_MESSAGE,
        provider: "resend"
      });
    }
  }

  if (!hasSupabaseAuthClient || !supabaseAuthClient) {
    return fail("Supabase Auth não configurado", 503);
  }

  const { error } = await supabaseAuthClient.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo
  });

  if (error) {
    return fail(`Falha ao processar reset de senha: ${error.message}`, 500);
  }

  return ok({
    message: GENERIC_RESET_MESSAGE,
    provider: "supabase"
  });
}
