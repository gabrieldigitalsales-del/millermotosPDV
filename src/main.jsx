import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QRCodeCanvas } from 'qrcode.react';
import {
  BadgeDollarSign,
  Bike,
  Boxes,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Database,
  DoorOpen,
  Download,
  FileBarChart,
  FileText,
  HandCoins,
  HelpCircle,
  Mail,
  Package,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Save,
  Search,
  Settings,
  ShoppingCart,
  Trash2,
  Truck,
  Upload,
  UserCog,
  Users,
  Wrench,
} from 'lucide-react';
import './styles.css';

const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const normalizeText = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const searchableText = (...values) => normalizeText(values.join(' '));
const onlyNumber = (v) => Number(String(v || '0').replace(',', '.')) || 0;
const todayISO = () => new Date().toISOString();
const saleCode = () => 'V' + Date.now().toString().slice(-8);

const defaultConfig = {
  nomeFantasia: 'MILLER MOTOS',
  razaoSocial: 'MILLER MOTOS PEÇAS E SERVIÇOS',
  cnpj: '00.000.000/0001-00',
  email: 'contato@millermotos.com',
  telefone: '(00) 00000-0000',
  endereco: 'Rua Principal, 100 - Centro',
  cidade: 'SETE LAGOAS - MG',
  chavePix: 'contato@millermotos.com',
  mensagemCupom: 'Obrigado pela preferência. Volte sempre!',
};

const defaultClients = [
  { id: 'C0001', nome: 'Cliente Balcão', documento: '', telefone: '', email: '', endereco: '', cidade: 'SETE LAGOAS', obs: 'Cliente padrão para vendas rápidas.' },
  { id: 'C0002', nome: 'João da Silva', documento: '000.000.000-00', telefone: '(31) 99999-0000', email: 'joao@email.com', endereco: 'Rua A, 10', cidade: 'SETE LAGOAS', obs: '' },
];

const defaultProducts = [
  { id: 'P0001', codigo: '111114', nome: 'Óleo 20W50 1L', categoria: 'Lubrificantes', custo: 24, preco: 35, estoque: 12, minimo: 3, unidade: 'UN' },
  { id: 'P0002', codigo: '222200', nome: 'Kit Relação 125cc', categoria: 'Transmissão', custo: 140, preco: 185, estoque: 3, minimo: 2, unidade: 'UN' },
  { id: 'P0003', codigo: '333310', nome: 'Pastilha de Freio', categoria: 'Freios', custo: 29, preco: 45, estoque: 10, minimo: 4, unidade: 'JG' },
  { id: 'P0004', codigo: '444120', nome: 'Cabo de Embreagem', categoria: 'Cabos', custo: 18, preco: 32, estoque: 6, minimo: 2, unidade: 'UN' },
];

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

