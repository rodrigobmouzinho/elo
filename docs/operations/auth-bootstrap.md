# Bootstrap de Auth e Roles (Supabase)

Arquivo: `supabase/bootstrap_auth_roles.sql`

## Quando executar
- Depois de criar usuários no Supabase Auth.
- Antes de testar login JWT/RBAC em staging/produção.

## O que o script faz
1. Vincula `member_profiles.auth_user_id` por e-mail.
2. Sobe roles administrativas (`user_roles`) para e-mails definidos.
3. Preenche `member` para usuários vinculados sem role.

## Como executar
```bash
# opção 1: Supabase SQL Editor
# cole o conteúdo de supabase/bootstrap_auth_roles.sql

# opção 2: CLI (projeto vinculado)
supabase db execute --file supabase/bootstrap_auth_roles.sql
```

## Verificação
```sql
select mp.full_name, mp.email, mp.auth_user_id, ur.role
from public.member_profiles mp
left join public.user_roles ur on ur.user_id = mp.auth_user_id
order by mp.full_name;
```
