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

const DEFAULT_USERS = [
  { id: 'U001', nome: 'Administrador', login: 'admin', senha: 'admin123', perfil: 'administrador', ativo: true },
  { id: 'U002', nome: 'Financeiro', login: 'financeiro', senha: 'fin123', perfil: 'financeiro', ativo: true },
  { id: 'U003', nome: 'Vendedor', login: 'vendedor', senha: 'venda123', perfil: 'vendedor', ativo: true },
];

const toNumber = (value) => Number(String(value ?? 0).replace(',', '.')) || 0;
const withProject = (row) => ({ ...row, project_id: MILLER_PROJECT_ID });
const projectFilter = (query) => query.eq('project_id', MILLER_PROJECT_ID);
const pick = (row, keys, fallback = '') => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return fallback;
};
const cleanId = (value, fallbackPrefix = 'ID') => String(value || `${fallbackPrefix}${Date.now()}`);
const looksUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
const removeDbMeta = (row) => {
  const { project_id, created_at, updated_at, busca_normalizada, ...rest } = row || {};
  return rest;
};

function mergeDefaultUsers(users) {
  const byLogin = new Map();
  for (const user of [...DEFAULT_USERS, ...(users || [])]) {
    if (!user?.login) continue;
    byLogin.set(String(user.login).toLowerCase(), user);
  }
  return Array.from(byLogin.values());
}

function usuarioFromDb(row) {
  const rawNome = pick(row, ['nome', 'name', 'usuario_nome', 'display_name'], 'Usuário');
  const login = String(pick(row, ['login', 'usuario', 'username', 'email'], '') || '').trim();
  const perfil = String(pick(row, ['perfil', 'tipo', 'role'], 'vendedor')).toLowerCase();
  const nome = looksUuid(rawNome) ? (login || perfil || 'Usuário') : rawNome;
  return {
    id: cleanId(pick(row, ['id'], `U${Date.now()}`), 'U'),
    nome,
    login: login || String(nome).toLowerCase().replace(/\s+/g, ''),
    senha: String(pick(row, ['senha', 'password', 'pass'], '123456')),
    perfil: ['administrador', 'financeiro', 'vendedor'].includes(perfil) ? perfil : 'vendedor',
    ativo: row?.ativo !== false,
  };
}

