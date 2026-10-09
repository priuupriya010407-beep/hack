import { useEffect, useState, type FormEvent } from 'react';
import { AppHeader } from '../components/Layout';
import { apiFetch, formatDate } from '../lib/api';

type Investigation = {
  id: string;
  title: string;
  scanType: string;
  resultStatus?: string;
  createdAt?: string;
  notes?: string;
};

type ReportItem = {
  id: string;
  title: string;
  type: string;
  status: string;
  generatedAt: string;
  data: Record<string, unknown> | null;
};

function ReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadData = async () => {
    const [loadedReports, loadedInvestigations] = await Promise.all([
      apiFetch<ReportItem[]>('/reports'),
      apiFetch<Investigation[]>('/investigations'),
    ]);
    setReports(loadedReports);
    setInvestigations(loadedInvestigations);
    setSelectedId((current) => current || loadedInvestigations[0]?.id || '');
  };

  useEffect(() => {
    loadData()
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load reports.'))
      .finally(() => setIsLoading(false));
  }, []);

  const generateReport = async (event: FormEvent) => {
    event.preventDefault();
    const investigation = investigations.find((item) => item.id === selectedId);
    if (!investigation) {
      setError('Choose an investigation first.');
      return;
    }
    setIsGenerating(true);
    setError('');
    setFeedback('');
    try {
      const created = await apiFetch<{ id: string }>('/reports', {
        method: 'POST',
        body: JSON.stringify({
          investigationId: investigation.id,
          reportType: `${investigation.scanType} investigation`,
          data: {
            investigationId: investigation.id,
            title: investigation.title,
            scanType: investigation.scanType,
            resultStatus: investigation.resultStatus,
            createdAt: investigation.createdAt,
            notes: investigation.notes,
            limitations: 'Summary generated from stored investigation metadata; not an independent forensic conclusion.',
          },
        }),
      });
      setFeedback(`Report ${created.id} was generated and saved. It is available below to download.`);
      try {
        await loadData();
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'Could not refresh the reports list.';
        setError(`Report ${created.id} was saved, but the list could not be refreshed. ${detail}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate report.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = (report: ReportItem) => {
    const file = new Blob([JSON.stringify({
      id: report.id,
      title: report.title,
      type: report.type,
      generatedAt: report.generatedAt,
      data: report.data,
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.id}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setFeedback(`Download started for ${report.id}.json.`);
  };

  return (
    <>
      <AppHeader />
      <main className="container page-section">
        <div className="section-header"><span className="kicker">Reports</span><h2>Evidence and report center</h2></div>
        {error ? <p className="status-pill danger" role="alert">{error}</p> : null}
        {feedback ? <p className="status-pill success" role="status">{feedback}</p> : null}
        <form className="card form-grid" style={{ padding: 20, marginBottom: 20 }} onSubmit={generateReport}>
          <label htmlFor="report-investigation">Generate report from a saved investigation</label>
          <select id="report-investigation" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} disabled={!investigations.length}>
            {!investigations.length ? <option value="">No investigations available</option> : null}
            {investigations.map((item) => <option key={item.id} value={item.id}>{item.title} ({item.id})</option>)}
          </select>
          <button type="submit" className="button primary" disabled={isGenerating || !investigations.length}>{isGenerating ? 'Generating…' : 'Generate report'}</button>
        </form>
        {isLoading ? <p className="muted">Loading reports…</p> : null}
        {!isLoading && reports.length === 0 ? <div className="card" style={{ padding: 20 }}><p className="muted">No reports yet. Save an investigation, then generate a report from it.</p></div> : null}
        <div className="three-grid">
          {reports.map((report) => (
            <article key={report.id} className="card" style={{ padding: 20 }}>
              <div className="label">{report.type}</div>
              <h3>{report.title}</h3>
              <p className="muted">{report.id} · {formatDate(report.generatedAt)}</p>
              <span className="badge">{report.status}</span>
              <div><button type="button" className="button ghost" style={{ marginTop: 14 }} onClick={() => downloadReport(report)}>Download JSON summary</button></div>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}

export default ReportsPage;
