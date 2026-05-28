-- =========================================================
-- PDV MILLER MOTOS - CORRECAO CADASTRAR PRODUTO SO COM NOME
-- Pode rodar por cima. Nao apaga dados.
-- Corrige id automatico, codigo automatico e valores padrao.
-- =========================================================

create extension if not exists pgcrypto;

-- 1) Garante que todos os IDs tecnicos sejam gerados automaticamente.
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
    execute format('update public.%I set id = %s where id is null', r.table_name, default_sql);
    execute format('alter table public.%I alter column id set not null', r.table_name);
  end loop;
end $$;

-- 2) Garante colunas e defaults do produto.
alter table public.mm_pdv_produtos
  alter column id set default gen_random_uuid(),
  alter column project_id set default '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026',
  alter column codigo set default '',
  alter column nome set default 'Produto sem nome',
  alter column descricao set default '',
  alter column produto set default '',
  alter column categoria set default '',
  alter column unidade set default 'UN',
  alter column custo set default 0,
  alter column preco set default 0,
  alter column valor_venda set default 0,
  alter column estoque set default 0,
  alter column est_atual set default 0,
  alter column minimo set default 0,
  alter column ativo set default true;

-- 3) Trigger: se cadastrar somente NOME, o banco preenche o restante.
create or replace function public.mm_pdv_sync_produto()
returns trigger
language plpgsql
as $$
begin
  new.project_id := coalesce(new.project_id, '9f1f4df2-5f5a-4a7d-9f34-8a9be4412026');

  new.nome := coalesce(
    nullif(trim(new.nome), ''),
    nullif(trim(new.descricao), ''),
    nullif(trim(new.produto), ''),
    'Produto sem nome'
  );

  new.codigo := coalesce(
    nullif(trim(new.codigo), ''),
    'PROD-' || upper(substr(coalesce(new.id, gen_random_uuid())::text, 1, 6))
  );

  new.descricao := coalesce(nullif(trim(new.descricao), ''), new.nome);
  new.produto := coalesce(nullif(trim(new.produto), ''), new.nome);
  new.categoria := coalesce(new.categoria, '');
  new.unidade := coalesce(nullif(trim(new.unidade), ''), 'UN');
  new.custo := coalesce(new.custo, 0);
  new.preco := coalesce(new.preco, new.valor_venda, 0);
  new.valor_venda := coalesce(new.valor_venda, new.preco, 0);
  new.estoque := coalesce(new.estoque, new.est_atual, 0);
  new.est_atual := coalesce(new.est_atual, new.estoque, 0);
  new.minimo := coalesce(new.minimo, 0);
  new.ativo := coalesce(new.ativo, true);
  new.updated_at := now();

  return new;
end;
$$;

drop trigger if exists trg_mm_pdv_sync_produto on public.mm_pdv_produtos;
create trigger trg_mm_pdv_sync_produto
before insert or update on public.mm_pdv_produtos
for each row execute function public.mm_pdv_sync_produto();

-- 4) Corrige registros ja existentes que ficaram incompletos.
update public.mm_pdv_produtos
set
  nome = coalesce(nullif(trim(nome), ''), nullif(trim(descricao), ''), nullif(trim(produto), ''), 'Produto sem nome'),
  codigo = coalesce(nullif(trim(codigo), ''), 'PROD-' || upper(substr(id::text, 1, 6))),
  descricao = coalesce(nullif(trim(descricao), ''), nullif(trim(nome), ''), 'Produto sem nome'),
  produto = coalesce(nullif(trim(produto), ''), nullif(trim(nome), ''), 'Produto sem nome'),
  categoria = coalesce(categoria, ''),
  unidade = coalesce(nullif(trim(unidade), ''), 'UN'),
  custo = coalesce(custo, 0),
  preco = coalesce(preco, valor_venda, 0),
  valor_venda = coalesce(valor_venda, preco, 0),
  estoque = coalesce(estoque, est_atual, 0),
  est_atual = coalesce(est_atual, estoque, 0),
  minimo = coalesce(minimo, 0),
  ativo = coalesce(ativo, true),
  updated_at = now()
where true;

-- 5) Permissoes para Vercel/anon key.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.mm_pdv_produtos to anon, authenticated;

select 'OK - produtos agora podem ser cadastrados apenas com nome' as resultado;
