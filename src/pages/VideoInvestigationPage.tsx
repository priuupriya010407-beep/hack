import { useState, type FormEvent } from 'react';
import { AppHeader } from '../components/Layout';
import ResultFeedback from '../components/ResultFeedback';
import { Link } from 'react-router-dom';
import { recordInvestigation } from '../lib/api';
import { getSha256, getVideoMetadata } from '../lib/files';
import { analyzeRgbaPixels, type VisualMetrics } from '../lib/mediaAnalysis';

type VideoFrameSample = {
  timestamp: number;
  previewUrl: string;
  visualMetrics: VisualMetrics;
};

type VideoResult = {
  filename: string;
  sha256: string;
  duration: number;
  width: number;
  height: number;
  detectorStatus: string;
  investigationId: string;
  frames: VideoFrameSample[];
};

async function captureFrames(url: string, duration: number): Promise<VideoFrameSample[]> {
  const video = document.createElement('video');
  video.muted = true;
  video.preload = 'auto';

  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error('Could not decode video frames from this file.'));
    video.src = url;
    video.load();
  });

  const sampleTimes = [...new Set([0.1, 0.5, 0.9].map((fraction) => (
    Math.min(duration * fraction, Math.max(0, duration - 0.05))
  )))];
  const frames: VideoFrameSample[] = [];

  for (const timestamp of sampleTimes) {
    if (Math.abs(video.currentTime - timestamp) > 0.001) {
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          video.removeEventListener('seeked', handleSeeked);
          video.removeEventListener('error', handleError);
          window.clearTimeout(timeout);
        };
        const handleSeeked = () => {
          cleanup();
          resolve();
        };
        const handleError = () => {
          cleanup();
          reject(new Error('Could not seek to a sampled video frame.'));
        };
        const timeout = window.setTimeout(() => {
          cleanup();
          reject(new Error('Timed out while sampling a video frame.'));
        }, 10000);
        video.addEventListener('seeked', handleSeeked, { once: true });
        video.addEventListener('error', handleError, { once: true });
        try {
          video.currentTime = timestamp;
        } catch (error) {
          cleanup();
          reject(error);
        }
      });
    }

    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 256 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('This browser cannot inspect video frame pixels.');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    frames.push({
      timestamp,
      previewUrl: canvas.toDataURL('image/jpeg', 0.82),
      visualMetrics: analyzeRgbaPixels(context.getImageData(0, 0, canvas.width, canvas.height).data),
    });
  }

  video.removeAttribute('src');
  video.load();
  return frames;
}

function VideoInvestigationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<VideoResult | null>(null);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setResult(null);
    if (!file) {
      setError('Choose an MP4 or WebM video first.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('Choose a video smaller than 100 MB.');
      return;
    }

    setIsAnalyzing(true);
    let previewUrl = '';
    try {
      const metadata = await getVideoMetadata(file);
      previewUrl = metadata.previewUrl;
      const [sha256, frames] = await Promise.all([
        getSha256(file),
        captureFrames(previewUrl, metadata.duration),
      ]);
      const frameSummary = frames.map(({ timestamp, visualMetrics }) => (
        `${timestamp.toFixed(2)}s brightness ${visualMetrics.averageLuminance.toFixed(1)}/255, contrast ${visualMetrics.contrast.toFixed(1)}`
      )).join('; ');
      const record = await recordInvestigation({
        title: `Video review: ${file.name}`,
        scanType: 'video',
        resultStatus: 'Three local frame diagnostics complete; no deepfake detector configured',
        notes: `SHA-256 ${sha256}; ${metadata.width}x${metadata.height}; ${metadata.duration.toFixed(2)} seconds; sampled frames: ${frameSummary}`,
      });
      setResult({
        filename: file.name,
        sha256,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        detectorStatus: 'Deepfake detector not configured',
        investigationId: record.id,
        frames,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Video checks failed.');
    } finally {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <AppHeader />
      <main className="container page-section">
        <div className="section-header">
          <span className="kicker">Video integrity</span>
          <h2>Inspect video metadata and sampled frames</h2>
          <p className="muted">The video stays in your browser. Three frames are sampled locally for brightness, contrast, clipping, and tonal-range diagnostics. This app does not have a trained deepfake detector configured.</p>
        </div>
        <form className="card" style={{ padding: 24 }} onSubmit={handleSubmit}>
          <div className="form-grid">
            <label htmlFor="video-file">Choose MP4 or WebM (max 100 MB)</label>
            <input
              id="video-file"
              type="file"
              accept="video/mp4,video/webm"
              onChange={(event) => { setFile(event.target.files?.[0] || null); setResult(null); setError(''); }}
            />
            {file ? <span className="muted">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</span> : null}
            {file && file.size > 100 * 1024 * 1024 ? <span className="status-pill danger">Choose a video smaller than 100 MB.</span> : null}
            {error ? <div className="status-pill danger" role="alert">{error}</div> : null}
            <button type="submit" className="button primary" disabled={isAnalyzing || !file || file.size > 100 * 1024 * 1024}>
              {isAnalyzing ? 'Sampling video locally…' : 'Inspect video and save to history'}
            </button>
          </div>
        </form>
        {result ? (
          <section className="summary-box" style={{ marginTop: 20 }} aria-live="polite">
            <p className="status-pill success" role="status">Video inspection completed and saved as investigation {result.investigationId}. <Link to="/history">View scan history</Link></p>
            <h3>Video inspection</h3>
            <ul className="list-stack">
              <li>File: {result.filename}</li>
              <li>Duration: {result.duration.toFixed(2)} seconds</li>
              <li>Resolution: {result.width} × {result.height}</li>
              <li>SHA-256: <code>{result.sha256}</code></li>
              <li>Deepfake detection: {result.detectorStatus}</li>
              <li>Saved investigation: {result.investigationId}</li>
            </ul>
            <h4>Sampled frame diagnostics</h4>
            <div className="list-stack">
              {result.frames.map((frame, index) => (
                <article className="card" key={`${frame.timestamp}-${index}`} style={{ padding: 16 }}>
                  <img src={frame.previewUrl} alt={`Video frame sampled at ${frame.timestamp.toFixed(2)} seconds`} style={{ display: 'block', maxWidth: '100%', maxHeight: 240, borderRadius: 12, marginBottom: 12 }} />
                  <strong>Frame at {frame.timestamp.toFixed(2)} seconds</strong>
                  <ul className="list-stack">
                    <li>Average brightness: {frame.visualMetrics.averageLuminance.toFixed(1)} / 255</li>
                    <li>Pixel contrast: {frame.visualMetrics.contrast.toFixed(1)}</li>
                    <li>Dark / bright clipped pixels: {frame.visualMetrics.shadowClippingPercent.toFixed(1)}% / {frame.visualMetrics.highlightClippingPercent.toFixed(1)}%</li>
                    <li>Distinct tonal ranges: {frame.visualMetrics.tonalBins} / 16</li>
                  </ul>
                </article>
              ))}
            </div>
            <p className="muted">Sampled frames and their measurements are descriptive diagnostics, not a deepfake verdict or a conclusion about the entire video.</p>
            <ResultFeedback investigationId={result.investigationId} resultKind="video" />
          </section>
        ) : null}
      </main>
    </>
  );
}

export default VideoInvestigationPage;
