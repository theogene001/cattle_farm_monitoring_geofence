import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const Login = ({ onLogin, onBackToLanding, onNavigateToSignup }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      // For demo purposes, accept any valid email/password
      if (formData.email && formData.password.length >= 6) {
        onLogin(formData);
      } else {
        setErrors({ general: 'Invalid credentials. Please try again.' });
      }
    }, 1000);
  };

  const handleDemoLogin = () => {
    setFormData({
      email: 'demo@cattlefarm.com',
      password: 'demo123'
    });
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin({ email: 'demo@cattlefarm.com', password: 'demo123' });
    }, 500);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <button className="back-btn" onClick={onBackToLanding}>
            <ArrowLeft size={20} />
            Back to Home
          </button>
        </div>
        
        <div className="login-box">
          <div className="login-logo">
            <img src="/src/img/logo.jpg" alt="Cattle Farm Monitoring" className="logo-img" />
            <h1>Cattle Farm Monitoring</h1>
            <p>Sign in to access your dashboard</p>
          </div>
          
          <form onSubmit={handleSubmit} className="login-form">
            {errors.general && (
              <div className="error-message general-error">
                {errors.general}
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-group">
                <User className="input-icon" size={20} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  className={errors.email ? 'error' : ''}
                />
              </div>
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-group">
                <Lock className="input-icon" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className={errors.password ? 'error' : ''}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>
            
            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" />
                <span className="checkmark"></span>
                Remember me
              </label>
              <a href="#forgot" className="forgot-link">Forgot password?</a>
            </div>
            
            <button type="submit" className="btn-login-submit" disabled={isLoading}>
              {isLoading ? (
                <div className="loading-spinner"></div>
              ) : (
                'Sign In'
              )}
            </button>
            
            <div className="divider">
              <span>or</span>
            </div>
            
            <button type="button" className="btn-demo" onClick={handleDemoLogin}>
              Try Demo Account
            </button>
          </form>
          
          <div className="login-footer">
            <p>
              Don't have an account?{' '}
              <button className="link-btn" onClick={onNavigateToSignup}>
                Sign up here
              </button>
            </p>
          </div>
        </div>
        
        <div className="login-info">
          <h3>Secure Access</h3>
          <ul>
            <li>✓ End-to-end encryption</li>
            <li>✓ Multi-factor authentication</li>
            <li>✓ Regular security audits</li>
            <li>✓ SOC 2 Type II compliant</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;