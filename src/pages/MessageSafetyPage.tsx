import { useState, type FormEvent } from 'react';
import { AppHeader } from '../components/Layout';
import ResultFeedback from '../components/ResultFeedback';
import { Link } from 'react-router-dom';
import { apiFetch, recordInvestigation } from '../lib/api';

function MessageSafetyPage() {
  const [text, setText] = useState('Urgent action required. Your account is suspended. Reset your password and confirm your OTP now.');
  const [result, setResult] = useState<{ warnings?: string[]; summary?: string; status?: string; investigationId: string } | null>(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setResult(null);
    if (!text.trim()) {
      setError('Enter a message to check.');
      return;
    }
    if (text.length > 10000) {
      setError('Message must be 10,000 characters or fewer.');
      return;
    }
    setIsScanning(true);

    try {
      const data = await apiFetch<{ warnings?: string[]; summary?: string; status?: string }>('/analyze/message', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      const record = await recordInvestigation({
        title: 'Message safety review',
        scanType: 'message',
        resultStatus: data.status || 'Reviewed',
        notes: `${data.warnings?.length || 0} rule-based warning(s); message text not stored.`,
      });
      setResult({ ...data, investigationId: record.id });
    } catch (err) {
      setError(err instanceof TypeError ? 'Cannot reach the backend. Check the server connection.' : err instanceof Error ? err.message : 'Analysis failed.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <>
      <AppHeader />
      <div className="container page-section">
        <div className="section-header">
          <span className="kicker">Message review</span>
          <h2>Suspicious message and phishing analysis</h2>
        </div>

        <form className="card" style={{ padding: 24 }} onSubmit={handleSubmit}>
          <div className="form-grid">
              <label htmlFor="message-text">Message text (max 10,000 characters)</label>
              <textarea id="message-text" rows={8} maxLength={10000} value={text} onChange={(e) => setText(e.target.value)} />
              <button type="submit" className="button primary" disabled={isScanning}>{isScanning ? 'Checking…' : 'Run message scan'}</button>
            {error ? <div className="status-pill danger" role="alert">{error}</div> : null}
          </div>
        </form>

        {result ? (
          <div className="summary-box" style={{ marginTop: 20 }} aria-live="polite">
            <p className="status-pill success" role="status">Message review completed and saved as investigation {result.investigationId}. <Link to="/history">View scan history</Link></p>
            <h3>Findings</h3>
            <p className="muted">Status: {result.status}</p>
            <ul className="list-stack">
              {(result.warnings || []).map((warning) => <li key={warning}>{warning}</li>)}
              {result.summary ? <li>{result.summary}</li> : null}
            </ul>
            <ResultFeedback investigationId={result.investigationId} resultKind="message" />
          </div>
        ) : null}
      </div>
    </>
  );
}

export default MessageSafetyPage;
