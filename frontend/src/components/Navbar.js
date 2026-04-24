import React, { useState, useEffect } from 'react';
import './Navbar.css';
import { useAuth } from '../services/AuthContext';

const Navbar = ({ currentPage, onNavigate, theme, toggleTheme }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId) => {
    setMenuOpen(false);
    const doScroll = () => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (currentPage !== 'home') {
      onNavigate('home');
      setTimeout(doScroll, 120);
    } else {
      doScroll();
    }
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-inner">
        {/* Logo */}
        <button className="nav-logo" onClick={() => onNavigate('home')}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span className="logo-text">AI<span className="logo-dash">.</span>SHIELD</span>
        </button>

        {/* Nav Links */}
        <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <li><button onClick={() => { onNavigate('home'); setMenuOpen(false); }} className={currentPage === 'home' ? 'active' : ''}>Home</button></li>

          <li className="nav-dropdown">
            <button className={`nav-dropdown-trigger ${(currentPage === 'phishing' || currentPage === 'steganography') ? 'active' : ''}`}>
              Tools
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
            <div className="nav-dropdown-menu">
              <button className={`nav-dd-item ${currentPage === 'phishing' ? 'dd-active' : ''}`}
                onClick={() => { onNavigate('phishing'); setMenuOpen(false); }}>
                <div className="dd-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>
                  </svg>
                </div>
                <div>
                  <div className="dd-label">Phishing Analyzer</div>
                  <div className="dd-sub">URL & Email Detection</div>
                </div>
              </button>
              <button className={`nav-dd-item ${currentPage === 'steganography' ? 'dd-active' : ''}`}
                onClick={() => { onNavigate('steganography'); setMenuOpen(false); }}>
                <div className="dd-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4"/><path d="M12 16V8"/>
                  </svg>
                </div>
                <div>
                  <div className="dd-label">Steganography Detector</div>
                  <div className="dd-sub">Hidden Data in Images</div>
                </div>
              </button>
            </div>
          </li>

          <li><button onClick={() => { onNavigate('dashboard'); setMenuOpen(false); }} className={currentPage === 'dashboard' ? 'active' : ''}>Dashboard</button></li>
          <li><button onClick={() => scrollToSection('features')}>Features</button></li>
          <li><button onClick={() => scrollToSection('how-it-works')}>How It Works</button></li>
        </ul>

        {/* CTA */}
        <div className="nav-cta">
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
              </svg>
            )}
          </button>
          
          {user ? (
            <div className="nav-user-profile">
              <div className="user-info" title={user.email}>
                <div className="user-avatar">{user.email[0].toUpperCase()}</div>
                <span className="user-email-preview">{user.email.split('@')[0]}</span>
              </div>
              <button className="btn-logout" onClick={() => { logout(); onNavigate('home'); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          ) : (
            <button className="btn-login" onClick={() => onNavigate('auth', { mode: 'login' })}>
              Sign In
            </button>
          )}

          <button className="btn-nav-launch" onClick={() => onNavigate('scan')}>
            Launch Scanner
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        <button className={`hamburger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(!menuOpen)}>
          <span/><span/><span/>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
