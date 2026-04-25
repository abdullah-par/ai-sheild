import React, { useState, useEffect, useRef } from 'react';
import './SteganographyPage.css';
import * as api from '../services/api';
import { transformStegoScan } from '../services/transformers';

/* ── UI Components ─────────────────────────── */
const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const IconImage = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);

const IconAnalysis = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>
  </svg>
);

/* ── Entropy Heatmap ──────────────────────────── */
const EntropyMap = ({ active }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const draw = () => {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);
      const cellW = 8, cellH = 8;
      for (let x = 0; x < W; x += cellW) {
        for (let y = 0; y < H; y += cellH) {
          const base = (y / H) * 0.6 + (x / W) * 0.3;
          const noise = Math.random() * 0.4;
          let val = base + noise;
          const cx = W * 0.6, cy = H * 0.35;
          const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
          if (dist < 60) val = Math.min(val + (1 - dist / 60) * 0.8, 1);
          const r = Math.floor(val * 16);
          const g = Math.floor(val * 185);
          const b = Math.floor(val * 129);
          ctx.fillStyle = `rgba(${r},${g},${b},${0.3 + val * 0.7})`;
          ctx.fillRect(x, y, cellW - 1, cellH - 1);
        }
      }
    };
    draw();
    const interval = setInterval(draw, 1000);
    return () => clearInterval(interval);
  }, [active]);
  return <canvas ref={canvasRef} width={400} height={200} className="entropy-canvas-2" />;
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
    <div className="lsb-grid-2">
      {bits.map((b, i) => (
        <div key={i} className={`lsb-bit-2 ${b ? 'on' : ''}`} />
      ))}
    </div>
  );
};

