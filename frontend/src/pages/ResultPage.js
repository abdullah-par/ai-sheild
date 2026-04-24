import React, { useEffect, useState } from 'react';
import './ResultPage.css';

/* ── Simulated Analysis Data ────────────────── */
const generateResult = (scanData) => {
  const isPhishing = scanData.value &&
    (scanData.value.includes('paypal') || scanData.value.includes('bank') ||
     scanData.value.includes('secure') || scanData.value.includes('verify') ||
     scanData.value.includes('login') || scanData.value.includes('apple') ||
     scanData.value.includes('Urgent') || scanData.type === 'image');

  const risk = isPhishing ? Math.floor(72 + Math.random() * 25) : Math.floor(5 + Math.random() * 20);

  const urlIndicators = isPhishing ? [
    { label: 'Domain Age', value: '< 7 days', status: 'danger' },
    { label: 'HTTPS Valid', value: 'No', status: 'danger' },
    { label: 'IP Geolocation', value: 'Russia (RU)', status: 'warning' },
    { label: 'Redirect Chain', value: '3 hops detected', status: 'warning' },
    { label: 'Typosquatting', value: 'PayPal similarity: 94%', status: 'danger' },
    { label: 'Blocklist Match', value: 'Google SafeBrowsing', status: 'danger' },
  ] : [
    { label: 'Domain Age', value: '8 years 3 months', status: 'safe' },
    { label: 'HTTPS Valid', value: 'Yes (TLS 1.3)', status: 'safe' },
    { label: 'IP Geolocation', value: 'United States (US)', status: 'safe' },
    { label: 'Redirect Chain', value: 'No redirects', status: 'safe' },
    { label: 'Typosquatting', value: 'No matches', status: 'safe' },
    { label: 'Blocklist Match', value: 'Not found', status: 'safe' },
  ];

  const emailIndicators = isPhishing ? [
    { label: 'SPF Check', value: 'FAIL', status: 'danger' },
    { label: 'DKIM Signature', value: 'Invalid', status: 'danger' },
    { label: 'DMARC Policy', value: 'None', status: 'warning' },
    { label: 'Sender Spoofing', value: 'Detected', status: 'danger' },
    { label: 'Suspicious Links', value: '3 found', status: 'danger' },
    { label: 'Urgency Signals', value: 'High — "Act Now"', status: 'warning' },
  ] : [
    { label: 'SPF Check', value: 'PASS', status: 'safe' },
    { label: 'DKIM Signature', value: 'Valid', status: 'safe' },
    { label: 'DMARC Policy', value: 'Reject', status: 'safe' },
    { label: 'Sender Spoofing', value: 'Not detected', status: 'safe' },
    { label: 'Suspicious Links', value: '0 found', status: 'safe' },
    { label: 'Urgency Signals', value: 'None', status: 'safe' },
  ];

  const imageIndicators = [
    { label: 'LSB Anomaly Score', value: isPhishing ? '87.4 (High)' : '2.1 (Normal)', status: isPhishing ? 'danger' : 'safe' },
    { label: 'Chi-Square Test', value: isPhishing ? 'Failed (p<0.01)' : 'Passed (p=0.84)', status: isPhishing ? 'danger' : 'safe' },
    { label: 'Entropy Level', value: isPhishing ? '7.98 (Abnormal)' : '4.2 (Normal)', status: isPhishing ? 'warning' : 'safe' },
    { label: 'Hidden Payload', value: isPhishing ? '~2.3 KB detected' : 'None', status: isPhishing ? 'danger' : 'safe' },
    { label: 'Metadata Clean', value: isPhishing ? 'No — anomalies found' : 'Yes', status: isPhishing ? 'warning' : 'safe' },
    { label: 'File Format Valid', value: 'Yes', status: 'safe' },
  ];

  const indicatorMap = { url: urlIndicators, email: emailIndicators, image: imageIndicators };
  const threatMap = {
    url: isPhishing ? 'Phishing URL' : 'Legitimate URL',
    email: isPhishing ? 'Phishing Email' : 'Legitimate Email',
    image: isPhishing ? 'Steganographic Content Detected' : 'No Hidden Data Found',
  };

  return {
    risk,
    isPhishing,
    threatType: threatMap[scanData.type],
    indicators: indicatorMap[scanData.type],
    confidence: isPhishing ? Math.floor(88 + Math.random() * 10) : Math.floor(92 + Math.random() * 7),
    scanTime: (0.8 + Math.random() * 1.4).toFixed(2),
    recommendations: isPhishing ? [
      'Do not visit or interact with this content',
      'Report to your IT/Security team immediately',
      'Block the domain/sender at your email gateway',
      'Monitor for related threats in your environment',
    ] : [
      'Content appears safe — proceed with caution',
      'Keep your threat detection tools up to date',
      'Continue monitoring for anomalies',
    ],
  };
};

