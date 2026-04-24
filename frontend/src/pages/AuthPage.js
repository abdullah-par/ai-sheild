import React, { useState } from 'react';
import './AuthPage.css';
import { useAuth } from '../services/AuthContext';

const AuthPage = ({ onNavigate, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
      onNavigate('dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo" onClick={() => onNavigate('home')}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>AI.SHIELD</span>
            </div>
            <h1>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h1>
            <p className="auth-subtitle">
              {mode === 'login' 
                ? 'Access your secure forensic workspace' 
                : 'Join the next generation of threat intelligence'}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}
            
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                placeholder="analyst@ai-shield.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button className="btn-auth" type="submit" disabled={loading}>
              {loading ? (
                <span className="loader"></span>
              ) : (
                mode === 'login' ? 'Sign In' : 'Get Started'
              )}
            </button>
          </form>

          <div className="auth-footer">
            {mode === 'login' ? (
              <p>Don't have an account? <button onClick={() => setMode('register')}>Sign Up</button></p>
            ) : (
              <p>Already have an account? <button onClick={() => setMode('login')}>Sign In</button></p>
            )}
          </div>
        </div>
        
        <div className="auth-decoration">
          <div className="deco-blob blob-1"></div>
          <div className="deco-blob blob-2"></div>
          <div className="deco-grid"></div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