function App() {
  const [screen, setScreen] = useState('pdv');
  const [openMenu, setOpenMenu] = useState(null);
  const [config, setConfig] = useLocalStorage('miller_config', defaultConfig);
  const [clients, setClients] = useLocalStorage('miller_clients', defaultClients);
  const [products, setProducts] = useLocalStorage('miller_products', defaultProducts);
  const [sales, setSales] = useLocalStorage('miller_sales', []);

  const menu = {
    CADASTROS: [
      { label: '👥 Cadastro de Clientes', screen: 'clientes' },
      { label: '📦 Cadastro de Produtos / Peças', screen: 'produtos' },
      { label: '🚚 Cadastro de Fornecedores', screen: 'fornecedores' },
      { label: '🧑‍🔧 Funcionários e Mecânicos', screen: 'funcionarios' },
    ],
    'VENDA BALCÃO': [
      { label: '🛒 Abrir PDV / Venda Balcão', screen: 'pdv' },
      { label: '🧾 Histórico de Vendas', screen: 'vendas' },
      { label: '💳 Pix / QR Code', screen: 'pix' },
    ],
    ESTOQUE: [
      { label: '📦 Produtos e Estoque', screen: 'produtos' },
      { label: '⚠️ Produtos com Estoque Baixo', screen: 'estoque' },
    ],
    FINANCEIRO: [
      { label: '💰 Resumo Financeiro', screen: 'financeiro' },
      { label: '📊 Relatórios', screen: 'relatorios' },
    ],
    FERRAMENTAS: [
      { label: '⚙️ Configurações da Empresa', screen: 'config' },
      { label: '💾 Backup e Restauração', screen: 'backup' },
    ],
    AJUDA: [
      { label: '🆘 Como usar o sistema', screen: 'ajuda' },
    ],
  };

  const shortcuts = [
    ['🛒', 'PDV Balcão', ShoppingCart, 'pdv'],
    ['👥', 'Clientes', Users, 'clientes'],
    ['📦', 'Produtos', Package, 'produtos'],
    ['🧾', 'Vendas', Receipt, 'vendas'],
    ['💳', 'Pix QR', CreditCard, 'pix'],
    ['💰', 'Financeiro', BadgeDollarSign, 'financeiro'],
    ['📊', 'Relatórios', FileBarChart, 'relatorios'],
    ['⚙️', 'Config.', Settings, 'config'],
    ['💾', 'Backup', Database, 'backup'],
  ];

  return (
    <div className="app-shell">
      <div className="titlebar">
        <span className="brand-icon">🏍️</span>
        Programa Oficina Mecânica + PDV + Estoque + Financeiro - Licenciado para {config.nomeFantasia}
        <span className="window-buttons">— □ ×</span>
      </div>

      <nav className="menu-bar">
        {Object.keys(menu).map((m) => (
          <button key={m} onClick={() => setOpenMenu(openMenu === m ? null : m)} className={openMenu === m ? 'active' : ''}>{m}</button>
        ))}
      </nav>

      <div className="toolbar">
        {shortcuts.map(([emoji, label, Icon, target]) => (
          <button key={label} className="shortcut" onClick={() => { setScreen(target); setOpenMenu(null); }}>
            <div className="shortcut-emoji">{emoji}</div>
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {openMenu && (
        <div className="dropdown">
          {menu[openMenu].map((item) => (
            <button key={item.label} onClick={() => { setScreen(item.screen); setOpenMenu(null); }}><FileText size={18} /> {item.label}</button>
          ))}
        </div>
      )}

      <main className="workspace">
        {screen === 'pdv' && <PDV config={config} clients={clients} products={products} setProducts={setProducts} sales={sales} setSales={setSales} />}
        {screen === 'clientes' && <Clients clients={clients} setClients={setClients} />}
        {screen === 'produtos' && <Products products={products} setProducts={setProducts} />}
        {screen === 'vendas' && <SalesHistory sales={sales} config={config} />}
        {screen === 'pix' && <Pix config={config} setConfig={setConfig} />}
        {screen === 'financeiro' && <Finance sales={sales} products={products} />}
        {screen === 'relatorios' && <Reports sales={sales} products={products} clients={clients} />}
        {screen === 'config' && <SettingsScreen config={config} setConfig={setConfig} />}
        {screen === 'backup' && <Backup config={config} clients={clients} products={products} sales={sales} setConfig={setConfig} setClients={setClients} setProducts={setProducts} setSales={setSales} />}
        {screen === 'estoque' && <LowStock products={products} />}
        {screen === 'fornecedores' && <SimplePanel title="🚚 Fornecedores" icon={<Truck />} />}
        {screen === 'funcionarios' && <SimplePanel title="🧑‍🔧 Funcionários e Mecânicos" icon={<UserCog />} />}
        {screen === 'ajuda' && <Help />}
      </main>

      <footer className="statusbar">
        <span>{config.cidade}</span>
        <span>{new Date().toLocaleDateString('pt-BR')}</span>
        <span>Usuário: ADMIN</span>
        <span className="pc">PC PDV</span>
        <span>{config.nomeFantasia}</span>
      </footer>
    </div>
  );
}

function PDV({ config, clients, products, setProducts, sales, setSales }) {
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState('Dinheiro');
  const [discount, setDiscount] = useState(0);
  const [lastSale, setLastSale] = useState(null);
  const receiptRef = useRef(null);

  const searchTerm = normalizeText(search);
  const filtered = products
    .filter(p => !searchTerm || searchableText(p.codigo, p.nome, p.categoria).includes(searchTerm))
    .sort((a, b) => {
      const aName = normalizeText(a.nome);
      const bName = normalizeText(b.nome);
      const aStarts = aName.startsWith(searchTerm) ? 0 : 1;
      const bStarts = bName.startsWith(searchTerm) ? 0 : 1;
      return aStarts - bStarts || aName.localeCompare(bName);
    })
    .slice(0, 12);
  const subtotal = cart.reduce((sum, i) => sum + i.preco * i.qtd, 0);
  const total = Math.max(0, subtotal - onlyNumber(discount));
  const selectedClient = clients.find(c => c.id === clientId) || clients[0];
  const pixText = `PIX ${config.nomeFantasia}\nChave: ${config.chavePix}\nValor: ${money(total)}`;

  function addProduct(product) {
    if (product.estoque <= 0) return alert('Produto sem estoque.');
    setCart(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) return prev.map(i => i.id === product.id ? { ...i, qtd: Math.min(i.qtd + 1, product.estoque) } : i);
      return [...prev, { ...product, qtd: 1 }];
    });
    setSearch('');
  }

  function changeQty(id, qtd) {
    const stock = products.find(p => p.id === id)?.estoque || 0;
    setCart(prev => prev.map(i => i.id === id ? { ...i, qtd: Math.max(1, Math.min(stock, Number(qtd) || 1)) } : i));
  }

  function finishSale() {
    if (!cart.length) return alert('Adicione produtos ao carrinho.');
    const sale = {
      id: saleCode(),
      data: todayISO(),
      cliente: selectedClient?.nome || 'Cliente Balcão',
      clienteId: selectedClient?.id,
      items: cart,
      subtotal,
      desconto: onlyNumber(discount),
      total,
      pagamento: payment,
    };
    setSales([sale, ...sales]);
    setProducts(products.map(p => {
      const sold = cart.find(i => i.id === p.id);
      return sold ? { ...p, estoque: Math.max(0, p.estoque - sold.qtd) } : p;
    }));
    setLastSale(sale);
    setCart([]);
    setDiscount(0);
    setTimeout(() => window.print(), 200);
  }

  return (
    <div className="pdv-grid">
      <section className="window-panel pdv-main">
        <header className="panel-title">🛒 VENDA BALCÃO - PDV MILLER MOTOS</header>
        <div className="pdv-top">
          <label>Cliente
            <select value={clientId} onChange={e => setClientId(e.target.value)}>{clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
          </label>
          <label>Pesquisar peça por código, nome ou categoria
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Ex.: O, Ol, oleo, Óleo, pastilha, 111114" />
          </label>
        </div>

        {search && <div className="search-results">{filtered.map(p => (
          <button key={p.id} onClick={() => addProduct(p)}><span>📦 {p.codigo}</span><strong>{p.nome}</strong><span>{money(p.preco)}</span><span>Est: {p.estoque}</span></button>
        ))}</div>}

        <table className="data-table">
          <thead><tr><th>Produto</th><th>Qtd</th><th>Unit.</th><th>Total</th><th></th></tr></thead>
          <tbody>
            {cart.map(item => <tr key={item.id}><td>{item.codigo} - {item.nome}</td><td><input className="qty" type="number" value={item.qtd} onChange={e => changeQty(item.id, e.target.value)} /></td><td>{money(item.preco)}</td><td>{money(item.preco * item.qtd)}</td><td><button className="mini-danger" onClick={() => setCart(cart.filter(i => i.id !== item.id))}>X</button></td></tr>)}
            {!cart.length && <tr><td colSpan="5" className="empty">Nenhum produto no carrinho.</td></tr>}
          </tbody>
        </table>

        <div className="pdv-bottom">
          <label>Pagamento<select value={payment} onChange={e => setPayment(e.target.value)}><option>Dinheiro</option><option>Pix</option><option>Cartão Débito</option><option>Cartão Crédito</option><option>Fiado / Conta Cliente</option></select></label>
          <label>Desconto R$<input value={discount} onChange={e => setDiscount(e.target.value)} /></label>
          <button className="big green" onClick={finishSale}><Receipt /> Finalizar e Imprimir Cupom</button>
          <button className="big" onClick={() => setCart([])}><Trash2 /> Limpar Venda</button>
        </div>
      </section>

      <aside className="window-panel pdv-side">
        <header className="panel-title">💳 Resumo / Pix</header>
        <div className="total-box">
          <span>Subtotal</span><strong>{money(subtotal)}</strong>
          <span>Desconto</span><strong>{money(onlyNumber(discount))}</strong>
          <span>Total</span><strong className="total-value">{money(total)}</strong>
        </div>
        <div className="qr-box"><QRCodeCanvas value={pixText} size={180} /><small>Chave Pix: {config.chavePix}</small></div>
      </aside>

      <div className="print-receipt" ref={receiptRef}>{lastSale && <ReceiptPrint sale={lastSale} config={config} />}</div>
    </div>
  );
}

function ReceiptPrint({ sale, config }) {
  return <div className="receipt-paper">
    <h2>{config.nomeFantasia}</h2>
    <p>{config.razaoSocial}</p><p>CNPJ: {config.cnpj}</p><p>{config.endereco}</p><p>{config.telefone} - {config.email}</p>
    <hr /><p>CUPOM NÃO FISCAL: {sale.id}</p><p>Data: {new Date(sale.data).toLocaleString('pt-BR')}</p><p>Cliente: {sale.cliente}</p><hr />
    {sale.items.map(i => <p key={i.id}>{i.qtd}x {i.nome}<br />{money(i.preco)} un. = {money(i.preco * i.qtd)}</p>)}
    <hr /><p>Subtotal: {money(sale.subtotal)}</p><p>Desconto: {money(sale.desconto)}</p><h3>Total: {money(sale.total)}</h3><p>Pagamento: {sale.pagamento}</p>
    {sale.pagamento === 'Pix' && <><p>PIX: {config.chavePix}</p><QRCodeCanvas value={`PIX ${config.chavePix} ${sale.total}`} size={120} /></>}
    <hr /><p>{config.mensagemCupom}</p>
  </div>;
}

function Clients({ clients, setClients }) {
  const blank = { id: '', nome: '', documento: '', telefone: '', email: '', endereco: '', cidade: 'SETE LAGOAS', obs: '' };
  const [form, setForm] = useState(blank);
  const [q, setQ] = useState('');
  const query = normalizeText(q);
  const list = clients.filter(c => !query || searchableText(c.id, c.nome, c.documento, c.telefone, c.email, c.endereco, c.cidade, c.obs).includes(query));
  const save = () => {
    if (!form.nome.trim()) return alert('Informe o nome do cliente.');
    if (form.id) setClients(clients.map(c => c.id === form.id ? form : c));
    else setClients([{ ...form, id: 'C' + String(Date.now()).slice(-5) }, ...clients]);
    setForm(blank);
  };
  return <CrudPanel title="👥 Cadastro de Clientes" q={q} setQ={setQ} onNew={() => setForm(blank)} onSave={save}>
    <div className="split">
      <div className="list-box">{list.map(c => <div key={c.id} onClick={() => setForm(c)}>👤 {c.id} - {c.nome}<br /><small>{c.telefone} {c.documento}</small></div>)}</div>
      <div className="grid-form two">
        {['nome','documento','telefone','email','endereco','cidade'].map(f => <label key={f}>{f.toUpperCase()}<input value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} /></label>)}
        <label className="wide">OBS<textarea value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })} /></label>
        <div className="side-actions wide"><button onClick={save}><Save /> Salvar</button><button onClick={() => form.id && setClients(clients.filter(c => c.id !== form.id))}><Trash2 /> Excluir</button></div>
      </div>
    </div>
  </CrudPanel>;
}

