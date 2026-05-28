import { PROJECT_ID, requireSupabase } from './supabaseClient';

const table = (name) => `mm_pdv_${name}`;
const withProject = (data = {}) => ({ project_id: PROJECT_ID, ...data });

export async function listRows(name, order = 'created_at', ascending = false) {
  const sb = requireSupabase();
  const { data, error } = await sb.from(table(name)).select('*').eq('project_id', PROJECT_ID).order(order, { ascending });
  if (error) throw error;
  return data || [];
}

export async function upsertRow(name, payload) {
  const sb = requireSupabase();
  const clean = { ...payload, project_id: PROJECT_ID, updated_at: new Date().toISOString() };
  const { data, error } = await sb.from(table(name)).upsert(clean).select().single();
  if (error) throw error;
  return data;
}

export async function insertRow(name, payload) {
  const sb = requireSupabase();
  const { data, error } = await sb.from(table(name)).insert(withProject(payload)).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRow(name, id) {
  const sb = requireSupabase();
  const { error } = await sb.from(table(name)).delete().eq('id', id).eq('project_id', PROJECT_ID);
  if (error) throw error;
}

export async function getConfig() {
  const sb = requireSupabase();
  let { data, error } = await sb.from(table('configuracoes')).select('*').eq('project_id', PROJECT_ID).maybeSingle();
  if (error) throw error;
  if (!data) data = await insertRow('configuracoes', { empresa: 'MILLER MOTOS', cidade: 'Sete Lagoas - MG' });
  return data;
}

export async function login(usuario, senha) {
  const sb = requireSupabase();
  const { data, error } = await sb.from(table('usuarios')).select('*').eq('project_id', PROJECT_ID).eq('usuario', usuario).eq('senha', senha).eq('ativo', true).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Usuário ou senha inválidos.');
  return data;
}

export async function productsPriority() {
  const sb = requireSupabase();
  const { data, error } = await sb.from('mm_pdv_produtos_prioridade_balcao').select('*').limit(20);
  if (error) throw error;
  return data || [];
}

export async function finalizeSale({ cliente, vendedor, usuario, forma_pagamento, desconto, items }) {
  const sb = requireSupabase();
  if (!items?.length) throw new Error('Adicione itens na venda.');
  const subtotal = items.reduce((sum, item) => sum + Number(item.quantidade) * Number(item.preco_venda), 0);
  const total = Math.max(0, subtotal - Number(desconto || 0));
  const venda = await insertRow('vendas', {
    cliente_id: cliente?.id || null,
    vendedor_id: vendedor?.id || null,
    usuario_id: usuario?.id || null,
    cliente_nome: cliente?.nome || 'Consumidor',
    vendedor_nome: vendedor?.nome || usuario?.nome || '',
    forma_pagamento,
    subtotal,
    desconto: Number(desconto || 0),
    total,
    status: 'finalizada'
  });

  for (const item of items) {
    const qtd = Number(item.quantidade);
    const unit = Number(item.preco_venda);
    await insertRow('itens_venda', {
      venda_id: venda.id,
      produto_id: item.id,
      codigo: item.codigo,
      descricao: item.descricao,
      quantidade: qtd,
      valor_unitario: unit,
      total: qtd * unit
    });
    const novoEstoque = Number(item.estoque || 0) - qtd;
    const { error: updateError } = await sb.from(table('produtos')).update({ estoque: novoEstoque, updated_at: new Date().toISOString() }).eq('id', item.id).eq('project_id', PROJECT_ID);
    if (updateError) throw updateError;
    await insertRow('movimento_estoque', {
      produto_id: item.id,
      codigo: item.codigo,
      descricao: item.descricao,
      tipo: 'saida',
      quantidade: qtd,
      origem: 'venda balcão',
      venda_id: venda.id,
      usuario_nome: usuario?.nome || '',
      observacao: `Venda ${venda.numero || ''}`
    });
  }
  return venda;
}

export async function stockEntry({ produto, quantidade, usuario, observacao }) {
  const sb = requireSupabase();
  const qtd = Number(quantidade || 0);
  if (!produto || qtd <= 0) throw new Error('Informe produto e quantidade.');
  const novoEstoque = Number(produto.estoque || 0) + qtd;
  const { error } = await sb.from(table('produtos')).update({ estoque: novoEstoque, updated_at: new Date().toISOString() }).eq('id', produto.id).eq('project_id', PROJECT_ID);
  if (error) throw error;
  return insertRow('movimento_estoque', {
    produto_id: produto.id,
    codigo: produto.codigo,
    descricao: produto.descricao,
    tipo: 'entrada',
    quantidade: qtd,
    origem: 'entrada manual',
    usuario_nome: usuario?.nome || '',
    observacao: observacao || ''
  });
}
