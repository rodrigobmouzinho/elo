-- Elo Networking - schema inicial MVP

create extension if not exists "pgcrypto";

create table if not exists public.member_profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone text not null,
  whatsapp text not null,
  city text not null,
  state text not null,
  area text not null,
  bio text,
  specialty text,
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.member_profiles(id) on delete cascade,
  started_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null check (status in ('active', 'expired', 'canceled')),
  created_at timestamptz not null default now()
);

create table if not exists public.membership_payments (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  gateway text not null,
  gateway_payment_id text,
  amount_cents integer not null,
  status text not null check (status in ('pending', 'paid', 'expired', 'refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null,
  online_url text,
  access_type text not null check (access_type in ('free_members', 'paid_members', 'public_with_member_discount')),
  price_cents integer,
  hero_image_url text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.member_profiles(id) on delete cascade,
  status text not null check (status in ('confirmed', 'canceled')),
  created_at timestamptz not null default now(),
  unique(event_id, member_id)
);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  member_id uuid not null references public.member_profiles(id) on delete cascade,
  points integer not null,
  reason text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  icon_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.member_badges (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.member_profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete set null,
  granted_at timestamptz not null default now(),
  unique(member_id, badge_id, season_id)
);

create table if not exists public.member_links (
  id uuid primary key default gen_random_uuid(),
  follower_member_id uuid not null references public.member_profiles(id) on delete cascade,
  followed_member_id uuid not null references public.member_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(follower_member_id, followed_member_id),
  check (follower_member_id <> followed_member_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_member_id uuid not null references public.member_profiles(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  looking_for text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  applicant_member_id uuid not null references public.member_profiles(id) on delete cascade,
  message text,
  status text not null default 'applied' check (status in ('applied', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique(project_id, applicant_member_id)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  recipient text not null,
  template text not null,
  status text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- RLS baseline
alter table public.member_profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.projects enable row level security;

create policy "members can view active profiles"
on public.member_profiles for select
using (active = true);

create policy "public can view events"
on public.events for select
using (true);

create policy "members can read own registrations"
on public.event_registrations for select
using (true);

create policy "members can view projects"
on public.projects for select
using (true);