/* ── Risk Gauge ─────────────────────────────── */
const RiskGauge = ({ risk }) => {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      let v = 0;
      const step = () => {
        v = Math.min(v + 2, risk);
        setAnimated(v);
        if (v < risk) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, 300);
    return () => clearTimeout(t);
  }, [risk]);

  const color = animated >= 70 ? '#ef4444' : animated >= 40 ? '#f59e0b' : '#10b981';
  const label = animated >= 70 ? 'HIGH RISK' : animated >= 40 ? 'MEDIUM RISK' : 'LOW RISK';
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (animated / 100) * circumference;

  return (
    <div className="risk-gauge">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10"/>
        <circle
          cx="70" cy="70" r="54"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.5s ease', filter: `drop-shadow(0 0 8px ${color})` }}
        />
        <text x="70" y="65" textAnchor="middle" fill={color} fontSize="28" fontWeight="800" fontFamily="JetBrains Mono">
          {animated}
        </text>
        <text x="70" y="82" textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="Inter">
          / 100
        </text>
      </svg>
      <div className="gauge-label" style={{ color }}>{label}</div>
    </div>
  );
};

/* ── Main Result Page ───────────────────────── */
const ResultPage = ({ scanData, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(0);

  const steps = [
    'Resolving target...',
    'Querying threat databases...',
    'Running AI inference...',
    'Generating report...',
  ];
  const [step, setStep] = useState(0);

  useEffect(() => {
    let p = 0;
    const interval = setInterval(() => {
      p = Math.min(p + Math.random() * 12, 95);
      setProgress(Math.floor(p));
      setStep(Math.min(Math.floor(p / 25), 3));
    }, 180);

    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      setResult(generateResult(scanData));
      setTimeout(() => setLoading(false), 400);
    }, 2800);

    return () => clearInterval(interval);
  }, [scanData]);

  if (loading) {
    return (
      <div className="result-page">
        <div className="loading-screen">
          <div className="loading-shield">
            <svg width="80" height="90" viewBox="0 0 80 90" fill="none">
              <path d="M40 4L6 18v22c0 21 14.7 40.6 34 46 19.3-5.4 34-25 34-46V18L40 4z"
                fill="url(#ls)" stroke="rgba(0,212,255,0.4)" strokeWidth="1"/>
              <path d="M26 45l8 8L54 36" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="ls" x1="6" y1="4" x2="74" y2="86">
                  <stop stopColor="rgba(0,212,255,0.4)"/>
                  <stop offset="1" stopColor="rgba(139,92,246,0.4)"/>
                </linearGradient>
              </defs>
            </svg>
            <div className="loading-ring" />
          </div>
          <div className="loading-steps">
            {steps.map((s, i) => (
              <div key={i} className={`loading-step ${i <= step ? 'done' : ''} ${i === step && progress < 100 ? 'active' : ''}`}>
                <div className="ls-indicator" />
                <span>{s}</span>
              </div>
            ))}
          </div>
          <div className="loading-progress">
            <div className="lp-bar"><div className="lp-fill" style={{ width: `${progress}%` }} /></div>
            <span>{progress}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="result-page">
      <div className="result-container">
        {/* Header */}
        <div className="result-header">
          <div className={`result-verdict ${result.isPhishing ? 'verdict-danger' : 'verdict-safe'}`}>
            <div className="verdict-icon">
              {result.isPhishing ? (
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M14 10v6M14 20h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M12 4.8L3 20h22L17 4.8a3 3 0 00-5 0z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M8 14l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              )}
            </div>
            <div>
              <div className="verdict-label">{result.threatType}</div>
              <div className="verdict-meta">
                Confidence: {result.confidence}% · Scan time: {result.scanTime}s
              </div>
            </div>
          </div>

          <div className="result-nav-btns">
            <button className="btn-secondary" onClick={() => onNavigate('scan')}>New Scan</button>
            <button className="btn-primary" onClick={() => onNavigate('dashboard')}>View Dashboard →</button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="result-grid">
          {/* Risk Score */}
          <div className="result-card risk-card">
            <div className="card-title">Risk Score</div>
            <RiskGauge risk={result.risk} />
          </div>

          {/* Indicators */}
          <div className="result-card indicators-card">
            <div className="card-title">Threat Indicators</div>
            <div className="indicators-list">
              {result.indicators.map((ind, i) => (
                <div key={i} className="indicator-row">
                  <div className="ind-label">{ind.label}</div>
                  <div className={`ind-value ind-${ind.status}`}>{ind.value}</div>
                  <div className={`ind-dot ind-dot-${ind.status}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="result-card recs-card">
            <div className="card-title">Recommendations</div>
            <div className="recs-list">
              {result.recommendations.map((r, i) => (
                <div key={i} className="rec-item">
                  <div className={`rec-bullet ${result.isPhishing ? 'bullet-danger' : 'bullet-safe'}`} />
                  <span>{r}</span>
                </div>
              ))}
            </div>

            <div className="scan-target-box">
              <div className="target-label">SCANNED TARGET</div>
              <div className="target-value">{scanData.value || 'Image file'}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="result-actions">
          <button className="action-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v9M4 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Download PDF Report
          </button>
          <button className="action-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Export as JSON
          </button>
          <button className="action-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 10v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2M8 2v8M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Share Result
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultPage;
