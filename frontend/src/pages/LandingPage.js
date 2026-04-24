import React, { useEffect, useRef, useState } from 'react';
import './LandingPage.css';

/* ── tiny sub-components ───────────────────────────────────────────── */

const ThreatCounter = ({ label, value, suffix = '', color }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const animated = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated.current) {
        animated.current = true;
        const duration = 2000;
        const steps = 60;
        const increment = value / steps;
        let current = 0;
        const timer = setInterval(() => {
          current = Math.min(current + increment, value);
          setCount(Math.floor(current));
          if (current >= value) clearInterval(timer);
        }, duration / steps);
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [value]);

  return (
    <div className="threat-counter" ref={ref}>
      <div className="counter-value" style={{ color }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div className="counter-label">{label}</div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description, badge, delay }) => (
  <div className="feature-card" style={{ animationDelay: `${delay}ms` }}>
    <div className="feature-card-glow" />
    <div className="feature-icon">{icon}</div>
    {badge && <span className="feature-badge">{badge}</span>}
    <h3 className="feature-title">{title}</h3>
    <p className="feature-desc">{description}</p>
    <div className="feature-arrow">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M4 9h10M10 5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  </div>
);

const StepCard = ({ number, title, desc, icon }) => (
  <div className="step-card">
    <div className="step-number">{number}</div>
    <div className="step-icon">{icon}</div>
    <h3>{title}</h3>
    <p>{desc}</p>
    <div className="step-connector" />
  </div>
);

