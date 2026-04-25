import React, { useState, useEffect } from 'react';
import './PhishingPage.css';
import * as api from '../services/api';
import { transformURLScan, transformEmailScan } from '../services/transformers';

/* ── UI Components ─────────────────────────── */

const IconScan = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </svg>
);

const IconURL = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const IconEmail = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

/* ── Animated Risk Meter ─────────────────────── */
const RiskMeter = ({ risk, show }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!show) return;
    let v = 0;
    const t = setInterval(() => {
      v = Math.min(v + 2, risk);
      setVal(v);
      if (v >= risk) clearInterval(t);
    }, 15);
    return () => clearInterval(t);
  }, [show, risk]);

  const color = val >= 70 ? 'var(--accent-danger)' : val >= 40 ? 'var(--accent-warn)' : 'var(--accent-safe)';
  const label = val >= 70 ? 'CRITICAL RISK' : val >= 40 ? 'SUSPICIOUS' : 'SECURE';
  const circ = 2 * Math.PI * 46;
  
  return (
    <div className="risk-meter-2">
      <svg width="140" height="140" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="46" fill="none" stroke="var(--border-strong)" strokeWidth="8"/>
        <circle cx="60" cy="60" r="46" fill="none" stroke={color}
          strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ - (val / 100) * circ}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 0.1s ease', filter: `drop-shadow(0 0 8px ${color}44)` }}
        />
        <text x="60" y="58" textAnchor="middle" fill="var(--text-primary)" fontSize="28" fontWeight="800" fontFamily="var(--font-mono)">{val}</text>
        <text x="60" y="74" textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontWeight="700">SCORE</text>
      </svg>
      <div className="rm-badge" style={{ backgroundColor: `${color}22`, color }}>{label}</div>
    </div>
  );
};

/* ── Result Panel ────────────────────────────── */
const ResultPanel = ({ result, onClear }) => (
  <div className={`result-panel-2 glass ${result.isPhishing ? 'threat' : 'clean'}`}>
    <div className="result-header-2">
      <div className="verdict-wrapper">
        <div className="verdict-title">{result.isPhishing ? 'Threat Identified' : 'Clean Analysis'}</div>
        <div className="verdict-target">{result.target}</div>
      </div>
      <button className="btn-clear-2" onClick={onClear}>Dismiss Analysis</button>
    </div>

    <div className="result-grid-2">
      <div className="result-chart-area">
        <RiskMeter risk={result.risk} show />
      </div>

      <div className="result-data-area">
        <div className="data-section">
          <div className="section-label-2">ML Model Indicators</div>
          <div className="indicators-list">
            {result.indicators.map((ind, i) => (
              <div key={i} className="indicator-row">
                <span className="ind-label">{ind.label}</span>
                <span className={`ind-status status-${ind.status}`}>{ind.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="data-section">
          <div className="section-label-2">Analysis Metadata</div>
          <div className="indicators-list">
            <div className="indicator-row">
              <span className="ind-label">Scan ID</span>
              <span className="ind-status status-safe">{result.scanId}</span>
            </div>
            <div className="indicator-row">
              <span className="ind-label">Confidence</span>
              <span className="ind-status status-safe">{result.confidence}%</span>
            </div>
            <div className="indicator-row">
              <span className="ind-label">Analysis Time</span>
              <span className="ind-status status-safe">{result.scanTime}s</span>
            </div>
          </div>
        </div>

        <div className="data-section">
          <div className="section-label-2">Security Recommendations</div>
          <div className="recs-list">
            {result.recs.map((r, i) => (
              <div key={i} className="rec-row">
                <span className="rec-bullet" />
                {r}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ── Main Page ───────────────────────────────── */
export default function PhishingPage() {
  const [tab, setTab] = useState('url');
  const [url, setUrl] = useState('');
  const [emailText, setEmailText] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    try {
      if (tab === 'url') {
        const data = await api.scanURL(url);
        setResult(transformURLScan(data));
      } else {
        const data = await api.analyzeEmailText(emailText);
        setResult(transformEmailScan(data));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="phishing-page-2">
      <div className="ph-grid-2" />
      
      <div className="ph-container-2">
        <header className="ph-header-2">
          <div className="ph-badge-2">AI-POWERED PHISHING ENGINE</div>
          <h1 className="ph-title-2">ML-Based Threat Detection</h1>
          <p className="ph-desc-2">
            Our machine learning models analyze URLs and email headers to detect phishing attempts.
            Real-time assessment of domain reputation, SSL certificates, geolocation, and heuristic scoring.
          </p>
        </header>

        {result ? (
          <ResultPanel result={result} onClear={() => setResult(null)} />
        ) : (
          <div className="ph-analyzer-card glass">
            <div className="ph-tabs-2">
              <button className={tab === 'url' ? 'active' : ''} onClick={() => setTab('url')}>
                <IconURL /> URL SCANNER
              </button>
              <button className={tab === 'email' ? 'active' : ''} onClick={() => setTab('email')}>
                <IconEmail /> EMAIL ANALYZER
              </button>
            </div>

            <div className="ph-input-area-2">
              {tab === 'url' ? (
                <div className="url-input-wrap-2">
                  <div className="input-group-2">
                    <input 
                      type="text" 
                      placeholder="Enter target URL for reputation analysis..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                    <button className="btn-scan-2" onClick={handleScan} disabled={!url || scanning}>
                      {scanning ? 'SCANNING...' : <><IconScan /> ANALYZE</>}
                    </button>
                  </div>
                  <div className="input-examples-2">
                    <span>Quick Test:</span>
                    <button onClick={() => setUrl('secure-login.xyz')}>secure-login.xyz</button>
                    <button onClick={() => setUrl('bank-alert-update.ru')}>bank-alert-update.ru</button>
                  </div>
                </div>
              ) : (
                <div className="email-input-wrap-2">
                  <textarea 
                    className="code-editor-style"
                    placeholder="Paste raw email headers or body here..."
                    value={emailText}
                    onChange={(e) => setEmailText(e.target.value)}
                  />
                  <div className="email-actions-2">
                    <div className="editor-info">MONITORING HEADER FLOW</div>
                    <button className="btn-scan-2" onClick={handleScan} disabled={!emailText || scanning}>
                      {scanning ? 'SCANNING...' : <><IconScan /> RUN FORENSICS</>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && <div className="ph-error-2">⚠ ANALYSIS ERROR: {error}</div>}
          </div>
        )}

        <div className="ph-features-row-2">
          <div className="ph-feature-2">
            <div className="ph-f-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <h4>Domain Intelligence</h4>
            <p>Recursive analysis of registrar data, SSL validity, and redirection chains.</p>
          </div>
          <div className="ph-feature-2">
            <div className="ph-f-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </div>
            <h4>Header Forensics</h4>
            <p>Verification of SPF, DKIM, and DMARC alignments to identify spoofing attempts.</p>
          </div>
          <div className="ph-feature-2">
            <div className="ph-f-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/>
              </svg>
            </div>
            <h4>Heuristic Scoring</h4>
            <p>Probability-based risk assessment powered by our proprietary threat models.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
