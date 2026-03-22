alter table public.projects
add column if not exists summary text,
add column if not exists business_areas text[] not null default '{}',
add column if not exists vision text,
add column if not exists needs jsonb not null default '[]'::jsonb,
add column if not exists gallery_image_urls text[] not null default '{}';

update public.projects
set summary = nullif(split_part(description, E'\n\n', 1), '')
where summary is null;

update public.projects
set vision = nullif(
  regexp_replace(description, '^[^\n]+(\n+[^\n]+)?', '', 1, 1, 'n'),
  ''
)
where vision is null;

update public.projects
set vision = description
where vision is null and nullif(description, '') is not null;

update public.projects
set business_areas = array[category]
where coalesce(array_length(business_areas, 1), 0) = 0
  and nullif(category, '') is not null;

update public.projects
set needs = jsonb_build_array(
  jsonb_build_object(
    'title', left(looking_for, 60),
    'description', 'Perfil buscado para acelerar a evolucao desta oportunidade.'
  )
)
where needs = '[]'::jsonb
  and nullif(looking_for, '') is not null;
