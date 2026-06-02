-- CORRECAO V8 - IDs obrigatorios no Supabase
-- Rode no SQL Editor do Supabase.
-- Corrige bancos antigos em que a coluna id existe, mas nao tem DEFAULT gen_random_uuid().

create extension if not exists pgcrypto;

alter table if exists public.mm_pdv_configuracoes
  alter column id set default gen_random_uuid();
alter table if exists public.mm_pdv_usuarios
  alter column id set default gen_random_uuid();
alter table if exists public.mm_pdv_clientes
  alter column id set default gen_random_uuid();
alter table if exists public.mm_pdv_fornecedores
  alter column id set default gen_random_uuid();
alter table if exists public.mm_pdv_vendedores
  alter column id set default gen_random_uuid();
alter table if exists public.mm_pdv_produtos
  alter column id set default gen_random_uuid();
alter table if exists public.mm_pdv_vendas
  alter column id set default gen_random_uuid();
alter table if exists public.mm_pdv_itens_venda
  alter column id set default gen_random_uuid();
alter table if exists public.mm_pdv_movimento_estoque
  alter column id set default gen_random_uuid();

-- Garante constraints que o app usa no upsert/on conflict.
create unique index if not exists mm_pdv_configuracoes_project_unique
on public.mm_pdv_configuracoes(project_id);

create unique index if not exists mm_pdv_usuarios_project_login_unique
on public.mm_pdv_usuarios(project_id, lower(login));

create unique index if not exists idx_mm_pdv_vendas_project_numero_unique
on public.mm_pdv_vendas(project_id, numero)
where numero is not null and trim(numero) <> '';

-- Remove triggers antigas de baixa automatica que podem duplicar estoque ou travar venda.
drop trigger if exists trg_mm_pdv_baixar_estoque_venda on public.mm_pdv_itens_venda;
drop trigger if exists baixar_estoque_venda on public.mm_pdv_itens_venda;
drop trigger if exists trg_baixar_estoque_venda on public.mm_pdv_itens_venda;
drop function if exists public.mm_pdv_baixar_estoque_venda();
drop function if exists public.baixar_estoque_venda();
