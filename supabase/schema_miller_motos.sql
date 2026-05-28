-- =========================================================
-- PDV MILLER MOTOS - SCHEMA SUPABASE EXCLUSIVO
-- Projeto: 9f1f4df2-5f5a-4a7d-9f34-8a9be4412026
-- Prefixo das tabelas: mm_pdv_
-- =========================================================

create extension if not exists pgcrypto;
create extension if not exists unaccent;
create extension if not exists pg_trgm;

create or replace function public.mm_pdv_unaccent(text)
returns text
language sql
immutable
parallel safe
as $$ select public.unaccent($1); $$;

-- ID unico para nao misturar com outros projetos
-- Nao altere depois de colocar o sistema em producao.

-- CONFIGURACOES DA EMPRESA
create table if not exists public.mm_pdv_config (
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  id text not null default 'CONFIG',
  nome_fantasia text not null default 'MILLER MOTOS',
  razao_social text default 'MILLER MOTOS PECAS E SERVICOS',
  cnpj text default '00.000.000/0001-00',
  email text default 'contato@millermotos.com',
  telefone text default '(31) 00000-0000',
  endereco text default 'Rua Principal, 100 - Centro',
  cidade text default 'SETE LAGOAS - MG',
  chave_pix text default 'contato@millermotos.com',
  mensagem_cupom text default 'Obrigado pela preferencia. Volte sempre!',
  permitir_vendedor_estoque boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, id)
);

-- USUARIOS / PERMISSOES
create table if not exists public.mm_pdv_usuarios (
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  id text not null,
  nome text not null,
  login text not null,
  senha text not null,
  perfil text not null check (perfil in ('administrador','financeiro','vendedor')),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, id),
  unique (project_id, login)
);

create table if not exists public.mm_pdv_clientes (
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  id text not null,
  nome text not null,
  documento text default '',
  telefone text default '',
  email text default '',
  endereco text default '',
  cidade text default 'SETE LAGOAS',
  obs text default '',
  busca_normalizada text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, id)
);

create table if not exists public.mm_pdv_fornecedores (
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  id text not null,
  nome text not null,
  cnpj text default '',
  telefone text default '',
  email text default '',
  cidade text default '',
  obs text default '',
  busca_normalizada text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, id)
);

create table if not exists public.mm_pdv_vendedores (
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  id text not null,
  nome text not null,
  telefone text default '',
  email text default '',
  comissao numeric(10,2) not null default 0,
  ativo boolean not null default true,
  busca_normalizada text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, id)
);

create table if not exists public.mm_pdv_produtos (
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  id text not null,
  codigo text not null,
  nome text not null,
  categoria text default '',
  fornecedor_id text,
  custo numeric(10,2) not null default 0,
  preco numeric(10,2) not null default 0,
  estoque numeric(10,3) not null default 0,
  minimo numeric(10,3) not null default 0,
  unidade text not null default 'UN',
  ativo boolean not null default true,
  busca_normalizada text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, id),
  unique (project_id, codigo)
);

create table if not exists public.mm_pdv_vendas (
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  id text not null,
  data timestamptz not null default now(),
  cliente_id text,
  cliente text not null default 'Cliente Balcao',
  vendedor_id text,
  vendedor text default '',
  usuario text default '',
  subtotal numeric(10,2) not null default 0,
  desconto numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  pagamento text not null default 'Dinheiro',
  status text not null default 'FINALIZADA',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, id)
);

create table if not exists public.mm_pdv_venda_itens (
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  id uuid not null default gen_random_uuid(),
  venda_id text not null,
  produto_id text not null,
  codigo text default '',
  nome text not null,
  qtd numeric(10,3) not null default 1,
  custo numeric(10,2) not null default 0,
  preco numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  primary key (project_id, id)
);

create table if not exists public.mm_pdv_estoque_movimentos (
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  id text not null,
  data timestamptz not null default now(),
  tipo text not null check (tipo in ('ENTRADA','SAIDA','SAÍDA','AJUSTE')),
  produto_id text not null,
  produto_nome text not null,
  qtd numeric(10,3) not null default 0,
  motivo text default '',
  usuario text default '',
  venda_id text,
  created_at timestamptz not null default now(),
  primary key (project_id, id)
);

create table if not exists public.mm_pdv_caixas (
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  id text not null,
  data_abertura timestamptz not null default now(),
  data_fechamento timestamptz,
  usuario_abertura text default '',
  usuario_fechamento text default '',
  valor_abertura numeric(10,2) not null default 0,
  valor_fechamento numeric(10,2),
  status text not null default 'ABERTO',
  created_at timestamptz not null default now(),
  primary key (project_id, id)
);



