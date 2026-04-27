import React, { useState, useEffect } from 'react';
import './ReportsPage.css';
import { generateAIReport, getLatestAIReport, getAIReportPDFUrl } from '../services/api';
import { useAuth } from '../services/AuthContext';

const ReportsPage = ({ onNavigate }) => {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const fetchLatest = async () => {
    try {
      setLoading(true);
      const data = await getLatestAIReport();
      setReport(data);
    } catch (err) {
      if (!err.message.includes('404') && !err.message.includes('not found')) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatest();
  }, []);

  const handleGenerate = async (range) => {
    try {
      setGenerating(true);
      setError(null);
      const newReport = await generateAIReport(range);
      setReport(newReport);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!report) return;
    const url = getAIReportPDFUrl(report.id);
    window.open(url, '_blank');
  };

  if (loading) return (
    <div className="reports-page">
      <div className="rep-container">
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '100px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>Loading reports...</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="reports-page">
      <div className="rep-grid" />
      <div className="rep-container">
        <button className="btn-back" onClick={() => onNavigate('home')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Home
        </button>
        <div className="rep-header">

          <div className="rep-badge">AI INSIGHTS</div>
          <h1 className="rep-title">Security Analysis <span className="gradient-text">Reports</span></h1>
          <p className="rep-desc">
            Generate and view deep, AI-driven insights from your automated defense vectors.
          </p>
        </div>

        <div className="rep-actions">
          <button 
            className="btn-generate" 
            onClick={() => handleGenerate('24h')} 
            disabled={generating}
          >
            {generating ? 'Analyzing telemetry...' : 'Generate 24h AI Report'}
          </button>
          <button 
            className="btn-generate-secondary" 
            onClick={() => handleGenerate('7d')} 
            disabled={generating}
          >
            {generating ? 'Analyzing telemetry...' : 'Generate 7-Day AI Report'}
          </button>
        </div>

        {error && <div className="rep-error">Error: {error}</div>}

        {report ? (
          <div className="report-card">
            <div className="rc-header">
              <div>
                <h2 className="rc-title">{report.title}</h2>
                <p className="rc-date">
                  Period: {new Date(report.time_range_start).toLocaleString()} - {new Date(report.time_range_end).toLocaleString()}
                </p>
              </div>
              <button className="btn-download" onClick={handleDownloadPDF}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download PDF
              </button>
            </div>

            <div className="rc-stats">
              <div className="rc-stat-box">
                <span className="rc-stat-label">TOTAL SCANS</span>
                <span className="rc-stat-val">{report.total_flows}</span>
              </div>
              <div className="rc-stat-box">
                <span className="rc-stat-label">MALICIOUS</span>
                <span className="rc-stat-val" style={{ color: 'var(--accent-danger)' }}>{report.malicious_count}</span>
              </div>
              <div className="rc-stat-box">
                <span className="rc-stat-label">THREATS BLOCKED</span>
                <span className="rc-stat-val">{report.blocked_count}</span>
              </div>
              <div className="rc-stat-box">
                <span className="rc-stat-label">TOP VECTOR</span>
                <span className="rc-stat-val" style={{ textTransform: 'capitalize' }}>{report.top_attack_type}</span>
              </div>
            </div>

            <div className="rc-content">
              <h3>AI Assessment</h3>
              <div className="markdown-body">
                {report.ai_raw_content.split('\n').map((line, index) => {
                  if (line.startsWith('EXECUTIVE SUMMARY:') || line.startsWith('THREAT LANDSCAPE:') || line.startsWith('PATTERN RECOGNITION:') || line.startsWith('ACTIONABLE RECOMMENDATIONS:')) {
                    return <h4 key={index} style={{ marginTop: '24px', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{line}</h4>;
                  }
                  if (line.match(/^\d+\./)) {
                    return <p key={index} style={{ paddingLeft: '20px', textIndent: '-20px' }}>{line}</p>;
                  }
                  return <p key={index}>{line}</p>;
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="no-report">
            <p>No reports generated yet. Click above to analyze recent telemetry data.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default ReportsPage;
