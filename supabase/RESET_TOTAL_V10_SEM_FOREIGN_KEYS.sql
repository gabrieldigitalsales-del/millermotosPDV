-- =========================================================
-- PDV MILLER MOTOS - RESET COMPLETO DO BANCO SUPABASE
-- ATENCAO: este script APAGA e RECRIA todas as tabelas mm_pdv_*.
-- Use em: Supabase > SQL Editor > New Query > Run.
-- Depois abra o sistema e pressione Ctrl+F5.
-- =========================================================

create extension if not exists pgcrypto;

-- Limpeza total das tabelas/views/funcoes antigas do PDV
-- V10: reset nuclear. Remove e recria sem foreign keys, para não herdar vínculos antigos/inválidos.
drop view if exists public.mm_pdv_vendas_tela cascade;
drop view if exists public.mm_pdv_estoque_movimento_geral cascade;
drop view if exists public.mm_pdv_estoque_resumo_geral cascade;
drop view if exists public.mm_pdv_produtos_prioridade_balcao cascade;

drop trigger if exists trg_mm_pdv_baixar_estoque_venda on public.mm_pdv_itens_venda;
drop trigger if exists baixar_estoque_venda on public.mm_pdv_itens_venda;
drop trigger if exists trg_baixar_estoque_venda on public.mm_pdv_itens_venda;
drop function if exists public.mm_pdv_baixar_estoque_venda();
drop function if exists public.baixar_estoque_venda();

drop table if exists public.mm_pdv_movimento_estoque cascade;
drop table if exists public.mm_pdv_itens_venda cascade;
drop table if exists public.mm_pdv_vendas cascade;
drop table if exists public.mm_pdv_produtos cascade;
drop table if exists public.mm_pdv_clientes cascade;
drop table if exists public.mm_pdv_fornecedores cascade;
drop table if exists public.mm_pdv_vendedores cascade;
drop table if exists public.mm_pdv_usuarios cascade;
drop table if exists public.mm_pdv_configuracoes cascade;
drop sequence if exists public.mm_pdv_venda_numero_seq cascade;

create sequence public.mm_pdv_venda_numero_seq start 1;

create table public.mm_pdv_configuracoes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  nome_empresa text not null default 'MILLER MOTOS',
  nome_fantasia text default 'MILLER MOTOS',
  razao_social text default 'MILLER MOTOS',
  cnpj text default '',
  email text default '',
  telefone text default '',
  whatsapp text default '',
  endereco text default '',
  cidade text default 'SETE LAGOAS - MG',
  uf text default 'MG',
  chave_pix text default '',
  nome_titular_pix text default 'MILLER MOTOS',
  mensagem_cupom text default 'Obrigado pela preferencia!',
  permitir_vendedor_estoque boolean not null default false,
  logo_url text default '',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mm_pdv_usuarios (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  nome text not null,
  login text not null,
  senha text not null,
  perfil text not null default 'vendedor' check (perfil in ('administrador','financeiro','vendedor')),
  ativo boolean not null default true,
  pode_vender boolean not null default true,
  pode_clientes boolean not null default true,
  pode_estoque boolean not null default false,
  pode_produtos boolean not null default false,
  pode_financeiro boolean not null default false,
  pode_configuracoes boolean not null default false,
  pode_backup boolean not null default false,
  pode_relatorios boolean not null default false,
  pode_fornecedores boolean not null default false,
  pode_vendedores boolean not null default false,
  pode_historico_vendas boolean not null default false,
  pode_pix boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mm_pdv_usuarios_project_login_unique unique (project_id, login)
);

