import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="container page-section">
      <div className="form-panel">
        <span className="kicker">404</span>
        <h1>Page not found</h1>
        <p className="muted">The requested route is unavailable.</p>
        <Link to="/" className="button primary">Back to home</Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
