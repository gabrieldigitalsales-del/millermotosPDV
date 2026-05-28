import { MILLER_PROJECT_ID, requireSupabase, isSupabaseConfigured } from './supabaseClient';

const tables = {
  config: 'mm_pdv_config',
  usuarios: 'mm_pdv_usuarios',
  clientes: 'mm_pdv_clientes',
  fornecedores: 'mm_pdv_fornecedores',
  vendedores: 'mm_pdv_vendedores',
  produtos: 'mm_pdv_produtos',
  vendas: 'mm_pdv_vendas',
  vendaItens: 'mm_pdv_venda_itens',
  movimentos: 'mm_pdv_estoque_movimentos',
};

const toNumber = (value) => Number(value || 0);
const withProject = (row) => ({ ...row, project_id: MILLER_PROJECT_ID });
const projectFilter = (query) => query.eq('project_id', MILLER_PROJECT_ID);

function cfgFromDb(row, usuarios) {
  if (!row) return null;
  return {
    nomeFantasia: row.nome_fantasia || 'MILLER MOTOS',
    razaoSocial: row.razao_social || 'MILLER MOTOS PECAS E SERVICOS',
    cnpj: row.cnpj || '',
    email: row.email || '',
    telefone: row.telefone || '',
    endereco: row.endereco || '',
    cidade: row.cidade || 'SETE LAGOAS - MG',
    chavePix: row.chave_pix || '',
    mensagemCupom: row.mensagem_cupom || 'Obrigado pela preferencia. Volte sempre!',
    permitirVendedorEstoque: Boolean(row.permitir_vendedor_estoque),
    usuarios: usuarios || [],
  };
}

function cfgToDb(config) {
  return withProject({
    id: 'CONFIG',
    nome_fantasia: config.nomeFantasia || 'MILLER MOTOS',
    razao_social: config.razaoSocial || '',
    cnpj: config.cnpj || '',
    email: config.email || '',
    telefone: config.telefone || '',
    endereco: config.endereco || '',
    cidade: config.cidade || '',
    chave_pix: config.chavePix || '',
    mensagem_cupom: config.mensagemCupom || '',
    permitir_vendedor_estoque: Boolean(config.permitirVendedorEstoque),
    updated_at: new Date().toISOString(),
  });
}

function produtoFromDb(row) {
  return {
    id: row.id,
    codigo: row.codigo || '',
    nome: row.nome || '',
    categoria: row.categoria || '',
    fornecedorId: row.fornecedor_id || '',
    custo: toNumber(row.custo),
    preco: toNumber(row.preco),
    estoque: toNumber(row.estoque),
    minimo: toNumber(row.minimo),
    unidade: row.unidade || 'UN',
    ativo: row.ativo !== false,
  };
}

function produtoToDb(p) {
  return withProject({
    id: p.id,
    codigo: p.codigo || '',
    nome: p.nome || '',
    categoria: p.categoria || '',
    fornecedor_id: p.fornecedorId || null,
    custo: toNumber(p.custo),
    preco: toNumber(p.preco),
    estoque: toNumber(p.estoque),
    minimo: toNumber(p.minimo),
    unidade: p.unidade || 'UN',
    ativo: p.ativo !== false,
    updated_at: new Date().toISOString(),
  });
}

function movimentoFromDb(row) {
  return {
    id: row.id,
    data: row.data,
    tipo: row.tipo,
    produtoId: row.produto_id,
    produtoNome: row.produto_nome,
    qtd: toNumber(row.qtd),
    motivo: row.motivo || '',
    usuario: row.usuario || '',
    vendaId: row.venda_id || '',
  };
}

function movimentoToDb(m) {
  return withProject({
    id: m.id,
    data: m.data || new Date().toISOString(),
    tipo: m.tipo === 'SAÍDA' ? 'SAIDA' : (m.tipo || 'ENTRADA'),
    produto_id: m.produtoId,
    produto_nome: m.produtoNome || '',
    qtd: toNumber(m.qtd),
    motivo: m.motivo || '',
    usuario: m.usuario || '',
    venda_id: m.vendaId || null,
  });
}