create table public.mm_pdv_vendedores (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  nome text not null,
  telefone text default '',
  email text default '',
  comissao numeric(12,2) not null default 0,
  ativo boolean not null default true,
  observacoes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mm_pdv_fornecedores (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  nome text not null,
  razao_social text default '',
  cnpj text default '',
  telefone text default '',
  whatsapp text default '',
  email text default '',
  endereco text default '',
  cidade text default 'SETE LAGOAS',
  uf text default 'MG',
  observacoes text default '',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mm_pdv_clientes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  nome text not null,
  apelido text default '',
  cpf_cnpj text default '',
  documento text default '',
  telefone text default '',
  whatsapp text default '',
  email text default '',
  endereco text default '',
  bairro text default '',
  cidade text default 'SETE LAGOAS',
  uf text default 'MG',
  cep text default '',
  observacoes text default '',
  limite_credito numeric(12,2) not null default 0,
  status text not null default 'LIBERAR',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mm_pdv_produtos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  codigo text not null,
  nome text not null,
  descricao text default '',
  produto text default '',
  categoria text default '',
  unidade text not null default 'UN',
  fornecedor_id uuid,
  custo numeric(12,2) not null default 0,
  preco numeric(12,2) not null default 0,
  valor_venda numeric(12,2) not null default 0,
  estoque numeric(12,3) not null default 0,
  est_atual numeric(12,3) not null default 0,
  minimo numeric(12,3) not null default 0,
  codigo_barras text default '',
  localizacao text default '',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mm_pdv_produtos_project_codigo_unique unique (project_id, codigo)
);

create table public.mm_pdv_vendas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  numero text not null,
  data timestamptz not null default now(),
  data_venda timestamptz not null default now(),
  cliente_id uuid,
  vendedor_id uuid,
  usuario_id uuid,
  usuario text default '',
  cliente_nome text default 'Cliente Balcao',
  vendedor_nome text default '',
  subtotal numeric(12,2) not null default 0,
  desconto numeric(12,2) not null default 0,
  acrescimo numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  forma_pagamento text not null default 'Dinheiro',
  status text not null default 'FINALIZADA',
  observacoes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mm_pdv_vendas_project_numero_unique unique (project_id, numero)
);

