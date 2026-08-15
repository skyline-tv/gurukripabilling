import { useState } from 'react';
import { authClient, isSupabaseConfigured } from './supabase.js';

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError(''); setLoading(true);
    try { onLogin(await authClient.signIn(email, password)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  return <main className="login-page"><section className="login-brand"><div className="login-mark">G</div><p>GURUKRIPA TRADING</p><h1>Business made<br/><span>simple.</span></h1><small>Billing, delivery orders, inventory, and customers — all in one place.</small><div className="login-details"><span>Shop No. 1, Satya Sai Mahal</span><span>Gandhi Road, Ulhasnagar-5</span></div></section><section className="login-panel"><form className="login-card" onSubmit={submit}><div className="login-logo"><span>G</span><div><b>Gurukripa</b><small>TRADING</small></div></div><p className="login-overline">WELCOME BACK</p><h2>Sign in to your account</h2><p className="login-sub">Use your staff account to continue.</p><label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password"/></label>{error && <p className="login-error">{error}</p>}{!isSupabaseConfigured && <p className="login-setup">Setup required: add Supabase variables to <code>.env.local</code>.</p>}<button className="login-submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in →'}</button><p className="login-help">Contact your administrator if you need access.</p></form></section></main>;
}
export default LoginPage;
