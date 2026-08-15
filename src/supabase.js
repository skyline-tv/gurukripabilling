import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// The client stores the complete session (including its refresh token) in
// localStorage, restores it on reopen, and refreshes access tokens in the background.
const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;

let refreshInFlight = null;
const configurationError = () => new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
const requireClient = () => { if (!supabase) throw configurationError(); return supabase; };
const sessionExpiredError = () => new Error('Your session has expired. Please sign in again.');
const signOutExpiredSession = async () => { if (supabase) await supabase.auth.signOut({ scope: 'local' }); throw sessionExpiredError(); };

const refreshSession = async () => {
  if (!refreshInFlight) {
    refreshInFlight = requireClient().auth.refreshSession().then(({ data, error }) => error || !data.session?.access_token ? null : data.session).finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
};

// Obtain a current session immediately before every database request. This makes
// foreground sync safe after a tab has been idle or the app has been reopened.
const getValidSession = async ({ forceRefresh = false } = {}) => {
  const { data, error } = await requireClient().auth.getSession();
  let session = data.session;
  const expiresSoon = !session?.expires_at || session.expires_at * 1000 <= Date.now() + 60_000;
  if (error || !session || forceRefresh || expiresSoon) session = await refreshSession();
  if (!session?.access_token) await signOutExpiredSession();
  return session;
};

const readProblem = async (response) => response.json().catch(() => ({}));
const isExpiredJwtProblem = (response, problem) => response.status === 401 && /jwt.*expired|token.*expired/i.test(`${problem.message || ''} ${problem.hint || ''} ${problem.error || ''}`);
const sendRequest = (path, { method = 'GET', body, prefer }, accessToken) => fetch(`${supabaseUrl}/rest/v1/${path}`, {
  method,
  headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
});

const request = async (path, options = {}) => {
  let session = await getValidSession();
  let response = await sendRequest(path, options, session.access_token);
  let problem = response.ok ? null : await readProblem(response);

  // A request may race expiry. Retry only once and only with a newly refreshed JWT.
  if (isExpiredJwtProblem(response, problem)) {
    const refreshedSession = await getValidSession({ forceRefresh: true });
    if (refreshedSession.access_token === session.access_token) await signOutExpiredSession();
    response = await sendRequest(path, options, refreshedSession.access_token);
    problem = response.ok ? null : await readProblem(response);
  }
  if (!response.ok) {
    if (isExpiredJwtProblem(response, problem)) await signOutExpiredSession();
    throw new Error(problem.message || problem.hint || 'Supabase request failed.');
  }
  return response.status === 204 ? null : response.json();
};

export const database = {
  getProfileRole: async (userId) => {
    if (!userId) return 'staff';
    const rows = await request(`profiles?select=role&id=eq.${encodeURIComponent(userId)}`);
    return rows?.[0]?.role || 'staff';
  },
  getProducts: () => request('products?select=*&order=name.asc'),
  getCustomers: () => request('customers?select=*&order=name.asc'),
  getOrders: () => request('delivery_orders?select=*,customers(name,mobile,address,city),delivery_order_items(*)&order=created_at.desc'),
  addProduct: (product) => request('products', { method: 'POST', body: product, prefer: 'return=representation' }),
  addCustomer: (customer) => request('customers', { method: 'POST', body: customer, prefer: 'return=representation' }),
  updateCustomer: (id, customer) => request(`customers?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: customer, prefer: 'return=representation' }),
  deleteCustomer: (id) => request(`customers?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }),
  updateOrder: (id, order) => request(`delivery_orders?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: order, prefer: 'return=representation' }),
  updateOrderWithItems: (orderId, customerId, items) => request('rpc/update_delivery_order', { method: 'POST', body: { p_order_id: orderId, p_customer_id: customerId, p_items: items } }),
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
  async getSession() { if (!supabase) return null; const { data } = await supabase.auth.getSession(); return data.session; },
  async signIn(email, password) {
    const { data, error } = await requireClient().auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new Error(error?.message || 'Unable to sign in.');
    return data.session;
  },
  async signOut() { if (supabase) await supabase.auth.signOut({ scope: 'local' }); },
  onAuthStateChange(callback) {
    if (!supabase) return { data: { subscription: { unsubscribe() {} } } };
    return supabase.auth.onAuthStateChange((_event, session) => callback(session));
  },
};
