import { MILLER_PROJECT_ID, requireSupabase, isSupabaseConfigured } from './supabaseClient';

const tables = {
  config: 'mm_pdv_configuracoes',
  usuarios: 'mm_pdv_usuarios',
  clientes: 'mm_pdv_clientes',
  fornecedores: 'mm_pdv_fornecedores',
  vendedores: 'mm_pdv_vendedores',
  produtos: 'mm_pdv_produtos',
  vendas: 'mm_pdv_vendas',
  vendaItens: 'mm_pdv_itens_venda',
  movimentos: 'mm_pdv_movimento_estoque',
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
const stripUuidPrefix = (value, fallback = '') => {
  const text = String(value ?? '').trim();
  if (!text) return fallback;
  return text
    .replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*-\s*/i, '')
    .trim() || fallback;
};
const friendlySaleNumber = (sale) => {
  const numero = String(sale?.numero || '').trim();
  if (numero && !looksUuid(numero)) return numero;
  const id = String(sale?.id || '').trim();
  if (id && !looksUuid(id)) return id;
  return '';
};
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
  const rawNome = stripUuidPrefix(pick(row, ['nome', 'name', 'usuario_nome', 'display_name'], 'Usuário'), 'Usuário');
  const login = String(pick(row, ['login', 'usuario', 'username', 'email'], '') || '').trim();
  const perfil = String(pick(row, ['perfil', 'tipo', 'role'], 'vendedor')).toLowerCase();
  const nome = looksUuid(rawNome) ? (login || perfil || 'Usuário') : stripUuidPrefix(rawNome, login || perfil || 'Usuário');
  const perfilFinal = ['administrador', 'financeiro', 'vendedor'].includes(perfil) ? perfil : 'vendedor';
  return {
    id: cleanId(pick(row, ['id'], `U${Date.now()}`), 'U'),
    nome,
    login: login || String(nome).toLowerCase().replace(/\s+/g, ''),
    senha: String(pick(row, ['senha', 'password', 'pass'], '123456')),
    perfil: perfilFinal,
    ativo: row?.ativo !== false,
    podeVender: Boolean(row?.pode_vender ?? ['administrador', 'financeiro', 'vendedor'].includes(perfilFinal)),
    podeClientes: Boolean(row?.pode_clientes ?? ['administrador', 'financeiro', 'vendedor'].includes(perfilFinal)),
    podeEstoque: Boolean(row?.pode_estoque ?? perfilFinal === 'administrador'),
    podeProdutos: Boolean(row?.pode_produtos ?? perfilFinal === 'administrador'),
    podeFinanceiro: Boolean(row?.pode_financeiro ?? ['administrador', 'financeiro'].includes(perfilFinal)),
    podeConfiguracoes: Boolean(row?.pode_configuracoes ?? perfilFinal === 'administrador'),
    podeBackup: Boolean(row?.pode_backup ?? perfilFinal === 'administrador'),
    podeRelatorios: Boolean(row?.pode_relatorios ?? ['administrador', 'financeiro'].includes(perfilFinal)),
    podeFornecedores: Boolean(row?.pode_fornecedores ?? perfilFinal === 'administrador'),
    podeVendedores: Boolean(row?.pode_vendedores ?? perfilFinal === 'administrador'),
    podeHistoricoVendas: Boolean(row?.pode_historico_vendas ?? ['administrador', 'financeiro'].includes(perfilFinal)),
    podePix: Boolean(row?.pode_pix ?? ['administrador', 'financeiro'].includes(perfilFinal)),
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
  return {
    project_id: MILLER_PROJECT_ID,
    nome_empresa: config.razaoSocial || config.nomeFantasia || 'MILLER MOTOS',
    nome_fantasia: config.nomeFantasia || 'MILLER MOTOS',
    cnpj: config.cnpj || '',
    email: config.email || '',
    telefone: config.telefone || '',
    endereco: config.endereco || '',
    cidade: config.cidade || 'SETE LAGOAS - MG',
    chave_pix: config.chavePix || '',
    mensagem_cupom: config.mensagemCupom || '',
    permitir_vendedor_estoque: Boolean(config.permitirVendedorEstoque),
    updated_at: new Date().toISOString(),
  };
}

