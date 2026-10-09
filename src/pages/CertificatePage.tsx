import Tesseract from 'tesseract.js';
import { useState } from 'react';
import { AppHeader } from '../components/Layout';
import ResultFeedback from '../components/ResultFeedback';
import { Link } from 'react-router-dom';
import { recordInvestigation } from '../lib/api';
import { reviewCertificate } from '../lib/certificateReview';

function CertificatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [verificationUrl, setVerificationUrl] = useState('');
  const [verification, setVerification] = useState('');
  const [investigationId, setInvestigationId] = useState('');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  const extractText = async () => {
    setError('');
    setVerification('');
    setInvestigationId('');
    if (!file) {
      setError('Choose a certificate image first.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('Choose an image smaller than 15 MB.');
      return;
    }

    setIsExtracting(true);
    setProgress('Loading OCR engine…');
    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (message) => {
          const percent = Math.round(message.progress * 100);
          setProgress(message.status ? `${message.status} ${percent}%` : 'Recognizing text…');
        },
      });
      const text = result.data.text.trim();
      if (!text) throw new Error('No readable text was found. Try a clearer image.');
      setExtractedText(text);
      setProgress(`OCR complete · ${Math.round(result.data.confidence)}% text confidence`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR could not read this image.');
      setProgress('');
    } finally {
      setIsExtracting(false);
    }
  };

  const verifyDetails = async () => {
    setError('');
    setVerification('');
    if (!extractedText.trim()) {
      setError('Extract or enter certificate text before reviewing it.');
      return;
    }

    let review;
    if (verificationUrl.trim()) {
      try {
        review = reviewCertificate(extractedText, verificationUrl.trim());
      } catch {
        setError('Enter a valid issuer verification URL beginning with http:// or https://.');
        return;
      }
    } else {
      review = reviewCertificate(extractedText);
    }

    setIsReviewing(true);
    try {
      const record = await recordInvestigation({
        title: `Certificate review: ${file?.name || 'manual text'}`,
        scanType: 'certificate',
        resultStatus: review.status,
        notes: `OCR warning-pattern review only. ${review.warnings.length} warning(s); ${review.foundFields.length}/4 field patterns found. Issuer was not contacted; authenticity not verified.`,
      });
      setInvestigationId(record.id);
      const foundFieldsText = review.foundFields.length ? review.foundFields.join(', ') : 'none recognized';
      setVerification([
        review.status,
        `Text fields found: ${foundFieldsText}.`,
        ...(review.warnings.length ? [`Warnings: ${review.warnings.join(' ')}`] : ['No configured warning patterns were detected.']),
        review.urlAssessment,
        `Saved investigation: ${record.id}`,
      ].join(' '));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the certificate review.');
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <>
      <AppHeader />
      <main className="container page-section">
        <div className="section-header">
          <span className="kicker">Certificate review</span>
          <h2>Extract and review certificate text</h2>
          <p className="muted">The checker flags explicit demo/fake wording, missing text fields, and insecure HTTP links. These are warning signs only: the app cannot determine whether a real certificate is genuine or fake, and does not contact issuer registries.</p>
        </div>
        <section className="card" style={{ padding: 24 }}>
          <div className="form-grid">
            <label htmlFor="certificate-image">Choose JPG, PNG, or WebP certificate image (max 15 MB)</label>
            <input
              id="certificate-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setExtractedText('');
                setVerification('');
                setInvestigationId('');
                setError('');
              }}
            />
            <div className="form-row">
              <button type="button" className="button primary" disabled={isExtracting} onClick={extractText}>
                {isExtracting ? 'Reading certificate…' : 'Extract text with OCR'}
              </button>
              <button type="button" className="button ghost" disabled={isReviewing} onClick={verifyDetails}>
                {isReviewing ? 'Saving review…' : 'Review fields and URL'}
              </button>
            </div>
            {progress ? <span className="muted" role="status">{progress}</span> : null}
            {isReviewing ? <span className="muted" role="status">Saving the certificate review to your history…</span> : null}
            <label htmlFor="certificate-text">Review or correct the extracted text</label>
            <textarea id="certificate-text" rows={8} maxLength={10000} value={extractedText} onChange={(event) => setExtractedText(event.target.value)} placeholder="Extracted certificate text appears here. You can also paste text for field checks." />
            <label htmlFor="issuer-url">Official verification URL (optional)</label>
            <input id="issuer-url" type="url" value={verificationUrl} onChange={(event) => setVerificationUrl(event.target.value)} placeholder="https://issuer.example/verify" />
            {error ? <div className="status-pill danger" role="alert">{error}</div> : null}
          </div>
        </section>
        {verification ? (
          <section className="summary-box" style={{ marginTop: 20 }} aria-live="polite">
            <p className="status-pill success" role="status">Certificate review completed and saved to your investigation history. <Link to="/history">View scan history</Link></p>
            <h3>Warning-pattern review — not an authenticity verdict</h3>
            <p>{verification}</p>
            <p className="muted">Warning signs do not prove fraud, and no listed warning signs do not prove a certificate is genuine. Confirm certificates directly with the official issuer using a contact method you find independently.</p>
            <ResultFeedback investigationId={investigationId} resultKind="certificate" />
          </section>
        ) : null}
      </main>
    </>
  );
}

export default CertificatePage;