create table public.mm_pdv_itens_venda (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  venda_id uuid not null,
  produto_id uuid,
  codigo text default '',
  descricao text not null,
  quantidade numeric(12,3) not null default 1,
  valor_unitario numeric(12,2) not null default 0,
  custo_unitario numeric(12,2) not null default 0,
  desconto numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.mm_pdv_movimento_estoque (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  produto_id uuid,
  venda_id uuid,
  item_venda_id uuid,
  codigo text default '',
  produto_nome text default '',
  tipo text not null default 'entrada' check (tipo in ('entrada','saida','ajuste')),
  origem text not null default 'manual',
  descricao text default '',
  quantidade numeric(12,3) not null default 0,
  qtd numeric(12,3) not null default 0,
  estoque_antes numeric(12,3) not null default 0,
  estoque_depois numeric(12,3) not null default 0,
  usuario_nome text default '',
  observacao text default '',
  data timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Trigger leve: apenas normaliza produto. Nao baixa estoque automaticamente para evitar deadlock/baixa dupla.
create or replace function public.mm_pdv_sync_produto()
returns trigger language plpgsql as $$
begin
  new.codigo := coalesce(nullif(trim(new.codigo), ''), upper(substr(gen_random_uuid()::text, 1, 8)));
  new.nome := coalesce(nullif(trim(new.nome), ''), nullif(trim(new.descricao), ''), nullif(trim(new.produto), ''), new.codigo, 'Produto sem nome');
  new.descricao := coalesce(nullif(trim(new.descricao), ''), new.nome);
  new.produto := coalesce(nullif(trim(new.produto), ''), new.nome);
  if coalesce(new.preco, 0) = 0 and coalesce(new.valor_venda, 0) > 0 then new.preco := new.valor_venda; end if;
  if coalesce(new.valor_venda, 0) = 0 and coalesce(new.preco, 0) > 0 then new.valor_venda := new.preco; end if;
  if coalesce(new.estoque, 0) = 0 and coalesce(new.est_atual, 0) > 0 then new.estoque := new.est_atual; end if;
  if coalesce(new.est_atual, 0) = 0 and coalesce(new.estoque, 0) > 0 then new.est_atual := new.estoque; end if;
  new.updated_at := now();
  return new;
end; $$;

create trigger trg_mm_pdv_sync_produto before insert or update on public.mm_pdv_produtos
for each row execute function public.mm_pdv_sync_produto();

create or replace function public.mm_pdv_sync_venda()
returns trigger language plpgsql as $$
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
end; $$;

create trigger trg_mm_pdv_sync_venda before insert or update on public.mm_pdv_vendas
for each row execute function public.mm_pdv_sync_venda();

create index idx_mm_pdv_clientes_project_nome on public.mm_pdv_clientes(project_id, nome);
create index idx_mm_pdv_fornecedores_project_nome on public.mm_pdv_fornecedores(project_id, nome);
create index idx_mm_pdv_vendedores_project_nome on public.mm_pdv_vendedores(project_id, nome);
create index idx_mm_pdv_produtos_project_nome on public.mm_pdv_produtos(project_id, nome);
create index idx_mm_pdv_produtos_project_codigo on public.mm_pdv_produtos(project_id, codigo);
create index idx_mm_pdv_vendas_project_data on public.mm_pdv_vendas(project_id, data_venda desc);
create index idx_mm_pdv_itens_venda_venda on public.mm_pdv_itens_venda(venda_id);
create index idx_mm_pdv_movimento_estoque_project_produto on public.mm_pdv_movimento_estoque(project_id, produto_id, created_at desc);

create or replace view public.mm_pdv_produtos_prioridade_balcao as
select p.id, p.project_id, p.codigo, p.nome, p.descricao, p.produto, p.categoria, p.unidade, p.custo, p.preco, p.valor_venda,
       p.estoque, p.est_atual, p.minimo, p.ativo,
       coalesce(sum(i.quantidade), 0) as quantidade_vendida,
       coalesce(sum(i.total), 0) as total_vendido,
       count(i.id) as vezes_vendido
from public.mm_pdv_produtos p
left join public.mm_pdv_itens_venda i on i.produto_id = p.id and i.project_id = p.project_id
where p.ativo = true
group by p.id, p.project_id, p.codigo, p.nome, p.descricao, p.produto, p.categoria, p.unidade, p.custo, p.preco, p.valor_venda, p.estoque, p.est_atual, p.minimo, p.ativo
order by coalesce(sum(i.quantidade), 0) desc, p.estoque desc, p.nome asc;

create or replace view public.mm_pdv_estoque_resumo_geral as
select
  p.id, p.project_id, p.codigo, p.nome, p.categoria, p.unidade, p.custo, p.preco, p.estoque, p.minimo,
  coalesce(sum(case when m.tipo = 'entrada' then m.quantidade else 0 end), 0) as total_entradas,
  coalesce(sum(case when m.tipo = 'saida' then m.quantidade else 0 end), 0) as total_saidas,
  coalesce(sum(case when m.tipo = 'ajuste' then m.quantidade else 0 end), 0) as total_ajustes,
  coalesce(p.estoque * p.custo, 0) as valor_custo_estoque,
  coalesce(p.estoque * p.preco, 0) as valor_venda_estoque,
  case when p.estoque <= 0 then 'ZERADO' when p.estoque <= p.minimo then 'BAIXO' else 'OK' end as status_estoque
from public.mm_pdv_produtos p
left join public.mm_pdv_movimento_estoque m on m.produto_id = p.id and m.project_id = p.project_id
where p.ativo = true
group by p.id, p.project_id, p.codigo, p.nome, p.categoria, p.unidade, p.custo, p.preco, p.estoque, p.minimo
order by status_estoque, p.nome;

create or replace view public.mm_pdv_estoque_movimento_geral as
select
  m.id, m.project_id, coalesce(m.created_at, m.data) as created_at, p.codigo as produto_codigo, p.nome as produto_nome,
  p.categoria, m.tipo, m.origem, m.descricao, m.quantidade, m.estoque_antes, m.estoque_depois,
  v.numero as venda_numero, m.usuario_nome
from public.mm_pdv_movimento_estoque m
left join public.mm_pdv_produtos p on p.id = m.produto_id
left join public.mm_pdv_vendas v on v.id = m.venda_id
order by coalesce(m.created_at, m.data) desc;

create or replace view public.mm_pdv_vendas_tela as
select id, project_id, numero, data_venda, cliente_nome, vendedor_nome, forma_pagamento, subtotal, desconto, acrescimo, total, status, observacoes, created_at
from public.mm_pdv_vendas
order by data_venda desc;

-- Dados iniciais limpos
insert into public.mm_pdv_configuracoes (project_id, nome_empresa, nome_fantasia, razao_social, cidade, chave_pix, nome_titular_pix, mensagem_cupom, permitir_vendedor_estoque)
values ('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','MILLER MOTOS','MILLER MOTOS','MILLER MOTOS','SETE LAGOAS - MG','','MILLER MOTOS','Obrigado pela preferencia!',false);

insert into public.mm_pdv_usuarios
(project_id, nome, login, senha, perfil, ativo, pode_vender, pode_clientes, pode_estoque, pode_produtos, pode_financeiro, pode_configuracoes, pode_backup, pode_relatorios, pode_fornecedores, pode_vendedores, pode_historico_vendas, pode_pix)
values
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','Vendedor','vendedor','venda123','vendedor',true,true,true,false,false,false,false,false,false,false,false,false,false),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','Administrador','admin','admin123','administrador',true,true,true,true,true,true,true,true,true,true,true,true,true),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','Financeiro','financeiro','fin123','financeiro',true,false,true,false,false,true,false,false,true,false,false,true,true);

insert into public.mm_pdv_vendedores (project_id, nome, ativo) values
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','Vendedor',true),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','Administrador',true);