function Products({ products, setProducts }) {
  const blank = { id: '', codigo: '', nome: '', categoria: '', custo: 0, preco: 0, estoque: 0, minimo: 0, unidade: 'UN' };
  const [form, setForm] = useState(blank);
  const [q, setQ] = useState('');
  const query = normalizeText(q);
  const list = products.filter(p => !query || searchableText(p.id, p.codigo, p.nome, p.categoria, p.unidade).includes(query));
  const save = () => {
    if (!form.nome.trim()) return alert('Informe o nome do produto.');
    const payload = { ...form, custo: onlyNumber(form.custo), preco: onlyNumber(form.preco), estoque: onlyNumber(form.estoque), minimo: onlyNumber(form.minimo) };
    if (form.id) setProducts(products.map(p => p.id === form.id ? payload : p));
    else setProducts([{ ...payload, id: 'P' + String(Date.now()).slice(-5), codigo: form.codigo || String(Date.now()).slice(-6) }, ...products]);
    setForm(blank);
  };
  return <CrudPanel title="📦 Produtos / Peças / Estoque" q={q} setQ={setQ} onNew={() => setForm(blank)} onSave={save}>
    <div className="split products-split">
      <table className="data-table"><thead><tr><th>Código</th><th>Produto</th><th>Preço</th><th>Estoque</th></tr></thead><tbody>{list.map(p => <tr key={p.id} onClick={() => setForm(p)} className={p.estoque <= p.minimo ? 'zero' : ''}><td>{p.codigo}</td><td>{p.nome}</td><td>{money(p.preco)}</td><td>{p.estoque}</td></tr>)}</tbody></table>
      <div className="grid-form two">
        {['codigo','nome','categoria','unidade','custo','preco','estoque','minimo'].map(f => <label key={f}>{f.toUpperCase()}<input value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} /></label>)}
        <div className="side-actions wide"><button onClick={save}><Save /> Salvar Produto</button><button onClick={() => form.id && setProducts(products.filter(p => p.id !== form.id))}><Trash2 /> Excluir</button></div>
      </div>
    </div>
  </CrudPanel>;
}

