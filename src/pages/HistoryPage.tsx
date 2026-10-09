import { useEffect, useState } from 'react';
import { AppHeader } from '../components/Layout';
import { apiFetch, formatDate } from '../lib/api';
import { investigationsToCsv } from '../lib/historyExport';
import { getInvestigationSeverity, type InvestigationSeverity } from '../lib/investigationSeverity';

type Investigation = {
  id: string;
  title: string;
  scanType: string;
  status: string;
  resultStatus?: string;
  createdAt?: string;
  notes?: string;
  hasReport?: boolean;
};

function HistoryPage() {
  const [items, setItems] = useState<Investigation[] | null>(null);
  const [search, setSearch] = useState('');
  const [scanType, setScanType] = useState('all');
  const [severityFilter, setSeverityFilter] = useState<InvestigationSeverity | 'all'>('all');
  const [error, setError] = useState('');
  const [exportMessage, setExportMessage] = useState('');
  const [undoMessage, setUndoMessage] = useState('');
  const [undoError, setUndoError] = useState('');
  const [isUndoing, setIsUndoing] = useState(false);

  useEffect(() => {
    apiFetch<Investigation[]>('/investigations')
      .then((loadedItems) => {
        setItems(loadedItems);
        setUndoError('');
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load scan history.'));
  }, []);

  const filteredItems = (items || []).filter((item) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [item.title, item.id, item.resultStatus, item.notes]
      .some((value) => value?.toLowerCase().includes(query));
    return matchesSearch
      && (scanType === 'all' || item.scanType === scanType)
      && (severityFilter === 'all' || getInvestigationSeverity(item.resultStatus) === severityFilter);
  });
  const severityCounts = (items || []).reduce<Record<InvestigationSeverity, number>>((counts, item) => {
    counts[getInvestigationSeverity(item.resultStatus)] += 1;
    return counts;
  }, { high: 0, caution: 0, none: 0, unassessed: 0 });

  const downloadCsv = () => {
    if (!items) return;
    setExportMessage('');
    const blob = new Blob([investigationsToCsv(filteredItems)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `proofpixel-investigations-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setExportMessage(`CSV export started with ${filteredItems.length} investigation${filteredItems.length === 1 ? '' : 's'} matching the current filters.`);
  };

  const undoLatest = async (item: Investigation) => {
    setUndoError('');
    setUndoMessage('');
    setIsUndoing(true);
    try {
      await apiFetch<{ undoneId: string }>(`/investigations/${encodeURIComponent(item.id)}/undo`, { method: 'DELETE' });
      setItems((current) => current?.filter((currentItem) => currentItem.id !== item.id) ?? []);
      setUndoMessage(`Undid the most recent investigation: ${item.title}.`);
    } catch (err) {
      setUndoError(err instanceof Error ? err.message : 'Could not undo this investigation.');
    } finally {
      setIsUndoing(false);
    }
  };

  const latestItem = items?.[0];
  const undoCandidate = items?.find((item) => !item.hasReport);

  return (
    <>
      <AppHeader />
      <main className="container page-section">
        <div className="section-header"><span className="kicker">History</span><h2>Scan history</h2><p className="muted">Your saved checks and actions appear here.</p></div>
        {error ? <p className="status-pill danger" role="alert">{error}</p> : null}
        {undoError ? <div className="card" style={{ padding: 16, marginBottom: 16 }}><p className="status-pill danger" role="alert">Undo not completed</p><p>{undoError}</p></div> : null}
        {undoMessage ? <div className="card" style={{ padding: 16, marginBottom: 16 }}><p className="status-pill success" role="status">Undo completed</p><p>{undoMessage}</p></div> : null}
        {items === null && !error ? <p className="muted">Loading your scans…</p> : null}
        {items !== null ? (
          <>
          <section className="card" style={{ padding: 20, marginBottom: 20 }} aria-labelledby="undo-latest-heading">
            <span className="kicker">Recent action</span>
            <h3 id="undo-latest-heading">Undo your latest saved check</h3>
            {undoCandidate ? (
              <>
                {latestItem?.hasReport ? <p className="status-pill warning" role="status">Your newest check has a saved report and is protected. The next recent check without a report can still be undone.</p> : null}
                <p><strong>{undoCandidate.title}</strong></p>
                <p className="muted">{undoCandidate.id} · {formatDate(undoCandidate.createdAt)}</p>
                <p className="muted">Undo removes this check from history. Only your most recent check without a saved report can be undone.</p>
                <button type="button" className="button ghost" disabled={isUndoing} onClick={() => undoLatest(undoCandidate)}>
                  {isUndoing ? 'Undoing your recent check…' : 'Undo recent saved check'}
                </button>
              </>
            ) : latestItem ? (
              <p className="status-pill warning" role="status">Your recent checks all have saved reports, so they are protected and cannot be undone.</p>
            ) : (
              <p className="muted">No saved checks yet. After you complete a check, you can undo your latest one here.</p>
            )}
          </section>
          <section className="card" style={{ padding: 20, marginBottom: 20 }} aria-labelledby="severity-summary-heading">
            <h3 id="severity-summary-heading">Indicator overview</h3>
            <p className="muted">Groups saved results by their wording only. These categories do not prove content is genuine, fake, or AI-generated.</p>
            <div className="form-row">
              <button type="button" className="button ghost" aria-pressed={severityFilter === 'all'} onClick={() => setSeverityFilter('all')}>
                All checks ({items.length})
              </button>
              <button type="button" className="button ghost" aria-pressed={severityFilter === 'high'} onClick={() => setSeverityFilter('high')}>
                Strong warning indicators ({severityCounts.high})
              </button>
              <button type="button" className="button ghost" aria-pressed={severityFilter === 'caution'} onClick={() => setSeverityFilter('caution')}>
                Caution indicators ({severityCounts.caution})
              </button>
              <button type="button" className="button ghost" aria-pressed={severityFilter === 'none'} onClick={() => setSeverityFilter('none')}>
                No listed indicators ({severityCounts.none})
              </button>
              <button type="button" className="button ghost" aria-pressed={severityFilter === 'unassessed'} onClick={() => setSeverityFilter('unassessed')}>
                Not assessed ({severityCounts.unassessed})
              </button>
            </div>
          </section>
          <div className="form-row" style={{ marginBottom: 16 }}>
            <label>
              Search history
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, result, ID, or notes" />
            </label>
            <label>
              Scan type
              <select value={scanType} onChange={(event) => setScanType(event.target.value)}>
                <option value="all">All types</option>
                {[...new Set(items.map((item) => item.scanType))].sort().map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <button type="button" className="button ghost" onClick={downloadCsv}>Export visible results as CSV</button>
            {exportMessage ? <span className="status-pill success" role="status">{exportMessage}</span> : null}
          </div>
          </>
        ) : null}
        {items?.length === 0 ? <div className="card" style={{ padding: 18 }}><p className="muted">No scans yet. Completed checks will appear here.</p></div> : null}
        {items?.length && filteredItems.length === 0 ? <div className="card" style={{ padding: 18 }}><p className="muted">No investigations match these filters.</p></div> : null}
        {filteredItems.length ? (
          <div className="card" style={{ padding: 18 }}>
            {filteredItems.map((item) => (
              <article key={item.id} style={{ borderBottom: '1px solid var(--line)', padding: '12px 0' }}>
                <strong>{item.title}</strong>
                <div className="muted">{item.id} · {item.scanType} · {formatDate(item.createdAt)}</div>
                <div className="muted">{item.status} · {item.resultStatus || 'No result summary'}</div>
              </article>
            ))}
          </div>
        ) : null}
      </main>
    </>
  );
}

export default HistoryPage;
