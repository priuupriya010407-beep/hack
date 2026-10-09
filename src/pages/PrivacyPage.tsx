import { AppHeader } from '../components/Layout';

function PrivacyPage() {
  return (
    <>
      <AppHeader />
      <div className="container page-section">
        <div className="section-header">
          <span className="kicker">Privacy</span>
          <h2>Privacy and security</h2>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <p className="muted">Selected media checks run in your browser; file contents are not uploaded by image, video, or comparison tools. Scan history stores filenames and concise metadata, not the analyzed file bytes. Social text and full URLs are not included in saved history or share summaries. Use care with sensitive material.</p>
          <ul className="muted">
            <li>Files selected for local checks are processed in your browser and not stored by the backend.</li>
            <li>Account investigation and report records are scoped to the signed-in user.</li>
            <li>Certificate OCR fetches Tesseract language/runtime resources as needed; certificate image bytes are processed by the browser.</li>
            <li>Rule-based results are indicators only; no external threat intelligence or authenticity registry is configured.</li>
          </ul>
        </div>
      </div>
    </>
  );
}

export default PrivacyPage;
