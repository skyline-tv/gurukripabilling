const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const storageKey = 'gurukripa-auth-session';

const getSession = () => {
  try { return JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch { return null; }
};

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const authClient = {
  getSession,
  async signIn(email, password) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error_description || payload.msg || 'Unable to sign in.');
    const session = { accessToken: payload.access_token, user: payload.user };
    sessionStorage.setItem(storageKey, JSON.stringify(session));
    return session;
  },
  signOut() { sessionStorage.removeItem(storageKey); },
};
