-- Correção para erro:
-- duplicate key value violates unique constraint "mm_pdv_usuarios_pkey"
-- Rode no Supabase > SQL Editor > New Query.

create extension if not exists pgcrypto;

-- Garante que novos usuários recebam UUID automático quando o app não enviar id.
alter table public.mm_pdv_usuarios
  alter column id set default gen_random_uuid();

-- Garante a chave única usada pelo app para atualizar por login em vez de duplicar id.
create unique index if not exists mm_pdv_usuarios_project_login_unique
on public.mm_pdv_usuarios(project_id, lower(login));

-- Remove duplicados de login dentro do mesmo projeto, mantendo o registro mais recente.
with duplicados as (
  select
    id,
    row_number() over (
      partition by project_id, lower(login)
      order by coalesce(updated_at, created_at) desc, created_at desc, id desc
    ) as rn
  from public.mm_pdv_usuarios
)
delete from public.mm_pdv_usuarios u
using duplicados d
where u.id = d.id
  and d.rn > 1;
