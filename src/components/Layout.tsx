import { Link, useNavigate } from 'react-router-dom';
import { clearAuthToken, getAuthToken } from '../lib/auth';

export function AppHeader() {
  const navigate = useNavigate();
  const isSignedIn = Boolean(getAuthToken());

  const signOut = () => {
    clearAuthToken();
    navigate('/login', { replace: true });
  };

  return (
    <header className="topbar">
      <div className="brand-wrap">
        <div className="brand-mark">P</div>
        <div>
          <div className="brand-name">ProofPixel AI</div>
          <small>Before You Believe It, Verify It.</small>
        </div>
      </div>

      <nav className="main-nav" aria-label="Main navigation">
        <Link to="/home">Home</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/history">Scan History</Link>
        <Link to="/investigation/image">Images</Link>
        <Link to="/investigation/video">Video</Link>
        <Link to="/certificate">Certificates</Link>
        <Link to="/message-safety">Messages</Link>
        <Link to="/url-safety">URL Safety</Link>
        <Link to="/social-safety">Social Scam Triage</Link>
        <Link to="/compare">Compare</Link>
        <Link to="/admin">Admin</Link>
      </nav>

      <div className="nav-actions">
        <Link to="/notifications" className="button ghost">Alerts</Link>
        <Link to="/profile" className="button ghost">Profile</Link>
        {isSignedIn
          ? <button type="button" className="button primary" onClick={signOut}>Sign out</button>
          : <Link to="/login" className="button primary">Sign in</Link>}
      </div>
    </header>
  );
}

export function AppFooter() {
  return (
    <footer className="site-footer">
      <div>
        <strong>ProofPixel AI</strong>
        <p>Digital investigation workflow for images, certificates, files, and online trust signals.</p>
      </div>
      <div>
        <h4>Quick links</h4>
        <ul>
          <li><Link to="/privacy">Privacy</Link></li>
          <li><Link to="/history">History</Link></li>
          <li><Link to="/reports">Reports</Link></li>
        </ul>
      </div>
      <div>
        <h4>Contact</h4>
        <ul>
          <li>support@proofpixel.ai</li>
          <li>+1 (415) 555-0149</li>
        </ul>
      </div>
    </footer>
  );
}
