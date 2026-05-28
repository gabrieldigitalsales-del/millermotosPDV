import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import QRCode from 'qrcode';
import { Users, Package, ShoppingCart, Settings, FileBarChart, Truck, UserCog, Boxes, Save, Trash2, Pencil, Search, Printer, LogOut, ShieldCheck, DollarSign, Plus, Download, RefreshCw } from 'lucide-react';
import './styles.css';
import { isSupabaseConfigured, PROJECT_ID } from './lib/supabaseClient';
import { deleteRow, finalizeSale, getConfig, insertRow, listRows, login, productsPriority, stockEntry, upsertRow } from './lib/repository';

const emptyProduct = { codigo: '', descricao: '', categoria: 'Geral', unidade: 'UN', preco_custo: 0, preco_venda: 0, estoque: 0, estoque_minimo: 0, ativo: true };
const emptyClient = { nome: '', cpf_cnpj: '', telefone: '', email: '', endereco: '', cidade: 'Sete Lagoas', observacao: '' };
const emptySupplier = { nome: '', cnpj: '', telefone: '', email: '', cidade: '', observacao: '' };
const emptySeller = { nome: '', telefone: '', email: '', comissao_percent: 0, ativo: true };

function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
function money(value) { return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function can(user, area, config) {
  if (!user) return false;
  if (user.perfil === 'administrador') return true;
  if (user.perfil === 'financeiro') return ['financeiro','relatorios','balcao','clientes','configuracoes'].includes(area);
  if (user.perfil === 'vendedor') {
    if (area === 'estoque') return Boolean(config?.permitir_vendedor_estoque);
    return ['balcao','clientes'].includes(area);
  }
  return false;
}

function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('balcao');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(null);
  const [data, setData] = useState({ clientes: [], produtos: [], fornecedores: [], vendedores: [], vendas: [], movimento: [], usuarios: [] });

  async function loadAll() {
    setLoading(true); setError('');
    try {
      if (!isSupabaseConfigured) throw new Error('Supabase não configurado. Coloque VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Vercel.');
      const [cfg, clientes, produtos, fornecedores, vendedores, vendas, movimento, usuarios] = await Promise.all([
        getConfig(), listRows('clientes', 'nome', true), listRows('produtos', 'descricao', true), listRows('fornecedores', 'nome', true), listRows('vendedores', 'nome', true), listRows('vendas'), listRows('movimento_estoque'), listRows('usuarios', 'nome', true)
      ]);
      setConfig(cfg);
      setData({ clientes, produtos, fornecedores, vendedores, vendas, movimento, usuarios });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadAll(); }, []);

  if (!user) return <Login onLogin={setUser} error={error} setError={setError} />;
  const nav = [
    ['balcao','🛒 Balcão', ShoppingCart], ['clientes','👥 Clientes', Users], ['produtos','📦 Produtos', Package], ['fornecedores','🚚 Fornecedores', Truck], ['vendedores','🧑‍🔧 Vendedores', UserCog], ['estoque','📦 Entrada/Saída Estoque', Boxes], ['relatorios','📊 Relatórios', FileBarChart], ['configuracoes','⚙️ Configurações', Settings]
  ];
  return <div className="app-shell">
    <div className="titlebar"><span className="brand-icon">🏍️</span>PDV MILLER MOTOS - Supabase Online <span className="project">Projeto: {PROJECT_ID}</span></div>
    <nav className="menu-bar">{nav.map(([id,label,Icon]) => <button key={id} className={screen===id?'active':''} disabled={!can(user, id==='produtos'?'estoque':id, config)} onClick={()=>setScreen(id)}><Icon size={16}/>{label}</button>)}<button onClick={loadAll}><RefreshCw size={16}/> Atualizar</button><button onClick={()=>setUser(null)}><LogOut size={16}/> Sair</button></nav>
    <div className="toolbar"><strong>Usuário:</strong> {user.nome} | <strong>Perfil:</strong> {user.perfil} | <strong>Status:</strong> {isSupabaseConfigured ? '✅ Supabase conectado' : '❌ Supabase não configurado'} {loading && ' | Carregando...'}</div>
    {error && <div className="error">{error}</div>}
    <main className="workspace">
      {screen==='balcao' && <Balcao data={data} config={config} user={user} reload={loadAll}/>}      
      {screen==='clientes' && <Crud title="👥 Cadastro de Clientes" rows={data.clientes} empty={emptyClient} table="clientes" fields={['nome','cpf_cnpj','telefone','email','endereco','cidade','observacao']} reload={loadAll}/>}      
      {screen==='produtos' && <Crud title="📦 Cadastro de Produtos / Peças" rows={data.produtos} empty={emptyProduct} table="produtos" fields={['codigo','descricao','categoria','unidade','preco_custo','preco_venda','estoque','estoque_minimo','ativo']} reload={loadAll}/>}      
      {screen==='fornecedores' && <Crud title="🚚 Cadastro de Fornecedores" rows={data.fornecedores} empty={emptySupplier} table="fornecedores" fields={['nome','cnpj','telefone','email','cidade','observacao']} reload={loadAll}/>}      
      {screen==='vendedores' && <Crud title="🧑‍🔧 Cadastro de Vendedores" rows={data.vendedores} empty={emptySeller} table="vendedores" fields={['nome','telefone','email','comissao_percent','ativo']} reload={loadAll}/>}      
      {screen==='estoque' && <Estoque data={data} user={user} reload={loadAll}/>}      
      {screen==='relatorios' && <Relatorios data={data}/>}      
      {screen==='configuracoes' && <Configuracoes config={config} usuarios={data.usuarios} reload={loadAll}/>}      
    </main>
    <footer className="statusbar">Sete Lagoas - MG | MILLER MOTOS | Todos os dados são salvos direto no Supabase</footer>
  </div>;
}

