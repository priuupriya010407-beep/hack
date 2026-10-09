import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { setAuthToken } from '../lib/auth';

function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('Alex Morgan');
  const [email, setEmail] = useState('alex@proofpixel.ai');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      setAuthToken(data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="form-panel">
        <span className="kicker">Create account</span>
        <h1>Register</h1>
        <form className="form-grid" onSubmit={handleSubmit}>
          <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <input type="email" placeholder="Work email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error ? <div className="status-pill danger" role="alert">{error}</div> : null}
          <button type="submit" className="button primary" disabled={isSubmitting}>{isSubmitting ? 'Creating account…' : 'Create account'}</button>
          <Link to="/login" className="button ghost">Already have an account?</Link>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;
