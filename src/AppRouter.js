import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import App from './App';
import './App.css';

const AppRouter = () => {
  const [currentPage, setCurrentPage] = useState('landing');
  const [user, setUser] = useState(null);

  // Check for existing auth token on app load
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // If we have a token, we can go directly to dashboard
      setCurrentPage('dashboard');
      setUser({ email: 'admin@cattlefarm.com' }); // Simple mock user
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentPage('dashboard');
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