import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppHeader } from '../components/Layout';
import ResultFeedback from '../components/ResultFeedback';
import { apiFetch, recordInvestigation } from '../lib/api';

type SocialAssessment = {
  score: number;
  level: 'low' | 'elevated' | 'high';
  signals: Array<{ label: string; category: string }>;
  recommendedActions: string[];
  rescueSteps: Array<{ id: string; title: string; detail: string; priority: number }>;
  checks: string[];
  mode: string;
  limitation: string;
  hostname: string | null;
  source: string;
};

type SavedSocialAssessment = SocialAssessment & {
  investigationId: string;
};

function SocialSafetyPage() {
  const location = useLocation();
  const [sharedPost] = useState(() => {
    const params = new URLSearchParams(location.hash.slice(1));
    return {
      source: params.get('source') || '',
      text: params.get('text') || '',
      url: params.get('url') || '',
    };
  });
  const [source] = useState(sharedPost.source);
  const [text, setText] = useState(sharedPost.text);
  const [url, setUrl] = useState(sharedPost.url);
  const [assessment, setAssessment] = useState<SavedSocialAssessment | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [copyStatus, setCopyStatus] = useState<{ message: string; success: boolean } | null>(null);

  useEffect(() => {
    if (location.hash) {
      window.history.replaceState(null, '', `${location.pathname}${location.search}`);
    }
  }, [location.hash, location.pathname, location.search]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setAssessment(null);
    setReportReady(false);
    setCompletedSteps([]);
    setCopyStatus(null);
    setIsSubmitting(true);

    try {
      const result = await apiFetch<SocialAssessment>('/analyze/social', {
        method: 'POST',
        body: JSON.stringify({ text: text.trim(), url: url.trim(), source: source || 'manual' }),
      });
      const record = await recordInvestigation({
        title: `Social safety review: ${result.source}`,
        scanType: 'social',
        resultStatus: `${result.level} indicator level (${result.score}/100)`,
        notes: `${result.signals.length} signal(s); original text and URL not stored.`,
      });
      setAssessment({ ...result, investigationId: record.id });
    } catch (err) {
      setError(err instanceof TypeError
        ? 'Cannot reach the backend. Check the server connection and try again.'
        : err instanceof Error ? err.message : 'Review failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildShareSummary = () => {
    if (!assessment) return '';
    return [
      'PROOFPIXEL SOCIAL SAFETY SUMMARY',
      `Reviewed: ${new Date().toISOString()}`,
      `Source: ${assessment.source}`,
      `Indicator score: ${assessment.score}/100 (${assessment.level.toUpperCase()})`,
      `Link host: ${assessment.hostname || 'Not provided'}`,
      '',
      'Signals:',
      ...(assessment.signals.length ? assessment.signals.map(({ category, label }) => `- ${category}: ${label}`) : ['- No listed scam-pattern signals detected']),
      '',
      'Recommended actions:',
      ...assessment.recommendedActions.map((action) => `- ${action}`),
      '',
      'Checks performed:',
      ...assessment.checks.map((check) => `- ${check}`),
      '',
      'Recovery checklist:',
      ...assessment.rescueSteps.map((step) => `- [${completedSteps.includes(step.id) ? 'x' : ' '}] ${step.title}`),
      '',
      `Limitations: ${assessment.limitation}`,
      '',
      'Privacy: The original post text and full URL are intentionally excluded from this summary.',
    ].join('\n');
  };

  const downloadReport = () => {
    const report = buildShareSummary();
    if (!report) return;
    const file = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = `proofpixel-safety-summary-${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
    setReportReady(true);
  };

  const copySummary = async () => {
    const report = buildShareSummary();
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopyStatus({ message: 'Copied a summary without the original post text or full link.', success: true });
    } catch {
      setCopyStatus({ message: 'Clipboard access is unavailable here. Use Download share-safe summary instead.', success: false });
    }
  };

  return (
    <>
      <AppHeader />
      <main className="container page-section">
        <div className="section-header">
          <span className="kicker">Instagram + Facebook</span>
          <h2>Check a social post before you trust it</h2>
          <p className="muted">Paste a post or message, include a link, or select text on Instagram/Facebook and send it here with the browser extension.</p>
          {source ? <span className="status-pill success">Shared from {source}</span> : null}
        </div>

        <div className="social-safety-grid">
          <form className="card social-safety-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label htmlFor="social-post">Post or message text</label>
              <textarea id="social-post" rows={7} maxLength={10000} value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste the caption, message, or selected social post text…" />
              <label htmlFor="social-link">Link shared in the post (optional)</label>
              <input id="social-link" type="url" maxLength={2048} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" />
              {error ? <div className="status-pill danger" role="alert">{error}</div> : null}
              <button type="submit" className="button primary" disabled={isSubmitting}>
                {isSubmitting ? 'Checking…' : 'Check post and link'}
              </button>
            </div>
          </form>

          <aside className="card social-extension-card">
            <span className="label">Browser add-on</span>
            <h3>Check while browsing</h3>
            <ol>
              <li>Install the ProofPixel extension from the project’s <code>extension</code> folder.</li>
              <li>On Instagram or Facebook, select the post text or a link.</li>
              <li>Click the extension to review only what you selected.</li>
            </ol>
            <p className="muted">It does not monitor your feed, read private messages, or run in the background. The checks are rule-based signals, not a definitive verdict.</p>
            <Link to="/privacy" className="text-button">Privacy details</Link>
          </aside>
        </div>

        {assessment ? (
          <section className="social-results" aria-live="polite">
            <article className="summary-box social-assessment">
              <p className="status-pill success" role="status">Social post review completed and saved as investigation {assessment.investigationId}. <Link to="/history">View scan history</Link></p>
              <div className="social-assessment-heading">
                <div>
                  <span className="kicker">Explainable scam triage</span>
                  <h3>Risk indicators</h3>
                </div>
                <span className={`risk-score ${assessment.level}`} aria-label={`${assessment.score} out of 100, ${assessment.level} indicator level`}>
                  <strong>{assessment.score}</strong><small>/100</small>
                </span>
              </div>
              <div className="risk-meter" role="meter" aria-label="Indicator score" aria-valuemin={0} aria-valuemax={100} aria-valuenow={assessment.score}>
                <span className={assessment.level} style={{ width: `${assessment.score}%` }} />
              </div>
              <span className={`status-pill ${assessment.level === 'high' ? 'danger' : assessment.level === 'elevated' ? 'warning' : 'success'}`}>
                {assessment.level === 'high' ? 'High indicator level' : assessment.level === 'elevated' ? 'Some caution indicators' : 'Few listed indicators'}
              </span>
              <h4>Why it was flagged</h4>
              {assessment.signals.length ? (
                <ul className="list-stack">{assessment.signals.map(({ category, label }) => <li key={category}>{category} — {label}</li>)}</ul>
              ) : <p className="muted">No listed scam-pattern signals were detected in the provided content.</p>}
              <h4>What to do next</h4>
              <ul className="list-stack">{assessment.recommendedActions.map((action) => <li key={action}>{action}</li>)}</ul>
              <div className="rescue-plan">
                <div className="rescue-plan-heading">
                  <div>
                    <span className="kicker">Scam Rescue Mode</span>
                    <h4>Recovery checklist</h4>
                  </div>
                  <span className="status-pill warning">Session only</span>
                </div>
                <p className="muted">If you already interacted with the post, take the steps that apply. Your checklist progress is not saved.</p>
                <ol className="rescue-steps">
                  {assessment.rescueSteps.map((step, index) => {
                    const checked = completedSteps.includes(step.id);
                    return (
                      <li key={step.id} className={checked ? 'completed' : ''}>
                        <label>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setCompletedSteps((current) => (
                              checked ? current.filter((id) => id !== step.id) : [...current, step.id]
                            ))}
                          />
                          <span className="rescue-step-number">{index + 1}</span>
                          <span className="rescue-step-copy"><strong>{step.title}</strong><small>{step.detail}</small></span>
                        </label>
                      </li>
                    );
                  })}
                </ol>
              </div>
              <details className="checks-details">
                <summary>Checks performed</summary>
                <ul className="list-stack">{assessment.checks.map((check) => <li key={check}>{check}</li>)}</ul>
              </details>
              <p className="assessment-limitation">{assessment.limitation}</p>
              <div className="report-actions">
                <button type="button" className="button ghost" onClick={copySummary}>Copy share-safe summary</button>
                <button type="button" className="button primary" onClick={downloadReport}>Download share-safe summary</button>
                {reportReady ? <span className="status-pill success" role="status">Share-safe summary download started; original post text was not included.</span> : null}
                {copyStatus ? <span className={`status-pill ${copyStatus.success ? 'success' : 'danger'}`} role={copyStatus.success ? 'status' : 'alert'}>{copyStatus.message}</span> : null}
              </div>
              <ResultFeedback investigationId={assessment.investigationId} resultKind="social" />
            </article>
          </section>
        ) : null}
      </main>
    </>
  );
}

export default SocialSafetyPage;
