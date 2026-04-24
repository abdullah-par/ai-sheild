import React, { useState, useEffect } from 'react';
import './PhishingPage.css';
import * as api from '../services/api';
import { transformURLScan, transformEmailScan } from '../services/transformers';

/* ── Animated Risk Meter ─────────────────────── */
const RiskMeter = ({ risk, show }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!show) return;
    let v = 0;
    const t = setInterval(() => {
      v = Math.min(v + 3, risk);
      setVal(v);
      if (v >= risk) clearInterval(t);
    }, 20);
    return () => clearInterval(t);
  }, [show, risk]);

  const color = val >= 70 ? '#ef4444' : val >= 40 ? '#f59e0b' : '#10b981';
  const label = val >= 70 ? 'HIGH RISK' : val >= 40 ? 'MEDIUM' : 'LOW RISK';
  const circ = 2 * Math.PI * 46;
  return (
    <div className="risk-meter">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10"/>
        <circle cx="60" cy="60" r="46" fill="none" stroke={color}
          strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ - (val / 100) * circ}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 0.05s linear', filter: `drop-shadow(0 0 6px ${color})` }}
        />
        <text x="60" y="55" textAnchor="middle" fill={color} fontSize="24" fontWeight="800" fontFamily="JetBrains Mono">{val}</text>
        <text x="60" y="70" textAnchor="middle" fill="#475569" fontSize="9" fontFamily="Inter">/ 100</text>
      </svg>
      <span className="rm-label" style={{ color }}>{label}</span>
    </div>
  );
};

/* ── Result Panel ────────────────────────────── */
const ResultPanel = ({ result, onClear }) => (
  <div className={`ph-result ${result.isPhishing ? 'danger' : 'safe'}`}>
    <div className="ph-result-header">
      <div className="ph-verdict-badge">
        {result.isPhishing ? '⚠️ PHISHING DETECTED' : '✅ APPEARS SAFE'}
      </div>
      <button className="ph-clear-btn" onClick={onClear}>New Scan ✕</button>
    </div>

    <div className="ph-result-grid">
      <RiskMeter risk={result.risk} show />

      <div className="ph-indicators">
        <div className="ph-ind-title">Threat Indicators</div>
        {result.indicators.map((ind, i) => (
          <div key={i} className="ph-ind-row">
            <span className="ph-ind-label">{ind.label}</span>
            <span className={`ph-ind-val ph-ind-${ind.status}`}>{ind.value}</span>
            <span className={`ph-ind-dot ph-dot-${ind.status}`} />
          </div>
        ))}
      </div>

      <div className="ph-recs">
        <div className="ph-ind-title">Recommendations</div>
        {result.recs.map((r, i) => (
          <div key={i} className="ph-rec-item">
            <span className={`ph-rec-dot ${result.isPhishing ? 'rdanger' : 'rsafe'}`} />
            {r}
          </div>
        ))}
        <div className="ph-scan-target">
          <span className="ph-target-label">SCANNED</span>
          <span className="ph-target-val">{result.target}</span>
        </div>
      </div>
    </div>
  </div>
);

/* ── Error Banner ────────────────────────────── */
const ErrorBanner = ({ message, onDismiss }) => (
  <div className="ph-error-banner">
    <span>⚠ {message}</span>
    <button onClick={onDismiss}>✕</button>
  </div>
);