function CrudPanel({ title, q, setQ, onNew, onSave, children }) {
  return <div className="window-panel full"><header className="panel-title">{title}</header><div className="crud-toolbar"><label>Pesquisar<input value={q} onChange={e => setQ(e.target.value)} /></label><button onClick={onNew}><Plus /> Novo</button><button onClick={onSave}><Save /> Salvar</button><button onClick={() => window.print()}><Printer /> Imprimir</button></div>{children}</div>;
}

function SalesHistory({ sales, config }) {
  const [selected, setSelected] = useState(null);
  return <div className="window-panel full"><header className="panel-title">🧾 Histórico de Vendas</header><table className="data-table"><thead><tr><th>Nº</th><th>Data</th><th>Cliente</th><th>Pagamento</th><th>Total</th><th>Ação</th></tr></thead><tbody>{sales.map(s => <tr key={s.id}><td>{s.id}</td><td>{new Date(s.data).toLocaleString('pt-BR')}</td><td>{s.cliente}</td><td>{s.pagamento}</td><td>{money(s.total)}</td><td><button onClick={() => { setSelected(s); setTimeout(() => window.print(), 100); }}>Imprimir</button></td></tr>)}</tbody></table><div className="print-receipt">{selected && <ReceiptPrint sale={selected} config={config} />}</div></div>;
}

