-- =========================================================
-- PDV MILLER MOTOS - CORRECAO DO ERRO id NULL
-- Pode rodar por cima. Nao apaga dados.
-- Corrige tabelas mm_pdv_* para gerar ID automaticamente.
-- =========================================================
create extension if not exists pgcrypto;

do $$
declare
  r record;
  default_sql text;
begin
  for r in
    select table_name, data_type
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'id'
      and table_name in (
        'mm_pdv_configuracoes',
        'mm_pdv_usuarios',
        'mm_pdv_vendedores',
        'mm_pdv_fornecedores',
        'mm_pdv_clientes',
        'mm_pdv_produtos',
        'mm_pdv_vendas',
        'mm_pdv_itens_venda',
        'mm_pdv_movimento_estoque'
      )
  loop
    if r.data_type = 'uuid' then
      default_sql := 'gen_random_uuid()';
    else
      default_sql := 'gen_random_uuid()::text';
    end if;

    execute format('alter table public.%I alter column id set default %s', r.table_name, default_sql);

    -- Se existirem linhas antigas com id nulo, preenche antes de reforcar NOT NULL.
    execute format('update public.%I set id = %s where id is null', r.table_name, default_sql);

    execute format('alter table public.%I alter column id set not null', r.table_name);
  end loop;
end $$;

-- Corrige produtos ja existentes sem nome/preco/estoque por causa de schema antigo.
update public.mm_pdv_produtos
set
  codigo = coalesce(nullif(trim(codigo), ''), upper(substr(id::text, 1, 8))),
  nome = coalesce(nullif(trim(nome), ''), nullif(trim(descricao), ''), nullif(trim(produto), ''), codigo, 'Produto sem nome'),
  descricao = coalesce(nullif(trim(descricao), ''), nullif(trim(nome), ''), nullif(trim(produto), ''), codigo, 'Produto sem nome'),
  produto = coalesce(nullif(trim(produto), ''), nullif(trim(nome), ''), nullif(trim(descricao), ''), codigo, 'Produto sem nome'),
  preco = case when coalesce(preco, 0) = 0 and coalesce(valor_venda, 0) > 0 then valor_venda else coalesce(preco, 0) end,
  valor_venda = case when coalesce(valor_venda, 0) = 0 and coalesce(preco, 0) > 0 then preco else coalesce(valor_venda, 0) end,
  estoque = case when coalesce(estoque, 0) = 0 and coalesce(est_atual, 0) > 0 then est_atual else coalesce(estoque, 0) end,
  est_atual = case when coalesce(est_atual, 0) = 0 and coalesce(estoque, 0) > 0 then estoque else coalesce(est_atual, 0) end
where true;

-- Garante numero amigavel para venda.
create sequence if not exists public.mm_pdv_venda_numero_seq start 1;

create or replace function public.mm_pdv_gerar_numero_venda()
returns trigger
language plpgsql
as $$
begin
  if new.numero is null
     or trim(new.numero) = ''
     or new.numero ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  then
    new.numero := 'VD-' || lpad(nextval('public.mm_pdv_venda_numero_seq')::text, 6, '0');
  end if;

  if new.data is null and new.data_venda is not null then new.data := new.data_venda; end if;
  if new.data_venda is null and new.data is not null then new.data_venda := new.data; end if;
  if new.data is null then new.data := now(); end if;
  if new.data_venda is null then new.data_venda := new.data; end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_mm_pdv_gerar_numero_venda on public.mm_pdv_vendas;
create trigger trg_mm_pdv_gerar_numero_venda
before insert or update on public.mm_pdv_vendas
for each row execute function public.mm_pdv_gerar_numero_venda();

with vendas_sem_numero as (
  select id, 'VD-' || lpad(row_number() over (order by created_at, id)::text, 6, '0') as novo_numero
  from public.mm_pdv_vendas
  where numero is null
     or trim(numero) = ''
     or numero ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
)
update public.mm_pdv_vendas v
set numero = n.novo_numero
from vendas_sem_numero n
where v.id = n.id;

-- Libera uso para Vercel/anon key nas sequencias.
grant usage, select on sequence public.mm_pdv_venda_numero_seq to anon, authenticated;
