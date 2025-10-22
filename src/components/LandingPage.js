import React, { useState } from 'react';
import apiService from '../services/apiService';

export default function LandingPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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
  
  const handleForgotPassword = () => {
    window.alert('Please contact your farm administrator to reset your password.');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f7f7f7' }}>
      {/* Left Side: Info & Logo */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#3CB371', color: '#fff', padding: '0 40px' }}>
        <img src={require('../img/logo.jpg')} alt="Cattle Farm Logo" style={{ width: 90, height: 90, borderRadius: 16, marginBottom: 24 }} />
        <h1 style={{ fontSize: 32, marginBottom: 12 }}>Cattle Farm Monitoring</h1>
        <p style={{ fontSize: 18, maxWidth: 340, marginBottom: 24, lineHeight: 1.5 }}>
          Welcome to the cattle farm monitoring system. This app allows you to manage your farm setting virtual fences and monitor your cattle.
        </p>
        <ul style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 0, paddingLeft: 20 }}>
          <li> Secure login required</li>
          <li> Real-time alerts and analytics</li>
          <li> Easy virtual fence management</li>
        </ul>
      </div>
      {/* Right Side: Login Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <div style={{ width: 380, background: '#fff', padding: 36, borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img src={require('../img/logo.jpg')} alt="Farm Logo" style={{ width: 64, height: 64, borderRadius: 12, marginBottom: 10 }} />
            <h2 style={{ margin: 0, color: '#3CB371', fontWeight: 700, fontSize: 26 }}>Welcome Back</h2>
            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: 15 }}>Sign in to your farm dashboard</p>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="email" style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="username"
                placeholder="e.g. manager@farm.com"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 15, background: '#f8f8f8', marginBottom: 2, outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="password" style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 15, background: '#f8f8f8', marginBottom: 2, outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <label style={{ fontSize: 14, color: '#555', display: 'flex', alignItems: 'center' }}>
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ marginRight: 7 }} /> Remember me
              </label>
              <button type="button" onClick={handleForgotPassword} style={{ fontSize: 14, color: '#3CB371', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Forgot password?</button>
            </div>
            {error && <div style={{ marginBottom: 12, color: '#c0392b', background: '#fdecea', border: '1px solid #f5c6cb', padding: '8px 10px', borderRadius: 6, fontSize: 14 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px 0', borderRadius: 8, border: 'none', background: '#3CB371', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 2px 8px rgba(60,179,113,0.08)', transition: 'background 0.2s' }}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <div style={{ marginTop: 18, fontSize: 13, color: '#888', textAlign: 'center' }}>
            <span>&copy; {new Date().getFullYear()} Cattle Farm Monitoring</span>
          </div>
        </div>
      </div>
    </div>
  );
}