function vendaFromDb(row, itens = []) {
  return {
    id: row.id,
    data: row.data,
    clienteId: row.cliente_id || '',
    cliente: row.cliente || 'Cliente Balcao',
    vendedorId: row.vendedor_id || '',
    vendedor: row.vendedor || '',
    usuario: row.usuario || '',
    subtotal: toNumber(row.subtotal),
    desconto: toNumber(row.desconto),
    total: toNumber(row.total),
    pagamento: row.pagamento || 'Dinheiro',
    status: row.status || 'FINALIZADA',
    items: itens.map((i) => ({
      id: i.produto_id || i.id,
      codigo: i.codigo || '',
      nome: i.nome || '',
      qtd: toNumber(i.qtd),
      custo: toNumber(i.custo),
      preco: toNumber(i.preco),
      total: toNumber(i.total),
    })),
  };
}

function vendaToDb(sale) {
  return withProject({
    id: sale.id,
    data: sale.data || new Date().toISOString(),
    cliente_id: sale.clienteId || null,
    cliente: sale.cliente || 'Cliente Balcao',
    vendedor_id: sale.vendedorId || null,
    vendedor: sale.vendedor || '',
    usuario: sale.usuario || '',
    subtotal: toNumber(sale.subtotal),
    desconto: toNumber(sale.desconto),
    total: toNumber(sale.total),
    pagamento: sale.pagamento || 'Dinheiro',
    status: sale.status || 'FINALIZADA',
    updated_at: new Date().toISOString(),
  });
}

function itemToDb(sale, item) {
  return withProject({
    venda_id: sale.id,
    produto_id: item.id || item.produtoId,
    codigo: item.codigo || '',
    nome: item.nome || '',
    qtd: toNumber(item.qtd),
    custo: toNumber(item.custo),
    preco: toNumber(item.preco),
    total: toNumber(item.total),
  });
}

const simpleTableMap = {
  clientes: tables.clientes,
  fornecedores: tables.fornecedores,
  vendedores: tables.vendedores,
};

function normalizeSimpleRows(rows) {
  return (rows || []).map((row) => ({ ...row, project_id: undefined, created_at: undefined, updated_at: undefined, busca_normalizada: undefined }));
}

async function selectAll(table, order = 'created_at', ascending = false) {
  const db = requireSupabase();
  const { data, error } = await projectFilter(db.from(table).select('*')).order(order, { ascending });
  if (error) throw error;
  return data || [];
}

async function replaceRows(table, rows) {
  const db = requireSupabase();
  const { error: delError } = await projectFilter(db.from(table).delete()).neq('id', '__never__');
  if (delError) throw delError;
  if (!rows || rows.length === 0) return [];
  const { data, error } = await db.from(table).insert(rows.map(withProject)).select();
  if (error) throw error;
  return data || [];
}

async function replaceProdutos(products) {
  const db = requireSupabase();
  const { error: delError } = await projectFilter(db.from(tables.produtos).delete()).neq('id', '__never__');
  if (delError) throw delError;
  if (!products?.length) return [];
  const { error } = await db.from(tables.produtos).insert(products.map(produtoToDb));
  if (error) throw error;
  return products;
}

async function replaceMovimentos(movements) {
  const db = requireSupabase();
  const { error: delError } = await projectFilter(db.from(tables.movimentos).delete()).neq('id', '__never__');
  if (delError) throw delError;
  if (!movements?.length) return [];
  const { error } = await db.from(tables.movimentos).insert(movements.map(movimentoToDb));
  if (error) throw error;
  return movements;
}

async function replaceConfig(config) {
  const db = requireSupabase();
  const { error: configError } = await db.from(tables.config).upsert(cfgToDb(config), { onConflict: 'project_id,id' });
  if (configError) throw configError;
  const users = config.usuarios || [];
  const { error: delUsersError } = await projectFilter(db.from(tables.usuarios).delete()).neq('id', '__never__');
  if (delUsersError) throw delUsersError;
  if (users.length) {
    const { error: usersError } = await db.from(tables.usuarios).insert(users.map((u) => withProject({
      id: u.id,
      nome: u.nome,
      login: u.login,
      senha: u.senha,
      perfil: u.perfil,
      ativo: u.ativo !== false,
      updated_at: new Date().toISOString(),
    })));
    if (usersError) throw usersError;
  }
  return config;
}

