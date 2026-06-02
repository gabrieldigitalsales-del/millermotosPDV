-- Correção para erro: deadlock detected ao salvar no Supabase
-- Rode no Supabase > SQL Editor > New Query.

-- Evita baixa de estoque duplicada por trigger antigo, porque o app já atualiza estoque/movimento.
drop trigger if exists trg_mm_pdv_baixar_estoque_venda on public.mm_pdv_itens_venda;
drop function if exists public.mm_pdv_baixar_estoque_venda();

-- Garante que a venda seja atualizada por número em vez de apagar/recriar todas.
create unique index if not exists idx_mm_pdv_vendas_project_numero_unique
on public.mm_pdv_vendas(project_id, numero)
where numero is not null and trim(numero) <> '';

-- Garante UUID automático em tabelas principais, quando necessário.
create extension if not exists pgcrypto;

alter table public.mm_pdv_vendas
  alter column id set default gen_random_uuid();

alter table public.mm_pdv_itens_venda
  alter column id set default gen_random_uuid();

alter table public.mm_pdv_movimento_estoque
  alter column id set default gen_random_uuid();

select 'OK - correcao de deadlock aplicada' as status;
