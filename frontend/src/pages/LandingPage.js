import React from 'react';
import './LandingPage.css';

/* ── UI Components ─────────────────────────── */

const FeatureIcon = ({ type }) => {
  const strokeColor = "var(--accent-primary)";
  if (type === 'ai') return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/>
    </svg>
  );
  if (type === 'realtime') return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m13 2-2 10h3L11 22l2-10h-3l2-10z"/>
    </svg>
  );
  if (type === 'secure') return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
  if (type === 'encryption') return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
  if (type === 'compliance') return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
  if (type === 'privacy') return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M12 12v10"/>
    </svg>
  );
  return null;
};

/* ── Landing Page ───────────────────────────── */

const LandingPage = ({ onNavigate }) => {
  return (
    <div className="landing-2">
      {/* ── HERO ── */}
      <section className="hero-2">
        <div className="hero-grid" />
        <div className="hero-glow" />
        
        <div className="hero-container-2">
          <h1 className="hero-title-2">
            Digital Forensic<br/>
            <span>Intelligence.</span>
          </h1>
          
          <p className="hero-subtitle-2">
            AI.SHIELD is an elite forensic toolkit designed for security professionals. 
            Identify, analyze, and neutralize advanced digital threats with sub-second intelligence.
          </p>

          <div className="hero-actions-2">
            <button className="btn-primary" onClick={() => onNavigate('scan')}>
              Start Analysis
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}>
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button className="btn-secondary" onClick={() => onNavigate('dashboard')}>
              Threat Feed
            </button>
          </div>
        </div>
      </section>

      {/* ── CORE CAPABILITIES (FEATURES) ── */}
      <section className="features-grid-section" id="features">
        <div className="features-container">
          <div className="features-header">
            <div className="feat-label">PLATFORM STACK</div>
            <h2 className="feat-title">Advanced Security Infrastructure</h2>
            <p className="feat-subtitle">Built with military-grade protocols for modern forensic analysis.</p>
          </div>
          
          <div className="features-grid-2">
            <div className="feat-card-2">
              <div className="feat-icon-2"><FeatureIcon type="ai" /></div>
              <h3>AI Heuristics</h3>
              <p>Advanced neural models trained on millions of attack vectors to identify zero-day phishing attempts.</p>
            </div>
            <div className="feat-card-2">
              <div className="feat-icon-2"><FeatureIcon type="secure" /></div>
              <h3>Forensic Integrity</h3>
              <p>Every analysis preserves technical metadata for incident response and legal reporting.</p>
            </div>
            <div className="feat-card-2">
              <div className="feat-icon-2">⚡</div>
              <h3>Sub-Second Latency</h3>
              <p>Get results in under 500ms using our high-performance asynchronous processing engine.</p>
            </div>
            <div className="feat-card-2">
              <div className="feat-icon-2">📂</div>
              <h3>Cross-Engine Scan</h3>
              <p>Unified analysis across URLs, Email headers, and complex image-based payloads.</p>
            </div>
            <div className="feat-card-2">
              <div className="feat-icon-2">🔒</div>
              <h3>Zero-Trust Model</h3>
              <p>No data is assumed safe. We validate every bit using entropy and statistical mapping.</p>
            </div>
            <div className="feat-card-2">
              <div className="feat-icon-2">📈</div>
              <h3>Detailed Analytics</h3>
              <p>Complete historical logs and risk trends via our integrated analyst dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PHISHING DEEP DIVE ── */}
      <section className="deep-dive-section phishing-dive">
        <div className="deep-dive-container">
          <div className="dive-visual">
            <div className="visual-box">
              <div className="scan-line-horizontal" />
              <div className="code-snippet">
                <code>HTTP/1.1 302 Found</code><br/>
                <code>Location: https://secure-login.ru/update</code><br/>
                <code>X-Phish-Score: 98.4%</code>
              </div>
            </div>
          </div>
          <div className="dive-content">
            <div className="dive-label">PHISHING ENGINE</div>
            <h2 className="dive-title">Beyond Simple Blacklists.</h2>
            <p className="dive-text">
              Traditional security relies on static blacklists. AI.SHIELD uses dynamic heuristics to analyze the intent of a URL or Email.
            </p>
            <div className="dive-features">
              <div className="dive-feat">
                <h4>Domain Reputation</h4>
                <p>Analyzing MX records, SSL certificate age, and registrar history to identify fresh-set phishing traps.</p>
              </div>
              <div className="dive-feat">
                <h4>Header Forensics</h4>
                <p>Parsing SPF, DKIM, and DMARC alignments to uncover spoofed sender identities in seconds.</p>
              </div>
              <div className="dive-feat">
                <h4>Heuristic URL Scoring</h4>
                <p>Our ML models identify 'look-alike' characters and suspicious path structures designed to deceive users.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STEGANOGRAPHY DEEP DIVE ── */}
      <section className="deep-dive-section stego-dive">
        <div className="deep-dive-container inverse">
          <div className="dive-content">
            <div className="dive-label">STEGO ENGINE</div>
            <h2 className="dive-title">Unmasking Hidden Payloads.</h2>
            <p className="dive-text">
              Steganography allows malicious actors to hide encrypted payloads inside seemingly harmless digital assets.
            </p>
            <div className="dive-features">
              <div className="dive-feat">
                <h4>LSB Analysis</h4>
                <p>Detecting anomalies in the Least Significant Bits of pixel data where payloads are often concealed.</p>
              </div>
              <div className="dive-feat">
                <h4>Chi-Square Testing</h4>
                <p>Statistical testing for the frequency of color distributions that indicate non-natural data insertion.</p>
              </div>
              <div className="dive-feat">
                <h4>Entropy Mapping</h4>
                <p>Visualizing the randomness of an image to find high-entropy blocks characteristic of encrypted data.</p>
              </div>
            </div>
          </div>
          <div className="dive-visual">
            <div className="visual-box stego-box">
              <div className="pixel-grid" />
              <div className="stego-overlay">
                <span>PAYLOAD DETECTED</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="how-it-works-section" id="how-it-works">
        <div className="how-container">
          <div className="how-header">
            <h2 className="how-title">The Forensic Process</h2>
            <p className="how-subtitle">Three steps to actionable threat intelligence.</p>
          </div>
          <div className="how-grid">
            <div className="how-step">
              <div className="step-num">01</div>
              <h3>Evidence Submission</h3>
              <p>Upload files, paste email headers, or enter URLs for immediate processing.</p>
            </div>
            <div className="how-step">
              <div className="step-num">02</div>
              <h3>Intelligent Analysis</h3>
              <p>Our engines perform multi-layered scanning using heuristics and statistical models.</p>
            </div>
            <div className="how-step">
              <div className="step-num">03</div>
              <h3>Forensic Reporting</h3>
              <p>Receive a detailed verdict with risk scores and breakdown of detected indicators.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECURITY & COMPLIANCE ── */}
      <section className="security-section" id="security">
        <div className="security-container">
          <div className="security-header">
            <div className="sec-label">DATA INTEGRITY</div>
            <h2 className="sec-title">Enterprise-Grade Security</h2>
            <p className="sec-subtitle">We maintain the highest standards of data protection and forensic integrity.</p>
          </div>
          <div className="security-grid">
            <div className="sec-card">
              <div className="sec-icon"><FeatureIcon type="secure" /></div>
              <h4>End-to-End Encryption</h4>
              <p>All data submissions and results are protected using AES-256 encryption in transit and at rest.</p>
            </div>
            <div className="sec-card">
              <div className="sec-icon"><FeatureIcon type="compliance" /></div>
              <h4>SOC2 Compliance</h4>
              <p>Our infrastructure follows strict SOC2 Type II protocols for security, availability, and confidentiality.</p>
            </div>
            <div className="sec-card">
              <div className="sec-icon"><FeatureIcon type="privacy" /></div>
              <h4>Zero-Knowledge Privacy</h4>
              <p>We do not store the content of your scans. Metadata is anonymized for global threat intelligence.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── RESOURCE HUB ── */}
      <section className="resources-section" id="resources">
        <div className="resources-container">
          <div className="res-header">
            <h2 className="res-title">Knowledge & Integration</h2>
            <p className="res-subtitle">Tools and documentation for security teams and developers.</p>
          </div>
          <div className="res-grid">
            <div className="res-item">
              <div className="res-label">DEVELOPERS</div>
              <h3>REST API v2.0</h3>
              <p>Integrate AI.SHIELD into your SOC workflow. Complete endpoints for URL and File analysis.</p>
              <button className="res-link">View Documentation →</button>
            </div>
            <div className="res-item">
              <div className="res-label">DATASET</div>
              <h3>Live Threat Feed</h3>
              <p>Access our global database of identified phishing domains and steganography signatures.</p>
              <button className="res-link">Access Database →</button>
            </div>
            <div className="res-item">
              <div className="res-label">RESEARCH</div>
              <h3>Forensic Blog</h3>
              <p>Deep dives into the latest cyber threats and our team's forensic methodology.</p>
              <button className="res-link">Read Latest Post →</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="stats-section-2">
        <div className="stats-container-2">
          <div className="stat-item-2">
            <div className="stat-val-2">28.4M</div>
            <div className="stat-lab-2">Threats Neutralized</div>
          </div>
          <div className="stat-item-2">
            <div className="stat-val-2">99.9%</div>
            <div className="stat-lab-2">Detection Accuracy</div>
          </div>
          <div className="stat-item-2">
            <div className="stat-val-2">&lt; 0.5s</div>
            <div className="stat-lab-2">Response Latency</div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;
