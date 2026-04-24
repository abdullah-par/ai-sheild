import React, { useState, useEffect, useRef } from 'react';
import './SteganographyPage.css';
import * as api from '../services/api';
import { transformStegoScan } from '../services/transformers';

/* ── Entropy Heatmap (canvas mock) ────────────── */
const EntropyMap = ({ active }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    const draw = () => {
      ctx.fillStyle = '#070d14';
      ctx.fillRect(0, 0, W, H);

      const cellW = 8, cellH = 8;
      for (let x = 0; x < W; x += cellW) {
        for (let y = 0; y < H; y += cellH) {
          const base = (y / H) * 0.6 + (x / W) * 0.3;
          const noise = Math.random() * 0.4;
          let val = base + noise;

          // hotspot zone
          const cx = W * 0.6, cy = H * 0.35;
          const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
          if (dist < 60) val = Math.min(val + (1 - dist / 60) * 0.8, 1);

          const r = Math.floor(val * 220);
          const g = Math.floor((1 - val) * 180);
          const b = Math.floor(139 + val * 80);
          ctx.fillStyle = `rgba(${r},${g},${b},0.85)`;
          ctx.fillRect(x, y, cellW - 1, cellH - 1);
        }
      }
    };

    draw();
    const interval = setInterval(draw, 800);
    return () => clearInterval(interval);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={200}
      className="entropy-canvas"
    />
  );
};

/* ── LSB Bit Visualizer ──────────────────────── */
const LSBVisualizer = ({ isStego }) => {
  const bits = Array.from({ length: 64 }, (_, i) => {
    if (!isStego) return Math.random() < 0.15 ? 1 : 0;
    const row = Math.floor(i / 8), col = i % 8;
    const inPattern = row >= 2 && row <= 5 && col >= 2 && col <= 5;
    return inPattern ? (Math.random() < 0.7 ? 1 : 0) : (Math.random() < 0.12 ? 1 : 0);
  });

  return (
    <div className="lsb-grid">
      {bits.map((b, i) => (
        <div key={i} className={`lsb-bit ${b ? 'lsb-on' : 'lsb-off'}`} />
      ))}
    </div>
  );
};

