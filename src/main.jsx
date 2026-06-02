import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QRCodeCanvas } from 'qrcode.react';
import {
  BadgeDollarSign,
  CalendarDays,
  CreditCard,
  Database,
  DoorOpen,
  Download,
  FileBarChart,
  FileText,
  HandCoins,
  HelpCircle,
  Lock,
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
} from 'lucide-react';
import './styles.css';
import { isSupabaseConfigured } from './lib/supabaseClient';
import { loadAllSupabase, saveResource } from './lib/supabaseRepository';

const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const normalizeText = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const searchableText = (...values) => normalizeText(values.join(' '));
const onlyNumber = (v) => Number(String(v || '0').replace(',', '.')) || 0;
const todayISO = () => new Date().toISOString();
const code = (prefix) => prefix + Date.now().toString().slice(-7);
const looksUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
const cleanDisplay = (value, fallback = '') => {
  const text = String(value ?? '').trim();
  if (!text) return fallback;
  return text.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*-\s*/i, '').trim() || fallback;
};
const saleNumber = (sale) => {
  const numero = cleanDisplay(sale?.numero || '', '');
  if (numero && !looksUuid(numero)) return numero;
  const id = cleanDisplay(sale?.id || '', '');
  if (id && !looksUuid(id)) return id;
  return 'VENDA';
};
const isSaleCanceled = (sale) => ['CANCELADA', 'CANCELADO', 'EXCLUIDA', 'EXCLUÍDA'].includes(String(sale?.status || '').toUpperCase()) || sale?.cancelada === true;

