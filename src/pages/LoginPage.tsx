import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { setAuthToken } from '../lib/auth';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((response) => {
        if (!response.ok) throw new Error('Backend is unavailable.');
        setApiAvailable(true);
      })
      .catch(() => setApiAvailable(false));
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data: { error?: string; token?: string } = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      if (!data.token) throw new Error('Login succeeded, but the server did not return a session. Please try again.');
      setAuthToken(data.token);
      const requestedPath = (location.state as { from?: string } | null)?.from;
      const destination = requestedPath?.startsWith('/') && !requestedPath.startsWith('//')
        ? requestedPath
        : '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err instanceof TypeError
        ? 'Cannot reach the backend. Start the app with "npm run dev" and try again.'
        : err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-story">
        <Link to="/home" className="brand-wrap login-brand">
          <span className="brand-mark">P</span>
          <span>
            <span className="brand-name">ProofPixel AI</span>
            <small>Digital safety, before you share.</small>
          </span>
        </Link>
        <div>
          <span className="kicker">Your digital safety desk</span>
          <h1>Pause. Check.<br />Then trust.</h1>
          <p>Review suspicious messages, links, images, and social posts with transparent checks.</p>
        </div>
        <div className="login-assurance">
          <span className={`api-indicator ${apiAvailable === false ? 'offline' : ''}`} />
          <span>
            <strong>{apiAvailable === null ? 'Checking secure connection…' : apiAvailable ? 'Backend connected' : 'Backend not connected'}</strong>
            <small>{apiAvailable === false ? 'Start both app services with npm run dev.' : 'Your workspace is ready for sign-in.'}</small>
          </span>
        </div>
      </section>

      <section className="login-form-wrap">
        <div className="login-form-card">
          <span className="kicker">Welcome back</span>
          <h2>Sign in to ProofPixel</h2>
          <p className="muted">Use your account to open your investigation workspace.</p>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label htmlFor="login-email">Email address</label>
            <input id="login-email" type="email" autoComplete="username" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error ? <div className="status-pill danger" role="alert">{error}</div> : null}
            <button type="submit" className="button primary" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div className="login-divider"><span>New to ProofPixel?</span></div>
          <Link to="/register" className="button ghost login-register">Create an account</Link>
          <div className="demo-login">
            <strong>Demo account</strong>
            <span>demo@proofpixel.ai</span>
            <span>Password: demo123</span>
            <button type="button" className="text-button" onClick={() => { setEmail('demo@proofpixel.ai'); setPassword('demo123'); }}>
              Fill demo credentials
            </button>
          </div>
          <Link to="/home" className="login-home-link">Visit product overview</Link>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
