-- =========================================================
-- MILLER MOTOS - CANCELAMENTO DE VENDA / REIMPRESSAO CUPOM
-- Migração segura. Não apaga dados.
-- Garante campos necessários para marcar venda como cancelada
-- e manter histórico para reimpressão.
-- =========================================================

alter table if exists public.mm_pdv_vendas
  add column if not exists status text default 'finalizada',
  add column if not exists observacoes text default '',
  add column if not exists updated_at timestamptz default now();

alter table if exists public.mm_pdv_movimento_estoque
  add column if not exists venda_id text,
  add column if not exists item_venda_id text,
  add column if not exists tipo text default 'entrada',
  add column if not exists origem text default 'manual',
  add column if not exists descricao text default '',
  add column if not exists quantidade numeric(12,3) default 0,
  add column if not exists usuario_nome text default '',
  add column if not exists created_at timestamptz default now();

-- View amigável para histórico sem mostrar UUID técnico.
create or replace view public.mm_pdv_vendas_tela as
select
  v.id,
  v.project_id,
  coalesce(v.numero, 'VD-000000') as numero,
  v.data_venda,
  v.cliente_nome,
  v.vendedor_nome,
  v.forma_pagamento,
  v.subtotal,
  v.desconto,
  v.acrescimo,
  v.total,
  v.status,
  v.observacoes,
  v.created_at
from public.mm_pdv_vendas v
order by v.data_venda desc;

grant select on public.mm_pdv_vendas_tela to anon, authenticated;

select 'OK - cancelamento/reimpressao preparado' as status;
