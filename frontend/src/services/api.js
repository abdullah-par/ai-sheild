const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const handleResponse = async (res) => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  return res.json();
};

const post = (url, body, isForm = false) =>
  fetch(`${BASE}${url}`, {
    method: 'POST',
    ...(isForm
      ? { body }
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  }).then(handleResponse);

const get = (url) => fetch(`${BASE}${url}`).then(handleResponse);

/* ── Phishing ─────────────────────────────── */
export const scanURL = (url) => post('/phishing/scan-url', { url });

export const analyzeEmailText = (rawEmail) =>
  post('/phishing/analyze-email', { raw_email: rawEmail });

export const analyzeEmailFile = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return post('/phishing/analyze-email', fd, true);
};

/* ── Steganography ────────────────────────── */
export const analyzeImage = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return post('/steganography/analyze', fd, true);
};

/* ── Dashboard ────────────────────────────── */
export const getScanHistory = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return get(`/scans${qs ? `?${qs}` : ''}`);
};

export const getStats      = () => get('/stats/summary');
export const getWeeklyStats = () => get('/stats/weekly');

export const exportReport = (scanId, format = 'pdf') =>
  fetch(`${BASE}/scans/${scanId}/report?format=${format}`);
