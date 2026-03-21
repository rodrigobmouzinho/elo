alter table public.events
  add column if not exists gallery_image_urls text[] not null default '{}';
