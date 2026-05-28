-- Correcao para erro: column mm_pdv_vendas.data does not exist
-- Padroniza a coluna de data das vendas para data_venda, usada pela versao atual do app.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='mm_pdv_vendas' and column_name='data'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='mm_pdv_vendas' and column_name='data_venda'
  ) then
    alter table public.mm_pdv_vendas rename column data to data_venda;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='mm_pdv_vendas' and column_name='data_venda'
  ) then
    alter table public.mm_pdv_vendas add column data_venda timestamptz not null default now();
  end if;
end $$;

drop index if exists public.idx_mm_pdv_vendas_data;
create index if not exists idx_mm_pdv_vendas_data on public.mm_pdv_vendas (project_id, data_venda desc);

create or replace view public.mm_pdv_relatorio_vendas_diarias as
select
  project_id,
  date_trunc('day', data_venda) as dia,
  count(*) as quantidade_vendas,
  sum(total) as faturamento,
  sum(desconto) as descontos
from public.mm_pdv_vendas
where project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026'
group by project_id, date_trunc('day', data_venda)
order by dia desc;
