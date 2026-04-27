import React, { useState } from 'react';
import './AuthPage.css';
import { useAuth } from '../services/AuthContext';

const makeAvatarDataUrl = ({ bg1, bg2, accent, shape, label }) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" aria-label="${label}">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bg1}"/>
          <stop offset="100%" stop-color="${bg2}"/>
        </linearGradient>
      </defs>
      <rect width="160" height="160" rx="32" fill="url(#g)"/>
      <circle cx="80" cy="80" r="54" fill="rgba(255,255,255,0.08)"/>
      ${shape}
      <circle cx="58" cy="62" r="7" fill="rgba(255,255,255,0.9)"/>
      <circle cx="102" cy="62" r="7" fill="rgba(255,255,255,0.9)"/>
      <path d="M52 98c12 18 44 18 56 0" fill="none" stroke="${accent}" stroke-width="10" stroke-linecap="round"/>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const AVATAR_OPTIONS = [
  {
    id: 'a1',
    label: 'Emerald Shield',
    dataUrl: makeAvatarDataUrl({
      bg1: '#0f172a',
      bg2: '#10b981',
      accent: '#a7f3d0',
      shape: '<path d="M80 26 118 46v34c0 28-16 49-38 58-22-9-38-30-38-58V46l38-20z" fill="rgba(255,255,255,0.14)"/>',
    }),
  },
  {
    id: 'a2',
    label: 'Sky Core',
    dataUrl: makeAvatarDataUrl({
      bg1: '#0f172a',
      bg2: '#0ea5e9',
      accent: '#bae6fd',
      shape: '<circle cx="80" cy="80" r="31" fill="rgba(255,255,255,0.16)"/><circle cx="80" cy="80" r="15" fill="rgba(255,255,255,0.28)"/>',
    }),
  },
  {
    id: 'a3',
    label: 'Signal Flame',
    dataUrl: makeAvatarDataUrl({
      bg1: '#111827',
      bg2: '#f59e0b',
      accent: '#fde68a',
      shape: '<path d="M80 28c10 12 16 22 16 34 0 10-6 17-16 22-10-5-16-12-16-22 0-12 6-22 16-34z" fill="rgba(255,255,255,0.16)"/>',
    }),
  },
  {
    id: 'a4',
    label: 'Violet Radar',
    dataUrl: makeAvatarDataUrl({
      bg1: '#111827',
      bg2: '#8b5cf6',
      accent: '#ddd6fe',
      shape: '<circle cx="80" cy="80" r="34" fill="rgba(255,255,255,0.12)"/><path d="M80 46v68M46 80h68" stroke="rgba(255,255,255,0.28)" stroke-width="10" stroke-linecap="round"/>',
    }),
  },
  {
    id: 'a5',
    label: 'Circuit Mint',
    dataUrl: makeAvatarDataUrl({
      bg1: '#0f172a',
      bg2: '#14b8a6',
      accent: '#99f6e4',
      shape: '<path d="M47 55h66v18H47zM60 74h40v16H60zM47 92h66v14H47z" fill="rgba(255,255,255,0.13)"/>',
    }),
  },
  {
    id: 'a6',
    label: 'Amber Pulse',
    dataUrl: makeAvatarDataUrl({
      bg1: '#1f2937',
      bg2: '#f97316',
      accent: '#fed7aa',
      shape: '<path d="M80 36 104 58v32L80 124 56 90V58z" fill="rgba(255,255,255,0.14)"/><path d="M80 54v52" stroke="rgba(255,255,255,0.22)" stroke-width="8" stroke-linecap="round"/>',
    }),
  },
  {
    id: 'a7',
    label: 'Rose Shield',
    dataUrl: makeAvatarDataUrl({
      bg1: '#1f1325',
      bg2: '#f43f5e',
      accent: '#fecdd3',
      shape: '<path d="M80 28 118 44v30c0 22-14 40-38 52-24-12-38-30-38-52V44z" fill="rgba(255,255,255,0.13)"/><circle cx="80" cy="80" r="18" fill="rgba(255,255,255,0.18)"/>',
    }),
  },
  {
    id: 'a8',
    label: 'Teal Orbit',
    dataUrl: makeAvatarDataUrl({
      bg1: '#022c22',
      bg2: '#06b6d4',
      accent: '#cffafe',
      shape: '<circle cx="80" cy="80" r="22" fill="rgba(255,255,255,0.2)"/><ellipse cx="80" cy="80" rx="48" ry="18" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="8"/>',
    }),
  },
  {
    id: 'a9',
    label: 'Midnight Grid',
    dataUrl: makeAvatarDataUrl({
      bg1: '#0b1120',
      bg2: '#334155',
      accent: '#cbd5e1',
      shape: '<path d="M52 52h56v56H52z" fill="rgba(255,255,255,0.08)"/><path d="M62 62h36v36H62z" fill="rgba(255,255,255,0.14)"/>',
    }),
  },
  {
    id: 'a10',
    label: 'Aurora Ring',
    dataUrl: makeAvatarDataUrl({
      bg1: '#111827',
      bg2: '#22c55e',
      accent: '#dcfce7',
      shape: '<circle cx="80" cy="80" r="30" fill="none" stroke="rgba(255,255,255,0.24)" stroke-width="12"/><circle cx="80" cy="80" r="12" fill="rgba(255,255,255,0.18)"/>',
    }),
  },
];