function Pix({ config, setConfig }) {
  const [valor, setValor] = useState('0');
  const text = `PIX ${config.nomeFantasia}\nChave: ${config.chavePix}\nValor: ${money(onlyNumber(valor))}`;
  return <div className="window-panel mid"><header className="panel-title">💳 Pix / QR Code</header><div className="pix-screen"><div className="qr-box big"><QRCodeCanvas value={text} size={240} /></div><div className="grid-form two"><label>Valor<input value={valor} onChange={e => setValor(e.target.value)} /></label><label>Chave Pix<input value={config.chavePix} onChange={e => setConfig({ ...config, chavePix: e.target.value })} /></label><p className="wide">Esse QR Code muda quando você altera a chave Pix ou o valor.</p></div></div></div>;
}

function SettingsScreen({ config, setConfig }) {
  const fields = ['nomeFantasia','razaoSocial','cnpj','email','telefone','endereco','cidade','chavePix','mensagemCupom'];
  return <div className="window-panel mid"><header className="panel-title">⚙️ Configurações da Empresa</header><div className="grid-form two padded">{fields.map(f => <label key={f}>{f}<input value={config[f]} onChange={e => setConfig({ ...config, [f]: e.target.value })} /></label>)}<button className="wide" onClick={() => alert('Configurações salvas automaticamente.') }><Save /> Salvar Configurações</button></div></div>;
}

