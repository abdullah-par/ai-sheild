const HIGH_RISK_COUNTRIES = ['RU', 'CN', 'KP', 'IR', 'NG'];
const bool = (good) => (good ? 'safe' : 'danger');

/* ── URL Scan ─────────────────────────────── */
export const transformURLScan = (d) => ({
  isPhishing: d.verdict !== 'SAFE',
  risk: d.risk_score,
  target: d.url,
  scanId: d.scan_id,
  confidence: d.confidence,
  scanTime: (d.scan_time_ms / 1000).toFixed(2),
  indicators: [
    { label: 'Domain Age',      value: `${d.indicators.domain_age_days} day(s)`,  status: d.indicators.domain_age_days < 30 ? 'danger' : 'safe' },
    { label: 'SSL Certificate', value: d.indicators.ssl_valid ? 'Valid' : 'Invalid', status: bool(d.indicators.ssl_valid) },
    { label: 'Geolocation',     value: d.indicators.geolocation,                  status: HIGH_RISK_COUNTRIES.includes(d.indicators.geolocation) ? 'warning' : 'safe' },
    { label: 'Redirect Hops',   value: `${d.indicators.redirect_hops} hop(s)`,   status: d.indicators.redirect_hops > 2 ? 'warning' : 'safe' },
    { label: 'Typosquatting',   value: d.indicators.typosquatting_match || 'None', status: d.indicators.typosquatting_match ? 'danger' : 'safe' },
    { label: 'Blocklist Hits',  value: d.indicators.blocklist_hits?.length ? d.indicators.blocklist_hits.join(', ') : 'None', status: d.indicators.blocklist_hits?.length ? 'danger' : 'safe' },
  ],
  recs: d.recommendations,
});

/* ── Email Scan ───────────────────────────── */
export const transformEmailScan = (d) => ({
  isPhishing: d.verdict !== 'SAFE',
  risk: d.risk_score,
  target: d.sender_analysis?.from_address || 'Email',
  scanId: d.scan_id,
  confidence: d.confidence,
  scanTime: (d.scan_time_ms / 1000).toFixed(2),
  indicators: [
    { label: 'SPF',              value: d.auth_checks.spf,   status: d.auth_checks.spf === 'PASS' ? 'safe' : 'danger' },
    { label: 'DKIM',             value: d.auth_checks.dkim,  status: d.auth_checks.dkim === 'VALID' ? 'safe' : 'danger' },
    { label: 'DMARC',            value: d.auth_checks.dmarc, status: d.auth_checks.dmarc !== 'NONE' ? 'safe' : 'warning' },
    { label: 'Sender Spoof',     value: d.sender_analysis.spoofing_detected ? 'Detected' : 'Not detected', status: bool(!d.sender_analysis.spoofing_detected) },
    { label: 'Suspicious Links', value: `${d.link_analysis.suspicious_links} found`, status: d.link_analysis.suspicious_links > 0 ? 'danger' : 'safe' },
    { label: 'Urgency Signals',  value: d.urgency_signals?.length ? `"${d.urgency_signals[0]}"` : 'None', status: d.urgency_signals?.length ? 'warning' : 'safe' },
  ],
  recs: d.recommendations || [],
});

/* ── Stego Scan ───────────────────────────── */
export const transformStegoScan = (d) => ({
  isStego:     d.verdict === 'STEGO_DETECTED',
  lsbScore:    d.analysis.lsb_anomaly_score.toFixed(1),
  confidence:  d.confidence,
  scanTime:    (d.scan_time_ms / 1000).toFixed(2),
  filename:    d.filename,
  heatmapUrl:  d.heatmap_url,
  analysis:    d.analysis,
  metrics: [
    { label: 'LSB Anomaly Score',  value: `${d.analysis.lsb_anomaly_score.toFixed(1)} / 100`,  status: d.analysis.lsb_anomaly_score > 50 ? 'danger' : 'safe' },
    { label: 'Chi-Square Test',    value: d.analysis.chi_square_passed ? `Passed (p=${d.analysis.chi_square_p_value})` : `Failed (p=${d.analysis.chi_square_p_value})`, status: bool(d.analysis.chi_square_passed) },
    { label: 'Entropy Level',      value: `${d.analysis.entropy_score} (${d.analysis.entropy_status})`, status: d.analysis.entropy_status === 'NORMAL' ? 'safe' : 'warning' },
    { label: 'Payload Estimate',   value: d.analysis.estimated_payload_bytes > 0 ? `~${(d.analysis.estimated_payload_bytes / 1024).toFixed(1)} KB hidden` : 'None', status: d.analysis.estimated_payload_bytes > 0 ? 'danger' : 'safe' },
    { label: 'Metadata Integrity', value: d.analysis.metadata_anomalies?.length ? 'Anomalies found' : 'Clean', status: d.analysis.metadata_anomalies?.length ? 'warning' : 'safe' },
    { label: 'File Format',        value: `Valid ${d.file_info.format}`, status: 'safe' },
  ],
});

/* ── Dashboard Stats ──────────────────────── */
export const transformStats = (d) => ({
  totalScans:       d.total_scans,
  threatsFound:     d.threats_found,
  cleanScans:       d.clean_scans,
  avgRiskScore:     d.average_risk_score.toFixed(1),
  donut: [
    { label: 'Phishing', value: (d.breakdown.phishing_url || 0) + (d.breakdown.phishing_email || 0), color: '#ef4444' },
    { label: 'Stego',    value: d.breakdown.steganography || 0, color: '#8b5cf6' },
    { label: 'Safe',     value: d.breakdown.safe || 0,          color: '#10b981' },
    { label: 'Suspicious', value: d.breakdown.suspicious || 0,  color: '#f59e0b' },
  ],
});

export const transformWeekly = (d) =>
  d.days.map((day) => ({ label: day.label, value: day.total, threat: day.threats > day.total * 0.3 }));

export const transformHistory = (d) =>
  d.scans.map((s) => ({
    id:     s.scan_id,
    time:   new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type:   s.type === 'url' ? 'URL' : s.type === 'email' ? 'Email' : 'Image',
    target: s.target,
    risk:   s.risk_score,
    status: s.verdict === 'SAFE' ? 'Safe' : s.verdict === 'STEGO_DETECTED' ? 'Stego' : s.verdict === 'SUSPICIOUS' ? 'Suspicious' : 'Phishing',
  }));