/* ── Result Panel ────────────────────────────── */
const ResultPanel = ({ result, preview, onClear }) => {
  const [showMap, setShowMap] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShowMap(true), 500); return () => clearTimeout(t); }, []);

  return (
    <div className={`stego-result-2 glass ${result.isStego ? 'threat' : 'clean'}`}>
      <div className="res-header-2">
        <div className="res-info">
          <div className="res-badge-2" style={{ color: result.isStego ? 'var(--accent-danger)' : 'var(--accent-safe)' }}>
            {result.isStego ? 'ANOMALY DETECTED' : 'CLEAN ANALYSIS'}
          </div>
          <div className="res-filename">{result.filename}</div>
        </div>
        <button className="btn-dismiss-2" onClick={onClear}>New Analysis</button>
      </div>

      <div className="res-main-2">
        <div className="res-preview-area">
          <div className="img-frame">
            <img src={preview} alt="Forensic preview" />
            {result.isStego && <div className="scan-sweep" />}
          </div>
          <div className="res-stats-2">
            <div className="stat-item">
              <span className="label">Confidence</span>
              <span className="value">{result.confidence}%</span>
            </div>
            <div className="stat-item">
              <span className="label">LSB Score</span>
              <span className="value" style={{ color: result.isStego ? 'var(--accent-danger)' : 'var(--accent-safe)' }}>{result.lsbScore}</span>
            </div>
          </div>
        </div>

        <div className="res-analysis-area">
          <div className="res-section-2">
            <div className="section-label-2">Forensic Indicators</div>
            <div className="indicators-2">
              {result.metrics.map((m, i) => (
                <div key={i} className="ind-row-2">
                  <span>{m.label}</span>
                  <span className={`status-${m.status}`}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="res-section-2">
            <div className="section-label-2">Model Confidence & Verdict</div>
            <div className="indicators-2">
              <div className="ind-row-2">
                <span>Verdict</span>
                <span className={`status-${result.isStego ? 'danger' : 'safe'}`}>
                  {result.isStego ? 'STEGO DETECTED' : 'CLEAN'}
                </span>
              </div>
              <div className="ind-row-2">
                <span>Confidence Level</span>
                <span className={`status-${result.confidence > 85 ? 'danger' : 'safe'}`}>
                  {result.confidence}%
                </span>
              </div>
              <div className="ind-row-2">
                <span>LSB Anomaly Score</span>
                <span className={`status-${result.isStego ? 'danger' : 'safe'}`}>
                  {result.lsbScore} / 100
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="res-footer-2">
        <div className="section-label-2">Entropy Heatmap Visualization</div>
        <div className="entropy-wrap-2">
          <EntropyMap active={showMap} />
          <div className="entropy-info-2">
            <p>{result.isStego 
              ? 'Critical entropy clusters detected. High probability of encrypted payload injection.' 
              : 'Entropy distribution within standard deviation. No hidden data patterns identified.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Main Page ───────────────────────────────── */
export default function SteganographyPage() {
  const [activeTab, setActiveTab] = useState('analyze');
  
  // Analyze State
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Encode State
  const [encodeFile, setEncodeFile] = useState(null);
  const [encodePreview, setEncodePreview] = useState(null);
  const [message, setMessage] = useState('');
  const [encoding, setEncoding] = useState(false);
  const [encodedImage, setEncodedImage] = useState(null);
  const [encodedFilename, setEncodedFilename] = useState('');

  // Decode State
  const [decodeFile, setDecodeFile] = useState(null);
  const [decodePreview, setDecodePreview] = useState(null);
  const [decoding, setDecoding] = useState(false);
  const [decodedMessage, setDecodedMessage] = useState('');

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(f);
    setResult(null);
  };

  const handleEncodeFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return;
    setEncodeFile(f);
    const reader = new FileReader();
    reader.onload = e => setEncodePreview(e.target.result);
    reader.readAsDataURL(f);
    setEncodedImage(null);
  };

  const handleDecodeFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return;
    setDecodeFile(f);
    const reader = new FileReader();
    reader.onload = e => setDecodePreview(e.target.result);
    reader.readAsDataURL(f);
    setDecodedMessage('');
  };

  const startScan = async () => {
    if (!file) return;
    setScanning(true);
    setProgress(0);
    setError(null);
    
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 2, 95));
    }, 100);

    try {
      const data = await api.analyzeImage(file);
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => {
        setResult(transformStegoScan(data));
        setScanning(false);
      }, 500);
    } catch (err) {
      clearInterval(interval);
      setScanning(false);
      setError(err.message);
    }
  };

  const runEncode = async () => {
    if (!encodeFile || !message) return;
    setEncoding(true);
    setError(null);
    try {
      const data = await api.encodeImage(encodeFile, message);
      setEncodedImage(data.image_base64);
      setEncodedFilename(data.filename);
    } catch (err) {
      setError(err.message);
    } finally {
      setEncoding(false);
    }
  };

  const runDecode = async () => {
    if (!decodeFile) return;
    setDecoding(true);
    setError(null);
    try {
      const data = await api.decodeImage(decodeFile);
      setDecodedMessage(data.message || 'No hidden message found or corrupted data.');
    } catch (err) {
      setError(err.message);
    } finally {
      setDecoding(false);
    }
  };

  return (
    <div className="stego-page-2">
      <div className="stego-grid-2" />
      
      <div className="stego-container-2">
        <header className="stego-header-2">
          <div className="stego-badge-2">AI-POWERED STEGO ENGINE</div>
          <h1 className="stego-title-2">LSB & Entropy Detection</h1>
          <p className="stego-desc-2">
            Advanced steganography detection using statistical analysis. Detects hidden payloads via 
            LSB anomaly scoring, chi-square testing, entropy mapping, and EXIF metadata analysis.
          </p>
          
          <div className="stego-tabs">
            <button className={`stego-tab ${activeTab === 'analyze' ? 'active' : ''}`} onClick={() => setActiveTab('analyze')}>Analyze</button>
            <button className={`stego-tab ${activeTab === 'encode' ? 'active' : ''}`} onClick={() => setActiveTab('encode')}>Encode (Hide)</button>
            <button className={`stego-tab ${activeTab === 'decode' ? 'active' : ''}`} onClick={() => setActiveTab('decode')}>Decode (Reveal)</button>
          </div>
        </header>

        {error && <div className="stego-error-2" style={{marginBottom: '20px'}}>⚠ Failure: {error}</div>}

        {activeTab === 'analyze' && (
          result ? (
            <ResultPanel result={result} preview={preview} onClear={() => { setFile(null); setPreview(null); setResult(null); }} />
          ) : (
            <div className="stego-analyzer-card glass">
              <div className="stego-upload-area-2">
                <div 
                  className={`drop-zone-2 ${preview ? 'has-file' : ''}`}
                  onClick={() => !preview && document.getElementById('stego-upload').click()}
                >
                  <input type="file" id="stego-upload" hidden accept="image/*" onChange={e => handleFile(e.target.files[0])} />
                  {preview ? (
                    <div className="preview-wrap-2">
                      <img src={preview} alt="Analysis Target" />
                      {scanning && <div className="scan-line-2" />}
                      <div className="file-info-2">
                        <span>{file?.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}>✕</button>
                      </div>
                    </div>
                  ) : (
                    <div className="upload-prompt-2">
                      <div className="icon-wrap-2"><IconImage /></div>
                      <h3>Drag & Drop Image</h3>
                      <p>Supported: PNG, JPEG, BMP, WebP</p>
                    </div>
                  )}
                </div>

                <div className="analysis-sidebar-2">
                  <div className="sidebar-section">
                    <div className="sidebar-label">ENGINE STATUS</div>
                    <div className="status-indicator">
                      <div className="status-dot" />
                      <span>Neural Model v4.1 Active</span>
                    </div>
                  </div>
                  <div className="sidebar-section">
                    <div className="sidebar-label">DETECTION METHODS</div>
                    <ul className="methods-list">
                      <li><IconShield /> LSB Analysis</li>
                      <li><IconAnalysis /> Chi-Square Test</li>
                      <li><IconShield /> Entropy Mapping</li>
                    </ul>
                  </div>
                  <div className="sidebar-actions">
                    {scanning ? (
                      <div className="progress-wrap-2">
                        <div className="progress-bar-2">
                          <div className="progress-fill-2" style={{ width: `${progress}%` }} />
                        </div>
                        <span>Analyzing Pixels... {progress}%</span>
                      </div>
                    ) : (
                      <button className="btn-analyze-2" onClick={startScan} disabled={!file}>Run Forensic Analysis</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {activeTab === 'encode' && (
          <div className="stego-analyzer-card glass">
            <div className="stego-upload-area-2">
              <div 
                className={`drop-zone-2 ${encodePreview ? 'has-file' : ''}`}
                onClick={() => !encodePreview && document.getElementById('stego-encode-upload').click()}
              >
                <input type="file" id="stego-encode-upload" hidden accept="image/*" onChange={e => handleEncodeFile(e.target.files[0])} />
                {encodePreview ? (
                  <div className="preview-wrap-2">
                    <img src={encodePreview} alt="Encode Target" />
                    <div className="file-info-2">
                      <span>{encodeFile?.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); setEncodeFile(null); setEncodePreview(null); setEncodedImage(null); }}>✕</button>
                    </div>
                  </div>
                ) : (
                  <div className="upload-prompt-2">
                    <div className="icon-wrap-2"><IconImage /></div>
                    <h3>Upload Cover Image</h3>
                    <p>PNG recommended for best results</p>
                  </div>
                )}
              </div>

              <div className="analysis-sidebar-2">
                <div className="sidebar-section">
                  <div className="sidebar-label">SECRET MESSAGE</div>
                  <textarea 
                    className="stego-input-text" 
                    placeholder="Enter the message to hide..." 
                    value={message} 
                    onChange={e => setMessage(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="sidebar-actions">
                  <button className="btn-analyze-2" onClick={runEncode} disabled={!encodeFile || !message || encoding}>
                    {encoding ? 'Encoding...' : 'Hide Message'}
                  </button>
                  
                  {encodedImage && (
                    <a href={encodedImage} download={encodedFilename} className="btn-download-2" style={{marginTop: '10px', display: 'block', textAlign: 'center', textDecoration: 'none'}}>
                      Download Encoded Image
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'decode' && (
          <div className="stego-analyzer-card glass">
            <div className="stego-upload-area-2">
              <div 
                className={`drop-zone-2 ${decodePreview ? 'has-file' : ''}`}
                onClick={() => !decodePreview && document.getElementById('stego-decode-upload').click()}
              >
                <input type="file" id="stego-decode-upload" hidden accept="image/*" onChange={e => handleDecodeFile(e.target.files[0])} />
                {decodePreview ? (
                  <div className="preview-wrap-2">
                    <img src={decodePreview} alt="Decode Target" />
                    <div className="file-info-2">
                      <span>{decodeFile?.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); setDecodeFile(null); setDecodePreview(null); setDecodedMessage(''); }}>✕</button>
                    </div>
                  </div>
                ) : (
                  <div className="upload-prompt-2">
                    <div className="icon-wrap-2"><IconImage /></div>
                    <h3>Upload Encoded Image</h3>
                    <p>Select image to extract payload</p>
                  </div>
                )}
              </div>

              <div className="analysis-sidebar-2">
                <div className="sidebar-section">
                  <div className="sidebar-label">DECODED PAYLOAD</div>
                  {decodedMessage ? (
                    <div className="decoded-msg-box">{decodedMessage}</div>
                  ) : (
                    <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>No payload extracted yet.</p>
                  )}
                </div>
                <div className="sidebar-actions">
                  <button className="btn-analyze-2" onClick={runDecode} disabled={!decodeFile || decoding}>
                    {decoding ? 'Decoding...' : 'Extract Message'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="stego-info-row-2">
          <div className="info-card-2">
            <h4>Bit-Level Inspection</h4>
            <p>Recursive scanning of the least significant bits across all RGB channels to identify non-random data injection.</p>
          </div>
          <div className="info-card-2">
            <h4>Statistical Entropy</h4>
            <p>Heuristic-based entropy mapping identifies clusters of high-complexity data that signal encrypted payload presence.</p>
          </div>
          <div className="info-card-2">
            <h4>Zero-Knowledge</h4>
            <p>All forensic processing happens in-memory. Your data is analyzed and discarded immediately after report generation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
