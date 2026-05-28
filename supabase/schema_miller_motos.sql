-- PDV MILLER MOTOS - Supabase direto
-- Projeto exclusivo: 9f1f4df2-5f5a-4a7d-9f34-8a9be4412026
-- Prefixo exclusivo: mm_pdv_

create extension if not exists pgcrypto;

create table if not exists public.mm_pdv_configuracoes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  empresa text not null default 'MILLER MOTOS',
  cnpj text default '',
  telefone text default '',
  email text default '',
  endereco text default '',
  cidade text default 'Sete Lagoas - MG',
  chave_pix text default '',
  permitir_vendedor_estoque boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.mm_pdv_usuarios (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  nome text not null,
  usuario text not null unique,
  senha text not null,
  perfil text not null check (perfil in ('administrador','financeiro','vendedor')),
  ativo boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.mm_pdv_clientes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  nome text not null,
  cpf_cnpj text default '',
  telefone text default '',
  email text default '',
  endereco text default '',
  cidade text default 'Sete Lagoas',
  observacao text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.mm_pdv_fornecedores (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  nome text not null,
  cnpj text default '',
  telefone text default '',
  email text default '',
  cidade text default '',
  observacao text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.mm_pdv_vendedores (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  nome text not null,
  telefone text default '',
  email text default '',
  comissao_percent numeric(10,2) default 0,
  ativo boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.mm_pdv_produtos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  codigo text not null,
  descricao text not null,
  categoria text default 'Geral',
  unidade text default 'UN',
  preco_custo numeric(12,2) default 0,
  preco_venda numeric(12,2) not null default 0,
  estoque numeric(12,3) not null default 0,
  estoque_minimo numeric(12,3) default 0,
  ativo boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(project_id, codigo)
);

create table if not exists public.mm_pdv_vendas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  numero serial,
  cliente_id uuid references public.mm_pdv_clientes(id),
  vendedor_id uuid references public.mm_pdv_vendedores(id),
  usuario_id uuid references public.mm_pdv_usuarios(id),
  cliente_nome text default 'Consumidor',
  vendedor_nome text default '',
  forma_pagamento text not null default 'Dinheiro',
  subtotal numeric(12,2) not null default 0,
  desconto numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'finalizada',
  created_at timestamptz default now()
);

create table if not exists public.mm_pdv_itens_venda (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  venda_id uuid not null references public.mm_pdv_vendas(id) on delete cascade,
  produto_id uuid references public.mm_pdv_produtos(id),
  codigo text not null,
  descricao text not null,
  quantidade numeric(12,3) not null,
  valor_unitario numeric(12,2) not null,
  total numeric(12,2) not null,
  created_at timestamptz default now()
);

create table if not exists public.mm_pdv_movimento_estoque (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  produto_id uuid references public.mm_pdv_produtos(id),
  codigo text not null,
  descricao text not null,
  tipo text not null check (tipo in ('entrada','saida','ajuste')),
  quantidade numeric(12,3) not null,
  origem text not null default 'manual',
  venda_id uuid references public.mm_pdv_vendas(id),
  usuario_nome text default '',
  observacao text default '',
  created_at timestamptz default now()
);

create index if not exists idx_mm_pdv_clientes_project on public.mm_pdv_clientes(project_id);
create index if not exists idx_mm_pdv_produtos_project on public.mm_pdv_produtos(project_id);
create index if not exists idx_mm_pdv_vendas_project on public.mm_pdv_vendas(project_id);
create index if not exists idx_mm_pdv_movimento_project on public.mm_pdv_movimento_estoque(project_id);

create or replace view public.mm_pdv_produtos_prioridade_balcao as
select
  p.*,
  coalesce(sum(i.quantidade), 0) as total_vendido
from public.mm_pdv_produtos p
left join public.mm_pdv_itens_venda i on i.produto_id = p.id and i.project_id = p.project_id
where p.project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026'
  and p.ativo = true
  and p.estoque > 0
group by p.id
order by coalesce(sum(i.quantidade), 0) desc, p.descricao asc;

-- RLS para teste/desenvolvimento: políticas liberadas para anon key.
-- Para produção com autenticação real, substitua por políticas baseadas em auth.uid().
alter table public.mm_pdv_configuracoes enable row level security;
alter table public.mm_pdv_usuarios enable row level security;
alter table public.mm_pdv_clientes enable row level security;
alter table public.mm_pdv_fornecedores enable row level security;
alter table public.mm_pdv_vendedores enable row level security;
alter table public.mm_pdv_produtos enable row level security;
alter table public.mm_pdv_vendas enable row level security;
alter table public.mm_pdv_itens_venda enable row level security;
alter table public.mm_pdv_movimento_estoque enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='mm_pdv_clientes' and policyname='mm_pdv_clientes_all') then
    create policy mm_pdv_clientes_all on public.mm_pdv_clientes for all using (project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026') with check (project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='mm_pdv_produtos' and policyname='mm_pdv_produtos_all') then
    create policy mm_pdv_produtos_all on public.mm_pdv_produtos for all using (project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026') with check (project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='mm_pdv_vendas' and policyname='mm_pdv_vendas_all') then
    create policy mm_pdv_vendas_all on public.mm_pdv_vendas for all using (project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026') with check (project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='mm_pdv_itens_venda' and policyname='mm_pdv_itens_all') then
    create policy mm_pdv_itens_all on public.mm_pdv_itens_venda for all using (project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026') with check (project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='mm_pdv_movimento_estoque' and policyname='mm_pdv_mov_all') then
    create policy mm_pdv_mov_all on public.mm_pdv_movimento_estoque for all using (project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026') with check (project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='mm_pdv_configuracoes' and policyname='mm_pdv_config_all') then
    create policy mm_pdv_config_all on public.mm_pdv_configuracoes for all using (project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026') with check (project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='mm_pdv_usuarios' and policyname='mm_pdv_usuarios_all') then
    create policy mm_pdv_usuarios_all on public.mm_pdv_usuarios for all using (project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026') with check (project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='mm_pdv_fornecedores' and policyname='mm_pdv_fornecedores_all') then
    create policy mm_pdv_fornecedores_all on public.mm_pdv_fornecedores for all using (project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026') with check (project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='mm_pdv_vendedores' and policyname='mm_pdv_vendedores_all') then
    create policy mm_pdv_vendedores_all on public.mm_pdv_vendedores for all using (project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026') with check (project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026');
  end if;
end $$;

insert into public.mm_pdv_configuracoes(project_id, empresa, cidade)
select '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026', 'MILLER MOTOS', 'Sete Lagoas - MG'
where not exists (select 1 from public.mm_pdv_configuracoes where project_id = '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026');

insert into public.mm_pdv_usuarios(project_id, nome, usuario, senha, perfil) values
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','Administrador','admin','admin123','administrador'),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','Financeiro','financeiro','fin123','financeiro'),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','Vendedor','vendedor','venda123','vendedor')
on conflict (usuario) do nothing;

insert into public.mm_pdv_vendedores(project_id, nome, telefone, comissao_percent) values
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','Vendedor Balcão','',0)
on conflict do nothing;

insert into public.mm_pdv_clientes(project_id, nome, cidade) values
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','Consumidor','Sete Lagoas')
on conflict do nothing;

insert into public.mm_pdv_produtos(project_id, codigo, descricao, categoria, unidade, preco_custo, preco_venda, estoque, estoque_minimo) values
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','OLEO20W50','Óleo 20W50 1L','Lubrificantes','UN',25,35,20,5),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','KITREL125','Kit Relação 125cc','Transmissão','UN',130,185,8,2),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','PASTFREIO','Pastilha de Freio','Freios','JG',30,45,12,3),
('9f1f4df2-5f5a-4a7d-9f34-8a9be4412026','CAMARA18','Câmara de Ar Aro 18','Pneus','UN',24,38,10,3)
on conflict (project_id, codigo) do nothing;
