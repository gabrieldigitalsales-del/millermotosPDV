-- V9 - Corrige erro:
-- insert or update on table "mm_pdv_itens_venda" violates foreign key constraint "mm_pdv_itens_venda_produto_id_fkey"
--
-- Causa: alguns produtos antigos ficaram com ids locais/antigos no app, mas o banco
-- foi recriado com UUIDs novos. Quando a venda tenta gravar o item usando um id de
-- produto que nao existe mais na tabela mm_pdv_produtos, a FK bloqueia.
--
-- Solucao: para historico de venda/cupom, o item ja salva codigo, descricao,
-- quantidade, valor e total. Por isso deixamos produto_id opcional e sem FK rigida.

alter table if exists public.mm_pdv_itens_venda
  alter column produto_id drop not null;

alter table if exists public.mm_pdv_movimento_estoque
  alter column produto_id drop not null;

alter table if exists public.mm_pdv_itens_venda
  drop constraint if exists mm_pdv_itens_venda_produto_id_fkey;

alter table if exists public.mm_pdv_movimento_estoque
  drop constraint if exists mm_pdv_movimento_estoque_produto_id_fkey;

-- Remove qualquer FK antiga com outro nome apontando para produto_id.
do $$
declare
  r record;
begin
  for r in
    select conrelid::regclass::text as table_name, conname
    from pg_constraint
    where contype = 'f'
      and conrelid in ('public.mm_pdv_itens_venda'::regclass, 'public.mm_pdv_movimento_estoque'::regclass)
      and pg_get_constraintdef(oid) ilike '%produto_id%'
  loop
    execute format('alter table %s drop constraint if exists %I', r.table_name, r.conname);
  end loop;
end $$;

-- Garante defaults de UUID, porque bancos antigos ficaram sem default em alguns ids.
create extension if not exists pgcrypto;

alter table if exists public.mm_pdv_itens_venda
  alter column id set default gen_random_uuid();

alter table if exists public.mm_pdv_movimento_estoque
  alter column id set default gen_random_uuid();

alter table if exists public.mm_pdv_vendas
  alter column id set default gen_random_uuid();
