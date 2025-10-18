import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import App from './App';
import './App.css';
import apiService from './services/apiService';

const AppRouter = () => {
  const [currentPage, setCurrentPage] = useState('landing');
  const [user, setUser] = useState(null);

  // Check for existing auth token on app load
  useEffect(() => {
    // On load, try session-first via /auth/me, then fallback to JWT in localStorage
    // Try session-first via /auth/me, then fallback to JWT in localStorage
    const init = async () => {
      try {
        const res = await apiService.get('/auth/me');
        if (res && res.success && res.data && res.data.user) {
          setUser(res.data.user);
          setCurrentPage('dashboard');
          return;
        }
      } catch (err) {
        // ignore - try token fallback
      }

      const token = localStorage.getItem('authToken');
      if (token) {
        const payload = apiService.decodeTokenPayload(token);
        if (payload) {
          setUser({
            id: payload.id,
            name: payload.name || payload.email,
            email: payload.email,
            role: payload.role || 'viewer'
          });
          setCurrentPage('dashboard');
        } else {
          // token invalid -> clear
          apiService.logout();
        }
      }
    };
    init();
  }, []);

  const handleLogin = async (userData) => {
    // userData: { email, password } expected
    try {
      const res = await apiService.login(userData.email, userData.password);
      if (res?.success && res.data?.token) {
        const payload = apiService.decodeTokenPayload(res.data.token);
        const loggedUser = payload ? {
          id: payload.id,
          name: payload.name || payload.email,
          email: payload.email,
          role: payload.role || 'viewer'
        } : { email: userData.email };
        setUser(loggedUser);
        setCurrentPage('dashboard');
      } else {
        throw new Error(res?.message || 'Login failed');
      }
    } catch (err) {
      // Bubble up to caller (Login component) to show message
      throw err;
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('authToken');
    setCurrentPage('landing');
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'landing':
        return (
          <LandingPage
            onLogin={handleLogin}
          />
        );
      case 'dashboard':
        return (
          <App
            user={user}
            onLogout={handleLogout}
          />
        );
      default:
        return (
          <LandingPage
            onLogin={handleLogin}
          />
        );
    }
  };

  return (
    <div className="app-router">
      {renderCurrentPage()}
    </div>
  );
};

export default AppRouter;