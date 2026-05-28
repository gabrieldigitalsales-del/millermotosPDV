-- =========================================================
-- PDV MILLER MOTOS - CORRECAO DE NUMERACAO E NOMES VISIVEIS
-- Rode no SQL Editor do Supabase. Nao apaga dados.
-- Objetivo: nunca mostrar UUID tecnico em telas/cupom.
-- =========================================================

create extension if not exists pgcrypto;

-- 1) Sequencia de numero amigavel de vendas
create sequence if not exists public.mm_pdv_venda_numero_seq start 1;

-- 2) Garante coluna numero amigavel nas vendas
alter table public.mm_pdv_vendas
add column if not exists numero text;

-- 3) Preenche vendas antigas sem numero ou com numero igual a UUID
with numeradas as (
  select
    id,
    'VD-' || lpad((row_number() over (order by coalesce(created_at, data_venda, data, now())))::text, 6, '0') as novo_numero
  from public.mm_pdv_vendas
  where numero is null
     or trim(numero) = ''
     or numero ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
)
update public.mm_pdv_vendas v
set numero = n.novo_numero
from numeradas n
where v.id = n.id;

-- 4) Funcao para gerar numero amigavel automaticamente
create or replace function public.mm_pdv_gerar_numero_venda()
returns trigger
language plpgsql
as $$
begin
  if new.numero is null
     or trim(new.numero) = ''
     or new.numero ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    new.numero := 'VD-' || lpad(nextval('public.mm_pdv_venda_numero_seq')::text, 6, '0');
  end if;

  if new.data is null and new.data_venda is not null then
    new.data := new.data_venda;
  end if;

  if new.data_venda is null and new.data is not null then
    new.data_venda := new.data;
  end if;

  if new.data is null then
    new.data := now();
  end if;

  if new.data_venda is null then
    new.data_venda := new.data;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_mm_pdv_gerar_numero_venda on public.mm_pdv_vendas;
create trigger trg_mm_pdv_gerar_numero_venda
before insert or update on public.mm_pdv_vendas
for each row
execute function public.mm_pdv_gerar_numero_venda();

-- 5) Remove UUID que ficou gravado no inicio de nomes por erro de versao anterior
update public.mm_pdv_fornecedores
set nome = regexp_replace(nome, '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*-\s*', '', 'i')
where nome ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*-\s*';

update public.mm_pdv_vendedores
set nome = regexp_replace(nome, '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*-\s*', '', 'i')
where nome ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*-\s*';

update public.mm_pdv_clientes
set nome = regexp_replace(nome, '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*-\s*', '', 'i')
where nome ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*-\s*';

update public.mm_pdv_usuarios
set nome = regexp_replace(nome, '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*-\s*', '', 'i')
where nome ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*-\s*';

update public.mm_pdv_produtos
set nome = regexp_replace(nome, '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*-\s*', '', 'i'),
    descricao = coalesce(nullif(descricao, ''), nome),
    produto = coalesce(nullif(produto, ''), nome)
where nome ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*-\s*'
   or nome is null
   or trim(nome) = '';

-- 6) Verificacao
select numero, cliente_nome, vendedor_nome, total, data_venda
from public.mm_pdv_vendas
order by data_venda desc
limit 10;