const defaultPermissionsByProfile = (perfil) => ({
  podeVender: ['administrador', 'financeiro', 'vendedor'].includes(perfil),
  podeClientes: ['administrador', 'financeiro', 'vendedor'].includes(perfil),
  podeEstoque: perfil === 'administrador',
  podeProdutos: perfil === 'administrador',
  podeFinanceiro: ['administrador', 'financeiro'].includes(perfil),
  podeConfiguracoes: perfil === 'administrador',
  podeBackup: perfil === 'administrador',
  podeRelatorios: ['administrador', 'financeiro'].includes(perfil),
  podeFornecedores: perfil === 'administrador',
  podeVendedores: perfil === 'administrador',
  podeHistoricoVendas: ['administrador', 'financeiro'].includes(perfil),
  podePix: ['administrador', 'financeiro'].includes(perfil),
});
const permissionValue = (user, key, fallback) => user?.[key] === undefined || user?.[key] === null ? fallback : Boolean(user[key]);
const blankPaymentLine = (meio = 'Dinheiro', valor = '') => ({ id: code('PG-'), meio, valor });
const paymentLabel = (payments, fallback = 'Dinheiro') => {
  const list = Array.isArray(payments) ? payments.filter(p => onlyNumber(p.valor) > 0) : [];
  if (!list.length) return fallback;
  return list.map(p => `${p.meio}: ${money(p.valor)}`).join(' + ');
};
const removeAccents = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const pixSanitize = (value, max = 99) => removeAccents(value).replace(/[^A-Za-z0-9 $%*+\-./:]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase().slice(0, max);
const tlv = (id, value) => {
  const text = String(value ?? '');
  return `${id}${String(text.length).padStart(2, '0')}${text}`;
};
const crc16Pix = (payload) => {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
    crc &= 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};
const pixKeyTypeHint = (key) => {
  const value = String(key || '').trim();
  if (!value) return 'Informe uma chave Pix.';
  if (/^\+55\d{10,11}$/.test(value)) return '';
  if (/^\d{11}$/.test(value)) return '';
  if (/^\d{14}$/.test(value)) return '';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return '';
  return 'A chave Pix deve ser CPF, CNPJ, e-mail, UUID ou telefone com +55 e DDD. Ex.: +5531999999999.';
};
const buildPixPayload = ({ config, total = 0, saleNumberText = '', cliente = '' }) => {
  const key = String(config?.chavePix || '').trim();
  if (!key) return '';
  const amount = Number(total || 0);
  const merchantName = pixSanitize(config?.nomeFantasia || config?.razaoSocial || 'MILLER MOTOS', 25) || 'MILLER MOTOS';
  const merchantCity = pixSanitize((config?.cidade || config?.endereco || 'SETE LAGOAS').split('-')[0], 15) || 'SETE LAGOAS';
  const txidBase = saleNumberText || cliente || 'PDV';
  const txid = pixSanitize(txidBase, 25).replace(/\s/g, '') || 'PDV';
  const merchantAccountInfo = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', key);
  const additionalData = tlv('05', txid);
  const parts = [
    tlv('00', '01'),
    tlv('01', '12'),
    tlv('26', merchantAccountInfo),
    tlv('52', '0000'),
    tlv('53', '986'),
    amount > 0 ? tlv('54', amount.toFixed(2)) : '',
    tlv('58', 'BR'),
    tlv('59', merchantName),
    tlv('60', merchantCity),
    tlv('62', additionalData),
  ].filter(Boolean).join('');
  const withoutCrc = parts + '6304';
  return withoutCrc + crc16Pix(withoutCrc);
};
const pixPayload = buildPixPayload;

const defaultConfig = {
  nomeFantasia: 'MILLER MOTOS',
  razaoSocial: 'MILLER MOTOS PEÇAS E SERVIÇOS',
  cnpj: '00.000.000/0001-00',
  email: 'contato@millermotos.com',
  telefone: '(31) 00000-0000',
  endereco: 'Rua Principal, 100 - Centro',
  cidade: 'SETE LAGOAS - MG',
  chavePix: 'contato@millermotos.com',
  mensagemCupom: 'Obrigado pela preferência. Volte sempre!',
  permitirVendedorEstoque: false,
  usuarios: [
    { id: 'U003', nome: 'Vendedor', login: 'vendedor', senha: 'venda123', perfil: 'vendedor', ativo: true },
    { id: 'U001', nome: 'Administrador', login: 'admin', senha: 'admin123', perfil: 'administrador', ativo: true },
    { id: 'U002', nome: 'Financeiro', login: 'financeiro', senha: 'fin123', perfil: 'financeiro', ativo: true },
  ],
};

const defaultClients = [
  { id: 'C0001', nome: 'Cliente Balcão', documento: '', telefone: '', email: '', endereco: '', cidade: 'SETE LAGOAS', obs: 'Cliente padrão para vendas rápidas.' },
  { id: 'C0002', nome: 'João da Silva', documento: '000.000.000-00', telefone: '(31) 99999-0000', email: 'joao@email.com', endereco: 'Rua A, 10', cidade: 'SETE LAGOAS', obs: '' },
];
const defaultSuppliers = [
  { id: 'F0001', nome: 'Distribuidora Minas Motos', cnpj: '11.111.111/0001-11', telefone: '(31) 3333-1111', email: 'vendas@minasmotos.com', cidade: 'BELO HORIZONTE', obs: 'Peças em geral' },
  { id: 'F0002', nome: 'Lubrasil Atacado', cnpj: '22.222.222/0001-22', telefone: '(31) 3333-2222', email: 'contato@lubrasil.com', cidade: 'SETE LAGOAS', obs: 'Lubrificantes' },
];
const defaultVendors = [
  { id: 'V0001', nome: 'Balcão', telefone: '', email: '', comissao: 0, ativo: true },
  { id: 'V0002', nome: 'Carlos Vendedor', telefone: '(31) 99911-2233', email: 'carlos@email.com', comissao: 2, ativo: true },
];
const defaultProducts = [
  { id: 'P0001', codigo: '111114', nome: 'Óleo 20W50 1L', categoria: 'Lubrificantes', fornecedorId: 'F0002', custo: 24, preco: 35, estoque: 12, minimo: 3, unidade: 'UN' },
  { id: 'P0002', codigo: '222200', nome: 'Kit Relação 125cc', categoria: 'Transmissão', fornecedorId: 'F0001', custo: 140, preco: 185, estoque: 3, minimo: 2, unidade: 'UN' },
  { id: 'P0003', codigo: '333310', nome: 'Pastilha de Freio', categoria: 'Freios', fornecedorId: 'F0001', custo: 29, preco: 45, estoque: 10, minimo: 4, unidade: 'JG' },
  { id: 'P0004', codigo: '444120', nome: 'Cabo de Embreagem', categoria: 'Cabos', fornecedorId: 'F0001', custo: 18, preco: 32, estoque: 6, minimo: 2, unidade: 'UN' },
];
const defaultMovements = [
  { id: 'M0001', data: todayISO(), tipo: 'ENTRADA', produtoId: 'P0001', produtoNome: 'Óleo 20W50 1L', qtd: 12, motivo: 'Estoque inicial', usuario: 'Administrador' },
  { id: 'M0002', data: todayISO(), tipo: 'ENTRADA', produtoId: 'P0002', produtoNome: 'Kit Relação 125cc', qtd: 3, motivo: 'Estoque inicial', usuario: 'Administrador' },
];

function SyncStatus({ loading, error }) {
  if (loading) {
    return <div className="loading-screen"><div className="window-panel mid center"><h2>🔄 Carregando dados do Supabase...</h2><p>Aguarde enquanto o PDV MILLER MOTOS sincroniza os dados.</p></div></div>;
  }
  if (error) {
    return <div className="loading-screen"><div className="window-panel mid center"><h2>⚠️ Supabase não conectado</h2><p>{error}</p><p>Configure as variáveis no Vercel: <code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code> e <code>VITE_MM_PROJECT_ID</code>.</p></div></div>;
  }
  return null;
}

function permissions(user, config) {
  const perfil = user?.perfil || 'vendedor';
  const defaults = defaultPermissionsByProfile(perfil);
  const canStock = permissionValue(user, 'podeEstoque', defaults.podeEstoque) || (perfil === 'vendedor' && config.permitirVendedorEstoque);
  const canProducts = permissionValue(user, 'podeProdutos', defaults.podeProdutos) || (perfil === 'vendedor' && config.permitirVendedorEstoque);
  return {
    canSell: permissionValue(user, 'podeVender', defaults.podeVender),
    canClients: permissionValue(user, 'podeClientes', defaults.podeClientes),
    canStock,
    canProducts,
    canFinance: permissionValue(user, 'podeFinanceiro', defaults.podeFinanceiro),
    canConfig: permissionValue(user, 'podeConfiguracoes', defaults.podeConfiguracoes),
    canBackup: permissionValue(user, 'podeBackup', defaults.podeBackup),
    canReports: permissionValue(user, 'podeRelatorios', defaults.podeRelatorios),
    canSuppliers: permissionValue(user, 'podeFornecedores', defaults.podeFornecedores),
    canVendors: permissionValue(user, 'podeVendedores', defaults.podeVendedores),
    canSalesHistory: permissionValue(user, 'podeHistoricoVendas', defaults.podeHistoricoVendas),
    canPix: permissionValue(user, 'podePix', defaults.podePix),
  };
}

function App() {
  const [screen, setScreen] = useState('pdv');
  const [openMenu, setOpenMenu] = useState(null);
  const [configRaw, setConfigRaw] = useState(defaultConfig);
  const [clientsRaw, setClientsRaw] = useState(defaultClients);
  const [suppliersRaw, setSuppliersRaw] = useState(defaultSuppliers);
  const [vendorsRaw, setVendorsRaw] = useState(defaultVendors);
  const [productsRaw, setProductsRaw] = useState(defaultProducts);
  const [salesRaw, setSalesRaw] = useState([]);
  const [movementsRaw, setMovementsRaw] = useState(defaultMovements);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const persistEnabledRef = useRef(false);

  useEffect(() => {
    let active = true;
    async function loadData() {
      if (!isSupabaseConfigured) {
        setDataError('Supabase não configurado. O sistema agora trabalha direto no Supabase para sincronizar entre dispositivos.');
        setDataLoading(false);
        return;
      }
      try {
        const data = await loadAllSupabase({
          config: defaultConfig,
          clients: defaultClients,
          suppliers: defaultSuppliers,
          vendors: defaultVendors,
          products: defaultProducts,
          sales: [],
          movements: defaultMovements,
        });
        if (!active) return;
        setConfigRaw(data.config);
        setClientsRaw(data.clients);
        setSuppliersRaw(data.suppliers);
        setVendorsRaw(data.vendors);
        setProductsRaw(data.products);
        setSalesRaw(data.sales);
        setMovementsRaw(data.movements);
        persistEnabledRef.current = true;
        setDataError('');
      } catch (error) {
        console.error(error);
        if (active) setDataError(error.message || 'Erro ao carregar dados do Supabase.');
      } finally {
        if (active) setDataLoading(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, []);

  function makeSyncedSetter(resource, rawSetter) {
    return (updater) => {
      rawSetter((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (persistEnabledRef.current) {
          saveResource(resource, next).catch((error) => {
            console.error(error);
            alert('Erro ao salvar no Supabase: ' + (error.message || error));
          });
        }
        return next;
      });
    };
  }

  const config = configRaw;
  const clients = clientsRaw;
  const suppliers = suppliersRaw;
  const vendors = vendorsRaw;
  const products = productsRaw;
  const sales = salesRaw;
  const movements = movementsRaw;
  const setConfig = makeSyncedSetter('config', setConfigRaw);
  const setClients = makeSyncedSetter('clients', setClientsRaw);
  const setSuppliers = makeSyncedSetter('suppliers', setSuppliersRaw);
  const setVendors = makeSyncedSetter('vendors', setVendorsRaw);
  const setProducts = makeSyncedSetter('products', setProductsRaw);
  const setSales = makeSyncedSetter('sales', setSalesRaw);
  const setMovements = makeSyncedSetter('movements', setMovementsRaw);
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('miller_current_user') || 'null'); } catch { return null; }
  });
  const perm = permissions(currentUser, config);

  if (dataLoading || dataError) return <SyncStatus loading={dataLoading} error={dataError} />;

  function login(user) { setCurrentUser(user); sessionStorage.setItem('miller_current_user', JSON.stringify(user)); }
  function logout() { setCurrentUser(null); sessionStorage.removeItem('miller_current_user'); }
  if (!currentUser) return <Login config={config} onLogin={login} />;

  function go(target) {
    const checks = {
      pdv: perm.canSell, clientes: perm.canClients, produtos: perm.canProducts, estoque: perm.canStock,
      fornecedores: perm.canSuppliers, vendedores: perm.canVendors, vendas: perm.canSalesHistory, pix: perm.canPix,
      financeiro: perm.canFinance, relatorios: perm.canReports, config: perm.canConfig, backup: perm.canBackup, movimentos: perm.canStock,
    };
    if (checks[target] === false) return alert('Acesso negado para este perfil. Entre com senha de administrador ou libere a permissão.');
    setScreen(target); setOpenMenu(null);
  }

  const menu = {
    CADASTROS: [
      { label: '👥 Cadastro de Clientes', screen: 'clientes' },
      { label: '📦 Cadastro de Produtos / Peças', screen: 'produtos' },
      { label: '🚚 Cadastro de Fornecedores', screen: 'fornecedores' },
      { label: '👨‍💼 Cadastro de Vendedores', screen: 'vendedores' },
    ],
    'VENDA BALCÃO': [
      { label: '🛒 Abrir PDV / Venda Balcão', screen: 'pdv' },
      { label: '🧾 Histórico de Vendas', screen: 'vendas' },
      { label: '💳 Pix / QR Code', screen: 'pix' },
    ],
    ESTOQUE: [
      { label: '📦 Produtos e Estoque', screen: 'produtos' },
      { label: '🔁 Relação Entrada/Saída', screen: 'movimentos' },
      { label: '⚠️ Produtos com Estoque Baixo', screen: 'estoque' },
    ],
    FINANCEIRO: [
      { label: '💰 Resumo Financeiro', screen: 'financeiro' },
      { label: '📊 Relatórios completos', screen: 'relatorios' },
    ],
    FERRAMENTAS: [
      { label: '🔁 Entrada/Saída de Estoque', screen: 'movimentos' },
      { label: '⚙️ Configurações da Empresa e Usuários', screen: 'config' },
      { label: '💾 Backup e Restauração', screen: 'backup' },
    ],
    AJUDA: [ { label: '🆘 Como usar o sistema', screen: 'ajuda' } ],
  };
  const shortcuts = [
    ['🛒','PDV Balcão',ShoppingCart,'pdv'], ['👥','Clientes',Users,'clientes'], ['📦','Produtos',Package,'produtos'],
    ['🚚','Fornec.',Truck,'fornecedores'], ['👨‍💼','Vendedores',UserCog,'vendedores'], ['🔁','Estoque',Database,'movimentos'],
    ['🧾','Vendas',Receipt,'vendas'], ['💰','Financeiro',BadgeDollarSign,'financeiro'], ['📊','Relatórios',FileBarChart,'relatorios'],
    ['⚙️','Config.',Settings,'config'], ['💾','Backup',Database,'backup'],
  ];
  const canOpen = (target) => ({
    pdv: perm.canSell, clientes: perm.canClients, produtos: perm.canProducts, estoque: perm.canStock,
    fornecedores: perm.canSuppliers, vendedores: perm.canVendors, vendas: perm.canSalesHistory, pix: perm.canPix,
    financeiro: perm.canFinance, relatorios: perm.canReports, config: perm.canConfig, backup: perm.canBackup, movimentos: perm.canStock, ajuda: true,
  }[target] !== false);

  return <div className="app-shell">
    <div className="titlebar"><span className="brand-icon">🏍️</span> Programa Oficina Mecânica + PDV + Estoque + Financeiro - Licenciado para {config.nomeFantasia}<span className="window-buttons">— □ ×</span></div>
    <nav className="menu-bar">{Object.keys(menu).map(m => <button key={m} onClick={() => setOpenMenu(openMenu === m ? null : m)} className={openMenu === m ? 'active' : ''}>{m}</button>)}</nav>
    <div className="toolbar">{shortcuts.filter(([, , , target]) => canOpen(target)).map(([emoji,label,Icon,target]) => <button key={label} className="shortcut" onClick={() => go(target)}><div className="shortcut-emoji">{emoji}</div><Icon size={22}/><span>{label}</span></button>)}</div>
    {openMenu && <div className="dropdown">{menu[openMenu].filter(item => canOpen(item.screen)).map(item => <button key={item.label} onClick={() => go(item.screen)}><FileText size={18}/> {item.label}</button>)}</div>}
    <main className="workspace">
      {screen === 'pdv' && <PDV currentUser={currentUser} config={config} clients={clients} products={products} setProducts={setProducts} sales={sales} setSales={setSales} vendors={vendors} movements={movements} setMovements={setMovements} />}
      {screen === 'clientes' && <Clients clients={clients} setClients={setClients} />}
      {screen === 'produtos' && <Products products={products} setProducts={setProducts} suppliers={suppliers} currentUser={currentUser} config={config} movements={movements} setMovements={setMovements} />}
      {screen === 'fornecedores' && <Suppliers suppliers={suppliers} setSuppliers={setSuppliers} />}
      {screen === 'vendedores' && <Vendors vendors={vendors} setVendors={setVendors} />}
      {screen === 'movimentos' && <StockMovements products={products} setProducts={setProducts} movements={movements} setMovements={setMovements} currentUser={currentUser} canEdit={perm.canStock} />}
      {screen === 'vendas' && <SalesHistory sales={sales} setSales={setSales} products={products} setProducts={setProducts} movements={movements} setMovements={setMovements} config={config} currentUser={currentUser} />}
      {screen === 'pix' && <Pix config={config} setConfig={setConfig} canEdit={perm.canConfig} />}
      {screen === 'financeiro' && <Finance sales={sales} products={products} />}
      {screen === 'relatorios' && <Reports sales={sales} products={products} clients={clients} vendors={vendors} suppliers={suppliers} movements={movements} />}
      {screen === 'estoque' && <LowStock products={products} />}
      {screen === 'config' && <SettingsScreen config={config} setConfig={setConfig} />}
      {screen === 'backup' && <Backup config={config} clients={clients} suppliers={suppliers} vendors={vendors} products={products} sales={sales} movements={movements} setConfig={setConfig} setClients={setClients} setSuppliers={setSuppliers} setVendors={setVendors} setProducts={setProducts} setSales={setSales} setMovements={setMovements} />}
      {screen === 'ajuda' && <Help />}
    </main>
    <footer className="statusbar"><span>{config.cidade}</span><span>{new Date().toLocaleDateString('pt-BR')}</span><span>Usuário: {currentUser.nome} ({currentUser.perfil})</span><button className="status-logout" onClick={logout}>Sair</button><span className="pc">PC PDV</span><span>Supabase direto</span><span>{config.nomeFantasia}</span></footer>
  </div>;
}

function Login({ config, onLogin }) {
  const [login, setLogin] = useState('vendedor');
  const [senha, setSenha] = useState('venda123');

  function submit(e) {
    e.preventDefault();
    const typedLogin = normalizeText(login);
    const typedSenha = String(senha).trim();

    const fixedUsers = defaultConfig.usuarios || [];
    const dbUsers = config.usuarios || [];

    // Primeiro valida os acessos padrao garantidos. Assim, mesmo que a tabela do Supabase
    // esteja com senha errada ou incompleta, o dono consegue entrar para corrigir.
    const guaranteedUser = fixedUsers.find((u) =>
      u.ativo !== false &&
      normalizeText(u.login) === typedLogin &&
      String(u.senha).trim() === typedSenha
    );
    if (guaranteedUser) {
      sessionStorage.removeItem('miller_current_user');
      onLogin(guaranteedUser);
      return;
    }

    const dbUser = dbUsers.find((u) =>
      u.ativo !== false &&
      normalizeText(u.login) === typedLogin &&
      String(u.senha || '').trim() === typedSenha
    );
    if (dbUser) {
      sessionStorage.removeItem('miller_current_user');
      onLogin(dbUser);
      return;
    }

    alert('Usuário ou senha incorretos. Use vendedor/venda123, admin/admin123 ou financeiro/fin123.');
  }

  return (
    <div className="app-shell login-shell">
      <div className="login-box window-panel">
        <header className="panel-title">🔐 Entrar no PDV {config.nomeFantasia}</header>

        <form onSubmit={submit} className="grid-form one padded">
          <label>
            Usuário
            <input
              value={login}
              onChange={e => setLogin(e.target.value)}
              autoFocus
              placeholder="Digite seu usuário"
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="Digite sua senha"
            />
          </label>

          <button className="big green">
            <Lock /> Entrar
          </button>

          <div className="login-welcome">
            <strong>Bem-vindo ao sistema {config.nomeFantasia}</strong>
            <br />
            Acesse com seu usuário e senha para iniciar as vendas, consultar produtos e gerenciar o atendimento.
          </div>
        </form>
      </div>
    </div>
  );
}

function PDV({ config, clients, products, setProducts, sales, setSales, vendors, movements, setMovements, currentUser }) {
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [vendorId, setVendorId] = useState(vendors[0]?.id || '');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [payments, setPayments] = useState([blankPaymentLine('Dinheiro', '')]);
  const [discount, setDiscount] = useState(0);
  const [lastSale, setLastSale] = useState(null);
  const searchTerm = normalizeText(search);
  const saleRank = useMemo(() => {
    const rank = {};
    sales.filter(sale => !isSaleCanceled(sale)).forEach(sale => (sale.items || []).forEach(item => {
      rank[item.id || item.produtoId] = (rank[item.id || item.produtoId] || 0) + Number(item.qtd || 0);
    }));
    movements.filter(m => m.tipo === 'SAÍDA').forEach(m => {
      rank[m.produtoId] = (rank[m.produtoId] || 0) + Number(m.qtd || 0);
    });
    return rank;
  }, [sales, movements]);
  const rankProducts = (list) => [...list].sort((a,b) => {
    const score = (saleRank[b.id] || 0) - (saleRank[a.id] || 0);
    if (score !== 0) return score;
    if ((b.estoque || 0) !== (a.estoque || 0)) return (b.estoque || 0) - (a.estoque || 0);
    return normalizeText(a.nome).localeCompare(normalizeText(b.nome));
  });
  const filtered = products
    .filter(p => !searchTerm || searchableText(p.codigo,p.nome,p.categoria).includes(searchTerm))
    .sort((a,b)=>{ const an=normalizeText(a.nome), bn=normalizeText(b.nome); return (an.startsWith(searchTerm)?0:1)-(bn.startsWith(searchTerm)?0:1) || an.localeCompare(bn);})
    .slice(0,18);
  const topProducts = rankProducts(products.filter(p => Number(p.estoque || 0) > 0)).slice(0,18);
  const displayProducts = searchTerm ? filtered : topProducts;
  const displayTitle = searchTerm ? '🔎 Resultado da pesquisa' : '⭐ Produtos mais vendidos';
  const subtotal = cart.reduce((sum,i)=>sum+i.preco*i.qtd,0);
  const total = Math.max(0, subtotal - onlyNumber(discount));
  const typedPaymentTotal = payments.reduce((sum,p)=>sum+onlyNumber(p.valor),0);
  const remainingPayment = Math.max(0, total - typedPaymentTotal);
  const selectedClient = clients.find(c=>c.id===clientId) || clients[0];
  const selectedVendor = vendors.find(v=>v.id===vendorId) || vendors[0];
  const pixTotal = payments.filter(p => p.meio === 'Pix').reduce((sum,p)=>sum+onlyNumber(p.valor),0) || (payments.some(p => p.meio === 'Pix') ? remainingPayment || total : total);
  const pixText = pixPayload({ config, total: pixTotal, cliente: selectedClient?.nome || 'Cliente Balcão' });

  function addProduct(p){
    if(p.estoque<=0) return alert('Produto sem estoque.');
    setCart(prev=>{
      const ex=prev.find(i=>i.id===p.id);
      if(ex) return prev.map(i=>i.id===p.id?{...i,qtd:Math.min(i.qtd+1,p.estoque)}:i);
      return [...prev,{...p,qtd:1}];
    });
    setSearch('');
  }
  function changeQty(id,qtd){
    const stock=products.find(p=>p.id===id)?.estoque||0;
    setCart(prev=>prev.map(i=>i.id===id?{...i,qtd:Math.max(1,Math.min(stock,Number(qtd)||1))}:i));
  }
  function updatePayment(id, field, value) {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  }
  function addPaymentLine() {
    setPayments(prev => [...prev, blankPaymentLine('Pix', remainingPayment ? String(remainingPayment.toFixed(2)).replace('.', ',') : '')]);
  }
  function removePaymentLine(id) {
    setPayments(prev => prev.length <= 1 ? prev : prev.filter(p => p.id !== id));
  }
  function normalizedPayments() {
    const filled = payments
      .map(p => ({ ...p, valor: onlyNumber(p.valor) }))
      .filter(p => p.meio && p.valor > 0);
    if (!filled.length) return [{ id: code('PG-'), meio: payments[0]?.meio || 'Dinheiro', valor: total }];
    if (Math.abs(filled.reduce((sum,p)=>sum+p.valor,0) - total) > 0.01) return null;
    return filled;
  }
  function finishSale(){
    if(!cart.length) return alert('Adicione produtos ao carrinho.');
    const paymentList = normalizedPayments();
    if (!paymentList) return alert(`A soma dos pagamentos precisa fechar exatamente ${money(total)}. Falta/sobra: ${money(Math.abs(total - typedPaymentTotal))}`);
    const numero=code('VD-');
    const pagamento = paymentLabel(paymentList, paymentList[0]?.meio || 'Dinheiro');
    const sale={id:numero,numero,data:todayISO(),cliente:selectedClient?.nome||'Cliente Balcão',clienteId:selectedClient?.id,vendedor:selectedVendor?.nome||currentUser.nome,vendedorId:selectedVendor?.id,usuario:currentUser.nome,items:cart,subtotal,desconto:onlyNumber(discount),total,pagamento,pagamentos:paymentList,status:'FINALIZADA'};
    setSales([sale,...sales]);
    setProducts(products.map(p=>{ const sold=cart.find(i=>i.id===p.id); return sold?{...p,estoque:Math.max(0,p.estoque-sold.qtd)}:p;}));
    const outs=cart.map(i=>({id:code('MOV'),data:todayISO(),tipo:'SAÍDA',produtoId:i.id,produtoNome:i.nome,qtd:i.qtd,motivo:`Venda ${saleNumber(sale)}`,usuario:currentUser.nome,vendaId:saleNumber(sale)}));
    setMovements([...outs,...movements]);
    setLastSale(sale);
    setCart([]);
    setDiscount(0);
    setPayments([blankPaymentLine('Dinheiro', '')]);
    setTimeout(()=>window.print(),200);
  }
  return <div className="pdv-grid"><section className="window-panel pdv-main"><header className="panel-title">🛒 VENDA BALCÃO - PDV MILLER MOTOS</header><div className="pdv-top"><label>Cliente<select value={clientId} onChange={e=>setClientId(e.target.value)}>{clients.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></label><label>Vendedor<select value={vendorId} onChange={e=>setVendorId(e.target.value)}>{vendors.filter(v=>v.ativo!==false).map(v=><option key={v.id} value={v.id}>{cleanDisplay(v.nome, 'Vendedor')}</option>)}</select></label><label>Pesquisar peça por código, nome ou categoria<input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ex.: O, Ol, oleo, Óleo, pastilha, 111114" /></label></div><div className="quick-products-title">{displayTitle}{searchTerm && <small>Busca inteligente com ou sem acento</small>}</div><div className="search-results quick-products">{displayProducts.length ? displayProducts.map(p=><button key={p.id} onClick={()=>addProduct(p)} className={p.estoque<=0?'disabled-product':''}><span>📦 {p.codigo}</span><strong>{cleanDisplay(p.nome, 'Produto')}</strong><span>{money(p.preco)}</span><span>Est: {p.estoque}</span><small>Saídas: {saleRank[p.id] || 0}</small></button>) : <div className="empty-result">Nenhum produto encontrado. Cadastre peças ou altere a pesquisa.</div>}</div><table className="data-table"><thead><tr><th>Produto</th><th>Qtd</th><th>Unit.</th><th>Total</th><th></th></tr></thead><tbody>{cart.map(item=><tr key={item.id}><td>{item.codigo} - {cleanDisplay(item.nome, 'Produto')}</td><td><input className="qty" type="number" value={item.qtd} onChange={e=>changeQty(item.id,e.target.value)} /></td><td>{money(item.preco)}</td><td>{money(item.preco*item.qtd)}</td><td><button className="mini-danger" onClick={()=>setCart(cart.filter(i=>i.id!==item.id))}>X</button></td></tr>)}{!cart.length&&<tr><td colSpan="5" className="empty">Nenhum produto no carrinho.</td></tr>}</tbody></table><div className="payment-box"><div className="payment-title">Meios de pagamento <small>Total informado: {money(typedPaymentTotal)} | Falta: {money(remainingPayment)}</small></div>{payments.map((p,idx)=><div className="payment-line" key={p.id}><label>Meio<select value={p.meio} onChange={e=>updatePayment(p.id,'meio',e.target.value)}><option>Dinheiro</option><option>Pix</option><option>Cartão Débito</option><option>Cartão Crédito</option><option>Fiado / Conta Cliente</option></select></label><label>Valor R$<input value={p.valor} onChange={e=>updatePayment(p.id,'valor',e.target.value)} placeholder={idx===0 ? money(total) : '0,00'} /></label><button className="mini-danger" onClick={()=>removePaymentLine(p.id)} disabled={payments.length<=1}>Remover</button></div>)}<button className="big" onClick={addPaymentLine}><Plus/> Adicionar outro pagamento</button></div><div className="pdv-bottom"><label>Desconto R$<input value={discount} onChange={e=>setDiscount(e.target.value)} /></label><button className="big green" onClick={finishSale}><Receipt/> Finalizar e Imprimir Cupom</button><button className="big" onClick={()=>setCart([])}><Trash2/> Limpar Venda</button></div></section><aside className="window-panel pdv-side"><header className="panel-title">💳 Resumo / Pix</header><div className="total-box"><span>Subtotal</span><strong>{money(subtotal)}</strong><span>Desconto</span><strong>{money(onlyNumber(discount))}</strong><span>Total</span><strong className="total-value">{money(total)}</strong><span>Pagamentos</span><strong>{money(typedPaymentTotal)}</strong></div><div className="qr-box"><QRCodeCanvas value={pixText || 'CHAVE PIX NAO INFORMADA'} size={180}/><small>Chave Pix: {config.chavePix}</small>{pixKeyTypeHint(config.chavePix)&&<small className="warning-text">{pixKeyTypeHint(config.chavePix)}</small>}</div></aside><div className="print-receipt">{lastSale&&<ReceiptPrint sale={lastSale} config={config}/>}</div></div>;
}

function ReceiptPrint({ sale, config }) {
  const pagamentos = Array.isArray(sale.pagamentos) && sale.pagamentos.length ? sale.pagamentos : [{ meio: sale.pagamento || 'Dinheiro', valor: sale.total }];
  const pixAmount = pagamentos.filter(p => p.meio === 'Pix').reduce((sum,p)=>sum+onlyNumber(p.valor),0);
  return <div className="receipt-paper"><h2>{config.nomeFantasia}</h2><p>{config.razaoSocial}</p><p>CNPJ: {config.cnpj}</p><p>{config.endereco}</p><p>{config.telefone} - {config.email}</p><hr/><p>CUPOM NÃO FISCAL: {saleNumber(sale)}</p>{isSaleCanceled(sale)&&<h3 className="receipt-canceled">VENDA CANCELADA</h3>}<p>Data: {new Date(sale.data).toLocaleString('pt-BR')}</p><p>Cliente: {sale.cliente}</p><p>Vendedor: {sale.vendedor}</p><hr/>{sale.items.map(i=><p key={i.id || i.itemId}>{i.qtd}x {cleanDisplay(i.nome, 'Produto')}<br/>{money(i.preco)} un. = {money(i.preco*i.qtd)}</p>)}<hr/><p>Subtotal: {money(sale.subtotal)}</p><p>Desconto: {money(sale.desconto)}</p><h3>Total: {money(sale.total)}</h3><p>Pagamento: {paymentLabel(pagamentos, sale.pagamento)}</p>{pagamentos.map((p,idx)=><p key={idx}>{p.meio}: {money(p.valor)}</p>)}{pixAmount>0&&<><p>PIX: {config.chavePix}</p><QRCodeCanvas value={pixPayload({ config, total: pixAmount, saleNumberText: saleNumber(sale), cliente: sale.cliente })} size={120}/></>}<hr/><p>{config.mensagemCupom}</p></div>;
}


function Pix({ config, setConfig, canEdit }) {
  const [valor,setValor]=useState('');
  const [cliente,setCliente]=useState('');
  const qrValue = pixPayload({ config, total: onlyNumber(valor), cliente });
  return <div className="window-panel mid"><header className="panel-title">💳 Pix / QR Code Dinâmico</header><div className="pix-screen"><div className="qr-box big"><QRCodeCanvas value={qrValue || 'CHAVE PIX NAO INFORMADA'} size={240}/>{pixKeyTypeHint(config.chavePix)&&<small className="warning-text">{pixKeyTypeHint(config.chavePix)}</small>}</div><div className="grid-form one"><label>Chave Pix<input value={config.chavePix || ''} disabled={!canEdit} onChange={e=>setConfig({...config,chavePix:e.target.value})}/></label><label>Valor R$<input value={valor} onChange={e=>setValor(e.target.value)} placeholder="0,00"/></label><label>Cliente / referência<input value={cliente} onChange={e=>setCliente(e.target.value)} placeholder="Opcional"/></label><label>Prévia do conteúdo do QR<textarea readOnly value={qrValue}/></label>{!canEdit&&<p className="permission-help">Somente administrador pode alterar a chave Pix. Financeiro pode gerar QR por valor.</p>}</div></div></div>;
}


function CrudPanel({ title, q, setQ, onNew, onSave, children }) { return <div className="window-panel full"><header className="panel-title">{title}</header><div className="crud-toolbar"><label>Pesquisar<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Busca inteligente com ou sem acento"/></label><button onClick={onNew}><Plus/> Novo</button><button onClick={onSave}><Save/> Salvar</button><button onClick={()=>window.print()}><Printer/> Imprimir</button></div>{children}</div>; }
function Clients({ clients, setClients }) { const blank={id:'',nome:'',documento:'',telefone:'',email:'',endereco:'',cidade:'SETE LAGOAS',obs:''}; const [form,setForm]=useState(blank); const [q,setQ]=useState(''); const query=normalizeText(q); const list=clients.filter(c=>!query||searchableText(c.nome,c.documento,c.telefone,c.email,c.endereco,c.cidade,c.obs).includes(query)); const save=()=>{ if(!form.nome.trim()) return alert('Informe o nome do cliente.'); if(form.id) setClients(clients.map(c=>c.id===form.id?form:c)); else setClients([{...form,id:code('C')},...clients]); setForm(blank);}; return <CrudPanel title="👥 Cadastro de Clientes" q={q} setQ={setQ} onNew={()=>setForm(blank)} onSave={save}><div className="split"><div className="list-box">{list.map(c=><div key={c.id} onClick={()=>setForm(c)}>👤 {cleanDisplay(c.nome, 'Cliente')}<br/><small>{c.telefone} {c.documento}</small></div>)}</div><div className="grid-form two">{['nome','documento','telefone','email','endereco','cidade'].map(f=><label key={f}>{f.toUpperCase()}<input value={form[f]} onChange={e=>setForm({...form,[f]:e.target.value})}/></label>)}<label className="wide">OBS<textarea value={form.obs} onChange={e=>setForm({...form,obs:e.target.value})}/></label><div className="side-actions wide"><button onClick={save}><Save/> Salvar</button><button onClick={()=>form.id&&setClients(clients.filter(c=>c.id!==form.id))}><Trash2/> Excluir</button></div></div></div></CrudPanel>; }
function Suppliers({ suppliers, setSuppliers }) { const blank={id:'',nome:'',cnpj:'',telefone:'',email:'',cidade:'SETE LAGOAS',obs:''}; const [form,setForm]=useState(blank); const [q,setQ]=useState(''); const list=suppliers.filter(s=>!normalizeText(q)||searchableText(s.nome,s.cnpj,s.telefone,s.email,s.cidade,s.obs).includes(normalizeText(q))); const save=()=>{ if(!form.nome.trim()) return alert('Informe o fornecedor.'); if(form.id) setSuppliers(suppliers.map(s=>s.id===form.id?form:s)); else setSuppliers([{...form,id:code('F')},...suppliers]); setForm(blank); }; return <CrudPanel title="🚚 Cadastro de Fornecedores" q={q} setQ={setQ} onNew={()=>setForm(blank)} onSave={save}><div className="split"><div className="list-box">{list.map(s=><div key={s.id} onClick={()=>setForm(s)}>🚚 {cleanDisplay(s.nome, 'Fornecedor')}<br/><small>{s.cnpj} {s.telefone}</small></div>)}</div><div className="grid-form two">{['nome','cnpj','telefone','email','cidade','obs'].map(f=><label key={f}>{f.toUpperCase()}<input value={form[f]} onChange={e=>setForm({...form,[f]:e.target.value})}/></label>)}<div className="side-actions wide"><button onClick={save}><Save/> Salvar Fornecedor</button><button onClick={()=>form.id&&setSuppliers(suppliers.filter(s=>s.id!==form.id))}><Trash2/> Excluir</button></div></div></div></CrudPanel>; }
function Vendors({ vendors, setVendors }) { const blank={id:'',nome:'',telefone:'',email:'',comissao:0,ativo:true}; const [form,setForm]=useState(blank); const [q,setQ]=useState(''); const list=vendors.filter(v=>!normalizeText(q)||searchableText(v.nome,v.telefone,v.email,v.comissao).includes(normalizeText(q))); const save=()=>{ if(!form.nome.trim()) return alert('Informe o vendedor.'); const payload={...form,comissao:onlyNumber(form.comissao),ativo:form.ativo!==false}; if(form.id) setVendors(vendors.map(v=>v.id===form.id?payload:v)); else setVendors([{...payload,id:code('V')},...vendors]); setForm(blank); }; return <CrudPanel title="👨‍💼 Cadastro de Vendedores" q={q} setQ={setQ} onNew={()=>setForm(blank)} onSave={save}><div className="split"><div className="list-box">{list.map(v=><div key={v.id} onClick={()=>setForm(v)}>👨‍💼 {cleanDisplay(v.nome, 'Vendedor')}<br/><small>Comissão: {v.comissao || 0}% - {v.ativo?'Ativo':'Inativo'}</small></div>)}</div><div className="grid-form two"><label>NOME<input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/></label><label>TELEFONE<input value={form.telefone} onChange={e=>setForm({...form,telefone:e.target.value})}/></label><label>E-MAIL<input value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>COMISSÃO %<input value={form.comissao} onChange={e=>setForm({...form,comissao:e.target.value})}/></label><label className="wide check-line"><input type="checkbox" checked={form.ativo!==false} onChange={e=>setForm({...form,ativo:e.target.checked})}/> Vendedor ativo</label><div className="side-actions wide"><button onClick={save}><Save/> Salvar Vendedor</button><button onClick={()=>form.id&&setVendors(vendors.filter(v=>v.id!==form.id))}><Trash2/> Excluir</button></div></div></div></CrudPanel>; }
function Products({ products, setProducts, suppliers, currentUser, config, movements, setMovements }) { const blank={id:'',codigo:'',nome:'',categoria:'',fornecedorId:'',custo:0,preco:0,estoque:0,minimo:0,unidade:'UN'}; const [form,setForm]=useState(blank); const [q,setQ]=useState(''); const query=normalizeText(q); const list=products.filter(p=>!query||searchableText(p.codigo,p.nome,p.categoria,p.unidade).includes(query)); const save=()=>{ if(!form.nome.trim()) return alert('Informe o nome do produto.'); const old=products.find(p=>p.id===form.id); const payload={...form,custo:onlyNumber(form.custo),preco:onlyNumber(form.preco),estoque:onlyNumber(form.estoque),minimo:onlyNumber(form.minimo)}; if(form.id) { setProducts(products.map(p=>p.id===form.id?payload:p)); if(old && old.estoque !== payload.estoque){ const delta=payload.estoque-old.estoque; setMovements([{id:code('MOV'),data:todayISO(),tipo:delta>=0?'ENTRADA':'SAÍDA',produtoId:payload.id,produtoNome:payload.nome,qtd:Math.abs(delta),motivo:'Ajuste direto no cadastro de produto',usuario:currentUser.nome},...movements]); } } else { const novo={...payload,id:code('P'),nome:form.nome.trim(),codigo:String(form.codigo||'').trim() || ('PROD-' + Date.now().toString().slice(-6))}; setProducts([novo,...products]); if(novo.estoque>0) setMovements([{id:code('MOV'),data:todayISO(),tipo:'ENTRADA',produtoId:novo.id,produtoNome:novo.nome,qtd:novo.estoque,motivo:'Cadastro inicial do produto',usuario:currentUser.nome},...movements]); } setForm(blank); }; return <CrudPanel title="📦 Produtos / Peças / Estoque" q={q} setQ={setQ} onNew={()=>setForm(blank)} onSave={save}><div className="split products-split"><table className="data-table"><thead><tr><th>Código</th><th>Produto</th><th>Preço</th><th>Estoque</th></tr></thead><tbody>{list.map(p=><tr key={p.id} onClick={()=>setForm(p)} className={p.estoque<=p.minimo?'zero':''}><td>{p.codigo}</td><td>{cleanDisplay(p.nome, 'Produto')}</td><td>{money(p.preco)}</td><td>{p.estoque}</td></tr>)}</tbody></table><div className="grid-form two"><label>CÓDIGO<input value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value})}/></label><label>NOME<input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/></label><label>CATEGORIA<input value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})}/></label><label>FORNECEDOR<select value={form.fornecedorId} onChange={e=>setForm({...form,fornecedorId:e.target.value})}><option value="">Sem fornecedor</option>{suppliers.map(s=><option key={s.id} value={s.id}>{cleanDisplay(s.nome, 'Fornecedor')}</option>)}</select></label>{['unidade','custo','preco','estoque','minimo'].map(f=><label key={f}>{f.toUpperCase()}<input value={form[f]} onChange={e=>setForm({...form,[f]:e.target.value})}/></label>)}<div className="side-actions wide"><button onClick={save}><Save/> Salvar Produto</button><button onClick={()=>form.id&&setProducts(products.filter(p=>p.id!==form.id))}><Trash2/> Excluir</button></div></div></div></CrudPanel>; }

