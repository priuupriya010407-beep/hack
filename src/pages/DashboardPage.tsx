import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/Layout';
import { apiFetch } from '../lib/api';
import { createWorkspaceBackup, serializeWorkspaceBackup } from '../lib/workspaceBackup';

type DashboardData = {
  total: number;
  imageScans: number;
  videoScans: number;
  certificateReviews: number;
  reportsGenerated: number;
  activity: Array<{ id: string; title: string; scanType: string; status: string; resultStatus?: string; createdAt: string; notes?: string }>;
};

type UserProfile = { id: string; name: string; email: string; role: string };
type Investigation = { id: string; title: string; scanType: string; status: string; resultStatus?: string; createdAt?: string; notes?: string };
type Report = { id: string; title: string; type: string; status: string; generatedAt: string; data: Record<string, unknown> | null };

function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [backupError, setBackupError] = useState('');
  const [backupMessage, setBackupMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    apiFetch<DashboardData>('/dashboard')
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load dashboard data.'));
  }, []);

  const exportWorkspace = async () => {
    setIsExporting(true);
    setBackupError('');
    setBackupMessage('');
    let objectUrl = '';
    try {
      const [profile, investigations, reports] = await Promise.all([
        apiFetch<UserProfile>('/auth/me'),
        apiFetch<Investigation[]>('/investigations'),
        apiFetch<Report[]>('/reports'),
      ]);
      const backup = createWorkspaceBackup(profile, investigations, reports);
      const file = new Blob([serializeWorkspaceBackup(backup)], { type: 'application/json;charset=utf-8' });
      objectUrl = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `proofpixel-workspace-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      setBackupMessage('Workspace backup download started. It includes your profile, investigations, and reports—not media files.');
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : 'Could not export your workspace.');
    } finally {
      if (objectUrl) window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      setIsExporting(false);
    }
  };

  const stats = data ? [
    { label: 'Total investigations', value: String(data.total) },
    { label: 'Image scans', value: String(data.imageScans) },
    { label: 'Video scans', value: String(data.videoScans) },
    { label: 'Reports generated', value: String(data.reportsGenerated) },
  ] : [];

  return (
    <>
      <AppHeader />
      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="brand-name">Workspace</div>
          <ul>
            <li><Link to="/dashboard">Overview</Link></li>
            <li><Link to="/investigation/image">Image investigation</Link></li>
            <li><Link to="/investigation/video">Video investigation</Link></li>
            <li><Link to="/certificate">Certificates</Link></li>
            <li><Link to="/history">Scan history</Link></li>
            <li><Link to="/reports">Reports</Link></li>
          </ul>
        </aside>
        <main className="content">
          <section className="section-header">
            <span className="kicker">Dashboard</span>
            <h2>Investigation overview</h2>
            <p className="muted">Download a portable backup of your profile, saved investigations, and reports. Media files are never included.</p>
            <button type="button" className="button ghost" onClick={exportWorkspace} disabled={isExporting}>
              {isExporting ? 'Preparing workspace backup…' : 'Export my workspace data'}
            </button>
            {backupError ? <p className="status-pill danger" role="alert">{backupError}</p> : null}
            {backupMessage ? <p className="status-pill success" role="status">{backupMessage}</p> : null}
          </section>
          {error ? <p className="status-pill danger" role="alert">{error}</p> : null}
          {!data && !error ? <p className="muted">Loading your investigations…</p> : null}
          <div className="stats-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="metric-box">
                <span className="muted">{stat.label}</span>
                <strong>{stat.value}</strong>
                <span className="status-pill success">Your workspace</span>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="section-header"><h3>Recent activity</h3></div>
            {data?.activity.length ? (
              <ul>
                {data.activity.map((item) => (
                  <li key={item.id} style={{ listStyle: 'none', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                      <div><strong>{item.title}</strong><div className="muted">{item.id} · {item.scanType}</div></div>
                      <span className={`status-pill ${item.status === 'completed' ? 'success' : 'warning'}`}>{item.resultStatus || item.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : data ? (
              <p className="muted">No investigations yet. Start with an <Link to="/investigation/image">image check</Link> or <Link to="/social-safety">social scam triage</Link>.</p>
            ) : null}
          </div>
        </main>
      </div>
    </>
  );
}

export default DashboardPage;
