import { useCallback, useEffect, useMemo, useState } from 'react';
import { authClient, database } from './supabase.js';
import { getUserRole, toCustomer, toInvoice, toOrder, toProduct } from './records.js';
import DashboardPage from './Dashboard.jsx';
import DeliveryOrdersPage from './DeliveryOrders.jsx';
import DeliveryOrderWorkspace from './DeliveryOrderWorkspace.jsx';
import Products from './Products.jsx';
import Inventory from './Inventory.jsx';
import Customers from './Customers.jsx';
import Invoices from './Invoices.jsx';
import Reports from './Reports.jsx';
import LoginPage from './LoginPage.jsx';
import Sidebar from './Sidebar.jsx';

function AppShell({ user, onSignOut }) {
  const [page, setPage] = useState('Home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newOrderTick, setNewOrderTick] = useState(0);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [role, setRole] = useState(() => getUserRole(user));

  const go = (nextPage, options) => {
    setPage(nextPage);
    setSidebarOpen(false);
    if (options?.newOrder) setNewOrderTick((tick) => tick + 1);
  };

  const flash = (text, tone = 'success') => {
    setToast({ text, tone });
    window.setTimeout(() => setToast(null), 3200);
  };

  const refresh = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const [productRows, customerRows, orderRows, invoiceRows] = await Promise.all([
        database.getProducts(),
        database.getCustomers(),
        database.getOrders(),
        database.getInvoices().catch(() => []),
      ]);
      setProducts(productRows.map(toProduct));
      setCustomers(customerRows.map(toCustomer));
      setOrders(orderRows.map(toOrder));
      setInvoices(invoiceRows.map(toInvoice));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(() => refresh(true), 15000);
    const onFocus = () => refresh(true);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    let active = true;
    const resolveRole = async () => {
      const metadataRole = getUserRole(user);
      if (metadataRole === 'admin') {
        if (active) setRole('admin');
        return;
      }
      try {
        const profileRole = await database.getProfileRole(user?.id);
        if (active) setRole(profileRole === 'admin' ? 'admin' : 'staff');
      } catch {
        if (active) setRole('staff');
      }
    };
    if (user?.id) resolveRole();
    else setRole('staff');
    return () => { active = false; };
  }, [user]);

  const lowStock = products.filter((product) => product.stock <= product.minimum).length;
  const navItems = useMemo(
    () => (role === 'staff' ? ['Home', 'Delivery Orders', 'Invoices'] : ['Home', 'Delivery Orders', 'Invoices', 'Products', 'Inventory', 'Customers', 'Reports']),
    [role],
  );

  useEffect(() => {
    if (!navItems.includes(page)) setPage('Home');
  }, [navItems, page]);

  const pages = {
    Home: <DashboardPage products={products} orders={orders} lowStock={lowStock} go={go} role={role} />,
    Products: <Products products={products} refresh={refresh} flash={flash} />,
    Inventory: <Inventory products={products} refresh={refresh} flash={flash} user={user} />,
    Customers: <Customers customers={customers} refresh={refresh} flash={flash} />,
    Reports: <Reports orders={orders} products={products} flash={flash} />,
    Invoices: <Invoices invoices={invoices} refresh={refresh} flash={flash} />,
    'Delivery Orders': (
      <DeliveryOrdersPage startNew={newOrderTick}>
        <DeliveryOrderWorkspace products={products} customers={customers} orders={orders} invoices={invoices} refresh={refresh} flash={flash} user={user} role={role} go={go} />
      </DeliveryOrdersPage>
    ),
  };

  const toastTone = toast?.tone === 'error' ? 'error' : toast?.tone === 'warning' ? 'warning' : 'success';

  return (
    <div className="app">
      <Sidebar page={page} navItems={navItems} onNavigate={go} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="app-main">
        <header className="app-header">
          <button className="sidebar-toggle" type="button" aria-label="Open menu" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}>
            <span /><span /><span />
          </button>
          <div className="crumb">{page}</div>
          <div className="header-user">
            <span className="header-user-name">{user?.email || ''}</span>
            <button className="logout-link" type="button" onClick={onSignOut}>Log out</button>
          </div>
        </header>
        <section className="content">
          {error && <p className="sync-error">Could not load data: {error}</p>}
          {loading ? <div className="page-loading">Loading delivery orders and catalog…</div> : pages[page]}
        </section>
      </main>
      {toast?.text && (
        <div className={`toast toast-${toastTone}`}>
          {toastTone === 'error' ? '✕' : toastTone === 'warning' ? '!' : '✓'} {toast.text}
        </div>
      )}
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const restored = await authClient.getSession();
        if (active) setSession(restored);
      } finally {
        if (active) setCheckingSession(false);
      }
    };
    restoreSession();
    const { data: { subscription } } = authClient.onAuthStateChange((nextSession) => {
      if (active) setSession(nextSession);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (checkingSession) return <main className="login-page"><p className="page-loading">Restoring your session…</p></main>;
  if (!session) return <LoginPage onLogin={setSession} />;
  return <AppShell user={session.user} onSignOut={async () => { await authClient.signOut(); setSession(null); }} />;
}

export default App;
