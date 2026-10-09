import { useState, type FormEvent } from 'react';
import { AppHeader } from '../components/Layout';
import ResultFeedback from '../components/ResultFeedback';
import { Link } from 'react-router-dom';
import { apiFetch, recordInvestigation } from '../lib/api';

type UrlResult = {
  hostname?: string;
  https?: boolean;
  suspicious?: boolean;
  warnings?: string[];
  provider?: string;
  note?: string;
  investigationId: string;
};

function UrlSafetyPage() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<UrlResult | null>(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setResult(null);
    setIsScanning(true);

    try {
      const data = await apiFetch<{ hostname?: string; https?: boolean; suspicious?: boolean; warnings?: string[]; provider?: string; note?: string }>('/analyze/url', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      const record = await recordInvestigation({
        title: `URL safety review: ${data.hostname || 'link'}`,
        scanType: 'url',
        resultStatus: data.suspicious ? 'Suspicious structure indicators' : 'No obvious structure indicator',
        notes: `${data.provider || 'Structural checks'}; URL not stored.`,
      });
      setResult({ ...data, investigationId: record.id });
    } catch (err) {
      setError(err instanceof TypeError ? 'Cannot reach the backend. Check the server connection.' : err instanceof Error ? err.message : 'URL analysis failed.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <>
      <AppHeader />
      <div className="container page-section">
        <div className="section-header">
          <span className="kicker">URL safety</span>
          <h2>Link inspection</h2>
        </div>

        <form className="card" style={{ padding: 24 }} onSubmit={handleSubmit}>
          <div className="form-grid">
            <label htmlFor="url-to-check">Link to inspect (http:// or https://)</label>
            <input id="url-to-check" type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
            <p className="muted">Checks are structural heuristics only; no threat-intelligence provider is configured.</p>
            <button type="submit" className="button primary" disabled={isScanning}>{isScanning ? 'Inspecting…' : 'Inspect URL'}</button>
            {error ? <div className="status-pill danger" role="alert">{error}</div> : null}
          </div>
        </form>

        {result ? (
          <div className="summary-box" style={{ marginTop: 20 }} aria-live="polite">
            <p className="status-pill success" role="status">URL inspection completed and saved as investigation {result.investigationId}. <Link to="/history">View scan history</Link></p>
            <h3>Structural review</h3>
            <ul className="list-stack">
              <li>Normalized host: {result.hostname}</li>
              <li>HTTPS: {result.https ? 'yes' : 'no'}</li>
              <li>Suspicious pattern: {result.suspicious ? 'yes' : 'no'}</li>
              {(result.warnings || []).map((warning) => <li key={warning}>{warning}</li>)}
              {result.note ? <li>{result.note}</li> : null}
            </ul>
            <ResultFeedback investigationId={result.investigationId} resultKind="url" />
          </div>
        ) : null}
      </div>
    </>
  );
}

export default UrlSafetyPage;
