import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

type ResultKind = 'image' | 'video' | 'certificate' | 'url' | 'message' | 'social' | 'comparison';

const resultExplanations: Record<ResultKind, string> = {
  image: 'This checks image measurements and a file hash. It does not detect AI-generated images or confirm the original source.',
  video: 'This checks metadata and three sampled frames. No deepfake or AI-video detector is configured.',
  certificate: 'This checks OCR text patterns only. The issuer is not contacted, so the credential is not authenticated.',
  url: 'This checks URL structure only. It does not query live threat-intelligence databases or establish who owns the site.',
  message: 'This checks for rule-based scam language. It does not establish who wrote the message or whether it was AI-generated.',
  social: 'This checks rule-based scam signals. The score is not a probability and does not verify the account, post, or author.',
  comparison: 'Matching SHA-256 hashes show the files are byte-for-byte identical; different hashes show they differ. Neither result identifies the original.',
};

function ResultFeedback({ investigationId, resultKind }: { investigationId: string; resultKind: ResultKind }) {
  const [response, setResponse] = useState<'yes' | 'no' | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    apiFetch<{ feedback: { helpful: boolean } | null }>(`/investigations/${encodeURIComponent(investigationId)}/feedback`)
      .then(({ feedback }) => {
        if (isCurrent && feedback) setResponse(feedback.helpful ? 'yes' : 'no');
      })
      .catch((err: unknown) => {
        if (isCurrent) setError(err instanceof Error ? err.message : 'Could not load your saved feedback.');
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => { isCurrent = false; };
  }, [investigationId]);

  const submitFeedback = async (helpful: boolean) => {
    setError('');
    setIsSubmitting(true);
    try {
      await apiFetch<{ saved: boolean }>(`/investigations/${encodeURIComponent(investigationId)}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ helpful }),
      });
      setResponse(helpful ? 'yes' : 'no');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card" style={{ padding: 16, marginTop: 16 }} aria-label="Result feedback">
      <h4>Can this prove whether it is real or fake?</h4>
      <ul className="list-stack">
        <li><strong>Original / genuine:</strong> Not confirmed by this check.</li>
        <li><strong>Fake / manipulated:</strong> Not confirmed by this check.</li>
        <li><strong>AI-generated:</strong> Not assessed by this check.</li>
      </ul>
      <p className="muted">{resultExplanations[resultKind]} A warning is not proof of fraud, and no warning is not proof of authenticity. Verify important claims with the original source or official issuer.</p>
      {isLoading ? <p className="muted" role="status">Loading your saved feedback…</p> : null}
      {!isLoading && response ? (
        <p className="status-pill success" role="status">Thanks—your feedback was saved.</p>
      ) : null}
      {!isLoading && !response ? (
        <>
          <p><strong>Was this result helpful?</strong></p>
          {error ? <p className="status-pill danger" role="alert">{error}</p> : null}
          <div className="form-row">
            <button type="button" className="button ghost" disabled={isSubmitting} onClick={() => submitFeedback(true)}>{isSubmitting ? 'Saving…' : response === 'yes' ? 'Helpful (saved)' : 'Yes, helpful'}</button>
            <button type="button" className="button ghost" disabled={isSubmitting} onClick={() => submitFeedback(false)}>{isSubmitting ? 'Saving…' : response === 'no' ? 'Not helpful (saved)' : 'Not really'}</button>
          </div>
        </>
      ) : null}
    </section>
  );
}

export default ResultFeedback;
