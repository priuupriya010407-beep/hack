import { useState, type FormEvent } from 'react';
import { AppHeader } from '../components/Layout';
import ResultFeedback from '../components/ResultFeedback';
import { Link } from 'react-router-dom';
import { recordInvestigation } from '../lib/api';
import { getSha256 } from '../lib/files';

type ComparisonResult = {
  fileA: File;
  fileB: File;
  hashA: string;
  hashB: string;
  investigationId: string;
};

function FileComparisonPage() {
  const [files, setFiles] = useState<[File | null, File | null]>([null, null]);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState('');
  const [isComparing, setIsComparing] = useState(false);

  const handleCompare = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setResult(null);
    const [fileA, fileB] = files;
    if (!fileA || !fileB) {
      setError('Choose both files before comparing.');
      return;
    }
    if (fileA.size > 100 * 1024 * 1024 || fileB.size > 100 * 1024 * 1024) {
      setError('Each file must be 100 MB or smaller.');
      return;
    }

    setIsComparing(true);
    try {
      const [hashA, hashB] = await Promise.all([getSha256(fileA), getSha256(fileB)]);
      const match = hashA === hashB;
      const record = await recordInvestigation({
        title: `File comparison: ${fileA.name} and ${fileB.name}`,
        scanType: 'comparison',
        resultStatus: match ? 'Exact SHA-256 match' : 'Different SHA-256 hashes',
        notes: `A ${hashA}; B ${hashB}`,
      });
      setResult({ fileA, fileB, hashA, hashB, investigationId: record.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not compare files.');
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <>
      <AppHeader />
      <main className="container page-section">
        <div className="section-header">
          <span className="kicker">File integrity</span>
          <h2>Compare two files exactly</h2>
          <p className="muted">SHA-256 is computed locally in your browser. File contents are not uploaded.</p>
        </div>

        <form className="card" style={{ padding: 24 }} onSubmit={handleCompare}>
          <div className="form-row">
            {[0, 1].map((index) => (
              <label key={index}>
                <span className="muted">File {index === 0 ? 'A' : 'B'} (max 100 MB)</span>
                <input type="file" onChange={(event) => {
                  const next = [...files] as [File | null, File | null];
                  next[index] = event.target.files?.[0] || null;
                  setFiles(next);
                  setResult(null);
                  setError('');
                }} />
                {files[index] ? <small className="muted">{files[index]?.name} · {files[index]?.size.toLocaleString()} bytes</small> : null}
              </label>
            ))}
          </div>
          {error ? <div className="status-pill danger" role="alert" style={{ marginTop: 16 }}>{error}</div> : null}
          <div style={{ marginTop: 16 }}>
            <button type="submit" className="button primary" disabled={isComparing || !files[0] || !files[1]}>
              {isComparing ? 'Hashing files…' : 'Hash and compare'}
            </button>
          </div>
        </form>

        {result ? (
          <section className="summary-box" style={{ marginTop: 20 }} aria-live="polite">
            <p className="status-pill success" role="status">File comparison completed and saved as investigation {result.investigationId}. <Link to="/history">View scan history</Link></p>
            <h3>{result.hashA === result.hashB ? 'Exact content match' : 'Files differ'}</h3>
            <ul className="list-stack">
              <li>File A ({result.fileA.name}): <code>{result.hashA}</code></li>
              <li>File B ({result.fileB.name}): <code>{result.hashB}</code></li>
              <li>Result: {result.hashA === result.hashB ? 'Both files have identical SHA-256 hashes.' : 'Different SHA-256 hashes; file contents differ.'}</li>
              <li>Saved investigation: {result.investigationId}</li>
            </ul>
            <p className="muted">Matching hashes indicate identical bytes, not proof of authorship or authenticity.</p>
            <ResultFeedback investigationId={result.investigationId} resultKind="comparison" />
          </section>
        ) : null}
      </main>
    </>
  );
}

export default FileComparisonPage;
