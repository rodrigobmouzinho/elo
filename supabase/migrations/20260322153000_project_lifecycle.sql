alter table public.projects
add column if not exists status text not null default 'active'
  check (status in ('active', 'completed', 'inactive')),
add column if not exists completed_at timestamptz,
add column if not exists inactivated_at timestamptz,
add column if not exists updated_at timestamptz not null default now();

update public.projects
set status = 'active'
where status is null;

update public.projects
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;