/* ── URL Scanner ─────────────────────────────── */
const URLScanner = ({ onResult, onError }) => {
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);

  const scan = async () => {
    if (!url) return;
    setScanning(true);
    try {
      const data = await api.scanURL(url);
      onResult(transformURLScan(data));
    } catch (err) {
      onError(err.message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="ph-input-wrap">
      <div className="ph-url-bar">
        <span className="ph-url-prefix">🔗</span>
        <input
          className="ph-url-input"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && scan()}
          placeholder="Paste a suspicious URL to scan…"
          spellCheck={false}
        />
        <button className="ph-scan-btn" onClick={scan} disabled={!url || scanning}>
          {scanning ? <span className="spin-ring" /> : 'Scan →'}
        </button>
      </div>

      <div className="ph-example-row">
        <span>Try:</span>
        {['paypal-secure-login.ru','bank-update-now.xyz','apple-id-verify.cc','github.com'].map(ex => (
          <button key={ex} className="ph-chip" onClick={() => setUrl(ex)}>{ex}</button>
        ))}
      </div>

      {scanning && (
        <div className="ph-scanning">
          <div className="ph-scan-bar"><div className="ph-scan-fill" /></div>
          <span>Running AI analysis on {url}…</span>
        </div>
      )}

      <div className="ph-url-features">
        {['Domain & WHOIS Lookup','SSL / TLS Validation','Blocklist Cross-check','Redirect Chain Analysis','Typosquatting Detection','AI Confidence Scoring'].map((f, i) => (
          <div key={i} className="ph-url-feat">
            <span className="ph-feat-dot" />
            {f}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Email Analyzer ──────────────────────────── */
const EmailAnalyzer = ({ onResult, onError }) => {
  const [mode, setMode] = useState('paste');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [drag, setDrag] = useState(false);

  const scan = async () => {
    if (mode === 'paste' && !text) return;
    if (mode === 'upload' && !file) return;
    setScanning(true);
    try {
      const data = mode === 'paste'
        ? await api.analyzeEmailText(text)
        : await api.analyzeEmailFile(file);
      onResult(transformEmailScan(data));
    } catch (err) {
      onError(err.message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="ph-input-wrap">
      <div className="ph-mode-toggle">
        <button className={mode === 'paste' ? 'active' : ''} onClick={() => setMode('paste')}>Paste Headers / Body</button>
        <button className={mode === 'upload' ? 'active' : ''} onClick={() => setMode('upload')}>Upload .eml / .msg</button>
      </div>

      {mode === 'paste' ? (
        <div className="ph-paste-wrap">
          <textarea
            className="ph-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`From: sender@suspicious.com\nTo: victim@company.com\nSubject: Urgent: Verify Your Account Now!\n\nDear Customer, click here immediately to avoid account suspension…`}
          />
          <span className="ph-char-count">{text.length} chars</span>
        </div>
      ) : (
        <div
          className={`ph-drop ${drag ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); setFile(e.dataTransfer.files[0]); }}
          onClick={() => document.getElementById('ph-file').click()}
        >
          <input id="ph-file" type="file" accept=".eml,.msg,.txt" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
          {file
            ? <div className="ph-file-chosen">📄 {file.name} <span>({(file.size/1024).toFixed(1)} KB)</span></div>
            : <><div className="ph-drop-icon">📥</div><p>Drop .eml / .msg file here</p><span>or click to browse</span></>}
        </div>
      )}

      {scanning && (
        <div className="ph-scanning">
          <div className="ph-scan-bar"><div className="ph-scan-fill" /></div>
          <span>Parsing headers and running SPF / DKIM / DMARC checks…</span>
        </div>
      )}

      <button className="ph-analyze-btn" onClick={scan} disabled={scanning || (mode === 'paste' ? !text : !file)}>
        {scanning ? 'Analyzing…' : 'Analyze Email →'}
      </button>
    </div>
  );
};

/* ── Main Page ───────────────────────────────── */
export default function PhishingPage() {
  const [tab, setTab] = useState('url');
  const [result, setResult] = useState(null);
  const [apiError, setApiError] = useState(null);

  return (
    <div className="phishing-page">
      <div className="ph-bg-glow" />
      <div className="ph-grid-overlay" />

      <div className="ph-container">
        {/* Hero */}
        <div className="ph-hero">
          <div className="ph-hero-badge">
            <span className="ph-badge-dot" />
            PHISHING DETECTION ENGINE
          </div>
          <h1 className="ph-hero-title">
            Phishing <span className="ph-gradient">Analyzer</span>
          </h1>
          <p className="ph-hero-sub">
            Scan URLs and emails against AI threat models, blocklists, and
            behavioral heuristics to detect phishing attempts in real time.
          </p>
          <div className="ph-hero-stats">
            {[['99.2%','Detection Rate'],['< 1s','Analysis Time'],['50M+','Patterns Trained']].map(([v,l]) => (
              <div key={l} className="ph-stat"><span className="ph-stat-val">{v}</span><span className="ph-stat-label">{l}</span></div>
            ))}
          </div>
        </div>

        {/* Analyzer Card */}
        {result ? (
          <ResultPanel result={result} onClear={() => setResult(null)} />
        ) : (
          <div className="ph-card">
            <div className="ph-tabs">
              <button className={`ph-tab ${tab === 'url' ? 'active' : ''}`} onClick={() => setTab('url')}>
                <span>🌐</span> URL Scanner
              </button>
              <button className={`ph-tab ${tab === 'email' ? 'active' : ''}`} onClick={() => setTab('email')}>
                <span>📧</span> Email Analyzer
              </button>
            </div>

            {apiError && <ErrorBanner message={apiError} onDismiss={() => setApiError(null)} />}
            {tab === 'url'   && <URLScanner    onResult={setResult} onError={setApiError} />}
            {tab === 'email' && <EmailAnalyzer onResult={setResult} onError={setApiError} />}
          </div>
        )}

        {/* Info Row */}
        <div className="ph-info-row">
          {[
            { icon: '🔍', title: 'Deep URL Inspection', desc: 'WHOIS, DNS, redirect chains, certificate validity and domain reputation checked simultaneously.' },
            { icon: '📬', title: 'Email Header Forensics', desc: 'SPF, DKIM, DMARC authentication checks plus spoofing detection and link extraction.' },
            { icon: '🤖', title: 'AI Confidence Scoring', desc: 'Multi-layer ML model trained on 50M+ phishing samples gives a 0–100 risk score instantly.' },
          ].map((c, i) => (
            <div key={i} className="ph-info-card">
              <div className="ph-info-icon">{c.icon}</div>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