function StockMovements({ products, setProducts, movements, setMovements, currentUser, canEdit }) {
  const [produtoId,setProdutoId]=useState(products[0]?.id||'');
  const [tipo,setTipo]=useState('ENTRADA');
  const [qtd,setQtd]=useState(1);
  const [motivo,setMotivo]=useState('Compra / reposição');
  const [q,setQ]=useState('');
  const [visao,setVisao]=useState('todos');

  const selectedProduct = products.find(p=>p.id===produtoId);
  const normalizedQuery = normalizeText(q);
  const filteredMovements = movements.filter(m=>{
    const movimentoTipo = String(m.tipo || '').toUpperCase();
    const matchQuery = !normalizedQuery || searchableText(m.tipo,m.produtoNome,m.motivo,m.usuario,m.vendaId).includes(normalizedQuery);
    const matchView =
      visao === 'todos' ||
      (visao === 'produto' && m.produtoId === produtoId) ||
      (visao === 'entradas' && movimentoTipo.includes('ENTRADA')) ||
      (visao === 'saidas' && (movimentoTipo.includes('SAÍDA') || movimentoTipo.includes('SAIDA')));
    return matchQuery && matchView;
  });

  const stockSummary = products.map(p=>{
    const movs = movements.filter(m=>m.produtoId===p.id);
    const entradas = movs.filter(m=>String(m.tipo||'').toUpperCase().includes('ENTRADA')).reduce((a,m)=>a+onlyNumber(m.qtd),0);
    const saidas = movs.filter(m=>String(m.tipo||'').toUpperCase().includes('SAÍDA') || String(m.tipo||'').toUpperCase().includes('SAIDA')).reduce((a,m)=>a+onlyNumber(m.qtd),0);
    const ajustes = movs.filter(m=>String(m.tipo||'').toUpperCase().includes('AJUSTE')).reduce((a,m)=>a+onlyNumber(m.qtd),0);
    return {...p, entradas, saidas, ajustes, valorCusto:(p.custo||0)*(p.estoque||0), valorVenda:(p.preco||0)*(p.estoque||0), status:(p.estoque<=0?'ZERADO':p.estoque<=p.minimo?'BAIXO':'OK')};
  });

  const summaryFiltered = stockSummary.filter(p=>{
    const matchQuery = !normalizedQuery || searchableText(p.codigo,p.nome,p.categoria,p.status).includes(normalizedQuery);
    const matchView =
      visao === 'todos' ||
      (visao === 'produto' && p.id === produtoId) ||
      (visao === 'baixo' && p.status === 'BAIXO') ||
      (visao === 'zerado' && p.status === 'ZERADO');
    return matchQuery && matchView;
  });

  const totais = summaryFiltered.reduce((acc,p)=>({
    estoque: acc.estoque + onlyNumber(p.estoque),
    entradas: acc.entradas + onlyNumber(p.entradas),
    saidas: acc.saidas + onlyNumber(p.saidas),
    valorCusto: acc.valorCusto + onlyNumber(p.valorCusto),
    valorVenda: acc.valorVenda + onlyNumber(p.valorVenda),
  }), {estoque:0, entradas:0, saidas:0, valorCusto:0, valorVenda:0});

  function registrar(){
    if(!canEdit) return alert('Acesso negado para movimentar estoque.');
    const prod=products.find(p=>p.id===produtoId);
    const amount=onlyNumber(qtd);
    if(!prod||amount<=0) return alert('Informe produto e quantidade.');
    if(tipo==='SAÍDA'&&prod.estoque<amount) return alert('Estoque insuficiente.');
    const estoqueDepois = tipo==='ENTRADA'?prod.estoque+amount:prod.estoque-amount;
    setProducts(products.map(p=>p.id===produtoId?{...p,estoque: estoqueDepois}:p));
    setMovements([{id:code('MOV'),data:todayISO(),tipo,produtoId,produtoNome:prod.nome,qtd:amount,motivo,usuario:currentUser.nome, estoqueAntes: prod.estoque, estoqueDepois},...movements]);
    setQtd(1);
  }

  return <div className="window-panel full"><header className="panel-title">🔁 Relação de Entrada e Saída do Estoque</header>
    <div className="crud-toolbar">
      <label>Visualizar<select value={visao} onChange={e=>setVisao(e.target.value)}><option value="todos">Todos os produtos</option><option value="produto">Somente este produto</option><option value="baixo">Estoque baixo</option><option value="zerado">Estoque zerado</option><option value="entradas">Entradas</option><option value="saidas">Saídas</option></select></label>
      <label>Pesquisar<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Produto, código, usuário, venda..."/></label>
      <button onClick={()=>window.print()}><Printer/> Imprimir Relação</button>
    </div>

    <div className="kpi-grid stock-kpis"><Kpi label="Produtos listados" value={summaryFiltered.length}/><Kpi label="Qtd total estoque" value={totais.estoque}/><Kpi label="Total entradas" value={totais.entradas}/><Kpi label="Total saídas" value={totais.saidas}/><Kpi label="Valor custo estoque" value={money(totais.valorCusto)}/><Kpi label="Valor venda estoque" value={money(totais.valorVenda)}/></div>

    <div className="grid-form movement-form padded"><label>Produto para movimentar<select value={produtoId} onChange={e=>setProdutoId(e.target.value)}>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} - {cleanDisplay(p.nome, 'Produto')} | Est: {p.estoque}</option>)}</select></label><label>Tipo<select value={tipo} onChange={e=>setTipo(e.target.value)}><option>ENTRADA</option><option>SAÍDA</option></select></label><label>Quantidade<input value={qtd} onChange={e=>setQtd(e.target.value)}/></label><label>Motivo<input value={motivo} onChange={e=>setMotivo(e.target.value)}/></label><button onClick={registrar}><Save/> Registrar Movimento</button></div>

    <h3 className="padded-title">Resumo geral do estoque {visao==='produto' && selectedProduct ? `- ${cleanDisplay(selectedProduct.nome, 'Produto')}` : ''}</h3>
    <table className="data-table"><thead><tr><th>Código</th><th>Produto</th><th>Estoque</th><th>Entradas</th><th>Saídas</th><th>Mín.</th><th>Status</th><th>Valor Venda</th></tr></thead><tbody>{summaryFiltered.map(p=><tr key={p.id} className={p.status!=='OK'?'zero':''}><td>{p.codigo}</td><td>{cleanDisplay(p.nome, 'Produto')}</td><td>{p.estoque}</td><td>{p.entradas}</td><td>{p.saidas}</td><td>{p.minimo}</td><td>{p.status}</td><td>{money(p.valorVenda)}</td></tr>)}{!summaryFiltered.length&&<tr><td colSpan="8" className="empty">Nenhum produto encontrado.</td></tr>}</tbody></table>

    <h3 className="padded-title">Movimentação detalhada</h3>
    <table className="data-table"><thead><tr><th>Data</th><th>Tipo</th><th>Produto</th><th>Qtd</th><th>Motivo</th><th>Venda</th><th>Usuário</th></tr></thead><tbody>{filteredMovements.map(m=><tr key={m.id} className={String(m.tipo).includes('SAÍ')?'zero':''}><td>{new Date(m.data).toLocaleString('pt-BR')}</td><td>{m.tipo}</td><td>{cleanDisplay(m.produtoNome, 'Produto')}</td><td>{m.qtd}</td><td>{m.motivo}</td><td>{looksUuid(m.vendaId)?'':m.vendaId}</td><td>{cleanDisplay(m.usuario, 'Usuário')}</td></tr>)}{!filteredMovements.length&&<tr><td colSpan="7" className="empty">Nenhuma movimentação encontrada.</td></tr>}</tbody></table>
  </div>;
}

