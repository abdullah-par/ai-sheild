import React from 'react';
import './Footer.css';

const Footer = ({ onNavigate }) => {
  const scrollToHomeSection = (id) => {
    onNavigate('home');
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  return (
    <footer className="footer-v2">
      <div className="footer-container">
        <div className="footer-top">
          {/* Brand Column */}
          <div className="footer-brand-col">
            <div className="footer-logo" onClick={() => onNavigate('home')} style={{ cursor: 'pointer' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>AI<span className="dot">.</span>SHIELD</span>
            </div>
            <p className="footer-desc">
              The #1 AI-powered forensic platform for digital threat intelligence. 
              Our engines enable security analysts to identify and neutralize 
              advanced phishing and steganography attacks in real-time.
            </p>
            <div className="footer-trust">
              <div className="trust-badge" onClick={() => scrollToHomeSection('security')} style={{ cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="m9 12 2 2 4-4"/>
                </svg>
                <span>SOC2 COMPLIANT</span>
              </div>
              <div className="trust-badge" onClick={() => scrollToHomeSection('security')} style={{ cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span>ENCRYPTED FLOW</span>
              </div>
            </div>
          </div>

          {/* Links Columns */}
          <div className="footer-links-grid">
            <div className="footer-col">
              <h4>Platforms</h4>
              <ul>
                <li><button onClick={() => onNavigate('phishing')}>Phishing Analyzer</button></li>
                <li><button onClick={() => onNavigate('steganography')}>Stego Detector</button></li>
                <li><button onClick={() => onNavigate('dashboard')}>Threat Dashboard</button></li>
                <li><button onClick={() => onNavigate('scan')}>Unified Scanner</button></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Use Cases</h4>
              <ul>
                <li><button onClick={() => scrollToHomeSection('features')}>Incident Response</button></li>
                <li><button onClick={() => scrollToHomeSection('features')}>Brand Protection</button></li>
                <li><button onClick={() => scrollToHomeSection('features')}>Fraud Prevention</button></li>
                <li><button onClick={() => scrollToHomeSection('features')}>Security Auditing</button></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <ul>
                <li><button onClick={() => scrollToHomeSection('resources')}>API Documentation</button></li>
                <li><button onClick={() => scrollToHomeSection('resources')}>Threat Database</button></li>
                <li><button onClick={() => scrollToHomeSection('resources')}>System Status</button></li>
                <li><button onClick={() => scrollToHomeSection('resources')}>Forensic Blog</button></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li><button onClick={() => scrollToHomeSection('how-it-works')}>About Us</button></li>
                <li><button onClick={() => scrollToHomeSection('security')}>Security Policy</button></li>
                <li><button onClick={() => scrollToHomeSection('security')}>Legal / Privacy</button></li>
                <li><button onClick={() => window.location.href = 'mailto:forensics@ai-shield.tech'}>Contact Sales</button></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-left">
            <span>© 2026 AI-SHIELD Forensics Ltd.</span>
            <div className="footer-legal-links">
              <button onClick={() => scrollToHomeSection('security')}>Privacy Policy</button>
              <button onClick={() => scrollToHomeSection('security')}>Terms of Service</button>
              <button onClick={() => scrollToHomeSection('security')}>Cookies</button>
            </div>
          </div>
          <div className="footer-bottom-right">
            <button className="footer-cta" onClick={() => onNavigate('scan')}>
              Get Started Free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
