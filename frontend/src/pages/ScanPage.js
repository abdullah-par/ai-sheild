import React, { useState } from 'react';
import './ScanPage.css';

/* ── URL Input ──────────────────────────────── */
const URLInput = ({ onSubmit }) => {
  const [url, setUrl] = useState('');
  return (
    <div className="input-panel">
      <div className="input-panel-header">
        <div className="iph-icon iph-url">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M12 3c0 0 3 2.5 3 9s-3 9-3 9M12 3c0 0-3 2.5-3 9s3 9 9M3 12h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <h3>URL Phishing Scanner</h3>
          <p>Analyze any URL for phishing indicators</p>
        </div>
      </div>

      <div className="url-input-wrap">
        <div className="url-prefix">https://</div>
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && url && onSubmit({ type: 'url', value: url })}
          placeholder="suspicious-domain.com/login"
          className="url-input"
          spellCheck={false}
        />
        <button className="url-scan-btn" onClick={() => url && onSubmit({ type: 'url', value: url })}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="8" cy="8" r="5" stroke="white" strokeWidth="1.5"/>
            <path d="M14 14l-3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Scan
        </button>
      </div>

      <div className="input-hints">
        <span className="hint-label">Try these examples:</span>
        {['paypal-secure-login.ru', 'bank-update-now.xyz', 'apple-id-verify.cc'].map(ex => (
          <button key={ex} className="hint-chip" onClick={() => setUrl(ex)}>{ex}</button>
        ))}
      </div>
    </div>
  );
};

