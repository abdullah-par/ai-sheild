import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { getStats, getWeeklyStats, getScanHistory, getScanDetail, generateUserReport } from '../services/api';
import { transformStats, transformWeekly, transformHistory } from '../services/transformers';
import { useAuth } from '../services/AuthContext';

/* ── Mini Bar Chart ─────────────────────────── */
const BarChart = ({ data }) => {
  const safeData = data?.length ? data : [
    { label: 'Mon', value: 0 },
    { label: 'Tue', value: 0 },
    { label: 'Wed', value: 0 },
    { label: 'Thu', value: 0 },
    { label: 'Fri', value: 0 },
    { label: 'Sat', value: 0 },
    { label: 'Sun', value: 0 },
  ];
  const max = Math.max(1, ...safeData.map(d => d.value));
  return (
    <div className="bar-chart">
      {safeData.map((d, i) => (
        <div key={i} className="bar-col">
          <div className="bar-wrap">
            <div
              className="bar-fill"
              style={{
                height: `${(d.value / max) * 100}%`,
                background: d.threat ? 'var(--accent-danger)' : 'var(--accent-primary)',
                opacity: 0.8,
                animationDelay: `${i * 60}ms`,
              }}
            />
          </div>
          <span className="bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

/* ── Threat Donut ───────────────────────────── */
const DonutChart = ({ segments }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const safeTotal = total || 1;
  let cumulativePercent = 0;
  const r = 52;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="donut-wrap">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="14"/>
        {segments.map((seg, i) => {
          const pct = seg.value / safeTotal;
          const dashArray = `${circumference * pct} ${circumference * (1 - pct)}`;
          const offset = circumference * (1 - cumulativePercent);
          cumulativePercent += pct;
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="14"
              strokeDasharray={dashArray}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ filter: `drop-shadow(0 0 4px ${seg.color}44)` }}
            />
          );
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text-primary)" fontSize="22" fontWeight="800" fontFamily="var(--font-mono)">
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text-secondary)" fontSize="10" fontFamily="var(--font-sans)">
          Total Scans
        </text>
      </svg>
      <div className="donut-legend">
        {segments.map((seg, i) => (
          <div key={i} className="legend-item">
            <div className="legend-dot" style={{ background: seg.color }} />
            <span>{seg.label}</span>
            <span className="legend-val">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Scan History Table ──────────────────────── */


const statusColors = {
  Phishing:   { bg: 'rgba(239,68,68,0.1)',  text: 'var(--accent-danger)', dot: 'var(--accent-danger)' },
  Stego:      { bg: 'rgba(14,165,233,0.1)', text: 'var(--accent-secondary)', dot: 'var(--accent-secondary)' },
  Safe:       { bg: 'rgba(16,185,129,0.1)', text: 'var(--accent-safe)',   dot: 'var(--accent-safe)' },
  Suspicious: { bg: 'rgba(245,158,11,0.1)',  text: 'var(--accent-warn)',   dot: 'var(--accent-warn)' },
};

const typeIcons = {
  URL:   '🌐',
  Email: '📧',
  Image: '🖼️',
};

const liveFeedMeta = {
  Phishing:   { msg: 'Phishing threat detected', color: 'var(--accent-danger)' },
  Stego:      { msg: 'Steganography threat detected', color: 'var(--accent-secondary)' },
  Safe:       { msg: 'Scan verified as safe', color: 'var(--accent-safe)' },
  Suspicious: { msg: 'Suspicious activity flagged', color: 'var(--accent-warn)' },
};

/* ── Stat Card ──────────────────────────────── */
const StatCard = ({ icon, label, value, change, changePos, color }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: `${color}18`, color }}>{icon}</div>
    <div className="stat-info">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
    <div className={`stat-change ${changePos ? 'pos' : 'neg'}`}>
      {changePos ? '↑' : '↓'} {change}
    </div>
  </div>
);

/* ── Dashboard ───────────────────────────────── */
const Dashboard = ({ onNavigate }) => {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');

  // ── API Data State ───────────────────────────
  const [stats, setStats]     = useState(null);
  const [weekData, setWeek]   = useState([]);
  const [donutData, setDonut] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  
  // ── Modal State ──────────────────────────────
  const [activeModalScan, setActiveModalScan] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const handleUserReport = async () => {
    if (!user) {
      alert('Please log in to generate a user report.');
      onNavigate('auth');
      return;
    }
    
    try {
      const reportData = await generateUserReport('json');

      // Download the report
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user_report_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      if (e.message.includes('Session expired')) {
        // Token was cleared and user redirected, no need to show additional alert
        return;
      }
      alert(e.message || 'Failed to generate user report');
    }
  };

  const handleScanClick = async (scanId) => {
    try {
      setModalLoading(true);
      setActiveModalScan({ loading: true });
      const scanDetail = await getScanDetail(scanId);
      setActiveModalScan({
        scanId: scanDetail.scan_id,
        type: scanDetail.type,
        value: scanDetail.target,
        result: scanDetail.raw_result,
        risk: scanDetail.risk_score,
        verdict: scanDetail.verdict,
        confidence: scanDetail.confidence,
        scanTime: scanDetail.scan_time_ms,
        createdAt: scanDetail.created_at
      });
    } catch (e) {
      console.error('Error loading scan details:', e);
      alert('Failed to load scan details');
      setActiveModalScan(null);
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [s, w, h] = await Promise.all([
          getStats(),
          getWeeklyStats(),
          getScanHistory({ limit: 20 }),
        ]);
        setStats(transformStats(s));
        setWeek(transformWeekly(w));
        setDonut(transformStats(s).donut);
        setHistory(transformHistory(h));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = filter === 'all'
    ? history
    : history.filter(s => s.status.toLowerCase() === filter);

  const liveFeed = history.slice(0, 5).map((scan) => {
    const meta = liveFeedMeta[scan.status] || liveFeedMeta.Suspicious;
    return {
      msg: meta.msg,
      target: scan.target,
      time: scan.time,
      color: meta.color,
    };
  });

  if (loading) return (
    <div className="dashboard">
      <div className="dash-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#475569' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🛡️</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>Loading threat intelligence…</div>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="dashboard">
      <div className="dash-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#64748b', maxWidth: 440 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 15, marginBottom: 8, color: '#94a3b8', fontWeight: 600 }}>Could not reach the API</div>
          <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: '#475569' }}>{error}</div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#334155' }}>Make sure the backend is running at <strong>{process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'}</strong></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard">
      <div className="dash-container">
        {/* Header */}
        <div className="dash-header">
          <div>
            <div className="dash-breadcrumb">Dashboard</div>
            <h1 className="dash-title">Threat Intelligence <span className="gradient-text">Overview</span></h1>
          </div>
          <div className="dash-actions">
            {user && (
              <button className="btn-secondary" onClick={handleUserReport}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M10 14l2-2-2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Generate Report
              </button>
            )}
            <button className="btn-primary" onClick={() => onNavigate('scan')}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="4.5" stroke="white" strokeWidth="1.5"/>
                <path d="M12 12l-2.5-2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              New Scan
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="stats-row">
          <StatCard icon="🛡️" label="Total Scans"    value={stats?.totalScans ?? '—'}  change="this session" changePos color="var(--accent-primary)" />
          <StatCard icon="⚠️" label="Threats Found"  value={stats?.threatsFound ?? '—'} change="detected"     changePos color="var(--accent-danger)" />
          <StatCard icon="✅" label="Clean Scans"    value={stats?.cleanScans ?? '—'}   change="verified safe" changePos color="var(--accent-safe)" />
          <StatCard icon="📊" label="Avg Risk Score" value={stats?.avgRiskScore ?? '—'} change="/ 100"        changePos={false} color="var(--accent-warn)" />
        </div>

        {/* Charts Row */}
        <div className="charts-row">
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">Weekly Scan Volume</div>
              <div className="chart-badge">Last 7 Days</div>
            </div>
            <BarChart data={weekData} />
            <div className="chart-legend-row">
              <div className="cl-item"><div className="cl-dot" style={{ background: 'var(--accent-primary)' }}/> Clean</div>
              <div className="cl-item"><div className="cl-dot" style={{ background: 'var(--accent-danger)' }}/> Threat</div>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">Threat Breakdown</div>
              <div className="chart-badge">All Time</div>
            </div>
            <DonutChart segments={donutData} />
          </div>

          {/* Live Feed */}
          <div className="chart-card live-feed">
            <div className="chart-header">
              <div className="chart-title">Live Threat Feed</div>
              <div className="live-indicator">
                <div className="live-dot" />
                LIVE
              </div>
            </div>
            <div className="feed-items">
              {liveFeed.length ? (
                liveFeed.map((f, i) => (
                  <div key={i} className="feed-item">
                    <div className="feed-dot" style={{ background: f.color, boxShadow: `0 0 6px ${f.color}` }} />
                    <div className="feed-content">
                      <span className="feed-msg">{f.msg}</span>
                      <span className="feed-target">{f.target}</span>
                    </div>
                    <span className="feed-time">{f.time}</span>
                  </div>
                ))
              ) : (
                <div className="feed-empty">No scans yet. Run your first scan to populate the feed.</div>
              )}
            </div>
          </div>
        </div>

        {/* Scan History */}
        <div className="history-card">
          <div className="history-header">
            <div className="chart-title">Scan History</div>
            <div className="history-filters">
              {['all', 'phishing', 'stego', 'safe', 'suspicious'].map(f => (
                <button
                  key={f}
                  className={`filter-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="history-table">
            <div className="table-head">
              <div>ID</div>
              <div>Type</div>
              <div>Target</div>
              <div>Risk</div>
              <div>Status</div>
              <div>Time</div>
              <div>Action</div>
            </div>
            {filtered.map((scan, i) => {
              const st = statusColors[scan.status] || { bg: 'rgba(148,163,184,0.1)', text: 'var(--text-primary)', dot: '#64748b' };
              return (
                <div 
                  key={i} 
                  className="table-row clickable-row" 
                  onClick={() => handleScanClick(scan.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="td-id">{scan.id}</div>
                  <div className="td-type">
                    <span>{typeIcons[scan.type]}</span>
                    {scan.type}
                  </div>
                  <div className="td-target">{scan.target}</div>
                  <div className="td-risk">
                    <div className="risk-pill">
                      <div
                        className="risk-bar"
                        style={{
                          width: `${scan.risk}%`,
                          background: scan.risk >= 70 ? '#ef4444' : scan.risk >= 40 ? '#f59e0b' : '#10b981',
                        }}
                      />
                    </div>
                    <span style={{ color: scan.risk >= 70 ? '#ef4444' : scan.risk >= 40 ? '#f59e0b' : '#10b981' }}>
                      {scan.risk}
                    </span>
                  </div>
                  <div>
                    <span className="status-badge" style={{ background: st.bg, color: st.text }}>
                      <div className="status-dot" style={{ background: st.dot }} />
                      {scan.status}
                    </span>
                  </div>
                  <div className="td-time">{scan.time}</div>
                  <div>
                    <button className="btn-view-action" onClick={(e) => {
                      e.stopPropagation();
                      handleScanClick(scan.id);
                    }}>View</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scan Detail Modal */}
      {activeModalScan && (
        <div className="modal-backdrop" onClick={() => !modalLoading && setActiveModalScan(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            {modalLoading ? (
              <div className="modal-loading-overlay">
                <div className="modal-spinner" />
                <div style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>Loading scan details...</div>
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <div className="modal-title-wrap">
                    <span className="modal-subtitle">Scan ID: {activeModalScan.scanId}</span>
                    <h2 className="modal-title">Scan Result <span className="gradient-text">Detail</span></h2>
                  </div>
                  <button className="modal-close-btn" onClick={() => setActiveModalScan(null)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                <div className="modal-body">
                  <div className="modal-grid">
                    {/* Left Column: Summary */}
                    <div className="modal-left">
                      <div className="detail-card">
                        <div className="detail-row">
                          <span className="detail-label">Target</span>
                          <span className="detail-value target-val" title={activeModalScan.value}>{activeModalScan.value}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Type</span>
                          <span className="detail-value">{typeIcons[activeModalScan.type] || '🔍'} {activeModalScan.type}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Scan Time</span>
                          <span className="detail-value">{activeModalScan.scanTime} ms</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Date</span>
                          <span className="detail-value">{activeModalScan.createdAt ? new Date(activeModalScan.createdAt).toLocaleString() : 'N/A'}</span>
                        </div>
                      </div>

                      <div className="detail-card verdict-card">
                        <span className="detail-label">Verdict</span>
                        <div className="modal-verdict" style={{
                          background: (statusColors[activeModalScan.verdict] || statusColors['Suspicious'])?.bg || 'rgba(148, 163, 184, 0.1)',
                          color: (statusColors[activeModalScan.verdict] || statusColors['Suspicious'])?.text || 'var(--text-primary)'
                        }}>
                          <div className="status-dot" style={{ background: (statusColors[activeModalScan.verdict] || statusColors['Suspicious'])?.dot || '#64748b' }} />
                          {activeModalScan.verdict}
                        </div>
                        
                        <span className="detail-label" style={{ marginTop: '16px' }}>Confidence</span>
                        <div className="confidence-val">{activeModalScan.confidence}%</div>
                      </div>
                    </div>

                    {/* Right Column: Risk & Results */}
                    <div className="modal-right">
                      <div className="detail-card risk-detail">
                        <span className="detail-label">Risk Score</span>
                        <div className="risk-score-wrap">
                          <div className="risk-score-number" style={{
                            color: activeModalScan.risk >= 70 ? 'var(--accent-danger)' : activeModalScan.risk >= 40 ? 'var(--accent-warn)' : 'var(--accent-safe)'
                          }}>
                            {activeModalScan.risk}
                          </div>
                          <div className="risk-score-bar-bg">
                            <div className="risk-score-bar-fill" style={{
                              width: `${activeModalScan.risk}%`,
                              background: activeModalScan.risk >= 70 ? 'var(--accent-danger)' : activeModalScan.risk >= 40 ? 'var(--accent-warn)' : 'var(--accent-safe)'
                            }} />
                          </div>
                        </div>
                      </div>

                      {/* Raw Results Breakdown */}
                      <div className="detail-card raw-results">
                        <span className="detail-label">Analysis Breakdown</span>
                        <div className="raw-results-content">
                          {activeModalScan.result ? (
                            typeof activeModalScan.result === 'object' ? (
                              <pre className="json-display">
                                {JSON.stringify(activeModalScan.result, null, 2)}
                              </pre>
                            ) : (
                              <div className="text-result">{activeModalScan.result}</div>
                            )
                          ) : (
                            <div className="text-result muted">No breakdown available.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="btn-secondary" onClick={() => setActiveModalScan(null)}>Close</button>
                  <button className="btn-primary" onClick={() => {
                    const scanToNavigate = { ...activeModalScan };
                    setActiveModalScan(null);
                    onNavigate('result', { 
                      scanData: {
                        scanId: scanToNavigate.scanId,
                        type: scanToNavigate.type,
                        value: scanToNavigate.value,
                        result: scanToNavigate.result,
                        risk: scanToNavigate.risk,
                        verdict: scanToNavigate.verdict,
                        confidence: scanToNavigate.confidence,
                        scanTime: scanToNavigate.scanTime,
                        createdAt: scanToNavigate.createdAt
                      } 
                    });
                  }}>View Full Report</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