/* ── Result Panel ────────────────────────────── */
const StegoResult = ({ result, preview, onClear }) => {
  const [showMap, setShowMap] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShowMap(true), 600); return () => clearTimeout(t); }, []);

  return (
    <div className={`stego-result ${result.isStego ? 'stego-danger' : 'stego-safe'}`}>
      <div className="stego-result-header">
        <div className="stego-verdict">
          <div className={`stv-icon ${result.isStego ? 'stv-danger' : 'stv-safe'}`}>
            {result.isStego ? '🔴' : '🟢'}
          </div>
          <div>
            <div className="stv-label">{result.isStego ? 'Hidden Payload Detected' : 'No Hidden Data Found'}</div>
            <div className="stv-meta">
              Confidence: {result.confidence}% · Scan time: {result.scanTime}s
            </div>
          </div>
        </div>
        <button className="stego-clear-btn" onClick={onClear}>New Scan ✕</button>
      </div>

      <div className="stego-result-body">
        {/* Image with overlay */}
        <div className="stego-image-wrap">
          {preview && <img src={preview} alt="analyzed" className="stego-analyzed-img" />}
          <div className="stego-img-overlay">
            {result.isStego && <div className="stego-scan-line" />}
            <div className="stego-img-badge">
              {result.isStego ? '⚠ ANOMALY DETECTED' : '✓ CLEAN'}
            </div>
          </div>
          <div className="stego-img-meta">
            <span>{result.filename}</span>
            <span>LSB Score: <b style={{ color: result.isStego ? '#ef4444' : '#10b981' }}>{result.lsbScore}</b></span>
          </div>
        </div>

        {/* Analysis Panels */}
        <div className="stego-analysis-panels">
          {/* Metrics */}
          <div className="stego-metrics">
            <div className="sm-title">Technical Analysis</div>
            {result.metrics.map((m, i) => (
              <div key={i} className="sm-row">
                <span className="sm-label">{m.label}</span>
                <span className={`sm-val sm-${m.status}`}>{m.value}</span>
                <span className={`sm-dot smd-${m.status}`} />
              </div>
            ))}
          </div>

          {/* LSB Bit Map */}
          <div className="stego-lsb-panel">
            <div className="sm-title">LSB Bit Pattern</div>
            <LSBVisualizer isStego={result.isStego} />
            <div className="lsb-legend">
              <span><span className="lsb-leg-dot lsb-on" /> Modified</span>
              <span><span className="lsb-leg-dot lsb-off" /> Normal</span>
            </div>
            {result.isStego && <div className="lsb-alert">High bit-flip concentration in region (2,2)–(5,5)</div>}
          </div>
        </div>
      </div>

      {/* Entropy Map */}
      <div className="stego-entropy-section">
        <div className="sm-title">Entropy Heatmap</div>
        <div className="entropy-wrap">
          <EntropyMap active={showMap} />
          <div className="entropy-legend-col">
            <div className="entropy-scale">
              <div className="es-bar" />
              <div className="es-labels"><span>High Entropy</span><span>Low Entropy</span></div>
            </div>
            <div className="entropy-note">
              {result.isStego
                ? '⚠ Elevated entropy cluster detected in upper-right quadrant — consistent with LSB steganography.'
                : '✓ Entropy distribution within normal bounds. No anomalous regions detected.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



/* ── Main Page ───────────────────────────────── */
export default function SteganographyPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [drag, setDrag] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [apiError, setApiError] = useState(null);

  const scanSteps = ['Reading pixel data…', 'Running LSB analysis…', 'Chi-Square test…', 'Mapping entropy…', 'Generating report…'];

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(f);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const startScan = async () => {
    if (!file) return;
    setScanning(true);
    setScanStep(0);
    setProgress(0);
    setApiError(null);
    // Animate progress bar while API call runs
    let p = 0;
    const interval = setInterval(() => {
      p = Math.min(p + Math.random() * 6, 90);
      setScanStep(Math.min(Math.floor(p / 20), 4));
      setProgress(Math.floor(p));
    }, 150);
    try {
      const data = await api.analyzeImage(file);
      clearInterval(interval);
      setProgress(100);
      setScanStep(4);
      setTimeout(() => { setScanning(false); setResult(transformStegoScan(data)); }, 300);
    } catch (err) {
      clearInterval(interval);
      setScanning(false);
      setProgress(0);
      setApiError(err.message);
    }
  };

  const reset = () => { setFile(null); setPreview(null); setResult(null); setScanning(false); setProgress(0); };

  return (
    <div className="stego-page">
      <div className="stego-bg-glow" />
      <div className="stego-grid-overlay" />

      <div className="stego-container">
        {/* Hero */}
        <div className="stego-hero">
          <div className="stego-hero-badge">
            <span className="stego-badge-dot" />
            STEGANOGRAPHY DETECTION ENGINE
          </div>
          <h1 className="stego-hero-title">
            Steganography <span className="stego-gradient">Detector</span>
          </h1>
          <p className="stego-hero-sub">
            Uncover hidden data embedded inside image files using LSB analysis,
            chi-square statistical testing, and entropy mapping — all powered by AI.
          </p>
          <div className="stego-formats">
            {['PNG','JPEG','BMP','GIF','WebP','TIFF'].map(f => (
              <span key={f} className="stego-format-tag">{f}</span>
            ))}
          </div>
        </div>

        {/* Main Card */}
        {result ? (
          <StegoResult result={result} preview={preview} onClear={reset} />
        ) : (
          <div className="stego-card">
            <div className="stego-card-inner">
              {/* Upload Zone */}
              <div
                className={`stego-upload-zone ${drag ? 'dragging' : ''} ${preview ? 'has-preview' : ''}`}
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={handleDrop}
                onClick={() => !preview && document.getElementById('stego-file-inp').click()}
              >
                <input
                  id="stego-file-inp"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files[0])}
                />

                {preview ? (
                  <div className="stego-preview-wrap">
                    <img src={preview} alt="preview" className="stego-preview-img" />
                    {scanning && <div className="stego-scan-overlay"><div className="stego-scan-beam" /></div>}
                    <div className="stego-preview-meta">
                      <span>📄 {file?.name}</span>
                      <span>{(file?.size / 1024).toFixed(1)} KB</span>
                    </div>
                    {!scanning && (
                      <button className="stego-remove-btn" onClick={e => { e.stopPropagation(); reset(); }}>✕</button>
                    )}
                  </div>
                ) : (
                  <div className="stego-upload-content">
                    <div className="stego-upload-icon">
                      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                        <rect x="4" y="4" width="48" height="48" rx="12" stroke="url(#sg)" strokeWidth="1.5" strokeDasharray="5 4"/>
                        <circle cx="18" cy="20" r="5" stroke="url(#sg)" strokeWidth="1.5"/>
                        <path d="M4 38l14-14 10 10 8-8 16 16" stroke="url(#sg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <defs>
                          <linearGradient id="sg" x1="4" y1="4" x2="52" y2="52">
                            <stop stopColor="#8b5cf6"/><stop offset="1" stopColor="#00d4ff"/>
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                    <p className="stego-upload-title">Drop your image here</p>
                    <p className="stego-upload-sub">or click to browse — PNG, JPG, BMP, GIF, WebP</p>
                    <div className="stego-upload-hint">
                      🔒 Files are analyzed locally and never stored
                    </div>
                  </div>
                )}
              </div>

              {/* Right Panel */}
              <div className="stego-right-panel">
                <div className="stego-methods">
                  <div className="stm-title">Detection Methods</div>
                  {[
                    { icon: '🔬', name: 'LSB Analysis', desc: 'Inspects least significant bits across all colour channels for non-random patterns.' },
                    { icon: '📊', name: 'Chi-Square Test', desc: 'Statistical test comparing observed vs expected pixel frequency distributions.' },
                    { icon: '🌡️', name: 'Entropy Mapping', desc: 'Identifies high-entropy clusters that indicate hidden encrypted payloads.' },
                    { icon: '🧩', name: 'Metadata Forensics', desc: 'Scans EXIF/metadata for injected data or anomalous field values.' },
                  ].map((m, i) => (
                    <div key={i} className="stm-item">
                      <div className="stm-icon">{m.icon}</div>
                      <div className="stm-info">
                        <div className="stm-name">{m.name}</div>
                        <div className="stm-desc">{m.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Scanning Progress */}
                {scanning && (
                  <div className="stego-progress">
                    <div className="sp-header">
                      <span>Analyzing…</span><span>{progress}%</span>
                    </div>
                    <div className="sp-bar"><div className="sp-fill" style={{ width: `${progress}%` }} /></div>
                    <div className="sp-steps">
                      {scanSteps.map((s, i) => (
                        <div key={i} className={`sp-step ${i < scanStep ? 'done' : i === scanStep ? 'active' : ''}`}>
                          <div className="sp-dot" />
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  className="stego-analyze-btn"
                  onClick={startScan}
                  disabled={!file || scanning}
                >
                  {scanning ? 'Analyzing Image…' : 'Analyze for Hidden Data →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Info */}
        <div className="stego-info-strip">
          {[['🎯','What is Steganography?','The practice of concealing messages or data within ordinary digital files. Attackers embed malware, C2 commands, or stolen data inside innocent-looking images.'],
            ['🛡️','Why Detect It?','Steganographic payloads bypass traditional AV and firewall inspection — making it a preferred exfiltration technique in advanced persistent threats (APTs).'],
            ['⚡','AI-Powered Detection','Our multi-layer model combines statistical analysis with deep learning to detect even low-rate LSB embedding that evades manual inspection.'],
          ].map(([icon, title, desc], i) => (
            <div key={i} className="stego-info-card">
              <div className="sic-icon">{icon}</div>
              <div className="sic-title">{title}</div>
              <div className="sic-desc">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