/* ── Email Input ──────────────────────────────── */
const EmailInput = ({ onSubmit }) => {
  const [mode, setMode] = useState('paste'); // paste | upload
  const [content, setContent] = useState('');
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  return (
    <div className="input-panel">
      <div className="input-panel-header">
        <div className="iph-icon iph-email">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M2 8l10 7 10-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <h3>Email Header Analyzer</h3>
          <p>Detect spoofing, phishing, and malicious content</p>
        </div>
      </div>

      <div className="mode-toggle">
        <button className={mode === 'paste' ? 'active' : ''} onClick={() => setMode('paste')}>Paste Content</button>
        <button className={mode === 'upload' ? 'active' : ''} onClick={() => setMode('upload')}>Upload .eml / .msg</button>
      </div>

      {mode === 'paste' ? (
        <div className="paste-area">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={`Paste email headers or full email body here...\n\nFrom: sender@example.com\nTo: victim@email.com\nSubject: Urgent: Verify Your Account\n...`}
            className="paste-input"
          />
          <div className="paste-meta">{content.length} characters</div>
        </div>
      ) : (
        <div
          className={`drop-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('email-file-input').click()}
        >
          <input
            id="email-file-input"
            type="file"
            accept=".eml,.msg,.txt"
            style={{ display: 'none' }}
            onChange={e => setFile(e.target.files[0])}
          />
          {file ? (
            <div className="file-selected">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="2" width="20" height="28" rx="3" stroke="#10b981" strokeWidth="1.5"/>
                <path d="M10 10h12M10 15h12M10 20h8" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>{file.name}</span>
              <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
          ) : (
            <div className="drop-zone-content">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path d="M20 28V12M12 20l8-8 8 8" stroke="rgba(0,212,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p>Drop your .eml or .msg file here</p>
              <span>or click to browse</span>
            </div>
          )}
        </div>
      )}

      <button
        className="analyze-btn"
        onClick={() => onSubmit({ type: 'email', value: mode === 'paste' ? content : file?.name })}
        disabled={mode === 'paste' ? !content : !file}
      >
        Analyze Email
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M4 9h10M10 5l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
};

/* ── Image Input ──────────────────────────────── */
const ImageInput = ({ onSubmit }) => {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="input-panel">
      <div className="input-panel-header">
        <div className="iph-icon iph-image">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M2 16l6-6 5 5 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h3>Steganography Detector</h3>
          <p>Uncover hidden data inside image files</p>
        </div>
      </div>

      <div
        className={`image-drop-zone ${dragging ? 'dragging' : ''} ${preview ? 'has-preview' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !preview && document.getElementById('img-file-input').click()}
      >
        <input
          id="img-file-input"
          type="file"
          accept="image/png,image/jpeg,image/bmp,image/gif,image/webp"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
        {preview ? (
          <div className="image-preview-wrap">
            <img src={preview} alt="preview" className="image-preview" />
            <div className="image-preview-overlay">
              <div className="scan-line" />
              <div className="preview-info">
                <span>{file?.name}</span>
                <span>{(file?.size / 1024).toFixed(1)} KB</span>
              </div>
            </div>
            <button className="remove-img" onClick={e => { e.stopPropagation(); setFile(null); setPreview(null); }}>✕</button>
          </div>
        ) : (
          <div className="image-drop-content">
            <div className="img-drop-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="4" y="4" width="40" height="40" rx="8" stroke="rgba(139,92,246,0.3)" strokeWidth="1.5" strokeDasharray="4 3"/>
                <circle cx="16" cy="18" r="4" stroke="rgba(139,92,246,0.5)" strokeWidth="1.5"/>
                <path d="M4 32l10-10 8 8 6-6 16 16" stroke="rgba(139,92,246,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p>Drop your image here</p>
            <span>PNG, JPG, BMP, GIF, WebP supported</span>
          </div>
        )}
      </div>

      <div className="stego-info">
        <div className="stego-info-item">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="#8b5cf6" strokeWidth="1.2"/><path d="M7 5v2l1.5 1.5" stroke="#8b5cf6" strokeWidth="1.2" strokeLinecap="round"/></svg>
          LSB Analysis
        </div>
        <div className="stego-info-item">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2v10" stroke="#8b5cf6" strokeWidth="1.2" strokeLinecap="round"/></svg>
          Chi-Square Test
        </div>
        <div className="stego-info-item">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="2" stroke="#8b5cf6" strokeWidth="1.2"/></svg>
          Entropy Mapping
        </div>
      </div>

      <button
        className="analyze-btn analyze-img"
        onClick={() => file && onSubmit({ type: 'image', value: file?.name })}
        disabled={!file}
      >
        Analyze for Hidden Data
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M4 9h10M10 5l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
};

/* ── Main Scan Page ──────────────────────────── */
const ScanPage = ({ initialType, onResult }) => {
  const [activeTab, setActiveTab] = useState(initialType || 'url');

  const tabs = [
    { id: 'url',   label: 'URL Scanner',   icon: '🌐', color: '#00d4ff' },
    { id: 'email', label: 'Email Analyzer', icon: '📧', color: '#8b5cf6' },
    { id: 'image', label: 'Stego Detector', icon: '🖼️', color: '#ec4899' },
  ];

  const handleSubmit = (data) => {
    onResult(data);
  };

  return (
    <div className="scan-page">
      <div className="scan-bg-glow" />

      <div className="scan-container">
        <div className="scan-header">
          <div className="scan-header-badge">THREAT SCANNER</div>
          <h1 className="scan-title">Choose Your <span className="gradient-text">Scan Type</span></h1>
          <p className="scan-subtitle">Select the type of content you want to analyze for threats.</p>
        </div>

        {/* Tabs */}
        <div className="scan-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`scan-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ '--tab-color': tab.color }}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              {activeTab === tab.id && <div className="tab-indicator" />}
            </button>
          ))}
        </div>

        {/* Input Panel */}
        <div className="scan-body">
          {activeTab === 'url'   && <URLInput   onSubmit={handleSubmit} />}
          {activeTab === 'email' && <EmailInput onSubmit={handleSubmit} />}
          {activeTab === 'image' && <ImageInput onSubmit={handleSubmit} />}
        </div>
      </div>
    </div>
  );
};

export default ScanPage;
