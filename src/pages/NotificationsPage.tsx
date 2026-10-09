import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/Layout';
import { apiFetch, formatDate } from '../lib/api';

type Investigation = { id: string; title: string; scanType: string; status: string; resultStatus?: string; createdAt?: string };

function NotificationsPage() {
  const [items, setItems] = useState<Investigation[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<Investigation[]>('/investigations')
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load activity.'));
  }, []);

  return (
    <>
      <AppHeader />
      <main className="container page-section">
        <div className="section-header"><span className="kicker">Alerts</span><h2>Recent investigation activity</h2></div>
        {error ? <p className="status-pill danger" role="alert">{error}</p> : null}
        {items === null && !error ? <p className="muted">Loading recent activity…</p> : null}
        {items?.length === 0 ? <div className="card" style={{ padding: 24 }}><p className="muted">No activity yet. Your completed checks will appear here.</p><Link to="/dashboard" className="button ghost">Go to dashboard</Link></div> : null}
        {items?.length ? (
          <div className="card" style={{ padding: 24 }}>
            {items.map((item) => (
              <div key={item.id} className="feed-item">
                <div><strong>{item.title}</strong><div className="muted">{formatDate(item.createdAt)} · {item.id}</div><div className="muted">{item.resultStatus || item.status}</div></div>
                <span className={`status-pill ${item.status === 'completed' ? 'success' : 'warning'}`}>{item.scanType}</span>
              </div>
            ))}
          </div>
        ) : null}
      </main>
    </>
  );
}

export default NotificationsPage;