function SalesHistory({ sales, setSales, products, setProducts, movements, setMovements, config, currentUser }) {
  const [selected,setSelected]=useState(null);
  const [filters,setFilters]=useState({ q:'', ini:'', fim:'', min:'', max:'', vendedor:'', comprador:'', pagamento:'', status:'ativas' });
  const activeSales = sales.filter(s => !isSaleCanceled(s));
  const canceledSales = sales.filter(isSaleCanceled);
  const normalizedQ = normalizeText(filters.q);
  const filteredSales = sales.filter(s => {
    const data = s.data ? new Date(s.data) : null;
    const min = filters.ini ? new Date(filters.ini + 'T00:00:00') : null;
    const max = filters.fim ? new Date(filters.fim + 'T23:59:59') : null;
    const total = onlyNumber(s.total);
    const statusOk = filters.status === 'todas' || (filters.status === 'ativas' && !isSaleCanceled(s)) || (filters.status === 'canceladas' && isSaleCanceled(s));
    return statusOk &&
      (!normalizedQ || searchableText(s.numero,s.cliente,s.vendedor,s.pagamento,s.status,s.usuario).includes(normalizedQ)) &&
      (!min || (data && data >= min)) && (!max || (data && data <= max)) &&
      (!filters.min || total >= onlyNumber(filters.min)) && (!filters.max || total <= onlyNumber(filters.max)) &&
      (!filters.vendedor || normalizeText(s.vendedor).includes(normalizeText(filters.vendedor))) &&
      (!filters.comprador || normalizeText(s.cliente).includes(normalizeText(filters.comprador))) &&
      (!filters.pagamento || normalizeText(s.pagamento).includes(normalizeText(filters.pagamento)));
  });
  const totalFiltered = filteredSales.filter(s=>!isSaleCanceled(s)).reduce((sum,s)=>sum+onlyNumber(s.total),0);

  function printSale(sale) {
    setSelected(sale);
    setTimeout(()=>window.print(),100);
  }

  function cancelSale(sale) {
    if (isSaleCanceled(sale)) return alert('Essa venda já está cancelada.');
    const numero = saleNumber(sale);
    const ok = window.confirm(`Cancelar/excluir a venda ${numero}?

O estoque dos itens será devolvido automaticamente e a venda ficará marcada como CANCELADA para histórico.`);
    if (!ok) return;

    const restoredProducts = products.map(p => {
      const item = (sale.items || []).find(i => (i.id === p.id) || (i.produtoId === p.id));
      return item ? { ...p, estoque: onlyNumber(p.estoque) + onlyNumber(item.qtd) } : p;
    });

    const returnMovements = (sale.items || []).map(i => ({
      id: code('MOV'),
      data: todayISO(),
      tipo: 'ENTRADA',
      produtoId: i.id || i.produtoId,
      produtoNome: i.nome || i.descricao || 'Produto',
      qtd: onlyNumber(i.qtd),
      motivo: `Cancelamento da venda ${numero}`,
      usuario: currentUser?.nome || 'Sistema',
      vendaId: numero,
    }));

    const updatedSales = sales.map(s => s.id === sale.id ? {
      ...s,
      status: 'CANCELADA',
      cancelada: true,
      canceladaEm: todayISO(),
      canceladaPor: currentUser?.nome || 'Sistema',
    } : s);

    setProducts(restoredProducts);
    setMovements([...returnMovements, ...movements]);
    setSales(updatedSales);
    alert(`Venda ${numero} cancelada e estoque devolvido.`);
  }

  return <div className="window-panel full"><header className="panel-title">🧾 Histórico de Vendas</header>
    <div className="sales-filters">
      <label>Buscar<input value={filters.q} onChange={e=>setFilters({...filters,q:e.target.value})} placeholder="Nº, cliente, vendedor, pagamento..."/></label>
      <label>Data inicial<input type="date" value={filters.ini} onChange={e=>setFilters({...filters,ini:e.target.value})}/></label>
      <label>Data final<input type="date" value={filters.fim} onChange={e=>setFilters({...filters,fim:e.target.value})}/></label>
      <label>Valor mín.<input value={filters.min} onChange={e=>setFilters({...filters,min:e.target.value})}/></label>
      <label>Valor máx.<input value={filters.max} onChange={e=>setFilters({...filters,max:e.target.value})}/></label>
      <label>Vendedor<input value={filters.vendedor} onChange={e=>setFilters({...filters,vendedor:e.target.value})}/></label>
      <label>Comprador<input value={filters.comprador} onChange={e=>setFilters({...filters,comprador:e.target.value})}/></label>
      <label>Pagamento<input value={filters.pagamento} onChange={e=>setFilters({...filters,pagamento:e.target.value})}/></label>
      <label>Status<select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="ativas">Ativas</option><option value="canceladas">Canceladas</option><option value="todas">Todas</option></select></label>
      <button onClick={()=>window.print()}><Printer/> Imprimir Lista</button>
    </div>
    <div className="crud-toolbar sales-summary"><span className="toolbar-info">Vendas ativas: {activeSales.length} | Canceladas: {canceledSales.length}</span><span className="toolbar-info">Filtradas: {filteredSales.length} | Total ativo filtrado: {money(totalFiltered)}</span></div>
    <table className="data-table"><thead><tr><th>Nº</th><th>Data</th><th>Cliente</th><th>Vendedor</th><th>Pagamento</th><th>Total</th><th>Status</th><th>Ação</th></tr></thead><tbody>{filteredSales.map(s=><tr key={s.id} className={isSaleCanceled(s)?'zero':''}><td>{saleNumber(s)}</td><td>{new Date(s.data).toLocaleString('pt-BR')}</td><td>{cleanDisplay(s.cliente, 'Cliente')}</td><td>{cleanDisplay(s.vendedor, 'Vendedor')}</td><td>{s.pagamento}</td><td>{money(s.total)}</td><td>{isSaleCanceled(s)?'CANCELADA':(s.status||'FINALIZADA')}</td><td className="actions-cell"><button onClick={()=>printSale(s)}><Printer/> Imprimir</button>{!isSaleCanceled(s)&&<button className="mini-danger" onClick={()=>cancelSale(s)}><Trash2/> Cancelar</button>}</td></tr>)}{!filteredSales.length&&<tr><td colSpan="8" className="empty">Nenhuma venda encontrada com os filtros atuais.</td></tr>}</tbody></table>
    <div className="print-receipt">{selected&&<ReceiptPrint sale={selected} config={config}/>}</div>
  </div>;
}


