# Setup de E-mail Transacional (Resend)

## Objetivo
Garantir envio de recuperacao de senha pelo endpoint `POST /api/auth/reset-password`.

## Variaveis obrigatorias
- `RESEND_API_KEY`
- `EMAIL_FROM` (dominio validado no Resend)
- `APP_BASE_URL`
- `PASSWORD_RESET_REDIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Fluxo
1. API gera link de recuperacao via `supabaseAdmin.auth.admin.generateLink`.
2. API envia e-mail via Resend com o `action_link` seguro (`https://`).
3. Fallback: se Resend nao estiver disponivel, usa `supabaseAuthClient.auth.resetPasswordForEmail`.
4. O `redirectTo` e normalizado para HTTPS fora de ambientes locais.

## Validacao rapida
1. Configurar variaveis no ambiente (staging/producao).
2. Chamar `POST /api/auth/reset-password` com um e-mail valido.
3. Confirmar recebimento do e-mail no inbox.
4. Clicar no link e validar redirecionamento para `PASSWORD_RESET_REDIRECT_URL`.