async function replaceSales(sales) {
  const db = requireSupabase();
  const { error: delItens } = await projectFilter(db.from(tables.vendaItens).delete()).neq('id', '00000000-0000-0000-0000-000000000000');
  if (delItens) throw delItens;
  const { error: delVendas } = await projectFilter(db.from(tables.vendas).delete()).neq('id', '__never__');
  if (delVendas) throw delVendas;
  if (!sales?.length) return [];
  const { error: vendasError } = await db.from(tables.vendas).insert(sales.map(vendaToDb));
  if (vendasError) throw vendasError;
  const items = sales.flatMap((sale) => (sale.items || []).map((item) => itemToDb(sale, item)));
  if (items.length) {
    const { error: itensError } = await db.from(tables.vendaItens).insert(items);
    if (itensError) throw itensError;
  }
  return sales;
}

export async function saveResource(resource, value) {
  if (!isSupabaseConfigured) throw new Error('Supabase nao configurado.');
  if (resource === 'config') return replaceConfig(value);
  if (resource === 'products') return replaceProdutos(value);
  if (resource === 'movements') return replaceMovimentos(value);
  if (resource === 'sales') return replaceSales(value);
  if (resource === 'clients') return replaceRows(tables.clientes, value);
  if (resource === 'suppliers') return replaceRows(tables.fornecedores, value);
  if (resource === 'vendors') return replaceRows(tables.vendedores, value);
  return null;
}

export async function loadAllSupabase(defaults) {
  if (!isSupabaseConfigured) throw new Error('Supabase nao configurado.');
  const db = requireSupabase();

  const [configs, usuarios, clientes, fornecedores, vendedores, produtos, vendas, itens, movimentos] = await Promise.all([
    selectAll(tables.config, 'created_at', true),
    selectAll(tables.usuarios, 'created_at', true),
    selectAll(tables.clientes, 'created_at', true),
    selectAll(tables.fornecedores, 'created_at', true),
    selectAll(tables.vendedores, 'created_at', true),
    selectAll(tables.produtos, 'created_at', true),
    selectAll(tables.vendas, 'data', false),
    selectAll(tables.vendaItens, 'created_at', true),
    selectAll(tables.movimentos, 'data', false),
  ]);

  const isEmpty = !configs.length && !clientes.length && !produtos.length && !vendas.length;
  if (isEmpty && defaults) {
    await replaceConfig(defaults.config);
    await replaceRows(tables.clientes, defaults.clients);
    await replaceRows(tables.fornecedores, defaults.suppliers);
    await replaceRows(tables.vendedores, defaults.vendors);
    await replaceProdutos(defaults.products);
    await replaceSales(defaults.sales || []);
    await replaceMovimentos(defaults.movements || []);
    return defaults;
  }

  const itensByVenda = new Map();
  for (const item of itens) {
    if (!itensByVenda.has(item.venda_id)) itensByVenda.set(item.venda_id, []);
    itensByVenda.get(item.venda_id).push(item);
  }

  return {
    config: cfgFromDb(configs[0], normalizeSimpleRows(usuarios)) || defaults.config,
    clients: clientes.length ? normalizeSimpleRows(clientes) : defaults.clients,
    suppliers: fornecedores.length ? normalizeSimpleRows(fornecedores) : defaults.suppliers,
    vendors: vendedores.length ? normalizeSimpleRows(vendedores) : defaults.vendors,
    products: produtos.length ? produtos.map(produtoFromDb) : defaults.products,
    sales: vendas.map((sale) => vendaFromDb(sale, itensByVenda.get(sale.id) || [])),
    movements: movimentos.length ? movimentos.map(movimentoFromDb) : defaults.movements,
  };
}

export async function testSupabaseConnection() {
  const db = requireSupabase();
  const { error } = await db.from(tables.config).select('id').limit(1);
  if (error) throw error;
  return true;
}
