import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/Layout';
import { apiFetch } from '../lib/api';
import { clearAuthToken } from '../lib/auth';

type UserProfile = { id: string; name: string; email: string; role: string };

function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<UserProfile>('/auth/me')
      .then(setProfile)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load your profile.'));
  }, []);

  const signOut = () => {
    clearAuthToken();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <AppHeader />
      <div className="container page-section">
        <div className="section-header">
          <span className="kicker">Account</span>
          <h2>User profile</h2>
        </div>

        <div className="card" style={{ padding: 24 }}>
          {error ? <p className="status-pill danger" role="alert">{error}</p> : null}
          {profile ? (
            <div className="profile-row">
              <div>
                <div className="brand-name">{profile.name}</div>
                <div className="muted">{profile.email} · {profile.role}</div>
              </div>
              <span className="status-pill success">Authenticated</span>
            </div>
          ) : !error ? <p className="muted">Loading account…</p> : null}

          <p className="muted" style={{ marginTop: 18 }}>Media integrity checks are processed in your browser. Investigation summaries are stored in your account history; file bytes are not stored.</p>
          <button type="button" className="button ghost" style={{ marginTop: 20 }} onClick={signOut}>Sign out</button>
        </div>
      </div>
    </>
  );
}

export default ProfilePage;
