import { useState } from 'react';
import { authClient, isSupabaseConfigured } from './supabase.js';

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      onLogin(await authClient.signIn(email, password));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="brand">
          <span>G</span>
          <div>
            <strong>Gurukripa</strong>
            <small>TRADING</small>
          </div>
        </div>
        <p className="eyebrow">DELIVERY DESK</p>
        <h1>Sign in to take orders.</h1>
        <small>Create a delivery order, confirm stock, then print.</small>
        <ul className="login-steps">
          <li>Select party</li>
          <li>Add products</li>
          <li>Confirm and print</li>
        </ul>
        <div className="login-details">
          <span>Shop No. 1, Satya Sai Mahal</span>
          <span>Gandhi Road, Ulhasnagar-5</span>
          <span>Mob. 9623079356</span>
        </div>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <p className="eyebrow">STAFF LOGIN</p>
          <h2>Sign in</h2>
          <p className="login-sub">Use your account to open the delivery order desk.</p>
          <label className="picker-label">
            Email address
            <input
              className="text-field"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>
          <label className="picker-label">
            Password
            <span className="login-password">
              <input
                className="text-field"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
              <button type="button" className="secondary" onClick={() => setShowPassword((current) => !current)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>
          {error && <p className="login-error">{error}</p>}
          {!isSupabaseConfigured && (
            <p className="login-setup">Setup required: add Supabase variables to <code>.env.local</code>.</p>
          )}
          <button className="login-submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
          <p className="login-help">Contact your administrator if you need access.</p>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
