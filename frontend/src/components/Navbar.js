import React, { useState, useEffect } from 'react';
import './Navbar.css';

const Navbar = ({ currentPage, onNavigate }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scrolls to a section by ID, navigating to home first if needed
  const scrollToSection = (sectionId) => {
    setMenuOpen(false);
    const doScroll = () => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (currentPage !== 'home') {
      onNavigate('home');
      // Wait for React to render the landing page before scrolling
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
          <div className="logo-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 2L3 7v8c0 6.5 4.7 12.6 11 14 6.3-1.4 11-7.5 11-14V7L14 2z"
                fill="url(#shield-grad)" stroke="rgba(0,212,255,0.4)" strokeWidth="0.5"/>
              <path d="M10 14l2.5 2.5L18 11" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="shield-grad" x1="3" y1="2" x2="25" y2="26">
                  <stop offset="0%" stopColor="#00d4ff"/>
                  <stop offset="100%" stopColor="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
            <div className="logo-pulse" />
          </div>
          <span className="logo-text">AI<span className="logo-dash">-</span>SHIELD</span>
        </button>

        {/* Nav Links */}
        <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <li><button onClick={() => { onNavigate('home'); setMenuOpen(false); }} className={currentPage === 'home' ? 'active' : ''}>Home</button></li>

          {/* Tools dropdown */}
          <li className="nav-dropdown">
            <button className={`nav-dropdown-trigger ${(currentPage === 'phishing' || currentPage === 'steganography') ? 'active' : ''}`}>
              Tools
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 4 }}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="nav-dropdown-menu">
              <button className={`nav-dd-item ${currentPage === 'phishing' ? 'dd-active' : ''}`}
                onClick={() => { onNavigate('phishing'); setMenuOpen(false); }}>
                <span className="dd-icon">🎣</span>
                <div>
                  <div className="dd-label">Phishing Analyzer</div>
                  <div className="dd-sub">URL & Email Detection</div>
                </div>
              </button>
              <button className={`nav-dd-item ${currentPage === 'steganography' ? 'dd-active' : ''}`}
                onClick={() => { onNavigate('steganography'); setMenuOpen(false); }}>
                <span className="dd-icon">🔬</span>
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
          <button className="btn-nav-launch" onClick={() => onNavigate('scan')}>
            Launch Scanner
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Hamburger */}
        <button className={`hamburger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(!menuOpen)}>
          <span/><span/><span/>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
