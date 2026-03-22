alter table public.project_applications
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by_member_id uuid references public.member_profiles (id) on delete set null,
  add column if not exists rejection_reason text;

create index if not exists project_applications_reviewed_by_member_id_idx
  on public.project_applications (reviewed_by_member_id);