-- FUNCOES PARA BUSCA COM OU SEM ACENTO
create or replace function public.mm_pdv_normalizar_busca(valor text)
returns text
language sql
immutable
parallel safe
as $$ select lower(public.mm_pdv_unaccent(coalesce(valor, ''))); $$;

create or replace function public.mm_pdv_set_busca_clientes()
returns trigger
language plpgsql
as $$
begin
  new.busca_normalizada := public.mm_pdv_normalizar_busca(coalesce(new.nome,'') || ' ' || coalesce(new.documento,'') || ' ' || coalesce(new.telefone,'') || ' ' || coalesce(new.email,''));
  return new;
end $$;

create or replace function public.mm_pdv_set_busca_fornecedores()
returns trigger
language plpgsql
as $$
begin
  new.busca_normalizada := public.mm_pdv_normalizar_busca(coalesce(new.nome,'') || ' ' || coalesce(new.cnpj,'') || ' ' || coalesce(new.cidade,''));
  return new;
end $$;

create or replace function public.mm_pdv_set_busca_vendedores()
returns trigger
language plpgsql
as $$
begin
  new.busca_normalizada := public.mm_pdv_normalizar_busca(coalesce(new.nome,'') || ' ' || coalesce(new.telefone,'') || ' ' || coalesce(new.email,''));
  return new;
end $$;

create or replace function public.mm_pdv_set_busca_produtos()
returns trigger
language plpgsql
as $$
begin
  new.busca_normalizada := public.mm_pdv_normalizar_busca(coalesce(new.codigo,'') || ' ' || coalesce(new.nome,'') || ' ' || coalesce(new.categoria,''));
  return new;
end $$;

drop trigger if exists trg_mm_pdv_clientes_busca on public.mm_pdv_clientes;
create trigger trg_mm_pdv_clientes_busca before insert or update on public.mm_pdv_clientes for each row execute function public.mm_pdv_set_busca_clientes();

drop trigger if exists trg_mm_pdv_fornecedores_busca on public.mm_pdv_fornecedores;
create trigger trg_mm_pdv_fornecedores_busca before insert or update on public.mm_pdv_fornecedores for each row execute function public.mm_pdv_set_busca_fornecedores();

drop trigger if exists trg_mm_pdv_vendedores_busca on public.mm_pdv_vendedores;
create trigger trg_mm_pdv_vendedores_busca before insert or update on public.mm_pdv_vendedores for each row execute function public.mm_pdv_set_busca_vendedores();

drop trigger if exists trg_mm_pdv_produtos_busca on public.mm_pdv_produtos;
create trigger trg_mm_pdv_produtos_busca before insert or update on public.mm_pdv_produtos for each row execute function public.mm_pdv_set_busca_produtos();

-- INDICES PARA BUSCA RAPIDA
create index if not exists idx_mm_pdv_clientes_busca on public.mm_pdv_clientes using gin (busca_normalizada gin_trgm_ops);
create index if not exists idx_mm_pdv_produtos_busca on public.mm_pdv_produtos using gin (busca_normalizada gin_trgm_ops);
create index if not exists idx_mm_pdv_vendas_data on public.mm_pdv_vendas (project_id, data desc);
create index if not exists idx_mm_pdv_movimentos_data on public.mm_pdv_estoque_movimentos (project_id, data desc);


-- DADOS INICIAIS UNICOS
insert into public.mm_pdv_config (project_id, id, nome_fantasia, razao_social, cnpj, email, telefone, endereco, cidade, chave_pix)
values ('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','CONFIG','MILLER MOTOS','MILLER MOTOS PECAS E SERVICOS','00.000.000/0001-00','contato@millermotos.com','(31) 00000-0000','Rua Principal, 100 - Centro','SETE LAGOAS - MG','contato@millermotos.com')
on conflict (project_id, id) do nothing;

insert into public.mm_pdv_usuarios (project_id, id, nome, login, senha, perfil, ativo) values
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','U001','Administrador','admin','admin123','administrador',true),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','U002','Financeiro','financeiro','fin123','financeiro',true),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','U003','Vendedor','vendedor','venda123','vendedor',true)
on conflict (project_id, id) do nothing;

insert into public.mm_pdv_clientes (project_id, id, nome, documento, telefone, email, endereco, cidade, obs) values
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','C0001','Cliente Balcao','','','','','SETE LAGOAS','Cliente padrao para venda rapida'),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','C0002','Joao da Silva','000.000.000-00','(31) 99999-0000','joao@email.com','Rua A, 10','SETE LAGOAS','')
on conflict (project_id, id) do nothing;