function Login({ onLogin, error, setError }) {
  const [usuario, setUsuario] = useState('admin');
  const [senha, setSenha] = useState('admin123');
  async function submit(e) {
    e.preventDefault(); setError('');
    try { onLogin(await login(usuario, senha)); }
    catch (err) { setError(err.message); }
  }
  return <div className="login-bg"><form className="login-card" onSubmit={submit}><h1>🏍️ PDV MILLER MOTOS</h1><p>Sistema online com Supabase</p>{error && <div className="error">{error}</div>}<label>Usuário<input value={usuario} onChange={e=>setUsuario(e.target.value)}/></label><label>Senha<input type="password" value={senha} onChange={e=>setSenha(e.target.value)}/></label><button><ShieldCheck/> Entrar</button><small>admin/admin123 | financeiro/fin123 | vendedor/venda123</small></form></div>
}

function Crud({ title, rows, empty, table, fields, reload }) {
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState('');
  const filtered = rows.filter(r => normalizeText(Object.values(r).join(' ')).includes(normalizeText(q)));
  async function save() { await upsertRow(table, form); setForm(empty); await reload(); }
  async function remove(id) { if (confirm('Excluir registro?')) { await deleteRow(table, id); await reload(); } }
  return <div className="window-panel full"><header className="panel-title">{title}</header><div className="crud-layout"><section><input className="search-input" placeholder="Pesquisar..." value={q} onChange={e=>setQ(e.target.value)}/><div className="list-box">{filtered.map(r=><button key={r.id} onClick={()=>setForm(r)}><strong>{r.nome || r.descricao || r.codigo}</strong><span>{r.telefone || r.categoria || r.cidade}</span></button>)}</div></section><section className="form-grid">{fields.map(f=><label key={f}>{labelOf(f)}{typeof empty[f] === 'boolean' ? <select value={String(form[f] ?? true)} onChange={e=>setForm({...form,[f]:e.target.value==='true'})}><option value="true">Sim</option><option value="false">Não</option></select> : <input value={form[f] ?? ''} type={['preco_custo','preco_venda','estoque','estoque_minimo','comissao_percent'].includes(f)?'number':'text'} step="0.01" onChange={e=>setForm({...form,[f]:e.target.value})}/>}</label>)}<div className="actions"><button onClick={save}><Save/> Salvar</button><button onClick={()=>setForm(empty)}><Plus/> Novo</button>{form.id && <button onClick={()=>remove(form.id)}><Trash2/> Excluir</button>}</div></section></div></div>
}
function labelOf(f){return ({cpf_cnpj:'CPF/CNPJ', preco_custo:'Preço custo', preco_venda:'Preço venda', estoque_minimo:'Estoque mínimo', comissao_percent:'Comissão %', permitir_vendedor_estoque:'Vendedor pode mexer no estoque'}[f] || f.replace('_',' '));}

