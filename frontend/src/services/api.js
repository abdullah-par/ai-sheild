const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
console.log('API BASE URL:', BASE);

const handleResponse = async (res) => {
  if (!res.ok) {
    if (res.status === 401) {
      // Token expired or invalid - clear it and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/auth';
      throw new Error('Session expired. Please log in again.');
    }
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
  
  let sessionId = sessionStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('session_id', sessionId);
  }
  headers['X-Session-ID'] = sessionId;
  
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

export const getScanDetail = (scanId) => get(`/scans/${scanId}`);

export const getStats      = () => get('/stats/summary');
export const getWeeklyStats = () => get('/stats/weekly');

export const exportReport = (scanId, format = 'json') =>
  get(`/scans/${scanId}/report?format=${format}`);

export const generateUserReport = (format = 'json') =>
  get(`/user/report?format=${format}`);

/* ── AI Reports ───────────────────────────── */
export const generateAIReport = (timeRange = '24h') => post(`/reports/generate?time_range=${timeRange}`);
export const getLatestAIReport = () => get('/reports/latest');
export const getAIReportPDFUrl = (reportId) => {
  const token = getToken();
  const qs = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${BASE}/reports/${reportId}/pdf${qs}`;
};
export const getScanPDFUrl = (scanId) => `${BASE}/scans/${scanId}/pdf`;


