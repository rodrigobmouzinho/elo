alter table public.projects
add column if not exists documentation_files jsonb not null default '[]'::jsonb;

update public.projects
set documentation_files = '[]'::jsonb
where documentation_files is null;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'project-assets',
  'project-assets',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