function Finance({ sales, products }) { const activeSales=sales.filter(s=>!isSaleCanceled(s)); const total=activeSales.reduce((s,v)=>s+v.total,0); const lucro=activeSales.reduce((s,v)=>s+v.items.reduce((a,i)=>a+(i.preco-(i.custo||0))*i.qtd,0),0); const estoque=products.reduce((s,p)=>s+p.preco*p.estoque,0); const custoEstoque=products.reduce((s,p)=>s+p.custo*p.estoque,0); return <div className="window-panel mid"><header className="panel-title">💰 Resumo Financeiro</header><div className="kpi-grid"><Kpi label="Total vendido" value={money(total)}/><Kpi label="Lucro estimado" value={money(lucro)}/><Kpi label="Vendas ativas" value={activeSales.length}/><Kpi label="Vendas canceladas" value={sales.length-activeSales.length}/><Kpi label="Valor venda estoque" value={money(estoque)}/><Kpi label="Custo do estoque" value={money(custoEstoque)}/><Kpi label="Ticket médio" value={money(activeSales.length?total/activeSales.length:0)}/></div></div>; }
function Reports({ sales, products, clients, vendors, suppliers, movements }) { const [ini,setIni]=useState(''); const [fim,setFim]=useState(''); const period=sales.filter(s=>!isSaleCanceled(s)&&(!ini||s.data>=new Date(ini).toISOString())&&(!fim||s.data<=new Date(fim+'T23:59:59').toISOString())); const total=period.reduce((a,s)=>a+s.total,0); const lucro=period.reduce((s,v)=>s+v.items.reduce((a,i)=>a+(i.preco-(i.custo||0))*i.qtd,0),0); const byPay=groupSum(period,'pagamento'); const byVendor=groupSum(period,'vendedor'); const sold={}; period.forEach(s=>s.items.forEach(i=>{ sold[i.nome]=(sold[i.nome]||0)+i.qtd; })); const topProducts=Object.entries(sold).sort((a,b)=>b[1]-a[1]).slice(0,10); return <div className="window-panel full"><header className="panel-title">📊 Relatórios Completos</header><div className="crud-toolbar"><label>Data inicial<input type="date" value={ini} onChange={e=>setIni(e.target.value)}/></label><label>Data final<input type="date" value={fim} onChange={e=>setFim(e.target.value)}/></label><button onClick={()=>window.print()}><Printer/> Imprimir Relatório</button></div><div className="kpi-grid"><Kpi label="Faturamento período" value={money(total)}/><Kpi label="Lucro estimado" value={money(lucro)}/><Kpi label="Vendas no período" value={period.length}/><Kpi label="Ticket médio" value={money(period.length?total/period.length:0)}/><Kpi label="Clientes cadastrados" value={clients.length}/><Kpi label="Fornecedores" value={suppliers.length}/><Kpi label="Vendedores" value={vendors.length}/><Kpi label="Produtos" value={products.length}/><Kpi label="Estoque baixo" value={products.filter(p=>p.estoque<=p.minimo).length}/><Kpi label="Movimentos estoque" value={movements.length}/></div><div className="report-grid"><ReportTable title="Vendas por pagamento" rows={Object.entries(byPay)} /><ReportTable title="Vendas por vendedor" rows={Object.entries(byVendor)} /><ReportTable title="Produtos mais vendidos" rows={topProducts} /></div><h3>Produtos com estoque baixo</h3><table className="data-table"><thead><tr><th>Código</th><th>Produto</th><th>Estoque</th><th>Mínimo</th><th>Preço</th></tr></thead><tbody>{products.filter(p=>p.estoque<=p.minimo).map(p=><tr key={p.id} className="zero"><td>{p.codigo}</td><td>{cleanDisplay(p.nome, 'Produto')}</td><td>{p.estoque}</td><td>{p.minimo}</td><td>{money(p.preco)}</td></tr>)}</tbody></table></div>; }
function groupSum(list,key){ return list.reduce((acc,item)=>{ acc[item[key]||'Não informado']=(acc[item[key]||'Não informado']||0)+item.total; return acc; },{}); }
function ReportTable({title,rows}){ return <div><h3>{title}</h3><table className="data-table"><tbody>{rows.length?rows.map(([k,v])=><tr key={k}><td>{k}</td><td>{typeof v==='number'&&title!=='Produtos mais vendidos'?money(v):v}</td></tr>):<tr><td>Nenhum dado</td></tr>}</tbody></table></div>; }
function Kpi({label,value}){ return <div className="kpi"><span>{label}</span><strong>{value}</strong></div>; }
function LowStock({products}){ return <div className="window-panel full"><header className="panel-title">⚠️ Estoque Baixo</header><table className="data-table"><thead><tr><th>Código</th><th>Produto</th><th>Estoque</th><th>Mínimo</th></tr></thead><tbody>{products.filter(p=>p.estoque<=p.minimo).map(p=><tr className="zero" key={p.id}><td>{p.codigo}</td><td>{cleanDisplay(p.nome, 'Produto')}</td><td>{p.estoque}</td><td>{p.minimo}</td></tr>)}</tbody></table></div>; }
function SettingsScreen({ config, setConfig }) {
  const newUser = () => ({id:'',nome:'',login:'',senha:'',perfil:'vendedor',ativo:true,...defaultPermissionsByProfile('vendedor')});
  const normalizeUser = (user) => ({ ...defaultPermissionsByProfile(user.perfil || 'vendedor'), ...user });
  const [userForm,setUserForm]=useState(newUser());
  const users=(config.usuarios||defaultConfig.usuarios).map(normalizeUser);
  const permissionOptions = [
    ['podeVender','Vender no PDV'], ['podeClientes','Clientes'], ['podeProdutos','Produtos'], ['podeEstoque','Estoque'],
    ['podeHistoricoVendas','Histórico de vendas'], ['podePix','Pix / QR Code'], ['podeFinanceiro','Financeiro'], ['podeRelatorios','Relatórios'],
    ['podeFornecedores','Fornecedores'], ['podeVendedores','Vendedores'], ['podeConfiguracoes','Configurações'], ['podeBackup','Backup'],
  ];
  const applyProfileDefaults = (perfil) => setUserForm({...userForm, perfil, ...defaultPermissionsByProfile(perfil)});
  const saveUser=()=>{
    const loginNorm = normalizeText(userForm.login);
    if(!userForm.nome||!loginNorm||!userForm.senha) return alert('Preencha nome, login e senha.');
    if (users.some(u => u.id !== userForm.id && normalizeText(u.login) === loginNorm)) return alert('Já existe usuário com esse login. Use outro login para evitar duplicação no Supabase.');
    const payload={...normalizeUser(userForm),login:String(userForm.login).trim(),ativo:userForm.ativo!==false,id:userForm.id||code('U')};
    setConfig({...config,usuarios:userForm.id?users.map(u=>u.id===userForm.id?payload:u):[payload,...users]});
    setUserForm(newUser());
  };
  const fields=['nomeFantasia','razaoSocial','cnpj','email','telefone','endereco','cidade','chavePix','mensagemCupom'];
  return <div className="window-panel full"><header className="panel-title">⚙️ Configurações da Empresa, Pix e Permissões</header><div className="grid-form two padded">{fields.map(f=><label key={f}>{f}<input value={config[f]} onChange={e=>setConfig({...config,[f]:e.target.value})}/></label>)}<label className="wide check-line"><input type="checkbox" checked={!!config.permitirVendedorEstoque} onChange={e=>setConfig({...config,permitirVendedorEstoque:e.target.checked})}/> Permitir vendedor mexer no estoque/produtos por regra geral</label></div><h3 className="padded-title">Usuários, senhas e permissões por login</h3><div className="permission-help">Ao criar login, marque exatamente o que ele pode acessar. O login duplicado agora é bloqueado antes de salvar.</div><div className="split"><div className="list-box">{users.map(u=><div key={u.id} onClick={()=>setUserForm(normalizeUser(u))}>🔐 {cleanDisplay(u.nome, 'Usuário')}<br/><small>Login: {u.login} | {u.perfil} - {u.ativo!==false?'ativo':'inativo'}</small></div>)}</div><div className="grid-form two"><label>NOME<input value={userForm.nome} onChange={e=>setUserForm({...userForm,nome:e.target.value})}/></label><label>LOGIN<input value={userForm.login} onChange={e=>setUserForm({...userForm,login:e.target.value})}/></label><label>SENHA<input value={userForm.senha} onChange={e=>setUserForm({...userForm,senha:e.target.value})}/></label><label>PERFIL<select value={userForm.perfil} onChange={e=>applyProfileDefaults(e.target.value)}><option value="vendedor">vendedor</option><option value="financeiro">financeiro</option><option value="administrador">administrador</option></select></label><label className="wide check-line"><input type="checkbox" checked={userForm.ativo!==false} onChange={e=>setUserForm({...userForm,ativo:e.target.checked})}/> Usuário ativo</label><div className="permission-grid wide">{permissionOptions.map(([key,label])=><label key={key} className="check-line"><input type="checkbox" checked={!!userForm[key]} onChange={e=>setUserForm({...userForm,[key]:e.target.checked})}/> {label}</label>)}</div><div className="side-actions wide"><button onClick={saveUser}><Save/> Salvar Usuário</button><button onClick={()=>setUserForm(newUser())}><Plus/> Novo</button></div></div></div></div>;
}