insert into public.mm_pdv_fornecedores (project_id, nome, razao_social, cidade, uf, ativo) values
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','Fornecedor Padrao','Fornecedor Padrao','SETE LAGOAS','MG',true);

insert into public.mm_pdv_clientes (project_id, nome, cidade, uf, status, ativo) values
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','Cliente Balcao','SETE LAGOAS','MG','LIBERAR',true);

insert into public.mm_pdv_produtos (project_id, codigo, nome, descricao, produto, categoria, unidade, custo, preco, valor_venda, estoque, est_atual, minimo, ativo) values
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','OLEO20W50','Oleo 20W50 1L','Oleo 20W50 1L','Oleo 20W50 1L','Lubrificantes','UN',22,35,35,10,10,2,true),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','KITREL125','Kit Relacao 125cc','Kit Relacao 125cc','Kit Relacao 125cc','Transmissao','UN',135,185,185,5,5,1,true),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','PASTFREIO','Pastilha de Freio','Pastilha de Freio','Pastilha de Freio','Freios','JG',28,45,45,8,8,2,true),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','VELA125','Vela 125cc','Vela 125cc','Vela 125cc','Ignicao','UN',9,18,18,20,20,5,true),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','CABOEMB','Cabo de Embreagem','Cabo de Embreagem','Cabo de Embreagem','Cabos','UN',15,28,28,6,6,2,true);

insert into public.mm_pdv_movimento_estoque (project_id, produto_id, tipo, origem, descricao, produto_nome, quantidade, qtd, estoque_antes, estoque_depois, usuario_nome)
select project_id, id, 'entrada', 'carga_inicial', nome, nome, estoque, estoque, 0, estoque, 'Sistema'
from public.mm_pdv_produtos;

-- RLS aberta para o app atual usar anon key sem quebrar gravação.
alter table public.mm_pdv_configuracoes enable row level security;
alter table public.mm_pdv_usuarios enable row level security;
alter table public.mm_pdv_vendedores enable row level security;
alter table public.mm_pdv_fornecedores enable row level security;
alter table public.mm_pdv_clientes enable row level security;
alter table public.mm_pdv_produtos enable row level security;
alter table public.mm_pdv_vendas enable row level security;
alter table public.mm_pdv_itens_venda enable row level security;
alter table public.mm_pdv_movimento_estoque enable row level security;

do $$
declare t text;
begin
  foreach t in array array['mm_pdv_configuracoes','mm_pdv_usuarios','mm_pdv_vendedores','mm_pdv_fornecedores','mm_pdv_clientes','mm_pdv_produtos','mm_pdv_vendas','mm_pdv_itens_venda','mm_pdv_movimento_estoque'] loop
    execute format('drop policy if exists %I on public.%I', t || '_all', t);
    execute format('create policy %I on public.%I for all to anon, authenticated using (true) with check (true)', t || '_all', t);
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
  end loop;
end $$;

grant usage on schema public to anon, authenticated;
grant usage, select on sequence public.mm_pdv_venda_numero_seq to anon, authenticated;
grant select on public.mm_pdv_produtos_prioridade_balcao to anon, authenticated;
grant select on public.mm_pdv_estoque_resumo_geral to anon, authenticated;
grant select on public.mm_pdv_estoque_movimento_geral to anon, authenticated;
grant select on public.mm_pdv_vendas_tela to anon, authenticated;

-- Checagem final dos defaults/constraints que estavam gerando erro.
select
  'OK - RESET COMPLETO V10 CONCLUIDO. Tabelas recriadas do zero, ids default, unique constraints e SEM foreign keys antigas.' as status;
