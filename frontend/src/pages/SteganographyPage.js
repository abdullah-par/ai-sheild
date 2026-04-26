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
const EntropyMap = ({ active, imageSrc }) => {
  const canvasRef = useRef(null);

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  const colorForScore = (score) => {
    const t = clamp01(score);
    let r = 0;
    let g = 0;
    let b = 0;

    if (t < 0.33) {
      const p = t / 0.33;
      r = Math.floor(5 + p * 8);
      g = Math.floor(55 + p * 90);
      b = Math.floor(140 + p * 20);
    } else if (t < 0.66) {
      const p = (t - 0.33) / 0.33;
      r = Math.floor(13 + p * 180);
      g = Math.floor(145 + p * 60);
      b = Math.floor(160 - p * 130);
    } else {
      const p = (t - 0.66) / 0.34;
      r = Math.floor(193 + p * 52);
      g = Math.floor(205 - p * 140);
      b = Math.floor(30 - p * 20);
    }

    return { r, g, b, a: 0.35 + t * 0.6 };
  };

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, W, H);

    if (!imageSrc) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.fillText('Heatmap unavailable: no image source', 12, 22);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const sourceCanvas = document.createElement('canvas');
      const sourceCtx = sourceCanvas.getContext('2d');
      sourceCanvas.width = img.naturalWidth || img.width;
      sourceCanvas.height = img.naturalHeight || img.height;
      sourceCtx.drawImage(img, 0, 0, sourceCanvas.width, sourceCanvas.height);

      const { data, width, height } = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
      const cellW = 8;
      const cellH = 8;
      const bins = 16;

      for (let x = 0; x < W; x += cellW) {
        for (let y = 0; y < H; y += cellH) {
          const sx0 = Math.floor((x / W) * width);
          const sx1 = Math.floor(((x + cellW) / W) * width);
          const sy0 = Math.floor((y / H) * height);
          const sy1 = Math.floor(((y + cellH) / H) * height);

          let lsbOnes = 0;
          let samples = 0;
          const hist = new Array(bins).fill(0);

          for (let sy = sy0; sy < Math.max(sy0 + 1, sy1); sy++) {
            for (let sx = sx0; sx < Math.max(sx0 + 1, sx1); sx++) {
              const idx = (sy * width + sx) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];

              lsbOnes += (r & 1) + (g & 1) + (b & 1);
              samples += 3;

              const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
              const bin = Math.min(bins - 1, Math.floor((lum / 256) * bins));
              hist[bin] += 1;
            }
          }

          const lsbRatio = samples ? lsbOnes / samples : 0.5;
          const lsbAnomaly = Math.min(1, Math.abs(lsbRatio - 0.5) * 2);

          const pixelCount = hist.reduce((s, n) => s + n, 0) || 1;
          let entropy = 0;
          for (const h of hist) {
            if (!h) continue;
            const p = h / pixelCount;
            entropy -= p * Math.log2(p);
          }
          const normalizedEntropy = Math.min(1, entropy / Math.log2(bins));

          const score = clamp01(lsbAnomaly * 0.65 + normalizedEntropy * 0.35);
          const c = colorForScore(score);
          ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${c.a})`;
          ctx.fillRect(x, y, cellW - 1, cellH - 1);
        }
      }
    };

    img.onerror = () => {
      ctx.fillStyle = '#ef4444';
      ctx.font = '12px monospace';
      ctx.fillText('Failed to render heatmap from image', 12, 22);
    };

    img.src = imageSrc;
  }, [active, imageSrc]);
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
          <EntropyMap active={showMap} imageSrc={preview} />
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

  const base64ToFile = (base64Data, filename) => {
    try {
      const arr = base64Data.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, { type: mime });
    } catch (e) {
      console.error("Failed to convert base64 to File:", e);
      return null;
    }
  };

  const testInDecoder = () => {
    if (!encodedImage) return;
    const fileToDecode = base64ToFile(encodedImage, encodedFilename || 'encoded_image.png');
    if (fileToDecode) {
      setDecodeFile(fileToDecode);
      setDecodePreview(encodedImage);
      setDecodedMessage('');
      setActiveTab('decode');
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
                className={`drop-zone-2 ${(encodedImage || encodePreview) ? 'has-file' : ''}`}
                onClick={() => !(encodedImage || encodePreview) && document.getElementById('stego-encode-upload').click()}
              >
                <input type="file" id="stego-encode-upload" hidden accept="image/*" onChange={e => handleEncodeFile(e.target.files[0])} />
                {(encodedImage || encodePreview) ? (
                  <div className="preview-wrap-2">
                    <img src={encodedImage || encodePreview} alt="Encode Target" />
                    <div className="file-info-2">
                      <span>{encodedImage ? encodedFilename : encodeFile?.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); setEncodeFile(null); setEncodePreview(null); setEncodedImage(null); setMessage(''); }}>✕</button>
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
                {encodedImage ? (
                  <div className="sidebar-section">
                    <div className="sidebar-label" style={{color: 'var(--accent-safe)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '16px'}}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      ENCODING SUCCESSFUL
                    </div>
                    <p style={{fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '24px'}}>
                      Secret message has been securely embedded into the pixels using LSB encoding.
                    </p>
                    <button className="btn-analyze-2" onClick={testInDecoder} style={{background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', marginBottom: '12px'}}>
                      Test in Decoder →
                    </button>
                  </div>
                ) : (
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
                )}

                <div className="sidebar-actions">
                  {!encodedImage ? (
                    <button className="btn-analyze-2" onClick={runEncode} disabled={!encodeFile || !message || encoding}>
                      {encoding ? 'Encoding...' : 'Hide Message'}
                    </button>
                  ) : (
                    <a href={encodedImage} download={encodedFilename} className="btn-download-2" style={{display: 'block', textAlign: 'center', textDecoration: 'none'}}>
                      Download Encoded Image
                    </a>
                  )}
                  {encodedImage && (
                    <button className="btn-dismiss-2" onClick={() => { setEncodeFile(null); setEncodePreview(null); setEncodedImage(null); setMessage(''); }} style={{marginTop: '12px', width: '100%', background: 'transparent', borderColor: 'var(--border-strong)'}}>
                      Reset Form
                    </button>
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
                  {decodedMessage ? (
                    <>
                      <div className="sidebar-label" style={{color: 'var(--accent-safe)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '16px'}}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        PAYLOAD EXTRACTED
                      </div>
                      <div className="decoded-msg-box" style={{marginBottom: '20px'}}>{decodedMessage}</div>
                    </>
                  ) : (
                    <>
                      <div className="sidebar-label">DECODED PAYLOAD</div>
                      <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>No payload extracted yet.</p>
                    </>
                  )}
                </div>
                
                <div className="sidebar-actions">
                  {!decodedMessage ? (
                    <button className="btn-analyze-2" onClick={runDecode} disabled={!decodeFile || decoding}>
                      {decoding ? 'Decoding...' : 'Extract Message'}
                    </button>
                  ) : (
                    <button className="btn-dismiss-2" onClick={() => { setDecodeFile(null); setDecodePreview(null); setDecodedMessage(''); }} style={{width: '100%', background: 'transparent', borderColor: 'var(--border-strong)'}}>
                      Clear
                    </button>
                  )}
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