function cfgFromDb(row, usuarios) {
  const base = {
    nomeFantasia: 'MILLER MOTOS',
    razaoSocial: 'MILLER MOTOS PECAS E SERVICOS',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    cidade: 'SETE LAGOAS - MG',
    chavePix: '',
    mensagemCupom: 'Obrigado pela preferencia. Volte sempre!',
    permitirVendedorEstoque: false,
    usuarios: mergeDefaultUsers(usuarios),
  };
  if (!row) return base;
  return {
    ...base,
    nomeFantasia: pick(row, ['nome_fantasia', 'nomeFantasia'], base.nomeFantasia),
    razaoSocial: pick(row, ['razao_social', 'razaoSocial'], base.razaoSocial),
    cnpj: pick(row, ['cnpj'], base.cnpj),
    email: pick(row, ['email'], base.email),
    telefone: pick(row, ['telefone'], base.telefone),
    endereco: pick(row, ['endereco'], base.endereco),
    cidade: pick(row, ['cidade'], base.cidade),
    chavePix: pick(row, ['chave_pix', 'chavePix'], base.chavePix),
    mensagemCupom: pick(row, ['mensagem_cupom', 'mensagemCupom'], base.mensagemCupom),
    permitirVendedorEstoque: Boolean(row.permitir_vendedor_estoque ?? row.permitirVendedorEstoque ?? false),
    usuarios: mergeDefaultUsers(usuarios),
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

function clienteFromDb(row) {
  const r = removeDbMeta(row);
  return {
    id: cleanId(r.id, 'C'),
    nome: pick(r, ['nome', 'cliente', 'razao_social', 'name'], r.id || 'Cliente'),
    documento: pick(r, ['documento', 'cpf', 'cnpj'], ''),
    telefone: pick(r, ['telefone', 'celular', 'whatsapp'], ''),
    email: pick(r, ['email'], ''),
    endereco: pick(r, ['endereco', 'rua'], ''),
    cidade: pick(r, ['cidade'], 'SETE LAGOAS'),
    obs: pick(r, ['obs', 'observacoes'], ''),
  };
}

function fornecedorFromDb(row) {
  const r = removeDbMeta(row);
  const nome = pick(r, ['nome', 'fornecedor', 'razao_social', 'name'], 'Fornecedor');
  return {
    id: cleanId(r.id, 'F'),
    nome: looksUuid(nome) ? 'Fornecedor' : nome,
    cnpj: pick(r, ['cnpj', 'documento'], ''),
    telefone: pick(r, ['telefone', 'celular'], ''),
    email: pick(r, ['email'], ''),
    cidade: pick(r, ['cidade'], ''),
    obs: pick(r, ['obs', 'observacoes'], ''),
  };
}

function vendedorFromDb(row) {
  const r = removeDbMeta(row);
  const nome = pick(r, ['nome', 'vendedor', 'usuario', 'name'], 'Vendedor');
  return {
    id: cleanId(r.id, 'V'),
    nome: looksUuid(nome) ? 'Vendedor' : nome,
    telefone: pick(r, ['telefone', 'celular'], ''),
    email: pick(r, ['email'], ''),
    comissao: toNumber(pick(r, ['comissao', 'comissao_percentual'], 0)),
    ativo: r.ativo !== false,
  };
}

function produtoFromDb(row) {
  const codigo = String(pick(row, ['codigo', 'code', 'referencia', 'barra', 'cod_barras'], '') || '');
  const nome = String(pick(row, ['nome', 'produto', 'descricao', 'descricao_produto', 'name'], '') || codigo || 'Produto sem nome');
  return {
    id: cleanId(row.id, 'P'),
    codigo,
    nome,
    categoria: String(pick(row, ['categoria', 'grupo', 'grupo_categoria'], '') || ''),
    fornecedorId: String(pick(row, ['fornecedor_id', 'fornecedorId'], '') || ''),
    custo: toNumber(pick(row, ['custo', 'valor_custo', 'preco_custo'], 0)),
    preco: toNumber(pick(row, ['preco', 'valor_avista', 'valor_venda', 'valor', 'preco_venda'], 0)),
    estoque: toNumber(pick(row, ['estoque', 'est_atual', 'estoque_atual', 'qtd_estoque', 'quantidade'], 0)),
    minimo: toNumber(pick(row, ['minimo', 'estoque_minimo'], 0)),
    unidade: String(pick(row, ['unidade', 'uni'], 'UN') || 'UN'),
    ativo: row.ativo !== false,
  };
}

function produtoToDb(p) {
  return withProject({
    id: cleanId(p.id, 'P'),
    codigo: p.codigo || '',
    nome: p.nome || p.codigo || 'Produto sem nome',
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
    id: cleanId(row.id, 'M'),
    data: row.data || row.created_at || new Date().toISOString(),
    tipo: row.tipo || 'ENTRADA',
    produtoId: row.produto_id || row.produtoId || '',
    produtoNome: row.produto_nome || row.produtoNome || row.nome || '',
    qtd: toNumber(row.qtd || row.quantidade),
    motivo: row.motivo || '',
    usuario: row.usuario || '',
    vendaId: row.venda_id || row.vendaId || '',
  };
}

function movimentoToDb(m) {
  return withProject({
    id: cleanId(m.id, 'M'),
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
    id: cleanId(row.id, 'VD'),
    data: row.data_venda || row.data || row.created_at || new Date().toISOString(),
    clienteId: row.cliente_id || row.clienteId || '',
    cliente: row.cliente || 'Cliente Balcao',
    vendedorId: row.vendedor_id || row.vendedorId || '',
    vendedor: row.vendedor || '',
    usuario: row.usuario || '',
    subtotal: toNumber(row.subtotal),
    desconto: toNumber(row.desconto),
    total: toNumber(row.total),
    pagamento: row.pagamento || row.forma_pagamento || 'Dinheiro',
    status: row.status || 'FINALIZADA',
    items: itens.map((i) => ({
      id: i.produto_id || i.id,
      codigo: i.codigo || '',
      nome: i.nome || i.descricao || '',
      qtd: toNumber(i.qtd || i.quantidade),
      custo: toNumber(i.custo),
      preco: toNumber(i.preco || i.valor_unitario),
      total: toNumber(i.total),
    })),
  };
}

function vendaToDb(sale) {
  return withProject({
    id: cleanId(sale.id, 'VD'),
    data_venda: sale.data || new Date().toISOString(),
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
  const users = mergeDefaultUsers(config.usuarios || []);
  const { error: delUsersError } = await projectFilter(db.from(tables.usuarios).delete()).neq('id', '__never__');
  if (delUsersError) throw delUsersError;
  if (users.length) {
    const { error: usersError } = await db.from(tables.usuarios).insert(users.map((u) => withProject({
      id: cleanId(u.id, 'U'),
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
  if (resource === 'clients') return replaceRows(tables.clientes, value.map((c) => withProject({
    id: cleanId(c.id, 'C'), nome: c.nome || 'Cliente', documento: c.documento || '', telefone: c.telefone || '', email: c.email || '', endereco: c.endereco || '', cidade: c.cidade || '', obs: c.obs || ''
  })));
  if (resource === 'suppliers') return replaceRows(tables.fornecedores, value.map((s) => withProject({
    id: cleanId(s.id, 'F'), nome: s.nome || 'Fornecedor', cnpj: s.cnpj || '', telefone: s.telefone || '', email: s.email || '', cidade: s.cidade || '', obs: s.obs || ''
  })));
  if (resource === 'vendors') return replaceRows(tables.vendedores, value.map((v) => withProject({
    id: cleanId(v.id, 'V'), nome: v.nome || 'Vendedor', telefone: v.telefone || '', email: v.email || '', comissao: toNumber(v.comissao), ativo: v.ativo !== false
  })));
  return null;
}

export async function loadAllSupabase(defaults) {
  if (!isSupabaseConfigured) throw new Error('Supabase nao configurado.');
  const [configs, usuarios, clientes, fornecedores, vendedores, produtos, vendas, itens, movimentos] = await Promise.all([
    selectAll(tables.config, 'created_at', true),
    selectAll(tables.usuarios, 'created_at', true),
    selectAll(tables.clientes, 'created_at', true),
    selectAll(tables.fornecedores, 'created_at', true),
    selectAll(tables.vendedores, 'created_at', true),
    selectAll(tables.produtos, 'created_at', true),
    selectAll(tables.vendas, 'data_venda', false),
    selectAll(tables.vendaItens, 'created_at', true),
    selectAll(tables.movimentos, 'data', false),
  ]);

  const isEmpty = !configs.length && !clientes.length && !produtos.length && !vendas.length;
  if (isEmpty && defaults) {
    await replaceConfig(defaults.config);
    await saveResource('clients', defaults.clients);
    await saveResource('suppliers', defaults.suppliers);
    await saveResource('vendors', defaults.vendors);
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

  const users = usuarios.map(usuarioFromDb);
  return {
    config: cfgFromDb(configs[0], users) || defaults.config,
    clients: clientes.length ? clientes.map(clienteFromDb) : defaults.clients,
    suppliers: fornecedores.length ? fornecedores.map(fornecedorFromDb) : defaults.suppliers,
    vendors: vendedores.length ? vendedores.map(vendedorFromDb) : defaults.vendors,
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
