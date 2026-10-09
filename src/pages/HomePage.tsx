import { Link } from 'react-router-dom';
import { AppFooter, AppHeader } from '../components/Layout';

const features = [
  { title: 'Image checks', text: 'Calculate a SHA-256 fingerprint and image dimensions locally. No manipulation-detection model is configured.' },
  { title: 'Video review', text: 'Read video duration and dimensions, sample a frame, and calculate its local SHA-256 fingerprint.' },
  { title: 'Certificate OCR', text: 'Extract text from certificate images in your browser and review basic fields. Issuers are not independently verified.' },
  { title: 'Message scan', text: 'Detect urgency, credential requests, and phishing language in email or chat content.' },
  { title: 'URL inspection', text: 'Check host structure, HTTPS posture, and common lookalike patterns before clicking.' },
  { title: 'Social post safety', text: 'Review selected Instagram and Facebook post text or links on demand with the browser add-on.' },
  { title: 'Explainable scam triage', text: 'Combine urgency, credential, payment, impersonation, and link signals into a transparent score and safe next steps.' },
  { title: 'Privacy-safe incident summary', text: 'Download a shareable review that includes findings and actions—but leaves out the original post and full link.' },
  { title: 'Scam Rescue Mode', text: 'Follow a tailored recovery checklist for compromised accounts, possible payment loss, and platform reporting.' },
  { title: 'Evidence reports', text: 'Generate concise findings with clear status, limitations, and next-step guidance.' },
];

const toolStack = [
  'Hash comparison',
  'Metadata inspection',
  'OCR extraction',
  'Threat flagging',
  'Report center',
  'Admin oversight',
];

function HomePage() {
  return (
    <>
      <AppHeader />
      <main>
        <section className="page-section hero">
          <div className="container hero-grid">
            <div>
              <span className="kicker">Digital trust platform</span>
              <h1>Before You Believe It, Verify It.</h1>
              <p className="lead">
                Review images, videos, certificates, and suspicious messages with forensic checks, hash validation, and explainable evidence.
              </p>
              <div className="hero-actions">
                <Link to="/login" className="button primary">Sign in to get started</Link>
                <a href="#features" className="button ghost">Explore tools</a>
              </div>
              <div className="disclaimer">
                ProofPixel AI supports analysis with indicators, not proof. Confirm major claims through trusted original sources.
              </div>
            </div>

            <div className="hero-panel">
              <div className="badge">Live overview</div>
              <div className="metric-grid" style={{ marginTop: 18 }}>
                <div className="metric-box"><span className="muted">Cases</span><strong>128</strong></div>
                <div className="metric-box"><span className="muted">Reports</span><strong>74</strong></div>
                <div className="metric-box"><span className="muted">Flags</span><strong>3</strong></div>
              </div>
              <div className="panel" style={{ padding: 18, marginTop: 20 }}>
                <div style={{ marginBottom: 8 }}><strong>Workflow</strong></div>
                <div className="muted">Upload → hash → inspect → score → report</div>
              </div>
            </div>
          </div>
        </section>

        <section className="page-section">
          <div className="container">
            <div className="section-header">
              <span className="kicker">Why it matters</span>
              <h2>Trust is easy to lose and hard to rebuild.</h2>
            </div>
            <div className="three-grid">
              <div className="card">
                <div className="label">Speed</div>
                <h3>Manipulation spreads fast</h3>
                <p className="muted">Images, videos, and forged documents can move through networks before traditional review catches up.</p>
              </div>
              <div className="card">
                <div className="label">Risk</div>
                <h3>Bad judgment costs more</h3>
                <p className="muted">Weak verification leads to damaged trust, false claims, and expensive mistakes in hiring and communications.</p>
              </div>
              <div className="card">
                <div className="label">Need</div>
                <h3>Clear evidence</h3>
                <p className="muted">Teams need practical tools that explain what was checked and where the uncertainty remains.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="page-section" id="features">
          <div className="container">
            <div className="section-header">
              <span className="kicker">Core tools</span>
              <h2>Built for real investigation workflows.</h2>
            </div>
            <div className="feature-grid">
              {features.map((feature) => (
                <div key={feature.title} className="card">
                  <div className="label">Feature</div>
                  <h3>{feature.title}</h3>
                  <p className="muted">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="page-section">
          <div className="container">
            <div className="section-header">
              <span className="kicker">Platform stack</span>
              <h2>Everything needed for a full review.</h2>
            </div>
            <div className="tool-grid">
              {toolStack.map((tool) => (
                <div key={tool} className="tool-pill">{tool}</div>
              ))}
            </div>
          </div>
        </section>

        <section className="page-section">
          <div className="container">
            <div className="section-header">
              <span className="kicker">Limitations</span>
              <h2>Transparent by design.</h2>
            </div>
            <div className="card">
              <p className="muted">ProofPixel AI does not claim to detect every deepfake, manipulated image, or forged certificate. Results are probabilistic and may have false positives or false negatives. Use the output as a decision aid, not a final verdict.</p>
            </div>
          </div>
        </section>
      </main>
      <AppFooter />
    </>
  );
}

export default HomePage;