function clienteFromDb(row) {
  const r = removeDbMeta(row);
  return {
    id: cleanId(r.id, 'C'),
    nome: stripUuidPrefix(pick(r, ['nome', 'cliente', 'razao_social', 'name'], 'Cliente'), 'Cliente'),
    documento: pick(r, ['documento', 'cpf_cnpj', 'cpf', 'cnpj'], ''),
    telefone: pick(r, ['telefone', 'celular', 'whatsapp'], ''),
    email: pick(r, ['email'], ''),
    endereco: pick(r, ['endereco', 'rua'], ''),
    cidade: pick(r, ['cidade'], 'SETE LAGOAS'),
    obs: pick(r, ['obs', 'observacoes'], ''),
  };
}

function fornecedorFromDb(row) {
  const r = removeDbMeta(row);
  const nome = stripUuidPrefix(pick(r, ['nome', 'fornecedor', 'razao_social', 'name'], 'Fornecedor'), 'Fornecedor');
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
  const nome = stripUuidPrefix(pick(r, ['nome', 'vendedor', 'usuario', 'name'], 'Vendedor'), 'Vendedor');
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
  const nome = stripUuidPrefix(String(pick(row, ['nome', 'produto', 'descricao', 'descricao_produto', 'name'], '') || codigo || 'Produto sem nome'), codigo || 'Produto sem nome');
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

function isUuid(value) {
  return looksUuid(value);
}

function stripBadId(row) {
  const copy = { ...row };
  // Nunca envie id vazio/nulo/temporario para o Supabase.
  // Assim o banco usa o default gen_random_uuid().
  if (copy.id === null || copy.id === undefined || String(copy.id).trim() === '' || !isUuid(copy.id)) {
    delete copy.id;
  }
  return copy;
}

function produtoToDb(p) {
  const nome = String(p.nome || p.produto || p.descricao || '').trim() || 'Produto sem nome';
  const codigo = String(p.codigo || '').trim() || ('PROD-' + Date.now().toString().slice(-6));
  return stripBadId(withProject({
    id: p.id,
    codigo,
    nome,
    descricao: nome,
    produto: nome,
    categoria: p.categoria || '',
    fornecedor_id: isUuid(p.fornecedorId) ? p.fornecedorId : null,
    custo: toNumber(p.custo),
    preco: toNumber(p.preco),
    valor_venda: toNumber(p.preco),
    estoque: toNumber(p.estoque),
    est_atual: toNumber(p.estoque),
    minimo: toNumber(p.minimo),
    unidade: p.unidade || 'UN',
    ativo: p.ativo !== false,
    updated_at: new Date().toISOString(),
  }));
}

function movimentoFromDb(row) {
  return {
    id: cleanId(row.id, 'M'),
    data: row.created_at || row.data || new Date().toISOString(),
    tipo: String(row.tipo || 'entrada').toUpperCase().replace('SAIDA', 'SAÍDA'),
    produtoId: row.produto_id || row.produtoId || '',
    produtoNome: stripUuidPrefix(row.descricao || row.produto_nome || row.produtoNome || row.nome || '', ''),
    qtd: toNumber(row.quantidade || row.qtd),
    motivo: row.origem || row.motivo || '',
    usuario: stripUuidPrefix(row.usuario_nome || row.usuario || '', ''),
    vendaId: row.venda_id || row.vendaId || '',
  };
}

function movimentoToDb(m) {
  const tipo = String(m.tipo || 'entrada').toLowerCase().includes('sa') ? 'saida' : String(m.tipo || 'entrada').toLowerCase();
  return stripBadId(withProject({
    id: m.id,
    produto_id: isUuid(m.produtoId) ? m.produtoId : null,
    venda_id: isUuid(m.vendaId) ? m.vendaId : null,
    tipo: ['entrada', 'saida', 'ajuste'].includes(tipo) ? tipo : 'entrada',
    origem: m.motivo || 'manual',
    descricao: m.produtoNome || '',
    quantidade: toNumber(m.qtd),
    estoque_antes: toNumber(m.estoqueAntes),
    estoque_depois: toNumber(m.estoqueDepois),
    usuario_nome: m.usuario || '',
  }));
}

function parseSaleMeta(row) {
  try {
    const obs = String(row?.observacoes || '').trim();
    if (obs.startsWith('{')) return JSON.parse(obs);
  } catch {}
  return {};
}

function vendaFromDb(row, itens = []) {
  const numero = String(pick(row, ['numero', 'codigo_venda', 'n_venda'], '') || '').trim();
  const meta = parseSaleMeta(row);
  return {
    id: cleanId(row.id, 'VD'), // id tecnico interno; nunca exibir ao usuario
    numero: numero && !looksUuid(numero) ? numero : '',
    data: row.data_venda || row.data || row.created_at || new Date().toISOString(),
    clienteId: row.cliente_id || row.clienteId || '',
    cliente: stripUuidPrefix(row.cliente_nome || row.cliente || 'Cliente Balcao', 'Cliente Balcao'),
    vendedorId: row.vendedor_id || row.vendedorId || '',
    vendedor: stripUuidPrefix(row.vendedor_nome || row.vendedor || '', ''),
    usuario: stripUuidPrefix(row.usuario || '', ''),
    subtotal: toNumber(row.subtotal),
    desconto: toNumber(row.desconto),
    total: toNumber(row.total),
    pagamento: row.forma_pagamento || row.pagamento || 'Dinheiro',
    pagamentos: Array.isArray(meta.pagamentos) ? meta.pagamentos : [],
    status: row.status || 'FINALIZADA',
    cancelada: String(row.status || '').toUpperCase().includes('CANCEL'),
    canceladaEm: meta.canceladaEm || '',
    canceladaPor: meta.canceladaPor || '',
    items: itens.map((i) => ({
      id: i.produto_id || i.id,
      itemId: i.id,
      codigo: i.codigo || '',
      nome: stripUuidPrefix(i.nome || i.descricao || '', 'Produto'),
      qtd: toNumber(i.quantidade || i.qtd),
      custo: toNumber(i.custo_unitario || i.custo),
      preco: toNumber(i.valor_unitario || i.preco),
      total: toNumber(i.total),
    })),
  };
}

function vendaToDb(sale) {
  return stripBadId(withProject({
    id: sale.id,
    numero: friendlySaleNumber(sale),
    data: sale.data || new Date().toISOString(),
    data_venda: sale.data || new Date().toISOString(),
    cliente_id: isUuid(sale.clienteId) ? sale.clienteId : null,
    vendedor_id: isUuid(sale.vendedorId) ? sale.vendedorId : null,
    cliente_nome: sale.cliente || 'Cliente Balcao',
    vendedor_nome: sale.vendedor || '',
    subtotal: toNumber(sale.subtotal),
    desconto: toNumber(sale.desconto),
    total: toNumber(sale.total),
    forma_pagamento: sale.pagamento || 'Dinheiro',
    status: sale.status || (sale.cancelada ? 'CANCELADA' : 'FINALIZADA'),
    observacoes: JSON.stringify({ pagamentos: sale.pagamentos || [], canceladaEm: sale.canceladaEm || '', canceladaPor: sale.canceladaPor || '' }),
    updated_at: new Date().toISOString(),
  }));
}

function itemToDb(sale, item) {
  return stripBadId(withProject({
    id: item.itemId || undefined,
    venda_id: sale.__dbId || sale.id,
    produto_id: isUuid(item.id || item.produtoId) ? (item.id || item.produtoId) : null,
    codigo: item.codigo || '',
    descricao: item.nome || item.descricao || '',
    quantidade: toNumber(item.qtd),
    valor_unitario: toNumber(item.preco),
    custo_unitario: toNumber(item.custo),
    total: toNumber(item.total || toNumber(item.preco) * toNumber(item.qtd)),
  }));
}

async function selectAll(table, order = 'created_at', ascending = false) {
  const db = requireSupabase();
  const { data, error } = await projectFilter(db.from(table).select('*')).order(order, { ascending });
  if (error) throw error;
  return data || [];
}

async function replaceRows(table, rows) {
  const db = requireSupabase();
  const { error: delError } = await projectFilter(db.from(table).delete());
  if (delError) throw delError;
  if (!rows || rows.length === 0) return [];
  const { data, error } = await db.from(table).insert(rows.map(withProject)).select();
  if (error) throw error;
  return data || [];
}

async function replaceProdutos(products) {
  const db = requireSupabase();
  const { error: delError } = await projectFilter(db.from(tables.produtos).delete());
  if (delError) throw delError;
  if (!products?.length) return [];
  const { error } = await db.from(tables.produtos).insert(products.map(produtoToDb));
  if (error) throw error;
  return products;
}

async function replaceMovimentos(movements) {
  const db = requireSupabase();
  const { error: delError } = await projectFilter(db.from(tables.movimentos).delete());
  if (delError) throw delError;
  if (!movements?.length) return [];
  const { error } = await db.from(tables.movimentos).insert(movements.map(movimentoToDb));
  if (error) throw error;
  return movements;
}

async function replaceConfig(config) {
  const db = requireSupabase();
  const { error: configError } = await db.from(tables.config).upsert(cfgToDb(config), { onConflict: 'project_id' });
  if (configError) throw configError;
  const users = mergeDefaultUsers(config.usuarios || []);
  if (users.length) {
    // IMPORTANTE: não reenviar o id antigo dos usuários.
    // Em alguns bancos o id já existe em outra gravação e causa:
    // duplicate key value violates unique constraint "mm_pdv_usuarios_pkey".
    // O upsert por project_id + login atualiza o usuário existente ou cria um novo UUID automaticamente.
    const userRows = users.map((u) => {
      const row = stripBadId(withProject({
        nome: u.nome,
        login: u.login,
        senha: u.senha,
        perfil: u.perfil,
        ativo: u.ativo !== false,
        pode_vender: u.podeVender ?? u.perfil !== 'financeiro',
        pode_clientes: u.podeClientes ?? true,
        pode_estoque: u.podeEstoque ?? u.perfil === 'administrador',
        pode_produtos: u.podeProdutos ?? u.perfil === 'administrador',
        pode_financeiro: u.podeFinanceiro ?? (u.perfil === 'administrador' || u.perfil === 'financeiro'),
        pode_configuracoes: u.podeConfiguracoes ?? u.perfil === 'administrador',
        pode_backup: u.podeBackup ?? u.perfil === 'administrador',
        pode_relatorios: u.podeRelatorios ?? (u.perfil === 'administrador' || u.perfil === 'financeiro'),
        pode_fornecedores: u.podeFornecedores ?? u.perfil === 'administrador',
        pode_vendedores: u.podeVendedores ?? u.perfil === 'administrador',
        pode_historico_vendas: u.podeHistoricoVendas ?? (u.perfil === 'administrador' || u.perfil === 'financeiro'),
        pode_pix: u.podePix ?? (u.perfil === 'administrador' || u.perfil === 'financeiro'),
        updated_at: new Date().toISOString(),
      }));
      delete row.id;
      return row;
    });
    const { error: usersError } = await db.from(tables.usuarios).upsert(userRows, { onConflict: 'project_id,login' });
    if (usersError) throw usersError;
  }
  return config;
}

async function replaceSales(sales) {
  const db = requireSupabase();
  const { error: delItens } = await projectFilter(db.from(tables.vendaItens).delete());
  if (delItens) throw delItens;
  const { error: delVendas } = await projectFilter(db.from(tables.vendas).delete());
  if (delVendas) throw delVendas;
  if (!sales?.length) return [];

  for (const sale of sales) {
    const { data: insertedSale, error: vendaError } = await db
      .from(tables.vendas)
      .insert(vendaToDb(sale))
      .select('id, numero')
      .single();
    if (vendaError) throw vendaError;

    const dbSale = { ...sale, __dbId: insertedSale.id };
    const items = (sale.items || []).map((item) => itemToDb(dbSale, item));
    if (items.length) {
      const { error: itensError } = await db.from(tables.vendaItens).insert(items);
      if (itensError) throw itensError;
    }
  }
  return sales;
}

export async function saveResource(resource, value) {
  if (!isSupabaseConfigured) throw new Error('Supabase nao configurado.');
  if (resource === 'config') return replaceConfig(value);
  if (resource === 'products') return replaceProdutos(value);
  if (resource === 'movements') return replaceMovimentos(value);
  if (resource === 'sales') return replaceSales(value);
  if (resource === 'clients') return replaceRows(tables.clientes, value.map((c) => stripBadId(withProject({
    id: c.id, nome: c.nome || 'Cliente', cpf_cnpj: c.documento || '', telefone: c.telefone || '', email: c.email || '', endereco: c.endereco || '', cidade: c.cidade || '', observacoes: c.obs || '', ativo: true
  }))));
  if (resource === 'suppliers') return replaceRows(tables.fornecedores, value.map((s) => stripBadId(withProject({
    id: s.id, nome: s.nome || 'Fornecedor', cnpj: s.cnpj || '', telefone: s.telefone || '', email: s.email || '', cidade: s.cidade || '', observacoes: s.obs || '', ativo: true
  }))));
  if (resource === 'vendors') return replaceRows(tables.vendedores, value.map((v) => stripBadId(withProject({
    id: v.id, nome: v.nome || 'Vendedor', telefone: v.telefone || '', email: v.email || '', comissao: toNumber(v.comissao), ativo: v.ativo !== false
  }))));
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
    selectAll(tables.movimentos, 'created_at', false),
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