function Balcao({ data, config, user, reload }) {
  const [q, setQ] = useState('');
  const [cart, setCart] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [vendedorId, setVendedorId] = useState('');
  const [forma, setForma] = useState('Dinheiro');
  const [desconto, setDesconto] = useState(0);
  const [lastSale, setLastSale] = useState(null);
  const [qr, setQr] = useState('');

  const selectedCliente = data.clientes.find(c=>c.id===clienteId);
  const selectedVendedor = data.vendedores.find(v=>v.id===vendedorId);
  const ranking = useMemo(() => {
    const sold = {};
    data.movimento.filter(m=>m.tipo==='saida').forEach(m=>{ sold[m.produto_id]=(sold[m.produto_id]||0)+Number(m.quantidade||0); });
    return [...data.produtos].filter(p=>p.ativo!==false && Number(p.estoque)>0).sort((a,b)=>(sold[b.id]||0)-(sold[a.id]||0) || a.descricao.localeCompare(b.descricao));
  }, [data]);
  const products = q ? data.produtos.filter(p=>normalizeText(`${p.codigo} ${p.descricao} ${p.categoria}`).includes(normalizeText(q))) : ranking.slice(0, 16);
  const subtotal = cart.reduce((s,i)=>s+Number(i.quantidade)*Number(i.preco_venda),0);
  const total = Math.max(0, subtotal-Number(desconto||0));
  useEffect(()=>{ if(config?.chave_pix && forma==='Pix') QRCode.toDataURL(`PIX: ${config.chave_pix} | Valor: ${money(total)} | ${config.empresa}`).then(setQr); else setQr(''); },[config,forma,total]);
  function add(p){ const existing=cart.find(i=>i.id===p.id); if(existing) setCart(cart.map(i=>i.id===p.id?{...i,quantidade:Number(i.quantidade)+1}:i)); else setCart([...cart,{...p,quantidade:1}]); setQ(''); }
  async function finish(){ const sale=await finalizeSale({ cliente:selectedCliente, vendedor:selectedVendedor, usuario:user, forma_pagamento:forma, desconto, items:cart }); setLastSale(sale); setCart([]); setDesconto(0); await reload(); setTimeout(()=>window.print(),200); }
  return <div className="balcao-grid"><div className="window-panel"><header className="panel-title">🛒 Venda de Balcão</header><div className="yellow-line">⭐ Produtos mais vendidos</div><input className="search-big" autoFocus placeholder="Digite O, Ol, oleo, Óleo, código ou descrição..." value={q} onChange={e=>setQ(e.target.value)}/><div className="product-grid">{products.map(p=><button key={p.id} onClick={()=>add(p)}><strong>{p.descricao}</strong><span>{p.codigo} | Estoque: {p.estoque}</span><b>{money(p.preco_venda)}</b></button>)}</div></div><div className="window-panel"><header className="panel-title">🧾 Carrinho / Cupom</header><label>Cliente<select value={clienteId} onChange={e=>setClienteId(e.target.value)}><option value="">Consumidor</option>{data.clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></label><label>Vendedor<select value={vendedorId} onChange={e=>setVendedorId(e.target.value)}><option value="">{user.nome}</option>{data.vendedores.map(v=><option key={v.id} value={v.id}>{v.nome}</option>)}</select></label><div className="cart-list">{cart.map(i=><div key={i.id}><span>{i.descricao}</span><input type="number" min="1" value={i.quantidade} onChange={e=>setCart(cart.map(x=>x.id===i.id?{...x,quantidade:e.target.value}:x))}/><b>{money(Number(i.quantidade)*Number(i.preco_venda))}</b><button onClick={()=>setCart(cart.filter(x=>x.id!==i.id))}>×</button></div>)}</div><div className="totals"><span>Subtotal {money(subtotal)}</span><label>Desconto<input type="number" value={desconto} onChange={e=>setDesconto(e.target.value)}/></label><strong>Total {money(total)}</strong></div><label>Pagamento<select value={forma} onChange={e=>setForma(e.target.value)}><option>Dinheiro</option><option>Pix</option><option>Cartão Débito</option><option>Cartão Crédito</option></select></label>{qr && <img className="qr" src={qr}/>}<button className="finish" disabled={!cart.length} onClick={finish}>Finalizar e imprimir cupom</button></div><Cupom sale={lastSale} config={config} cart={cart} /></div>
}
function Cupom({ sale, config }) { if(!sale) return null; return <div className="print-cupom"><h2>{config?.empresa || 'MILLER MOTOS'}</h2><p>{config?.cnpj}</p><p>{config?.endereco}</p><hr/><p>Venda: {sale.numero} - {new Date(sale.created_at).toLocaleString('pt-BR')}</p><p>Cliente: {sale.cliente_nome}</p><p>Pagamento: {sale.forma_pagamento}</p><h3>Total: {money(sale.total)}</h3><p>Obrigado pela preferência!</p></div> }

function Estoque({ data, user, reload }) { const [produtoId,setProdutoId]=useState(''); const [qtd,setQtd]=useState(1); const [obs,setObs]=useState(''); const produto=data.produtos.find(p=>p.id===produtoId); async function entrada(){ await stockEntry({produto, quantidade:qtd, usuario:user, observacao:obs}); setProdutoId(''); setQtd(1); setObs(''); await reload(); } return <div className="window-panel full"><header className="panel-title">📦 Entrada e Saída de Estoque</header><div className="stock-entry"><label>Produto<select value={produtoId} onChange={e=>setProdutoId(e.target.value)}><option value="">Selecione</option>{data.produtos.map(p=><option key={p.id} value={p.id}>{p.descricao} - estoque {p.estoque}</option>)}</select></label><label>Quantidade<input type="number" value={qtd} onChange={e=>setQtd(e.target.value)}/></label><label>Observação<input value={obs} onChange={e=>setObs(e.target.value)}/></label><button onClick={entrada}><Plus/> Registrar entrada</button></div><table><thead><tr><th>Data</th><th>Tipo</th><th>Produto</th><th>Qtd</th><th>Origem</th><th>Usuário</th></tr></thead><tbody>{data.movimento.map(m=><tr key={m.id}><td>{new Date(m.created_at).toLocaleString('pt-BR')}</td><td>{m.tipo}</td><td>{m.descricao}</td><td>{m.quantidade}</td><td>{m.origem}</td><td>{m.usuario_nome}</td></tr>)}</tbody></table></div> }

function Relatorios({ data }) { const total=data.vendas.reduce((s,v)=>s+Number(v.total),0); const custo=data.movimento.filter(m=>m.tipo==='saida').reduce((s,m)=>{ const p=data.produtos.find(p=>p.id===m.produto_id); return s+Number(m.quantidade||0)*Number(p?.preco_custo||0);},0); const lucro=total-custo; const estoqueBaixo=data.produtos.filter(p=>Number(p.estoque)<=Number(p.estoque_minimo||0)); const porPag=data.vendas.reduce((a,v)=>{a[v.forma_pagamento]=(a[v.forma_pagamento]||0)+Number(v.total); return a;},{}); return <div className="window-panel full"><header className="panel-title">📊 Relatórios completos</header><div className="kpis"><div><span>Vendas</span><b>{data.vendas.length}</b></div><div><span>Faturamento</span><b>{money(total)}</b></div><div><span>Lucro estimado</span><b>{money(lucro)}</b></div><div><span>Produtos</span><b>{data.produtos.length}</b></div><div><span>Clientes</span><b>{data.clientes.length}</b></div><div><span>Estoque baixo</span><b>{estoqueBaixo.length}</b></div></div><h3>Vendas por pagamento</h3><table><tbody>{Object.entries(porPag).map(([k,v])=><tr key={k}><td>{k}</td><td>{money(v)}</td></tr>)}</tbody></table><h3>Estoque baixo</h3><table><tbody>{estoqueBaixo.map(p=><tr key={p.id}><td>{p.descricao}</td><td>{p.estoque}</td><td>Mínimo {p.estoque_minimo}</td></tr>)}</tbody></table></div> }

function Configuracoes({ config, usuarios, reload }) { const [form,setForm]=useState(config||{}); useEffect(()=>setForm(config||{}),[config]); async function save(){ await upsertRow('configuracoes', form); await reload(); alert('Configurações salvas no Supabase.'); } return <div className="window-panel full"><header className="panel-title">⚙️ Configurações</header><div className="form-grid">{['empresa','cnpj','telefone','email','endereco','cidade','chave_pix'].map(f=><label key={f}>{labelOf(f)}<input value={form[f]||''} onChange={e=>setForm({...form,[f]:e.target.value})}/></label>)}<label>Vendedor pode mexer no estoque<select value={String(form.permitir_vendedor_estoque||false)} onChange={e=>setForm({...form,permitir_vendedor_estoque:e.target.value==='true'})}><option value="false">Não</option><option value="true">Sim</option></select></label><button onClick={save}><Save/> Salvar configurações</button></div><h3>Usuários</h3><table><tbody>{usuarios.map(u=><tr key={u.id}><td>{u.nome}</td><td>{u.usuario}</td><td>{u.perfil}</td></tr>)}</tbody></table></div> }

createRoot(document.getElementById('root')).render(<App />);
