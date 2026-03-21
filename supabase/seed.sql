insert into public.member_profiles (id, full_name, email, phone, whatsapp, city, state, area, bio, specialty, active)
values
  ('f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e', 'Ana Costa', 'ana@elo.com', '83999990000', '83999990000', 'Joao Pessoa', 'PB', 'tecnologia', 'Construindo produtos digitais.', 'produto e growth', true),
  ('60948757-e688-41ec-b0fc-cf30cf8cc3d8', 'Pedro Nunes', 'pedro@elo.com', '83988887777', '83988887777', 'Recife', 'PE', 'vendas', 'Escalo operacoes comerciais B2B.', 'inside sales', true)
on conflict (id) do nothing;

insert into public.seasons (id, name, starts_at, ends_at, active)
values
  ('7b2b6d8b-2d68-47f1-b56c-a2d28383887d', 'Temporada 2026.1', '2026-01-10T00:00:00Z', '2026-06-30T23:59:59Z', true)
on conflict (id) do nothing;

insert into public.events (id, title, description, starts_at, location, access_type, hero_image_url)
values
  ('434f5f2a-1bb2-43eb-b5ce-d7c9bb728d18', 'Elo Founders Night', 'Encontro presencial para troca de experiencias entre founders.', '2026-04-05T19:00:00Z', 'Joao Pessoa - PB', 'free_members', '/event-placeholder.svg')
on conflict (id) do nothing;
