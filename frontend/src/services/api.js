const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const handleResponse = async (res) => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || body.message || `Request failed (${res.status})`);
  }
  return res.json();
};

const getToken = () => localStorage.getItem('token');

const getHeaders = (isForm = false) => {
  const headers = {};
  if (!isForm) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const post = (url, body, isForm = false) =>
  fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: getHeaders(isForm),
    body: isForm ? body : JSON.stringify(body),
  }).then(handleResponse);

export const get = (url) =>
  fetch(`${BASE}${url}`, {
    headers: getHeaders(),
  }).then(handleResponse);

/* ── Phishing ─────────────────────────────── */
export const scanURL = (url) => post('/phishing/scan-url', { url });

export const analyzeEmailText = (rawEmail) =>
  post('/phishing/analyze-email-text', { raw_email: rawEmail });

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

export const encodeImage = (file, message) => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('message', message);
  return post('/steganography/encode', fd, true);
};

export const decodeImage = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return post('/steganography/decode', fd, true);
};

/* ── Chatbot ──────────────────────────────── */
export const askChatbot = (question) => post('/chatbot/ask', { question });

/* ── Dashboard ────────────────────────────── */
export const getScanHistory = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return get(`/scans${qs ? `?${qs}` : ''}`);
};

export const getStats      = () => get('/stats/summary');
export const getWeeklyStats = () => get('/stats/weekly');

export const exportReport = (scanId, format = 'pdf') =>
  fetch(`${BASE}/scans/${scanId}/report?format=${format}`);
