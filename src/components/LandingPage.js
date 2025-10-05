import React, { useState } from 'react';
import apiService from '../services/apiService';

export default function LandingPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiService.login(email, password);
      if (res?.success && res?.data?.user) {
        onLogin(res.data.user);
      } else {
        setError(res?.message || 'Invalid email or password.');
      }
    } catch (err) {
      const msg = err?.message || '';
      setError(msg.includes('Invalid email or password') ? 'Invalid email or password.' : 'Unable to reach server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f7f7' }}>
      <div style={{ width: 360, background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,0.08)' }}>
        <h2 style={{ margin: 0, marginBottom: 8, textAlign: 'center' }}>Cattle Farm Monitoring</h2>
        <p style={{ marginTop: 0, marginBottom: 20, textAlign: 'center', color: '#666' }}>Sign in to continue</p>
        {error && (
          <div style={{ marginBottom: 12, color: '#c0392b', background: '#fdecea', border: '1px solid #f5c6cb', padding: '8px 10px', borderRadius: 6, fontSize: 14 }}>{error}</div>
        )}
        <form onSubmit={handleSubmit}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@cattlefarm.com"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', marginBottom: 12 }}
          />
          <label htmlFor="password" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="admin123"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', marginBottom: 16 }}
          />
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: 'none', background: '#3CB371', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div style={{ marginTop: 14, fontSize: 13, color: '#555' }}>
          <div><strong>Demo:</strong> admin@cattlefarm.com / admin123</div>
          <div><strong>Alt:</strong> demo@cattlefarm.com / demo123</div>
        </div>
      </div>
    </div>
  );
}