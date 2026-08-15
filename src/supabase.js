const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const storageKey = 'gurukripa-auth-session';

const getSession = () => { try { return JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch { return null; } };
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const request = async (path, { method = 'GET', body, prefer } = {}) => {
  const session = getSession();
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
  if (!session?.accessToken) throw new Error('Your session has expired. Please sign in again.');
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, { method, headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  if (!response.ok) { const problem = await response.json().catch(() => ({})); throw new Error(problem.message || problem.hint || 'Supabase request failed.'); }
  return response.status === 204 ? null : response.json();
};

export const database = {
  getProducts: () => request('products?select=*&order=name.asc'),
  getCustomers: () => request('customers?select=*&order=name.asc'),
  getOrders: () => request('delivery_orders?select=*,customers(name,mobile,address,city),delivery_order_items(*)&order=created_at.desc'),
  addProduct: (product) => request('products', { method: 'POST', body: product, prefer: 'return=representation' }),
  addCustomer: (customer) => request('customers', { method: 'POST', body: customer, prefer: 'return=representation' }),
  updateCustomer: (id, customer) => request(`customers?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: customer, prefer: 'return=representation' }),
  deleteCustomer: (id) => request(`customers?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }),
  updateProduct: (id, product) => request(`products?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: product, prefer: 'return=representation' }),
  deleteProduct: (id) => request(`products?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }),
  addMovement: (movement) => request('inventory_movements', { method: 'POST', body: movement, prefer: 'return=representation' }),
  createOrder: async ({ order, items }) => {
    const [created] = await request('delivery_orders', { method: 'POST', body: order, prefer: 'return=representation' });
    await request('delivery_order_items', { method: 'POST', body: items.map((item) => ({ ...item, delivery_order_id: created.id })), prefer: 'return=representation' });
    await request('rpc/finalize_delivery_order', { method: 'POST', body: { p_order_id: created.id } });
    return created;
  },
};

export const authClient = {
  getSession,
  async signIn(email, password) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error_description || payload.msg || 'Unable to sign in.');
    const session = { accessToken: payload.access_token, user: payload.user };
    sessionStorage.setItem(storageKey, JSON.stringify(session)); return session;
  },
  signOut() { sessionStorage.removeItem(storageKey); },
};
