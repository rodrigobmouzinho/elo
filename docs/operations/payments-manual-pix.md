# Fluxo de Pagamentos (Manual PIX)

## Configuração
- `PAYMENTS_MODE=manual_pix`
- `MANUAL_PIX_KEY=<chave-pix>`
- `MANUAL_PIX_KEY_TYPE=<email|cpf|telefone|aleatoria>`
- `MANUAL_PIX_BENEFICIARY=<nome favorecido>`
- `MANUAL_PIX_CITY=<cidade>`
- `MANUAL_PAYMENT_PROOF_CONTACT=<whatsapp ou email>`
- `MANUAL_PIX_INSTRUCTIONS=<mensagem opcional>`

## Fluxo de anuidade
1. Admin gera cobrança em `/api/admin/finance/memberships/:id/charge`.
2. API cria pagamento manual pendente em `membership_payments`.
3. API retorna `manualPayment` com:
   - `pixQrCodeImage` (QR dinâmico)
   - `pixCopyPaste`
   - `txId`
4. Admin aprova em `/api/admin/finance/memberships/:id/approve-payment`.
5. Aprovação renova `memberships.expires_at` por mais 365 dias e reativa `member_profiles.active=true`.
6. Quando `expires_at` passa da data atual, a API marca a anuidade como `expired` e inativa o acesso do membro.

## Fluxo de evento pago
1. Membro inicia checkout em `/api/app/events/:id/checkout`.
2. API cria pagamento pendente em `event_payments` e evita duplicidade reaproveitando pendência aberta.
3. Membro recebe QR dinâmico + código copia e cola no app.
4. Admin aprova comprovante em `/api/admin/finance/event-payments/:id/approve`.
5. PWA consulta `GET /api/app/events/:id/checkout-status` para feedback em tempo real.

## Vinculação da aprovação
- Cada pendência usa `externalReference`:
  - `membership:<membershipId>:member:<memberId>`
  - `event:<eventId>:member:<memberId>`
- A aprovação no admin usa o próprio registro pendente como fonte de verdade.

## Troubleshooting
- `MANUAL_PIX_KEY nao configurada`: revisar env no deploy.
- Checkout sem QR: validar se `manualPayment.pixQrCodeImage` e `manualPayment.pixCopyPaste` foram retornados.
- Pendência não aprovada no app: validar status em `event_payments`/`membership_payments` e reexecutar a aprovação no admin.
