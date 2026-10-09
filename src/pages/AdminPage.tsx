import { useEffect, useState } from 'react';
import { AppHeader } from '../components/Layout';
import { apiFetch } from '../lib/api';

type AdminMetrics = {
  totalInvestigations: number;
  reportsGenerated: number;
  pendingJobs: number;
  failedScans: number;
  modelAvailable: boolean;
};

function AdminPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<AdminMetrics>('/admin/metrics')
      .then(setMetrics)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load admin metrics.'));
  }, []);

  const cards = metrics ? [
    { label: 'Your investigations', value: String(metrics.totalInvestigations) },
    { label: 'Your reports', value: String(metrics.reportsGenerated) },
    { label: 'Pending jobs', value: String(metrics.pendingJobs) },
    { label: 'Failed scans', value: String(metrics.failedScans) },
  ] : [];

  return (
    <>
      <AppHeader />
      <main className="container page-section">
        <div className="section-header"><span className="kicker">Admin</span><h2>Operations status</h2></div>
        {error ? <div className="card" style={{ padding: 20 }}><p className="status-pill danger" role="alert">{error}</p><p className="muted">Admin metrics are available to administrator accounts only. This page no longer displays invented system statistics.</p></div> : null}
        {!metrics && !error ? <p className="muted">Loading real workspace metrics…</p> : null}
        {metrics ? (
          <>
            <div className="stats-grid">
              {cards.map((card) => <div key={card.label} className="metric-box"><span className="muted">{card.label}</span><strong>{card.value}</strong></div>)}
            </div>
            <div className="card" style={{ marginTop: 20, padding: 20 }}>
              <h3>Analysis service</h3>
              <p className={`status-pill ${metrics.modelAvailable ? 'success' : 'warning'}`}>{metrics.modelAvailable ? 'Configured' : 'Not configured'}</p>
              <p className="muted">Investigation data is scoped to your account. No global system health or storage figures are available from this demo backend.</p>
            </div>
          </>
        ) : null}
      </main>
    </>
  );
}

export default AdminPage;
