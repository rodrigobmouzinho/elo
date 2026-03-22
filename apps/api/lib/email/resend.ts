type PasswordResetEmailInput = {
  to: string;
  resetUrl: string;
};

type MemberApprovalEmailInput = {
  to: string;
  fullName: string;
  temporaryPassword: string;
  loginUrl: string;
};

const RESEND_API_URL = "https://api.resend.com/emails";

export function hasResendEmailProvider() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendPasswordResetEmail({ to, resetUrl }: PasswordResetEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY não configurada");
  }

  const from = process.env.EMAIL_FROM ?? "no-reply@elonetworking.com";
  const subject = "Recuperação de senha - Elo Networking";
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h2 style="margin: 0 0 12px;">Recuperação de senha</h2>
      <p>Recebemos um pedido para redefinir sua senha na plataforma Elo Networking.</p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:8px;">
          Redefinir senha
        </a>
      </p>
      <p>Se você não solicitou esta ação, ignore este e-mail.</p>
    </div>
  `;

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Falha no envio via Resend (${response.status}): ${detail}`);
  }
}

export async function sendMemberApprovalEmail({
  to,
  fullName,
  temporaryPassword,
  loginUrl
}: MemberApprovalEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY nao configurada");
  }

  const from = process.env.EMAIL_FROM ?? "no-reply@elonetworking.com";
  const subject = "Sua adesao foi aprovada - Elo Networking";
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
      <h2 style="margin: 0 0 12px;">Bem-vindo(a) a Elo Networking</h2>
      <p>Ola, ${fullName}.</p>
      <p>Sua solicitacao de adesao foi aprovada. Para concluir o primeiro acesso, use as credenciais abaixo:</p>
      <div style="padding: 12px 14px; border-radius: 12px; background: #F3F4F6; margin: 16px 0;">
        <p style="margin: 0 0 8px;"><strong>Login:</strong> ${to}</p>
        <p style="margin: 0;"><strong>Senha temporaria:</strong> ${temporaryPassword}</p>
      </div>
      <p>No primeiro acesso, voce vai criar sua senha definitiva seguindo o padrao de seguranca da plataforma.</p>
      <p>
        <a href="${loginUrl}" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:8px;">
          Entrar na plataforma
        </a>
      </p>
      <p>Se tiver qualquer duvida, nosso time segue disponivel tambem pelo WhatsApp.</p>
    </div>
  `;

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Falha no envio via Resend (${response.status}): ${detail}`);
  }
}
