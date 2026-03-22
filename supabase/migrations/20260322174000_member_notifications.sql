create table if not exists public.member_notifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.member_profiles (id) on delete cascade,
  type text not null check (
    type in ('project_application_accepted', 'project_application_rejected')
  ),
  title text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists member_notifications_member_id_idx
  on public.member_notifications (member_id);

create index if not exists member_notifications_member_id_read_at_idx
  on public.member_notifications (member_id, read_at);
