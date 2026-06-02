-- Correção 2026-06-02: permissões por login, pagamentos múltiplos e duplicidade de vendas/estoque.
-- Rode este arquivo no SQL Editor do Supabase uma vez, antes de usar a nova versão.

alter table public.mm_pdv_usuarios add column if not exists pode_clientes boolean not null default true;
alter table public.mm_pdv_usuarios add column if not exists pode_produtos boolean not null default false;
alter table public.mm_pdv_usuarios add column if not exists pode_backup boolean not null default false;
alter table public.mm_pdv_usuarios add column if not exists pode_fornecedores boolean not null default false;
alter table public.mm_pdv_usuarios add column if not exists pode_vendedores boolean not null default false;
alter table public.mm_pdv_usuarios add column if not exists pode_historico_vendas boolean not null default false;
alter table public.mm_pdv_usuarios add column if not exists pode_pix boolean not null default false;

update public.mm_pdv_usuarios set
  pode_clientes = true,
  pode_produtos = case when perfil = 'administrador' then true else false end,
  pode_backup = case when perfil = 'administrador' then true else false end,
  pode_fornecedores = case when perfil = 'administrador' then true else false end,
  pode_vendedores = case when perfil = 'administrador' then true else false end,
  pode_historico_vendas = case when perfil in ('administrador','financeiro') then true else false end,
  pode_pix = case when perfil in ('administrador','financeiro') then true else false end
where project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026';

-- Evita baixa duplicada de estoque: o aplicativo já baixa/devolve estoque e grava movimento.
-- Em bancos antigos, o trigger abaixo baixava estoque de novo quando os itens da venda eram regravados.
drop trigger if exists trg_mm_pdv_baixar_estoque_venda on public.mm_pdv_itens_venda;
drop function if exists public.mm_pdv_baixar_estoque_venda();

-- Garante número único de venda por projeto sem impedir cancelamento ou regravação.
create unique index if not exists idx_mm_pdv_vendas_project_numero_unique
on public.mm_pdv_vendas(project_id, numero)
where numero is not null and trim(numero) <> '';