const ThreatTicker = () => {
  const threats = [
    { type: 'PHISHING', domain: 'secure-bank-login.ru', status: 'BLOCKED', color: '#ef4444' },
    { type: 'MALWARE', domain: 'update-flash-now.net', status: 'BLOCKED', color: '#f59e0b' },
    { type: 'STEGO', file: 'invoice_final.png', status: 'DETECTED', color: '#8b5cf6' },
    { type: 'PHISHING', domain: 'paypa1-support.com', status: 'BLOCKED', color: '#ef4444' },
    { type: 'SUSPICIOUS', domain: 'free-crypto-claim.io', status: 'FLAGGED', color: '#f59e0b' },
    { type: 'STEGO', file: 'receipt_scan.jpg', status: 'DETECTED', color: '#8b5cf6' },
  ];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % threats.length), 2200);
    return () => clearInterval(t);
  }, [threats.length]);

  return (
    <div className="threat-ticker">
      <div className="ticker-header">
        <span className="ticker-dot" />
        <span>LIVE THREAT FEED</span>
      </div>
      <div className="ticker-items">
        {threats.map((t, i) => (
          <div key={i} className={`ticker-item ${i === active ? 'active' : ''}`}>
            <span className="ticker-type" style={{ color: t.color }}>{t.type}</span>
            <span className="ticker-target">{t.domain || t.file}</span>
            <span className="ticker-status" style={{ color: t.color }}>{t.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Particle Background ─────────────────────────────────────────────── */
const ParticleField = () => {
  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 8}s`,
    duration: `${6 + Math.random() * 8}s`,
    size: `${2 + Math.random() * 3}px`,
    opacity: 0.2 + Math.random() * 0.5,
  }));

  return (
    <div className="particle-field">
      {particles.map(p => (
        <div key={p.id} className="particle" style={{
          left: p.left,
          width: p.size,
          height: p.size,
          animationDelay: p.delay,
          animationDuration: p.duration,
          opacity: p.opacity,
        }} />
      ))}
    </div>
  );
};

/* ── Main Component ──────────────────────────────────────────────────── */
const LandingPage = ({ onNavigate }) => {
  const handleScan = (type) => {
    onNavigate('scan', { scanType: type });
  };

  return (
    <div className="landing">
      {/* ── HERO ── */}
      <section className="hero">
        <ParticleField />
        <div className="hero-grid-overlay" />
        <div className="hero-radial-glow" />

        <div className="hero-container">
          <div className="hero-content">
            {/* Badge */}
            <div className="hero-badge">
              <span className="badge-dot" />
              <span>Powered by Advanced AI & Machine Learning</span>
            </div>

            {/* Title */}
            <h1 className="hero-title">
              <span className="hero-title-line">Detect. Analyze.</span>
              <span className="hero-title-line gradient-text">Neutralize.</span>
            </h1>

            <p className="hero-subtitle">
              AI-SHIELD is your next-generation cyber threat intelligence platform.
              Scan URLs, analyze phishing emails, and uncover hidden steganographic
              payloads — all in seconds.
            </p>

            {/* Scan Buttons */}
            <div className="hero-actions">
              <button className="scan-btn scan-url" onClick={() => handleScan('url')}>
                <div className="scan-btn-icon">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M11 3c0 0 3 2.5 3 8s-3 8-3 8M11 3c0 0-3 2.5-3 8s3 8 3 8M3 11h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="scan-btn-text">
                  <span className="scan-label">Scan URL</span>
                  <span className="scan-sublabel">Phishing Detection</span>
                </div>
                <div className="scan-btn-arrow">→</div>
              </button>

              <button className="scan-btn scan-email" onClick={() => handleScan('email')}>
                <div className="scan-btn-icon">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <rect x="2" y="5" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M2 8l9 6 9-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="scan-btn-text">
                  <span className="scan-label">Analyze Email</span>
                  <span className="scan-sublabel">Header & Body Analysis</span>
                </div>
                <div className="scan-btn-arrow">→</div>
              </button>

              <button className="scan-btn scan-image" onClick={() => handleScan('image')}>
                <div className="scan-btn-icon">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <rect x="2" y="2" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="7.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M2 14l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="scan-btn-text">
                  <span className="scan-label">Check Image</span>
                  <span className="scan-sublabel">Steganography Detection</span>
                </div>
                <div className="scan-btn-arrow">→</div>
              </button>
            </div>

            {/* Trust row */}
            <div className="trust-row">
              {['256-bit Encrypted', 'Zero Data Retention', 'Real-time Analysis', 'AI-Powered'].map((t, i) => (
                <div key={i} className="trust-item">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l3.5 3.5L12 3" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Visual */}
          <div className="hero-visual">
            <div className="shield-container">
              <div className="shield-rings">
                <div className="ring ring-1" />
                <div className="ring ring-2" />
                <div className="ring ring-3" />
              </div>
              <div className="shield-core">
                <svg width="80" height="90" viewBox="0 0 80 90" fill="none">
                  <path d="M40 4L6 18v22c0 21 14.7 40.6 34 46 19.3-5.4 34-25 34-46V18L40 4z"
                    fill="url(#hero-shield)" stroke="rgba(0,212,255,0.3)" strokeWidth="1"/>
                  <path d="M26 45l8 8L54 36" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  <defs>
                    <linearGradient id="hero-shield" x1="6" y1="4" x2="74" y2="86">
                      <stop offset="0%" stopColor="rgba(0,212,255,0.3)"/>
                      <stop offset="100%" stopColor="rgba(139,92,246,0.3)"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <ThreatTicker />

              {/* Floating badges */}
              <div className="float-badge float-badge-1">
                <span className="fb-dot fb-green"/>
                <span>URL Safe</span>
              </div>
              <div className="float-badge float-badge-2">
                <span className="fb-dot fb-red"/>
                <span>Threat Blocked</span>
              </div>
              <div className="float-badge float-badge-3">
                <span className="fb-dot fb-purple"/>
                <span>Stego Detected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="stats-bar">
          <ThreatCounter label="Threats Blocked" value={2847193} color="#00d4ff" />
          <div className="stats-divider" />
          <ThreatCounter label="URLs Scanned" value={9834521} color="#8b5cf6" />
          <div className="stats-divider" />
          <ThreatCounter label="Emails Analyzed" value={1523847} color="#10b981" />
          <div className="stats-divider" />
          <ThreatCounter label="Accuracy Rate" value={99} suffix="%" color="#f59e0b" />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="features-section" id="features">
        <div className="section-container">
          <div className="section-header">
            <div className="section-label">CAPABILITIES</div>
            <h2 className="section-title">Advanced Threat <span className="gradient-text">Detection Suite</span></h2>
            <p className="section-subtitle">
              Three powerful AI engines working in concert to protect you from modern cyber threats.
            </p>
          </div>

          <div className="features-grid">
            <FeatureCard
              icon={
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="12" stroke="url(#f1)" strokeWidth="1.5"/>
                  <path d="M16 4c0 0 4 3.5 4 12s-4 12-4 12M16 4c0 0-4 3.5-4 12s4 12 4 12M4 16h24" stroke="url(#f1)" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="16" cy="16" r="3" fill="url(#f1)"/>
                  <defs><linearGradient id="f1" x1="4" y1="4" x2="28" y2="28"><stop stopColor="#00d4ff"/><stop offset="1" stopColor="#3b82f6"/></linearGradient></defs>
                </svg>
              }
              title="Phishing URL Detection"
              description="Deep-scan any URL against our AI model trained on millions of phishing patterns. Real-time domain reputation, redirect chain analysis, and WHOIS forensics."
              badge="Most Used"
              delay={0}
            />
            <FeatureCard
              icon={
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect x="3" y="7" width="26" height="19" rx="3" stroke="url(#f2)" strokeWidth="1.5"/>
                  <path d="M3 11l13 9 13-9" stroke="url(#f2)" strokeWidth="1.5" strokeLinecap="round"/>
                  <defs><linearGradient id="f2" x1="3" y1="7" x2="29" y2="26"><stop stopColor="#8b5cf6"/><stop offset="1" stopColor="#3b82f6"/></linearGradient></defs>
                </svg>
              }
              title="Email Header Analysis"
              description="Parse raw email headers and bodies to identify spoofing, suspicious routing, malicious attachments, and social engineering indicators with confidence scoring."
              badge="AI-Powered"
              delay={100}
            />
            <FeatureCard
              icon={
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect x="3" y="3" width="26" height="26" rx="4" stroke="url(#f3)" strokeWidth="1.5"/>
                  <circle cx="10" cy="10" r="2.5" stroke="url(#f3)" strokeWidth="1.5"/>
                  <path d="M3 21l7-7 6 6 4-4 9 9" stroke="url(#f3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <defs><linearGradient id="f3" x1="3" y1="3" x2="29" y2="29"><stop stopColor="#8b5cf6"/><stop offset="1" stopColor="#ec4899"/></linearGradient></defs>
                </svg>
              }
              title="Steganography Detection"
              description="Uncover hidden data concealed inside image files using LSB analysis, chi-square statistical tests, and entropy mapping. Supports PNG, JPG, BMP, and GIF."
              badge="Forensic"
              delay={200}
            />
            <FeatureCard
              icon={
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M16 3L4 8v10c0 8 5.5 15.4 12 17 6.5-1.6 12-9 12-17V8L16 3z" stroke="url(#f4)" strokeWidth="1.5"/>
                  <path d="M11 16l3.5 3.5L21 12" stroke="url(#f4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <defs><linearGradient id="f4" x1="4" y1="3" x2="28" y2="29"><stop stopColor="#10b981"/><stop offset="1" stopColor="#00d4ff"/></linearGradient></defs>
                </svg>
              }
              title="Risk Score Engine"
              description="Every scan produces a granular 0-100 risk score with threat category breakdown, confidence intervals, and recommended remediation actions."
              badge="Instant"
              delay={300}
            />
            <FeatureCard
              icon={
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect x="4" y="4" width="24" height="24" rx="3" stroke="url(#f5)" strokeWidth="1.5"/>
                  <path d="M4 12h24M12 4v8" stroke="url(#f5)" strokeWidth="1.5" strokeLinecap="round"/>
                  <rect x="8" y="16" width="4" height="8" rx="1" fill="url(#f5)" opacity="0.5"/>
                  <rect x="14" y="19" width="4" height="5" rx="1" fill="url(#f5)" opacity="0.7"/>
                  <rect x="20" y="14" width="4" height="10" rx="1" fill="url(#f5)"/>
                  <defs><linearGradient id="f5" x1="4" y1="4" x2="28" y2="28"><stop stopColor="#f59e0b"/><stop offset="1" stopColor="#ef4444"/></linearGradient></defs>
                </svg>
              }
              title="Threat Intelligence Dashboard"
              description="Aggregate all your scan history, visualize threat trends over time, and export full forensic reports in PDF or JSON format for compliance and audit trails."
              badge="Pro"
              delay={400}
            />
            <FeatureCard
              icon={
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="12" stroke="url(#f6)" strokeWidth="1.5"/>
                  <path d="M16 10v6l4 2" stroke="url(#f6)" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="16" cy="16" r="2" fill="url(#f6)"/>
                  <defs><linearGradient id="f6" x1="4" y1="4" x2="28" y2="28"><stop stopColor="#00d4ff"/><stop offset="1" stopColor="#10b981"/></linearGradient></defs>
                </svg>
              }
              title="Real-time Analysis"
              description="Sub-second threat verdicts powered by our distributed inference cluster. No queuing, no waiting — instant results for time-sensitive security decisions."
              badge="Fast"
              delay={500}
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="how-section" id="how-it-works">
        <div className="section-container">
          <div className="section-header">
            <div className="section-label">WORKFLOW</div>
            <h2 className="section-title">How <span className="gradient-text">AI-SHIELD</span> Works</h2>
            <p className="section-subtitle">Four steps from input to intelligence.</p>
          </div>

          <div className="steps-row">
            <StepCard
              number="01"
              icon="🌐"
              title="Choose Scan Type"
              desc="Select URL scan, email analysis, or steganography detection based on your threat vector."
            />
            <StepCard
              number="02"
              icon="📤"
              title="Upload or Input"
              desc="Paste a URL, upload an email file (.eml / .msg), or drop an image — it's that simple."
            />
            <StepCard
              number="03"
              icon="🤖"
              title="AI Analysis"
              desc="Our multi-layer AI engine processes your input against threat databases and behavioral models."
            />
            <StepCard
              number="04"
              icon="📊"
              title="Instant Results"
              desc="Get a full threat report with risk score, indicators of compromise, and actionable insights."
            />
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="cta-section">
        <div className="cta-glow-left" />
        <div className="cta-glow-right" />
        <div className="section-container">
          <div className="cta-inner">
            <h2 className="cta-title">Ready to Secure Your Digital Footprint?</h2>
            <p className="cta-subtitle">
              Join thousands of security professionals using AI-SHIELD to detect threats before they strike.
            </p>
            <div className="cta-buttons">
              <button className="btn-primary" onClick={() => onNavigate('scan')}>
                Start Free Scan
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 9h10M10 5l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="btn-secondary" onClick={() => onNavigate('dashboard')}>
                View Dashboard
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                <path d="M14 2L3 7v8c0 6.5 4.7 12.6 11 14 6.3-1.4 11-7.5 11-14V7L14 2z" fill="url(#fl)"/>
                <path d="M10 14l2.5 2.5L18 11" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <defs><linearGradient id="fl" x1="3" y1="2" x2="25" y2="26"><stop stopColor="#00d4ff"/><stop offset="1" stopColor="#8b5cf6"/></linearGradient></defs>
              </svg>
              <span>AI-SHIELD</span>
            </div>
            <p>AI-powered cyber threat detection. Fast, accurate, and always on.</p>
          </div>
          <div className="footer-copy">
            © 2026 AI-SHIELD. All rights reserved. Built for security professionals.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