function Finance({ sales, products }) {
  const total = sales.reduce((s, v) => s + v.total, 0);
  const lucro = sales.reduce((s, v) => s + v.items.reduce((a, i) => a + (i.preco - (i.custo || 0)) * i.qtd, 0), 0);
  const estoque = products.reduce((s, p) => s + p.preco * p.estoque, 0);
  return <div className="window-panel mid"><header className="panel-title">💰 Resumo Financeiro</header><div className="kpi-grid"><Kpi label="Total vendido" value={money(total)} /><Kpi label="Lucro estimado" value={money(lucro)} /><Kpi label="Vendas realizadas" value={sales.length} /><Kpi label="Valor em estoque" value={money(estoque)} /></div></div>;
}
function Reports({ sales, products, clients }) { return <div className="window-panel mid"><header className="panel-title">📊 Relatórios</header><div className="kpi-grid"><Kpi label="Clientes" value={clients.length} /><Kpi label="Produtos" value={products.length} /><Kpi label="Vendas" value={sales.length} /><Kpi label="Estoque baixo" value={products.filter(p => p.estoque <= p.minimo).length} /></div></div>; }
function LowStock({ products }) { return <div className="window-panel full"><header className="panel-title">⚠️ Estoque Baixo</header><table className="data-table"><thead><tr><th>Código</th><th>Produto</th><th>Estoque</th><th>Mínimo</th></tr></thead><tbody>{products.filter(p => p.estoque <= p.minimo).map(p => <tr className="zero" key={p.id}><td>{p.codigo}</td><td>{p.nome}</td><td>{p.estoque}</td><td>{p.minimo}</td></tr>)}</tbody></table></div>; }
function Kpi({ label, value }) { return <div className="kpi"><span>{label}</span><strong>{value}</strong></div>; }

function Backup({ config, clients, products, sales, setConfig, setClients, setProducts, setSales }) {
  const fileRef = useRef(null);
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ config, clients, products, sales }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'backup-miller-motos.json'; a.click();
  };
  const importData = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const data = JSON.parse(reader.result); setConfig(data.config || defaultConfig); setClients(data.clients || defaultClients); setProducts(data.products || defaultProducts); setSales(data.sales || []); alert('Backup restaurado.'); };
    reader.readAsText(file);
  };
  return <div className="window-panel mid"><header className="panel-title">💾 Backup e Restauração</header><div className="finance-grid"><button onClick={exportData}><Download /> Baixar Backup JSON</button><button onClick={() => fileRef.current.click()}><Upload /> Restaurar Backup</button><button onClick={() => { if(confirm('Restaurar dados de demonstração?')) { setConfig(defaultConfig); setClients(defaultClients); setProducts(defaultProducts); setSales([]); } }}><Database /> Restaurar Demonstração</button></div><input ref={fileRef} type="file" accept="application/json" hidden onChange={importData} /></div>;
}
function SimplePanel({ title, icon }) { return <div className="window-panel mid center"><div className="generic-icon">{icon}</div><h2>{title}</h2><p>Área reservada para evolução do sistema.</p></div>; }
function Help() { return <div className="window-panel mid"><header className="panel-title">🆘 Como usar</header><div className="help"><p><strong>1.</strong> Cadastre produtos com preço e estoque.</p><p><strong>2.</strong> Cadastre clientes ou use Cliente Balcão.</p><p><strong>3.</strong> Abra PDV Balcão, pesquise a peça, adicione ao carrinho e finalize.</p><p><strong>4.</strong> Para Pix, configure a chave em Configurações. O QR Code aparece no PDV e no cupom.</p><p><strong>5.</strong> Faça backup em JSON no menu Backup.</p></div></div>; }

createRoot(document.getElementById('root')).render(<App />);