insert into public.mm_pdv_fornecedores (project_id, id, nome, cnpj, telefone, email, cidade, obs) values
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','F0001','Distribuidora Minas Motos','11.111.111/0001-11','(31) 3333-1111','vendas@minasmotos.com','BELO HORIZONTE','Pecas em geral'),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','F0002','Lubrasil Atacado','22.222.222/0001-22','(31) 3333-2222','contato@lubrasil.com','SETE LAGOAS','Lubrificantes')
on conflict (project_id, id) do nothing;

insert into public.mm_pdv_vendedores (project_id, id, nome, telefone, email, comissao, ativo) values
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','V0001','Balcao','','',0,true),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','V0002','Carlos Vendedor','(31) 99911-2233','carlos@email.com',2,true)
on conflict (project_id, id) do nothing;

insert into public.mm_pdv_produtos (project_id, id, codigo, nome, categoria, fornecedor_id, custo, preco, estoque, minimo, unidade) values
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','P0001','111114','Oleo 20W50 1L','Lubrificantes','F0002',24,35,12,3,'UN'),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','P0002','222200','Kit Relacao 125cc','Transmissao','F0001',140,185,3,2,'UN'),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','P0003','333310','Pastilha de Freio','Freios','F0001',29,45,10,4,'JG'),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','P0004','444120','Cabo de Embreagem','Cabos','F0001',18,32,6,2,'UN')
on conflict (project_id, id) do nothing;

-- RLS: habilita seguranca e restringe tudo ao project_id exclusivo.
alter table public.mm_pdv_config enable row level security;
alter table public.mm_pdv_usuarios enable row level security;
alter table public.mm_pdv_clientes enable row level security;
alter table public.mm_pdv_fornecedores enable row level security;
alter table public.mm_pdv_vendedores enable row level security;
alter table public.mm_pdv_produtos enable row level security;
alter table public.mm_pdv_vendas enable row level security;
alter table public.mm_pdv_venda_itens enable row level security;
alter table public.mm_pdv_estoque_movimentos enable row level security;
alter table public.mm_pdv_caixas enable row level security;

-- Politicas publicas para app local com anon key. A restricao e pelo project_id fixo.
-- Em uma versao multiusuario profissional, troque por auth.uid() e tabela de usuarios autenticados.
do $$
declare
  t text;
begin
  foreach t in array array[
    'mm_pdv_config','mm_pdv_usuarios','mm_pdv_clientes','mm_pdv_fornecedores','mm_pdv_vendedores',
    'mm_pdv_produtos','mm_pdv_vendas','mm_pdv_venda_itens','mm_pdv_estoque_movimentos','mm_pdv_caixas'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'mm_pdv_project_select', t);
    execute format('drop policy if exists %I on public.%I', 'mm_pdv_project_insert', t);
    execute format('drop policy if exists %I on public.%I', 'mm_pdv_project_update', t);
    execute format('drop policy if exists %I on public.%I', 'mm_pdv_project_delete', t);
    execute format('create policy %I on public.%I for select using (project_id = %L::uuid)', 'mm_pdv_project_select', t, '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026');
    execute format('create policy %I on public.%I for insert with check (project_id = %L::uuid)', 'mm_pdv_project_insert', t, '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026');
    execute format('create policy %I on public.%I for update using (project_id = %L::uuid) with check (project_id = %L::uuid)', 'mm_pdv_project_update', t, '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026', '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026');
    execute format('create policy %I on public.%I for delete using (project_id = %L::uuid)', 'mm_pdv_project_delete', t, '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026');
  end loop;
end $$;

-- Views uteis para relatorios
create or replace view public.mm_pdv_relatorio_vendas_diarias as
select project_id, date_trunc('day', data) as dia, count(*) as quantidade_vendas, sum(total) as faturamento, sum(desconto) as descontos
from public.mm_pdv_vendas
where project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026'
group by project_id, date_trunc('day', data)
order by dia desc;

create or replace view public.mm_pdv_relatorio_produtos_mais_vendidos as
select i.project_id, i.produto_id, i.codigo, i.nome, sum(i.qtd) as qtd_vendida, sum(i.total) as total_vendido
from public.mm_pdv_venda_itens i
where i.project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026'
group by i.project_id, i.produto_id, i.codigo, i.nome
order by qtd_vendida desc;

-- FIM
