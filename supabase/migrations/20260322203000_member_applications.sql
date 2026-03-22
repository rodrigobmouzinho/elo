create table if not exists public.member_application_statuses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  is_final boolean not null default false,
  is_system boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.member_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  whatsapp text not null,
  city text not null,
  state text not null,
  area text not null,
  bio text,
  specialty text,
  avatar_url text,
  current_status_id uuid not null references public.member_application_statuses(id),
  internal_notes text,
  rejection_reason text,
  approved_member_id uuid references public.member_profiles(id) on delete set null,
  approved_auth_user_id uuid,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.member_applications(id) on delete cascade,
  status_id uuid not null references public.member_application_statuses(id),
  actor_user_id uuid,
  note text,
  created_at timestamptz not null default now()
);

alter table public.member_profiles
  add column if not exists must_change_password boolean not null default false,
  add column if not exists onboarding_application_id uuid references public.member_applications(id) on delete set null;

create index if not exists idx_member_applications_email
  on public.member_applications(email);

create index if not exists idx_member_applications_whatsapp
  on public.member_applications(whatsapp);

create index if not exists idx_member_applications_status
  on public.member_applications(current_status_id);

create index if not exists idx_member_application_status_history_application
  on public.member_application_status_history(application_id, created_at desc);