function Backup({ config, clients, suppliers, vendors, products, sales, movements, setConfig, setClients, setSuppliers, setVendors, setProducts, setSales, setMovements }) { const fileRef=useRef(null); const exportData=()=>{ const blob=new Blob([JSON.stringify({config,clients,suppliers,vendors,products,sales,movements},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='backup-pdv-miller-motos.json'; a.click(); }; const importData=e=>{ const file=e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ const data=JSON.parse(reader.result); setConfig(data.config||defaultConfig); setClients(data.clients||defaultClients); setSuppliers(data.suppliers||defaultSuppliers); setVendors(data.vendors||defaultVendors); setProducts(data.products||defaultProducts); setSales(data.sales||[]); setMovements(data.movements||defaultMovements); alert('Backup restaurado.'); }; reader.readAsText(file); }; return <div className="window-panel mid"><header className="panel-title">💾 Backup e Restauração</header><div className="finance-grid"><button onClick={exportData}><Download/> Baixar Backup JSON</button><button onClick={()=>fileRef.current.click()}><Upload/> Restaurar Backup</button><button onClick={()=>{ if(confirm('Restaurar dados de demonstração?')){ setConfig(defaultConfig); setClients(defaultClients); setSuppliers(defaultSuppliers); setVendors(defaultVendors); setProducts(defaultProducts); setSales([]); setMovements(defaultMovements); } }}><Database/> Restaurar Demonstração</button></div><input ref={fileRef} type="file" accept="application/json" hidden onChange={importData}/></div>; }
function Help(){ return <div className="window-panel mid"><header className="panel-title">🆘 Como usar</header><div className="help"><p><strong>1.</strong> Admin controla tudo e cadastra fornecedores, vendedores, usuários e permissões.</p><p><strong>2.</strong> Vendedor vende no balcão, mas não mexe no estoque se o admin não permitir.</p><p><strong>3.</strong> Toda venda baixa estoque e cria movimento de SAÍDA automaticamente.</p><p><strong>4.</strong> Entrada manual de estoque fica em Estoque &gt; Relação Entrada/Saída.</p><p><strong>5.</strong> Relatórios completos mostram vendas, lucro estimado, vendedor, pagamento, estoque baixo e produtos mais vendidos.</p></div></div>; }

createRoot(document.getElementById('root')).render(<App />);