const AuthPage = ({ onNavigate, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarKey, setAvatarKey] = useState(AVATAR_OPTIONS[0].id);
  const [avatarDataUrl, setAvatarDataUrl] = useState(AVATAR_OPTIONS[0].dataUrl);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const validateForm = () => {
    const nextErrors = {};
    const trimmedEmail = email.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) {
      nextErrors.email = 'Email is required.';
    } else if (!emailPattern.test(trimmedEmail)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!password) {
      nextErrors.password = 'Password is required.';
    } else if (mode === 'register' && password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    if (mode === 'register') {
      if (!username.trim()) {
        nextErrors.username = 'Username is required.';
      } else if (username.trim().length < 2) {
        nextErrors.username = 'Username must be at least 2 characters.';
      }
    }

    if (mode === 'register') {
      if (!confirmPassword) {
        nextErrors.confirmPassword = 'Please confirm your password.';
      } else if (confirmPassword !== password) {
        nextErrors.confirmPassword = 'Passwords do not match.';
      }
    }

    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const nextErrors = validateForm();
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, {
          username: username.trim(),
          avatarKey,
          avatarDataUrl,
        });
      }
      onNavigate('dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setError('');
    setFieldErrors({});
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setAvatarKey(AVATAR_OPTIONS[0].id);
    setAvatarDataUrl(AVATAR_OPTIONS[0].dataUrl);
  };

  const onEmailChange = (value) => {
    setEmail(value);
    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const onPasswordChange = (value) => {
    setPassword(value);
    if (fieldErrors.password || fieldErrors.confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, password: undefined, confirmPassword: undefined }));
    }
  };

  const onUsernameChange = (value) => {
    setUsername(value);
    if (fieldErrors.username) {
      setFieldErrors((prev) => ({ ...prev, username: undefined }));
    }
  };

  const onConfirmPasswordChange = (value) => {
    setConfirmPassword(value);
    if (fieldErrors.confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }
  };

  return (
    <div className="auth-page-split">
      <div className="auth-left-pane">
        <div className="auth-form-wrapper">
          <button className="btn-back" onClick={() => onNavigate('home')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back to Home
          </button>

          <div className="auth-header-text">
            <h1>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h1>
            <p className="auth-subtitle">
              {mode === 'login' 
                ? 'Access your secure forensic workspace' 
                : 'Simple sign up with email and password'}
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
                onChange={(e) => onEmailChange(e.target.value)}
                className={fieldErrors.email ? 'input-invalid' : ''}
                autoComplete="email"
                required
              />
              {fieldErrors.email ? <div className="field-error">{fieldErrors.email}</div> : null}
            </div>

            {mode === 'register' ? (
              <>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    placeholder="your_username"
                    value={username}
                    onChange={(e) => onUsernameChange(e.target.value)}
                    className={fieldErrors.username ? 'input-invalid' : ''}
                    autoComplete="username"
                    required
                  />
                  {fieldErrors.username ? <div className="field-error">{fieldErrors.username}</div> : null}
                </div>

                <div className="form-group">
                  <label>Choose Avatar</label>
                  <div className="avatar-picker-grid" role="listbox" aria-label="Avatar options">
                    {AVATAR_OPTIONS.map((avatar) => {
                      const selected = avatarDataUrl === avatar.dataUrl;
                      return (
                        <button
                          key={avatar.id}
                          type="button"
                          className={`avatar-option ${selected ? 'selected' : ''}`}
                          onClick={() => {
                            setAvatarKey(avatar.id);
                            setAvatarDataUrl(avatar.dataUrl);
                          }}
                          aria-pressed={selected}
                          title={avatar.label}
                        >
                          <img src={avatar.dataUrl} alt={avatar.label} className="avatar-option-img" />
                          <span>{avatar.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}

            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                className={fieldErrors.password ? 'input-invalid' : ''}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
              {mode === 'register' ? <div className="field-hint">Use at least 6 characters.</div> : null}
              {fieldErrors.password ? <div className="field-error">{fieldErrors.password}</div> : null}
            </div>

            {mode === 'register' ? (
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => onConfirmPasswordChange(e.target.value)}
                  className={fieldErrors.confirmPassword ? 'input-invalid' : ''}
                  autoComplete="new-password"
                  required
                />
                {fieldErrors.confirmPassword ? <div className="field-error">{fieldErrors.confirmPassword}</div> : null}
              </div>
            ) : null}

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
              <p>Don't have an account? <button onClick={() => handleModeChange('register')}>Sign Up</button></p>
            ) : (
              <p>Already have an account? <button onClick={() => handleModeChange('login')}>Sign In</button></p>
            )}
          </div>
        </div>
      </div>

      <div className="auth-right-pane">
        <div className="auth-promo-content">
          <div className="promo-shield-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h2>Securing digital thresholds with predictive intelligence.</h2>
          <p>Join the tier of automated payload isolation, LSB extraction protocols, and advanced metadata threat mitigation.</p>
          
          <div className="promo-stats">
            <div className="promo-stat-box">
              <span className="stat-num">99.8%</span>
              <span className="stat-desc">Accuracy Rate</span>
            </div>
            <div className="promo-stat-box">
              <span className="stat-num">&lt;2.4s</span>
              <span className="stat-desc">Scan Latency</span>
            </div>
            <div className="promo-stat-box">
              <span className="stat-num">24/7</span>
              <span className="stat-desc">Active Monitor</span>
            </div>
          </div>
        </div>
        <div className="pane-grid-overlay"></div>
      </div>
    </div>
  );
};

export default AuthPage;
