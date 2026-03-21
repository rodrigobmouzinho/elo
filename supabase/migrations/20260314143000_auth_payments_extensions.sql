-- Extensoes de auth/financeiro para MVP

alter table public.member_profiles
  add column if not exists auth_user_id uuid unique;

create table if not exists public.user_roles (
  user_id uuid primary key,
  role text not null check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

alter table public.membership_payments
  add column if not exists external_reference text,
  add column if not exists checkout_url text,
  add column if not exists pix_qr_code text,
  add column if not exists gateway_payload jsonb;

create table if not exists public.event_payments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.member_profiles(id) on delete cascade,
  gateway text not null,
  gateway_payment_id text,
  external_reference text,
  amount_cents integer not null,
  status text not null check (status in ('pending', 'paid', 'expired', 'refunded')),
  checkout_url text,
  pix_qr_code text,
  gateway_payload jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique(event_id, member_id, gateway_payment_id)
);

create index if not exists idx_membership_payments_gateway_payment_id
  on public.membership_payments(gateway_payment_id);

create index if not exists idx_event_payments_gateway_payment_id
  on public.event_payments(gateway_payment_id);

create index if not exists idx_member_profiles_auth_user_id
  on public.member_profiles(auth_user_id);
