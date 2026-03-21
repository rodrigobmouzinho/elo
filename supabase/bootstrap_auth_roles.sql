-- Bootstrap de autenticacao/roles para Elo Networking
-- Execute apos criar usuarios no Supabase Auth.

-- 1) Vincula perfis de membros ao auth.users por e-mail (idempotente)
update public.member_profiles mp
set auth_user_id = au.id
from auth.users au
where lower(mp.email) = lower(au.email)
  and (mp.auth_user_id is distinct from au.id);

-- 2) Define roles iniciais por e-mail de login
-- Ajuste os e-mails abaixo para o ambiente real.
with desired_roles(email, role) as (
  values
    ('admin@elonetworking.com', 'admin'::text),
    ('financeiro@elonetworking.com', 'admin'::text),
    ('suporte@elonetworking.com', 'admin'::text)
)
insert into public.user_roles (user_id, role)
select au.id, dr.role
from desired_roles dr
join auth.users au on lower(au.email) = lower(dr.email)
on conflict (user_id)
do update set role = excluded.role;

-- 3) Opcional: para todos os usuarios com email vinculado em member_profiles,
-- atribui role "member" quando ainda nao houver role definida.
insert into public.user_roles (user_id, role)
select au.id, 'member'::text
from auth.users au
join public.member_profiles mp on lower(mp.email) = lower(au.email)
left join public.user_roles ur on ur.user_id = au.id
where ur.user_id is null
on conflict (user_id) do nothing;

-- 4) Auditoria rapida
-- select mp.full_name, mp.email, mp.auth_user_id, ur.role
-- from public.member_profiles mp
-- left join public.user_roles ur on ur.user_id = mp.auth_user_id
-- order by mp.full_name;
