import { MILLER_PROJECT_ID, requireSupabase, supabase, isSupabaseConfigured } from './supabaseClient';

const tables = {
  config: 'mm_pdv_config',
  usuarios: 'mm_pdv_usuarios',
  clientes: 'mm_pdv_clientes',
  fornecedores: 'mm_pdv_fornecedores',
  vendedores: 'mm_pdv_vendedores',
  produtos: 'mm_pdv_produtos',
  vendas: 'mm_pdv_vendas',
  vendaItens: 'mm_pdv_venda_itens',
  estoqueMov: 'mm_pdv_estoque_movimentos',
  caixas: 'mm_pdv_caixas',
};

const withProject = (row) => ({ project_id: MILLER_PROJECT_ID, ...row });
const projectFilter = (query) => query.eq('project_id', MILLER_PROJECT_ID);

export async function testarConexaoSupabase() {
  const db = requireSupabase();
  const { data, error } = await projectFilter(db.from(tables.config).select('*')).limit(1);
  if (error) throw error;
  return data;
}

export async function listarTabela(nomeTabela, orderBy = 'created_at') {
  const db = requireSupabase();
  const { data, error } = await projectFilter(db.from(tables[nomeTabela]).select('*')).order(orderBy, { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function salvarRegistro(nomeTabela, registro) {
  const db = requireSupabase();
  const row = withProject(registro);
  const { data, error } = await db.from(tables[nomeTabela]).upsert(row, { onConflict: 'project_id,id' }).select().single();
  if (error) throw error;
  return data;
}

export async function excluirRegistro(nomeTabela, id) {
  const db = requireSupabase();
  const { error } = await projectFilter(db.from(tables[nomeTabela]).delete()).eq('id', id);
  if (error) throw error;
  return true;
}

export async function buscarProdutos(termo = '') {
  const db = requireSupabase();
  const search = termo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  let query = projectFilter(db.from(tables.produtos).select('*')).order('nome');
  if (search) query = query.ilike('busca_normalizada', `%${search}%`);
  const { data, error } = await query.limit(30);
  if (error) throw error;
  return data || [];
}


export async function listarProdutosPrioridadeBalcao(limite = 18) {
  const db = requireSupabase();
  const { data, error } = await projectFilter(
    db.from('mm_pdv_produtos_prioridade_balcao').select('*')
  ).limit(limite);
  if (error) throw error;
  return data || [];
}

export async function finalizarVendaSupabase({ venda, itens, movimentos, produtosAtualizados }) {
  const db = requireSupabase();
  const { data: vendaSalva, error: vendaError } = await db.from(tables.vendas).insert(withProject(venda)).select().single();
  if (vendaError) throw vendaError;

  const itensRows = itens.map((item) => withProject({ ...item, venda_id: venda.id }));
  const { error: itensError } = await db.from(tables.vendaItens).insert(itensRows);
  if (itensError) throw itensError;

  const movRows = movimentos.map((mov) => withProject({ ...mov, venda_id: venda.id }));
  const { error: movError } = await db.from(tables.estoqueMov).insert(movRows);
  if (movError) throw movError;

  for (const produto of produtosAtualizados) {
    const { error } = await projectFilter(db.from(tables.produtos).update({ estoque: produto.estoque, updated_at: new Date().toISOString() })).eq('id', produto.id);
    if (error) throw error;
  }

  return vendaSalva;
}

export async function carregarTudoSupabase() {
  if (!isSupabaseConfigured) return null;
  const [config, usuarios, clientes, fornecedores, vendedores, produtos, vendas, movimentos] = await Promise.all([
    listarTabela('config'),
    listarTabela('usuarios'),
    listarTabela('clientes'),
    listarTabela('fornecedores'),
    listarTabela('vendedores'),
    listarTabela('produtos'),
    listarTabela('vendas'),
    listarTabela('estoqueMov'),
  ]);
  return { config: config[0], usuarios, clientes, fornecedores, vendedores, products: produtos, sales: vendas, movements: movimentos };
}
