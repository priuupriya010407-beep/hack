import { useState, type FormEvent } from 'react';
import { AppHeader } from '../components/Layout';
import ResultFeedback from '../components/ResultFeedback';
import { Link } from 'react-router-dom';
import { recordInvestigation } from '../lib/api';
import { getImageDimensions, getImageVisualPixels, getSha256 } from '../lib/files';
import { analyzeRgbaPixels, type VisualMetrics } from '../lib/mediaAnalysis';

type ImageResult = {
  filename: string;
  size: number;
  width: number;
  height: number;
  sha256: string;
  visualMetrics: VisualMetrics;
  investigationId: string;
};

function ImageInvestigationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImageResult | null>(null);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setResult(null);
    if (!file) {
      setError('Choose an image file first.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const [sha256, dimensions, pixels] = await Promise.all([
        getSha256(file),
        getImageDimensions(file),
        getImageVisualPixels(file),
      ]);
      const visualMetrics = analyzeRgbaPixels(pixels);
      const record = await recordInvestigation({
        title: `Image review: ${file.name}`,
        scanType: 'image',
        resultStatus: 'Local visual diagnostics complete; no manipulation detector configured',
        notes: `SHA-256 ${sha256}; ${dimensions.width}x${dimensions.height}; ${file.size} bytes; brightness ${visualMetrics.averageLuminance.toFixed(1)}/255; contrast ${visualMetrics.contrast.toFixed(1)}; tonal bins ${visualMetrics.tonalBins}/16; shadow/highlight clipping ${visualMetrics.shadowClippingPercent.toFixed(1)}%/${visualMetrics.highlightClippingPercent.toFixed(1)}%; transparency ${visualMetrics.transparentPixelPercent.toFixed(1)}%`,
      });
      setResult({
        filename: file.name,
        size: file.size,
        width: dimensions.width,
        height: dimensions.height,
        sha256,
        visualMetrics,
        investigationId: record.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image checks failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <AppHeader />
      <main className="container page-section">
        <div className="section-header">
          <span className="kicker">Image integrity</span>
          <h2>Inspect an image file</h2>
          <p className="muted">The file stays in your browser. Alongside its hash and dimensions, local pixel diagnostics summarize brightness, contrast, clipping, tonal range, and transparency. This is not an AI manipulation detector.</p>
        </div>

        <form className="card" style={{ padding: 24 }} onSubmit={handleSubmit}>
          <div className="form-grid">
            <label htmlFor="image-file">Choose JPG, PNG, or WebP (max 25 MB)</label>
            <input
              id="image-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setResult(null);
                setError('');
              }}
            />
            {file ? <span className="muted">{file.name} · {(file.size / 1024).toFixed(1)} KB</span> : null}
            {file && file.size > 25 * 1024 * 1024 ? <span className="status-pill danger">Choose an image smaller than 25 MB.</span> : null}
            {error ? <div className="status-pill danger" role="alert">{error}</div> : null}
            <button type="submit" className="button primary" disabled={isAnalyzing || !file || file.size > 25 * 1024 * 1024}>
              {isAnalyzing ? 'Checking file…' : 'Inspect image and save to history'}
            </button>
          </div>
        </form>

        {result ? (
          <section className="summary-box" style={{ marginTop: 20 }} aria-live="polite">
            <p className="status-pill success" role="status">Image inspection completed and saved as investigation {result.investigationId}. <Link to="/history">View scan history</Link></p>
            <h3>Image integrity result</h3>
            <ul className="list-stack">
              <li>File: {result.filename} ({result.size.toLocaleString()} bytes)</li>
              <li>Dimensions: {result.width} × {result.height} pixels</li>
              <li>SHA-256: <code>{result.sha256}</code></li>
              <li>Average brightness: {result.visualMetrics.averageLuminance.toFixed(1)} / 255</li>
              <li>Pixel contrast (standard deviation): {result.visualMetrics.contrast.toFixed(1)}</li>
              <li>Dark clipped pixels: {result.visualMetrics.shadowClippingPercent.toFixed(1)}%</li>
              <li>Bright clipped pixels: {result.visualMetrics.highlightClippingPercent.toFixed(1)}%</li>
              <li>Distinct tonal ranges: {result.visualMetrics.tonalBins} / 16</li>
              <li>Transparent pixels: {result.visualMetrics.transparentPixelPercent.toFixed(1)}%</li>
              <li>Saved investigation: {result.investigationId}</li>
            </ul>
            <p className="muted">These measurements are descriptive visual diagnostics, not evidence of editing or authenticity. The hash identifies these exact file bytes, and neither establishes authorship.</p>
            <ResultFeedback investigationId={result.investigationId} resultKind="image" />
          </section>
        ) : null}
      </main>
    </>
  );
}

export default ImageInvestigationPage;
