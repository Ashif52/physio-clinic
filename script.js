/* ============================================
   PHYSIOFLOW — Main Application Logic
   Vanilla JavaScript (ES6+)
   Data persisted via Firebase Firestore Backend
   ============================================ */

'use strict';

/* ============================================
   1. API CLIENT — Communicates with Backend
   ============================================ */
const API = {
  _baseUrl: (window.location.protocol === 'file:' || ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port && window.location.port !== '3000'))
    ? 'http://localhost:3000/api'
    : '/api',
  _token: localStorage.getItem('physioflow_token') || null,

  /** Set JWT token */
  setToken(token) {
    this._token = token;
    if (token) {
      localStorage.setItem('physioflow_token', token);
    } else {
      localStorage.removeItem('physioflow_token');
    }
  },

  /** Get stored token */
  getToken() {
    return this._token;
  },

  /** Make authenticated API request */
  async request(endpoint, options = {}) {
    const url = `${this._baseUrl}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };

    if (this._token) {
      headers['Authorization'] = `Bearer ${this._token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();

      if (!response.ok) {
        throw { status: response.status, message: data.error || 'Request failed' };
      }

      return data;
    } catch (err) {
      if (err.status) throw err;
      console.error('API request failed:', err);
      throw { status: 0, message: 'Network error — is the server running?' };
    }
  },

  /** Shorthand methods */
  get(endpoint) { return this.request(endpoint); },
  post(endpoint, body) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); },
  put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }); },
  delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); },

  /** Multipart Form File Upload */
  async upload(endpoint, formData) {
    const url = `${this._baseUrl}${endpoint}`;
    const headers = {};
    if (this._token) {
      headers['Authorization'] = `Bearer ${this._token}`;
    }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        throw { status: response.status, message: data.error || 'Upload failed' };
      }
      return data;
    } catch (err) {
      if (err.status) throw err;
      console.error('API upload failed:', err);
      throw { status: 0, message: 'Network error during upload' };
    }
  },

  /** Auth methods — Single Unified Login */
  async login(username, password) {
    const data = await this.post('/auth/login', { username, password });
    this.setToken(data.token);
    return data;
  },

  async getMe() {
    return this.get('/auth/me');
  },

  /** Refresh all cached data from backend */
  async refreshAll() {
    try {
      const [patients, exercises, sessions, feedback, calendar] = await Promise.all([
        this.get('/patients').catch(() => []),
        this.get('/exercises').catch(() => []),
        this.get('/sessions').catch(() => []),
        this.get('/feedback').catch(() => []),
        this.get('/calendar').catch(() => []),
      ]);

      DB._cache = {
        patients: patients || [],
        exercises: exercises || [],
        sessions: sessions || [],
        feedback: feedback || [],
        calendarEvents: calendar || [],
      };
    } catch (err) {
      console.warn('Failed to refresh data cache:', err);
    }
  },
};


/* ============================================
   2. DATA LAYER — API-backed with local cache
   
   Provides the same interface (getAll, getById,
   query, add, update, remove) so all existing
   UI rendering code works unchanged.
   
   Data flows: Backend (Firestore) → API → Cache
   ============================================ */
const DB = {
  _cache: {
    doctors: [],
    patients: [],
    exercises: [],
    sessions: [],
    feedback: [],
    calendarEvents: [],
  },

  /** Initialize — fetch all data from backend into cache */
  async init() {
    await API.refreshAll();
  },

  /** Get all items from cached collection (synchronous for UI) */
  getAll(collection) {
    return this._cache[collection] || [];
  },

  /** Get item by ID from cache */
  getById(collection, id) {
    return this.getAll(collection).find(item => item.id === id);
  },

  /** Query with filter function */
  query(collection, filterFn) {
    return this.getAll(collection).filter(filterFn);
  },

  /** Add item — writes to API then updates cache */
  async add(collection, item) {
    // Map collection to API endpoint
    const endpoint = this._collectionToEndpoint(collection);
    if (endpoint) {
      try {
        const result = await API.post(endpoint, item);
        if (!this._cache[collection]) this._cache[collection] = [];
        this._cache[collection].push(result);
        return result;
      } catch (err) {
        console.error(`Failed to add to ${collection}:`, err);
        // Fallback: add to local cache
        if (!this._cache[collection]) this._cache[collection] = [];
        this._cache[collection].push(item);
        return item;
      }
    }
    // Fallback for unmapped collections
    if (!this._cache[collection]) this._cache[collection] = [];
    this._cache[collection].push(item);
    return item;
  },

  /** Update item — writes to API then updates cache */
  async update(collection, id, updates) {
    const endpoint = this._collectionToEndpoint(collection);
    if (endpoint) {
      try {
        const result = await API.put(`${endpoint}/${id}`, updates);
        const idx = (this._cache[collection] || []).findIndex(item => item.id === id);
        if (idx !== -1) {
          this._cache[collection][idx] = { ...this._cache[collection][idx], ...result };
        }
        return result;
      } catch (err) {
        console.error(`Failed to update ${collection}/${id}:`, err);
      }
    }
    // Fallback: update local cache
    const idx = (this._cache[collection] || []).findIndex(item => item.id === id);
    if (idx !== -1) {
      this._cache[collection][idx] = { ...this._cache[collection][idx], ...updates };
      return this._cache[collection][idx];
    }
    return null;
  },

  /** Remove item — writes to API then updates cache */
  async remove(collection, id) {
    const endpoint = this._collectionToEndpoint(collection);
    if (endpoint) {
      try {
        await API.delete(`${endpoint}/${id}`);
      } catch (err) {
        console.error(`Failed to delete ${collection}/${id}:`, err);
      }
    }
    this._cache[collection] = (this._cache[collection] || []).filter(item => item.id !== id);
  },

  /** Reset data — re-fetch from backend */
  async reset() {
    await API.refreshAll();
  },

  /** Map collection name to API endpoint */
  _collectionToEndpoint(collection) {
    const map = {
      patients: '/patients',
      exercises: '/exercises',
      sessions: '/sessions',
      feedback: '/feedback',
      calendarEvents: '/calendar',
      doctors: '/settings',
    };
    return map[collection] || null;
  },
};


/* ============================================
   3. UTILITY FUNCTIONS
   ============================================ */
const Utils = {
  /** Generate a unique ID */
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  /** Generate random password */
  randomPassword(len = 12) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let pw = '';
    for (let i = 0; i < len; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    return pw;
  },

  /** Generate username from name */
  usernameFromName(name) {
    return name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
  },

  /** Format date */
  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  },

  /** Time greeting */
  greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  },

  /** Debounce */
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  /** Copy to clipboard */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    }
  },

  /** Escape HTML */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};


/* ============================================
   4. TOAST NOTIFICATION SYSTEM
   ============================================ */
const Toast = {
  _container: null,

  init() {
    this._container = document.getElementById('toast-container');
  },

  show(type, title, message, duration = 4000) {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <div class="toast-content">
        <div class="toast-title">${Utils.escapeHtml(title)}</div>
        ${message ? `<div class="toast-message">${Utils.escapeHtml(message)}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.closest('.toast').remove()" aria-label="Dismiss">✕</button>
    `;
    this._container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(title, msg) { this.show('success', title, msg); },
  error(title, msg) { this.show('error', title, msg); },
  warning(title, msg) { this.show('warning', title, msg); },
  info(title, msg) { this.show('info', title, msg); }
};


/* ============================================
   5. CHART ENGINE (Canvas API)
   ============================================ */
const ChartEngine = {
  /** Draw a line chart */
  lineChart(canvasId, labels, datasets, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    // Find max value
    let maxVal = 0;
    datasets.forEach(ds => ds.data.forEach(v => { if (v > maxVal) maxVal = v; }));
    maxVal = Math.ceil(maxVal * 1.15);
    if (maxVal === 0) maxVal = 10;

    // Grid lines
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-light').trim() || 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = pad.top + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();

      // Y-axis labels
      const val = Math.round(maxVal - (maxVal / gridLines) * i);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary').trim() || '#8b92a0';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(val, pad.left - 8, y + 4);
    }

    // X-axis labels
    ctx.textAlign = 'center';
    const step = chartW / (labels.length - 1 || 1);
    labels.forEach((label, i) => {
      const x = pad.left + step * i;
      ctx.fillText(label, x, h - 10);
    });

    // Draw datasets
    datasets.forEach(ds => {
      ctx.beginPath();
      ctx.strokeStyle = ds.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ds.data.forEach((val, i) => {
        const x = pad.left + step * i;
        const y = pad.top + chartH - (val / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Area fill
      if (ds.fill) {
        const lastX = pad.left + step * (ds.data.length - 1);
        ctx.lineTo(lastX, pad.top + chartH);
        ctx.lineTo(pad.left, pad.top + chartH);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
        grad.addColorStop(0, ds.color.replace(')', ', 0.2)').replace('rgb', 'rgba'));
        grad.addColorStop(1, ds.color.replace(')', ', 0.02)').replace('rgb', 'rgba'));
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Data points
      ds.data.forEach((val, i) => {
        const x = pad.left + step * i;
        const y = pad.top + chartH - (val / maxVal) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = ds.color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      });
    });
  },

  /** Draw a bar chart */
  barChart(canvasId, labels, data, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    let maxVal = Math.max(...data) * 1.15;
    if (maxVal === 0) maxVal = 10;

    // Grid
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-light').trim() || 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (chartH / 5) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();

      const val = Math.round(maxVal - (maxVal / 5) * i);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary').trim() || '#8b92a0';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(val, pad.left - 8, y + 4);
    }

    // Bars
    const barWidth = (chartW / data.length) * 0.55;
    const gap = chartW / data.length;

    data.forEach((val, i) => {
      const x = pad.left + gap * i + (gap - barWidth) / 2;
      const barH = (val / maxVal) * chartH;
      const y = pad.top + chartH - barH;

      // Rounded top bar
      const r = Math.min(6, barWidth / 2);
      ctx.beginPath();
      ctx.moveTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.arcTo(x + barWidth, y, x + barWidth, y + r, r);
      ctx.lineTo(x + barWidth, pad.top + chartH);
      ctx.lineTo(x, pad.top + chartH);
      ctx.closePath();

      const grad = ctx.createLinearGradient(x, y, x, pad.top + chartH);
      grad.addColorStop(0, colors[i % colors.length]);
      grad.addColorStop(1, colors[i % colors.length] + '88');
      ctx.fillStyle = grad;
      ctx.fill();

      // Label
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary').trim() || '#8b92a0';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + barWidth / 2, h - 10);
    });
  },

  /** Draw a doughnut chart */
  doughnutChart(canvasId, data, colors, labels) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2 - 10;
    const radius = Math.min(cx, cy) - 10;
    const innerRadius = radius * 0.62;
    const total = data.reduce((a, b) => a + b, 0);
    let startAngle = -Math.PI / 2;

    data.forEach((val, i) => {
      const sliceAngle = (val / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerRadius, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = colors[i];
      ctx.fill();
      startAngle += sliceAngle;
    });

    // Center text
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#1a1d23';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(total, cx, cy + 4);
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary').trim() || '#8b92a0';
    ctx.fillText('Total', cx, cy + 22);

    // Legend
    const legendY = h - 20;
    let legendX = cx - (labels.length * 70) / 2;
    labels.forEach((label, i) => {
      ctx.fillStyle = colors[i];
      ctx.fillRect(legendX, legendY - 4, 10, 10);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#5a6170';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, legendX + 14, legendY + 5);
      legendX += 80;
    });
  }
};


/* ============================================
   6. SVG PROGRESS RING GENERATOR
   ============================================ */
function createProgressRing(percent, size = 120, strokeWidth = 8, color = '#5c7cfa') {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const trackColor = getComputedStyle(document.documentElement).getPropertyValue('--border-light').trim() || 'rgba(0,0,0,0.06)';

  return `
    <div class="progress-ring-container" style="width:${size}px;height:${size}px;">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${trackColor}" stroke-width="${strokeWidth}" />
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"
          stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"
          transform="rotate(-90 ${size / 2} ${size / 2})"
          style="transition: stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1);" />
      </svg>
      <div class="progress-ring-label">
        <div class="progress-ring-value">${Math.round(percent)}%</div>
        <div class="progress-ring-text">Complete</div>
      </div>
    </div>
  `;
}


/* ============================================
   7. MAIN APPLICATION CONTROLLER
   ============================================ */
const App = {
  currentUser: null,
  currentRole: null, // 'doctor' | 'patient'
  currentPage: 'dashboard',
  loginTab: 'doctor',
  sidebarOpen: false,
  searchOpen: false,
  selectedPatientId: null,
  calendarMonth: new Date().getMonth(),
  calendarYear: new Date().getFullYear(),

  /* ---- Initialization ---- */
  async init() {
    Toast.init();
    this._bindKeyboard();
    this._applyTheme();

    // Check remembered session via API token
    const token = API.getToken();
    if (token) {
      try {
        const data = await API.getMe();
        this.currentUser = data.user;
        this.currentRole = data.role;
        await DB.init();
        this._enterApp();
        return;
      } catch (err) {
        API.setToken(null);
        localStorage.removeItem('physioflow_session');
      }
    }
  },

  /* ---- Theme ---- */
  _applyTheme() {
    const theme = localStorage.getItem('physioflow_theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('physioflow_theme', next);
    const btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
    // Redraw charts
    this._renderCurrentPage();
  },

  /* ---- Keyboard Shortcuts ---- */
  _bindKeyboard() {
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.openSearch();
      }
      if (e.key === 'Escape') {
        if (this.searchOpen) this.closeSearch();
        this.closeModal();
      }
    });
  },

  /* ---- LOGIN (Unified Single Login) ---- */
  fillDemo(role) {
    const userInput = document.getElementById('login-username');
    const passInput = document.getElementById('login-password');
    if (userInput && passInput) {
      userInput.value = role === 'doctor' ? 'dr.smith' : 'john.doe';
      passInput.value = 'password';
      userInput.focus();
    }
  },

  togglePasswordVisibility() {
    const input = document.getElementById('login-password');
    const btn = document.querySelector('.password-toggle');
    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = '🙈';
    } else {
      input.type = 'password';
      btn.textContent = '👁️';
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    // Clear previous errors
    document.querySelectorAll('.form-group').forEach(fg => fg.classList.remove('has-error'));

    if (!username) {
      document.getElementById('fg-username').classList.add('has-error');
      return;
    }
    if (!password) {
      document.getElementById('fg-password').classList.add('has-error');
      return;
    }

    // Show loading
    document.getElementById('login-btn-text').textContent = 'Signing in…';
    document.getElementById('login-spinner').classList.remove('hidden');

    try {
      const data = await API.login(username, password);
      this.currentUser = data.user;
      this.currentRole = data.role;

      // Initialize DB cache with backend data
      await DB.init();

      const roleBadge = data.role === 'doctor' ? '👨‍⚕️ Doctor' : '👤 Patient';
      Toast.success('Welcome!', `Signed in as ${data.user.name} (${roleBadge})`);
      this._enterApp();
    } catch (err) {
      Toast.error('Login Failed', err.message || 'Invalid username or password');
    } finally {
      document.getElementById('login-btn-text').textContent = 'Sign In';
      document.getElementById('login-spinner').classList.add('hidden');
    }
  },

  logout() {
    this.currentUser = null;
    this.currentRole = null;
    API.setToken(null);
    localStorage.removeItem('physioflow_session');
    document.getElementById('app-layout').classList.add('hidden');
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('login-btn-text').textContent = 'Sign In';
    document.getElementById('login-spinner').classList.add('hidden');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
  },

  /* ---- Forgot Password ---- */
  showForgotPassword(e) {
    e.preventDefault();
    document.getElementById('forgot-modal').classList.add('active');
    document.getElementById('forgot-body').innerHTML = `
      <p style="font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-5);">
        Enter your email address and we'll send you instructions to reset your password.
      </p>
      <div class="form-group">
        <label for="forgot-email">Email Address</label>
        <div class="input-wrapper">
          <input type="email" id="forgot-email" class="form-input" placeholder="you@clinic.com" style="padding-left: 44px">
          <span class="input-icon">✉️</span>
        </div>
      </div>
    `;
    document.getElementById('forgot-footer').innerHTML = `
      <button class="btn btn-secondary" onclick="App.closeForgotPassword()">Cancel</button>
      <button class="btn btn-primary" onclick="App.submitForgotPassword()">Send Reset Link</button>
    `;
  },

  closeForgotPassword() {
    document.getElementById('forgot-modal').classList.remove('active');
  },

  submitForgotPassword() {
    const email = document.getElementById('forgot-email')?.value;
    if (!email) {
      Toast.warning('Email Required', 'Please enter your email address.');
      return;
    }
    document.getElementById('forgot-body').innerHTML = `
      <div class="success-animation">
        <div class="success-icon">✅</div>
        <h3 style="font-size: var(--text-lg); font-weight: 700; margin-bottom: var(--space-2);">Check Your Email</h3>
        <p style="font-size: var(--text-sm); color: var(--text-secondary);">
          We've sent password reset instructions to <strong>${Utils.escapeHtml(email)}</strong>
        </p>
      </div>
    `;
    document.getElementById('forgot-footer').innerHTML = `
      <button class="btn btn-primary" onclick="App.closeForgotPassword()">Done</button>
    `;
  },

  /* ---- Enter App ---- */
  _enterApp() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');
    this._buildSidebar();
    this._updateHeader();
    this.navigate('dashboard');
  },

  /* ---- Build Sidebar ---- */
  _buildSidebar() {
    const nav = document.getElementById('sidebar-nav');
    let items = [];

    if (this.currentRole === 'doctor') {
      items = [
        { section: 'Main', items: [
          { id: 'dashboard', icon: '📊', label: 'Dashboard' },
          { id: 'patients', icon: '👥', label: 'Patients', badge: DB.query('patients', p => p.status === 'active').length },
          { id: 'sessions', icon: '📋', label: 'Sessions' },
          { id: 'calendar', icon: '📅', label: 'Calendar' },
        ]},
        { section: 'Library', items: [
          { id: 'exercises', icon: '🏋️', label: 'Exercise Library' },
          { id: 'videos', icon: '🎬', label: 'Video Management' },
        ]},
        { section: 'Insights', items: [
          { id: 'progress', icon: '📈', label: 'Progress Tracker' },
          { id: 'reports', icon: '📄', label: 'Reports' },
        ]},
        { section: 'System', items: [
          { id: 'settings', icon: '⚙️', label: 'Settings' },
          { id: 'logout', icon: '🚪', label: 'Logout' },
        ]}
      ];
    } else {
      items = [
        { section: 'Main', items: [
          { id: 'dashboard', icon: '🏠', label: 'My Dashboard' },
          { id: 'my-sessions', icon: '📋', label: 'My Sessions' },
          { id: 'my-exercises', icon: '🏋️', label: 'Exercises' },
          { id: 'my-progress', icon: '📈', label: 'My Progress' },
          { id: 'feedback', icon: '💬', label: 'Give Feedback' },
        ]},
        { section: 'System', items: [
          { id: 'settings', icon: '⚙️', label: 'Settings' },
          { id: 'logout', icon: '🚪', label: 'Logout' },
        ]}
      ];
    }

    nav.innerHTML = items.map(section => `
      <div class="nav-section">
        <div class="nav-section-title">${section.section}</div>
        ${section.items.map(item => `
          <div class="nav-item ${item.id === this.currentPage ? 'active' : ''}" data-page="${item.id}" onclick="App.navigate('${item.id}')">
            <span class="nav-icon">${item.icon}</span>
            <span>${item.label}</span>
            ${item.badge ? `<span class="badge">${item.badge}</span>` : ''}
          </div>
        `).join('')}
      </div>
    `).join('');

    // Update user info
    document.getElementById('sidebar-avatar').textContent = this.currentUser.avatar || this.currentUser.name.split(' ').map(n => n[0]).join('');
    document.getElementById('sidebar-user-name').textContent = this.currentUser.name;
    document.getElementById('sidebar-user-role').textContent = this.currentRole === 'doctor' ? 'Physiotherapist' : 'Patient';
  },

  /* ---- Update Header ---- */
  _updateHeader() {
    const titles = {
      dashboard: { h: 'Dashboard', s: `${Utils.greeting()}, ${this.currentUser.name.split(' ')[0]}` },
      patients: { h: 'Patients', s: 'Manage your patient roster' },
      sessions: { h: 'Sessions', s: 'View and manage all sessions' },
      calendar: { h: 'Calendar', s: 'Session schedule overview' },
      exercises: { h: 'Exercise Library', s: 'Browse and manage exercises' },
      videos: { h: 'Video Management', s: 'Upload and manage exercise videos' },
      progress: { h: 'Progress Tracker', s: 'Monitor patient outcomes' },
      reports: { h: 'Reports', s: 'Generate and download reports' },
      settings: { h: 'Settings', s: 'Application preferences' },
      'my-sessions': { h: 'My Sessions', s: 'View your treatment sessions' },
      'my-exercises': { h: 'My Exercises', s: 'Your assigned exercises' },
      'my-progress': { h: 'My Progress', s: 'Track your recovery journey' },
      feedback: { h: 'Feedback', s: 'Share your session feedback' },
      'patient-profile': { h: 'Patient Profile', s: 'Detailed patient information' },
    };

    const t = titles[this.currentPage] || { h: 'PhysioFlow', s: '' };
    document.getElementById('page-heading').textContent = t.h;
    document.getElementById('page-subtitle').textContent = t.s;
  },

  /* ---- Navigation ---- */
  navigate(page) {
    if (page === 'logout') {
      this.logout();
      return;
    }

    this.currentPage = page;
    this._updateHeader();
    this._buildSidebar();
    this._renderCurrentPage();
    this.closeSidebar();

    // Scroll to top
    document.getElementById('page-container').scrollTop = 0;
  },

  _renderCurrentPage() {
    const container = document.getElementById('page-container');

    // Re-animate page enter
    container.style.animation = 'none';
    container.offsetHeight; // trigger reflow
    container.style.animation = '';

    const renderers = {
      dashboard: () => this.currentRole === 'doctor' ? this._renderDoctorDashboard() : this._renderPatientDashboard(),
      patients: () => this._renderPatients(),
      sessions: () => this._renderSessions(),
      calendar: () => this._renderCalendar(),
      exercises: () => this._renderExercises(),
      videos: () => this._renderVideos(),
      progress: () => this._renderProgress(),
      reports: () => this._renderReports(),
      settings: () => this._renderSettings(),
      'my-sessions': () => this._renderPatientSessions(),
      'my-exercises': () => this._renderPatientExercises(),
      'my-progress': () => this._renderPatientProgress(),
      feedback: () => this._renderFeedback(),
      'patient-profile': () => this._renderPatientProfile(),
    };

    const render = renderers[this.currentPage];
    if (render) {
      container.innerHTML = render();
      // Delayed chart rendering (needs DOM to be ready)
      requestAnimationFrame(() => this._initCharts());
    }
  },

  /* ---- Sidebar Toggle ---- */
  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
    document.getElementById('sidebar').classList.toggle('open', this.sidebarOpen);
    document.getElementById('sidebar-overlay').classList.toggle('active', this.sidebarOpen);
  },

  closeSidebar() {
    this.sidebarOpen = false;
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');
  },

  /* ---- Search ---- */
  openSearch() {
    this.searchOpen = true;
    document.getElementById('search-overlay').classList.add('active');
    const input = document.getElementById('global-search-input');
    input.value = '';
    input.focus();
    document.getElementById('search-results').innerHTML = '<div class="search-empty">Start typing to search…</div>';

    input.oninput = Utils.debounce(() => this._performSearch(input.value), 200);
  },

  closeSearch() {
    this.searchOpen = false;
    document.getElementById('search-overlay').classList.remove('active');
  },

  _performSearch(query) {
    const results = document.getElementById('search-results');
    if (!query.trim()) {
      results.innerHTML = '<div class="search-empty">Start typing to search…</div>';
      return;
    }

    const q = query.toLowerCase();
    let items = [];

    // Search patients
    DB.getAll('patients').forEach(p => {
      if (p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.diagnosis.toLowerCase().includes(q)) {
        items.push({ icon: '👤', title: p.name, subtitle: p.diagnosis, action: () => { this.selectedPatientId = p.id; this.navigate('patient-profile'); this.closeSearch(); } });
      }
    });

    // Search exercises
    DB.getAll('exercises').forEach(ex => {
      if (ex.title.toLowerCase().includes(q) || ex.category.toLowerCase().includes(q)) {
        items.push({ icon: '🏋️', title: ex.title, subtitle: `${ex.category} · ${ex.difficulty}`, action: () => { this.navigate('exercises'); this.closeSearch(); } });
      }
    });

    // Search pages
    const pages = [
      { name: 'Dashboard', page: 'dashboard' },
      { name: 'Patients', page: 'patients' },
      { name: 'Sessions', page: 'sessions' },
      { name: 'Calendar', page: 'calendar' },
      { name: 'Exercise Library', page: 'exercises' },
      { name: 'Reports', page: 'reports' },
      { name: 'Settings', page: 'settings' },
    ];
    pages.forEach(pg => {
      if (pg.name.toLowerCase().includes(q)) {
        items.push({ icon: '📄', title: pg.name, subtitle: 'Page', action: () => { this.navigate(pg.page); this.closeSearch(); } });
      }
    });

    if (items.length === 0) {
      results.innerHTML = '<div class="search-empty">No results found</div>';
    } else {
      results.innerHTML = items.slice(0, 10).map((item, i) => `
        <div class="search-result-item" onclick="App._searchActions[${i}]()" tabindex="0">
          <span class="search-result-icon">${item.icon}</span>
          <div class="search-result-text">
            <div class="result-title">${Utils.escapeHtml(item.title)}</div>
            <div class="result-subtitle">${Utils.escapeHtml(item.subtitle)}</div>
          </div>
        </div>
      `).join('');
      this._searchActions = items.slice(0, 10).map(item => item.action);
    }
  },

  _searchActions: [],

  /* ---- Notifications Toggle ---- */
  toggleNotifications() {
    Toast.info('Notifications', 'You have 3 new notifications');
    const dot = document.getElementById('notif-dot');
    if (dot) dot.style.display = 'none';
  },

  /* ---- Modal System ---- */
  openModal(title, bodyHtml, footerHtml, wide = false) {
    document.getElementById('generic-modal-title').textContent = title;
    document.getElementById('generic-modal-body').innerHTML = bodyHtml;
    document.getElementById('generic-modal-footer').innerHTML = footerHtml;
    document.getElementById('generic-modal-dialog').className = wide ? 'modal wide' : 'modal wide';
    document.getElementById('generic-modal').classList.add('active');
  },

  closeModal() {
    document.getElementById('generic-modal').classList.remove('active');
  },

  /* ---- In-App Confirmation Popup System ---- */
  confirm({
    title = 'Are you sure?',
    message = 'This action cannot be undone.',
    confirmText = 'Delete',
    cancelText = 'Cancel',
    type = 'danger',
    icon = '🗑️'
  } = {}) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const titleEl = document.getElementById('confirm-modal-title');
      const msgEl = document.getElementById('confirm-modal-message');
      const iconEl = document.getElementById('confirm-modal-icon');
      const cancelBtn = document.getElementById('confirm-modal-cancel-btn');
      const actionBtn = document.getElementById('confirm-modal-action-btn');

      if (!modal || !titleEl || !msgEl || !iconEl || !cancelBtn || !actionBtn) {
        resolve(window.confirm(message.replace(/<[^>]*>?/gm, '')));
        return;
      }

      titleEl.textContent = title;
      msgEl.innerHTML = message;
      iconEl.textContent = icon || (type === 'danger' ? '🗑️' : '⚠️');
      iconEl.className = `confirm-modal-icon-badge ${type}`;

      cancelBtn.textContent = cancelText;
      actionBtn.textContent = confirmText;
      actionBtn.className = `btn ${type === 'danger' ? 'btn-danger-solid' : 'btn-primary'}`;

      let isResolved = false;
      const cleanup = (result) => {
        if (isResolved) return;
        isResolved = true;
        modal.classList.remove('active');
        cancelBtn.onclick = null;
        actionBtn.onclick = null;
        modal.onclick = null;
        document.removeEventListener('keydown', keyHandler);
        resolve(result);
      };

      const keyHandler = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          cleanup(false);
        }
      };

      cancelBtn.onclick = () => cleanup(false);
      actionBtn.onclick = () => cleanup(true);
      modal.onclick = (e) => {
        if (e.target === modal) cleanup(false);
      };
      document.addEventListener('keydown', keyHandler);

      modal.classList.add('active');
      actionBtn.focus();
    });
  },


  /* ============================================
     DOCTOR DASHBOARD
     ============================================ */
  /* ============================================
     DOCTOR DASHBOARD (Clinical Command Center)
     ============================================ */
  _renderDoctorDashboard() {
    const patients = DB.getAll('patients');
    const sessions = DB.getAll('sessions');
    const feedbackList = DB.getAll('feedback');

    const activePatients = patients.filter(p => p.status === 'active');
    const completedPatients = patients.filter(p => p.status === 'completed');
    const pendingPatients = patients.filter(p => p.status === 'pending');

    const todayStr = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(s => s.date === todayStr);
    const unrepliedFeedback = feedbackList.filter(f => !f.doctorReply);

    // Expiring patients: endDate within next 7 days or expired
    const expiringPatients = patients.filter(p => {
      if (!p.endDate) return false;
      const end = new Date(p.endDate);
      const now = new Date();
      const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      return diffDays <= 7 || p.status === 'expired' || p.status === 'locked';
    });

    // Today's schedule queue (or fallback to top current sessions)
    const queueSessions = todaySessions.length > 0 
      ? todaySessions 
      : sessions.filter(s => s.status === 'current' || s.sessionNumber <= 2).slice(0, 4);

    return `
      <!-- 1. Hero Welcome Header -->
      <div class="dashboard-hero">
        <div class="hero-text">
          <h2>Good Morning, Dr. Sarah Smith 👋</h2>
          <div class="hero-tags">
            <span class="hero-tag date">🗓️ ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <span class="hero-tag primary">👥 <strong>${activePatients.length}</strong> Active</span>
            <span class="hero-tag accent">📋 <strong>${queueSessions.length}</strong> Sessions</span>
            <span class="hero-tag ${unrepliedFeedback.length > 0 ? 'warning' : 'success'}">
              ${unrepliedFeedback.length > 0 ? '⏳ ' + unrepliedFeedback.length + ' Reviews' : '✓ All Caught Up'}
            </span>
          </div>
        </div>
        <div class="hero-actions">
          <button class="btn btn-primary btn-hero-action" onclick="App._showAddPatientModal()">
            <span class="btn-icon-symbol">➕</span> Add Patient
          </button>
          <button class="btn btn-secondary btn-hero-action" onclick="App.navigate('sessions')">
            <span class="btn-icon-symbol">📅</span> Sessions
          </button>
          <button class="btn btn-secondary btn-hero-action" onclick="App.navigate('videos')">
            <span class="btn-icon-symbol">🎥</span> Videos
          </button>
          <button class="btn btn-secondary btn-hero-action" onclick="App.navigate('reports')">
            <span class="btn-icon-symbol">📊</span> Reports
          </button>
        </div>
      </div>

      <!-- 2. Balanced 4-Column KPI Grid -->
      <div class="stats-grid">
        <div class="stat-card blue">
          <div class="stat-card-header">
            <div class="stat-card-icon">👥</div>
            <span class="stat-trend up">↑ 12%</span>
          </div>
          <div class="stat-value">${activePatients.length}</div>
          <div class="stat-label">Active Patients (${patients.length} Total)</div>
        </div>

        <div class="stat-card green">
          <div class="stat-card-header">
            <div class="stat-card-icon">📋</div>
            <span class="stat-trend up">↑ 5%</span>
          </div>
          <div class="stat-value">${queueSessions.length || 4}</div>
          <div class="stat-label">Today's Treatment Sessions</div>
        </div>

        <div class="stat-card orange">
          <div class="stat-card-header">
            <div class="stat-card-icon">⏳</div>
            <span class="stat-trend ${unrepliedFeedback.length > 0 ? 'down' : 'up'}">
              ${unrepliedFeedback.length > 0 ? '⚠️ Action' : '✓ Caught Up'}
            </span>
          </div>
          <div class="stat-value">${unrepliedFeedback.length}</div>
          <div class="stat-label">Pending Patient Reviews</div>
        </div>

        <div class="stat-card purple">
          <div class="stat-card-header">
            <div class="stat-card-icon">💰</div>
            <span class="stat-trend up">↑ 18%</span>
          </div>
          <div class="stat-value">$12.4k</div>
          <div class="stat-label">Monthly Clinic Revenue</div>
        </div>
      </div>

      <!-- 3. Main Workstation 2-Column Layout -->
      <div class="dashboard-main-grid">
        <!-- LEFT COLUMN: Clinical Workflow & Visual Analytics -->
        <div class="dashboard-col">
          <!-- Today's Patient Queue -->
          <div class="content-card">
            <div class="card-header">
              <div style="display:flex;align-items:center;gap:var(--space-2);">
                <h3>📅 Today's Patient Session Queue</h3>
                <span class="badge" style="background:var(--primary-50);color:var(--primary-600);font-size:11px;font-weight:700;padding:2px 8px;border-radius:var(--radius-full);">
                  ${queueSessions.length} Scheduled
                </span>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="App.navigate('sessions')">View Full Schedule</button>
            </div>
            <div class="card-body">
              <div class="queue-list">
                ${queueSessions.map((s, idx) => {
                  const pat = DB.getById('patients', s.patientId) || { name: 'Patient ' + (idx + 1), avatar: 'PT', avatarColor: '#5c7cfa', diagnosis: 'Rehabilitation' };
                  const isCurrent = s.status === 'current' || idx === 0;
                  const isCompleted = s.status === 'completed';
                  const badgeClass = isCurrent ? 'current' : isCompleted ? 'completed' : 'upcoming';
                  const badgeLabel = isCurrent ? '🟢 In Progress' : isCompleted ? '✅ Completed' : '🟡 Next Up';
                  const exCount = s.exercises ? s.exercises.length : 3;

                  return `
                    <div class="queue-item">
                      <div class="queue-left">
                        <div class="patient-avatar" style="background:${pat.avatarColor};width:42px;height:42px;font-size:14px;flex-shrink:0;">${pat.avatar}</div>
                        <div style="min-width:0;">
                          <div style="font-weight:700;font-size:var(--text-sm);color:var(--text-primary);display:flex;align-items:center;gap:6px;">
                            <span>${Utils.escapeHtml(pat.name)}</span>
                            <span class="queue-badge ${badgeClass}">${badgeLabel}</span>
                          </div>
                          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">
                            ${Utils.escapeHtml(pat.diagnosis)} · Session #${s.sessionNumber || idx + 1} (${exCount} exercises)
                          </div>
                        </div>
                      </div>
                      <div style="display:flex;gap:var(--space-2);flex-shrink:0;">
                        <button class="btn btn-secondary btn-sm" onclick="App._showCredentialModal('${pat.id || s.patientId}')" title="Manage Credentials & Access">🔑</button>
                        <button class="btn btn-primary btn-sm" onclick="App.selectedPatientId='${pat.id || s.patientId}';App.navigate('patient-profile')">👁️ View</button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- 2-Column Analytics Charts -->
          <div class="dashboard-charts-2col">
            <div class="chart-card">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4);">
                <h4>📈 Weekly Session Volume</h4>
                <span style="font-size:11px;color:var(--text-tertiary);">Last 7 Days</span>
              </div>
              <div class="chart-canvas-wrapper"><canvas id="chart-weekly-sessions"></canvas></div>
            </div>

            <div class="chart-card">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4);">
                <h4>📊 Pain Reduction Velocity</h4>
                <span style="font-size:11px;color:var(--text-tertiary);">Avg Recovery Index</span>
              </div>
              <div class="chart-canvas-wrapper"><canvas id="chart-pain-trends"></canvas></div>
            </div>
          </div>

          <!-- Monthly Clinic Financial & Treatment Growth -->
          <div class="chart-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4);">
              <div>
                <h4>💰 Monthly Clinical Revenue & Case Growth</h4>
                <p style="font-size:12px;color:var(--text-secondary);margin-top:2px;">Total billing and completed patient rehabilitation packages</p>
              </div>
              <span class="badge" style="background:#eef2ff;color:#4c6ef5;font-weight:700;padding:4px 10px;border-radius:var(--radius-full);font-size:12px;">+18% Target</span>
            </div>
            <div class="chart-canvas-wrapper" style="height:200px;"><canvas id="chart-revenue"></canvas></div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Real-Time Feeds, Status Breakdown & Alerts -->
        <div class="dashboard-col">
          <!-- Patient Recovery & Status Breakdown -->
          <div class="chart-card">
            <h4>🎯 Patient Status Breakdown</h4>
            <div class="chart-canvas-wrapper" style="height:190px;"><canvas id="chart-patient-status"></canvas></div>
            <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:var(--space-2);text-align:center;margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--border-light);">
              <div>
                <div style="font-size:18px;font-weight:800;color:var(--primary-600);">${activePatients.length}</div>
                <div style="font-size:11px;color:var(--text-tertiary);">Active</div>
              </div>
              <div>
                <div style="font-size:18px;font-weight:800;color:var(--accent-600);">${completedPatients.length}</div>
                <div style="font-size:11px;color:var(--text-tertiary);">Completed</div>
              </div>
              <div>
                <div style="font-size:18px;font-weight:800;color:var(--warm-600);">${pendingPatients.length}</div>
                <div style="font-size:11px;color:var(--text-tertiary);">Pending</div>
              </div>
            </div>
          </div>

          <!-- Live Patient Feedback Stream -->
          <div class="content-card">
            <div class="card-header">
              <h3 style="font-size:var(--text-base);">💬 Patient Feedback Stream</h3>
              <button class="btn btn-secondary btn-sm" onclick="App.navigate('patients')">View All</button>
            </div>
            <div class="card-body" style="padding:var(--space-4);">
              <div class="feedback-stream-list">
                ${feedbackList.slice(0, 3).map(fb => {
                  const pat = DB.getById('patients', fb.patientId) || { name: 'Patient', avatar: 'PT', avatarColor: '#5c7cfa' };
                  const painCls = fb.painLevel <= 3 ? 'low' : fb.painLevel <= 6 ? 'mid' : 'high';
                  return `
                    <div class="feedback-stream-item">
                      <div class="feedback-stream-header">
                        <div style="display:flex;align-items:center;gap:8px;">
                          <div class="patient-avatar" style="background:${pat.avatarColor};width:26px;height:26px;font-size:11px;">${pat.avatar}</div>
                          <span style="font-weight:600;font-size:12px;">${Utils.escapeHtml(pat.name)}</span>
                        </div>
                        <span class="pain-badge ${painCls}">Pain ${fb.painLevel}/10</span>
                      </div>
                      <p style="font-size:12px;color:var(--text-secondary);line-height:1.4;margin-bottom:var(--space-2);">
                        "${Utils.escapeHtml(fb.comments || 'Completed session without issues.')}"
                      </p>
                      <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:10px;color:var(--text-tertiary);">${Utils.formatDate(fb.date)}</span>
                        <button class="btn btn-secondary btn-sm" onclick="App._replyFeedbackModal('${fb.id}')" style="padding:2px 8px;font-size:11px;">
                          ${fb.doctorReply ? '✓ Replied' : '💬 Reply'}
                        </button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Expiring Access & Renewal Alerts -->
          ${expiringPatients.length > 0 ? `
          <div class="content-card">
            <div class="card-header">
              <h3 style="font-size:var(--text-base);color:var(--warm-700);">⏳ Access & Renewal Alerts</h3>
            </div>
            <div class="card-body" style="padding:var(--space-4);">
              <div class="alert-list">
                ${expiringPatients.slice(0, 3).map(p => `
                  <div class="alert-item">
                    <div>
                      <div style="font-weight:700;font-size:12px;">${Utils.escapeHtml(p.name)}</div>
                      <div style="font-size:11px;color:var(--text-secondary);">
                        ${p.endDate ? 'Expires: ' + p.endDate : 'Plan Completed'}
                      </div>
                    </div>
                    <button class="btn btn-warm btn-sm" onclick="App._showCredentialModal('${p.id}')" style="padding:4px 10px;font-size:11px;white-space:nowrap;">
                      Extend
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Quick Clinical Tools Hub -->
          <div class="content-card">
            <div class="card-header">
              <h3 style="font-size:var(--text-base);">⚡ Quick Clinical Launch</h3>
            </div>
            <div class="card-body" style="padding:var(--space-4);">
              <div class="shortcuts-grid">
                <div class="shortcut-btn" onclick="App.navigate('exercises')">
                  <span class="icon">🏋️</span>
                  <span>Exercise Library</span>
                </div>
                <div class="shortcut-btn" onclick="App.navigate('videos')">
                  <span class="icon">🎥</span>
                  <span>Video Manager</span>
                </div>
                <div class="shortcut-btn" onclick="App.navigate('progress')">
                  <span class="icon">📊</span>
                  <span>Progress Tracker</span>
                </div>
                <div class="shortcut-btn" onclick="App.navigate('settings')">
                  <span class="icon">⚙️</span>
                  <span>Clinic Settings</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. Full-Width Patient Clinical Roster -->
      <div class="content-card">
        <div class="card-header">
          <div>
            <h3>Active Patient Clinical Roster</h3>
            <p style="font-size:12px;color:var(--text-secondary);margin-top:2px;">Complete overview of ongoing rehabilitation programs</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="App.navigate('patients')">Manage All Patients</button>
        </div>
        <div class="card-body no-pad">
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Diagnosis</th>
                  <th>Treatment Progress</th>
                  <th>Status</th>
                  <th>Plan Expiration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${patients.slice(0, 6).map(p => {
                  const progress = p.sessionCount > 0 ? Math.round((p.completedSessions / p.sessionCount) * 100) : 0;
                  return `
                  <tr>
                    <td>
                      <div class="patient-cell" style="cursor:pointer;" onclick="App.selectedPatientId='${p.id}';App.navigate('patient-profile')">
                        <div class="patient-avatar" style="background:${p.avatarColor}">${p.avatar}</div>
                        <div>
                          <div class="patient-name">${Utils.escapeHtml(p.name)}</div>
                          <div class="patient-email">${Utils.escapeHtml(p.email || p.username || '')}</div>
                        </div>
                      </div>
                    </td>
                    <td>${Utils.escapeHtml(p.diagnosis)}</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:8px;">
                        <div class="progress-bar-track" style="width:100px;">
                          <div class="progress-bar-fill" style="width:${progress}%"></div>
                        </div>
                        <span style="font-size:var(--text-xs);font-weight:600;">${p.completedSessions}/${p.sessionCount} (${progress}%)</span>
                      </div>
                    </td>
                    <td><span class="status-badge ${p.status}">${p.status}</span></td>
                    <td>
                      <span style="font-size:12px;color:${p.endDate && new Date(p.endDate) < new Date() ? 'var(--danger-500)' : 'var(--text-secondary)'};font-weight:${p.endDate && new Date(p.endDate) < new Date() ? '700' : '400'};">
                        ${p.endDate ? (new Date(p.endDate) < new Date() ? '⚠️ Expired: ' + p.endDate : p.endDate) : 'Ongoing'}
                      </span>
                    </td>
                    <td>
                      <div style="display:flex;gap:6px;">
                        <button class="btn btn-secondary btn-sm" onclick="App._showCredentialModal('${p.id}')" title="Credentials & Access">🔑</button>
                        <button class="btn btn-secondary btn-sm" onclick="App.selectedPatientId='${p.id}';App.navigate('patient-profile')" title="Patient Profile">👁️</button>
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  _replyFeedbackModal(feedbackId) {
    const fb = DB.getById('feedback', feedbackId);
    if (!fb) return;
    const patient = DB.getById('patients', fb.patientId);

    this.openModal('Reply to Patient Feedback', `
      <div style="margin-bottom:var(--space-4);">
        <div style="font-weight:600;margin-bottom:var(--space-1);">${patient ? Utils.escapeHtml(patient.name) : 'Patient'} Feedback (${fb.date})</div>
        <div style="background:var(--bg-tertiary);padding:var(--space-3);border-radius:var(--radius-md);font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-3);">
          <strong>Pain: ${fb.painLevel}/10 · ${fb.difficulty}</strong>: "${Utils.escapeHtml(fb.comments || 'No comments provided.')}"
        </div>
        <div class="form-group">
          <label>Doctor Clinical Reply / Instructions</label>
          <textarea id="reply-feedback-text" class="textarea-field" rows="3" placeholder="Write advice, encouragement, or adjustment to exercises...">${Utils.escapeHtml(fb.doctorReply || '')}</textarea>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="App._submitDoctorReply('${feedbackId}')">Send Clinical Reply</button>
    `);
  },

  async _submitDoctorReply(feedbackId) {
    const text = document.getElementById('reply-feedback-text')?.value.trim();
    try {
      await API.put(`/feedback/${feedbackId}/reply`, { reply: text });
      const fb = DB.getById('feedback', feedbackId);
      if (fb) fb.doctorReply = text;
      Toast.success('Reply Sent', 'Your clinical feedback has been sent to the patient.');
      this.closeModal();
      this._renderCurrentPage();
    } catch (err) {
      const fb = DB.getById('feedback', feedbackId);
      if (fb) fb.doctorReply = text;
      Toast.success('Reply Saved', 'Clinical feedback saved.');
      this.closeModal();
      this._renderCurrentPage();
    }
  },


  /* ============================================
     PATIENT MANAGEMENT
     ============================================ */
  _renderPatients() {
    const patients = DB.getAll('patients');

    return `
      <div class="content-card">
        <div class="card-header">
          <h3>All Patients (${patients.length})</h3>
          <div class="flex items-center gap-3" style="flex-wrap:wrap;">
            <div class="filter-bar">
              <div class="search-input">
                <span class="icon">🔍</span>
                <input type="text" id="patient-search" placeholder="Search patients…" oninput="App._filterPatients()">
              </div>
              <select class="select-compact" id="patient-status-filter" onchange="App._filterPatients()">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
              </select>
              <select class="select-compact" id="patient-sort" onchange="App._filterPatients()">
                <option value="name">Sort: Name</option>
                <option value="date">Sort: Date</option>
                <option value="status">Sort: Status</option>
              </select>
            </div>
            <button class="btn btn-primary btn-sm" onclick="App._showAddPatientModal()">+ Add Patient</button>
          </div>
        </div>
        <div class="card-body no-pad">
          <div style="overflow-x:auto;">
            <table class="data-table" id="patients-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Age / Gender</th>
                  <th>Diagnosis</th>
                  <th>Sessions</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="patients-tbody">
                ${this._renderPatientRows(patients)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  _renderPatientRows(patients) {
    if (patients.length === 0) {
      return `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">👥</div><h4>No patients found</h4><p>Add your first patient to get started.</p></div></td></tr>`;
    }
    return patients.map(p => `
      <tr>
        <td>
          <div class="patient-cell" style="cursor:pointer" onclick="App.selectedPatientId='${p.id}';App.navigate('patient-profile')">
            <div class="patient-avatar" style="background:${p.avatarColor}">${p.avatar}</div>
            <div>
              <div class="patient-name">${Utils.escapeHtml(p.name)}</div>
              <div class="patient-email">${Utils.escapeHtml(p.email)}</div>
            </div>
          </div>
        </td>
        <td>${p.age} / ${p.gender}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escapeHtml(p.diagnosis)}</td>
        <td>${p.completedSessions}/${p.sessionCount}</td>
        <td><span class="status-badge ${p.status}">${p.status}</span></td>
        <td>
          <div class="action-btns">
            <button class="action-btn" onclick="App._showEditPatientModal('${p.id}')" title="Edit" aria-label="Edit patient">✏️</button>
            <button class="action-btn" onclick="App._showCredentialModal('${p.id}')" title="Credentials" aria-label="Manage credentials">🔑</button>
            <button class="action-btn danger" onclick="App._deletePatient('${p.id}')" title="Delete" aria-label="Delete patient">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  _filterPatients() {
    const query = (document.getElementById('patient-search')?.value || '').toLowerCase();
    const status = document.getElementById('patient-status-filter')?.value || '';
    const sort = document.getElementById('patient-sort')?.value || 'name';

    let patients = DB.getAll('patients');
    if (query) {
      patients = patients.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        p.diagnosis.toLowerCase().includes(query)
      );
    }
    if (status) {
      patients = patients.filter(p => p.status === status);
    }

    patients.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'date') return new Date(b.startDate) - new Date(a.startDate);
      if (sort === 'status') return a.status.localeCompare(b.status);
      return 0;
    });

    document.getElementById('patients-tbody').innerHTML = this._renderPatientRows(patients);
  },

  _getPatientFormHtml(patient = null) {
    const p = patient || {};
    return `
      <div class="form-grid">
        <div class="form-group">
          <label>Full Name *</label>
          <input type="text" id="pf-name" class="form-input" value="${Utils.escapeHtml(p.name || '')}" placeholder="Patient name" required style="padding-left:16px">
        </div>
        <div class="form-group">
          <label>Age *</label>
          <input type="number" id="pf-age" class="form-input" value="${p.age || ''}" placeholder="Age" min="1" max="120" style="padding-left:16px">
        </div>
        <div class="form-group">
          <label>Gender</label>
          <select id="pf-gender" class="form-select">
            <option value="Male" ${p.gender === 'Male' ? 'selected' : ''}>Male</option>
            <option value="Female" ${p.gender === 'Female' ? 'selected' : ''}>Female</option>
            <option value="Other" ${p.gender === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input type="tel" id="pf-phone" class="form-input" value="${Utils.escapeHtml(p.phone || '')}" placeholder="+1 (555) 000-0000" style="padding-left:16px">
        </div>
        <div class="form-group full-width">
          <label>Email</label>
          <input type="email" id="pf-email" class="form-input" value="${Utils.escapeHtml(p.email || '')}" placeholder="patient@email.com" style="padding-left:16px">
        </div>
        <div class="form-group full-width">
          <label>Medical History</label>
          <textarea id="pf-history" class="textarea-field" rows="2" placeholder="Relevant medical history…">${Utils.escapeHtml(p.medicalHistory || '')}</textarea>
        </div>
        <div class="form-group full-width">
          <label>Diagnosis *</label>
          <input type="text" id="pf-diagnosis" class="form-input" value="${Utils.escapeHtml(p.diagnosis || '')}" placeholder="Primary diagnosis" style="padding-left:16px">
        </div>
        <div class="form-group full-width">
          <label>Treatment Plan</label>
          <textarea id="pf-plan" class="textarea-field" rows="2" placeholder="Treatment plan details…">${Utils.escapeHtml(p.treatmentPlan || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Total Sessions</label>
          <input type="number" id="pf-sessions" class="form-input" value="${p.sessionCount || 8}" min="1" max="100" style="padding-left:16px">
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="pf-status" class="form-select">
            <option value="active" ${p.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="pending" ${p.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="completed" ${p.status === 'completed' ? 'selected' : ''}>Completed</option>
          </select>
        </div>
        <div class="form-group">
          <label>Start Date</label>
          <input type="date" id="pf-start" class="form-input" value="${p.startDate || new Date().toISOString().split('T')[0]}" style="padding-left:16px">
        </div>
        <div class="form-group">
          <label>End Date</label>
          <input type="date" id="pf-end" class="form-input" value="${p.endDate || ''}" style="padding-left:16px">
        </div>

        ${!p.id ? `
        <div class="form-group full-width" style="margin-top:var(--space-2);padding-top:var(--space-4);border-top:1px dashed var(--border-medium);">
          <label style="font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:6px;">
            <span>🔑 Patient Login Password (Optional)</span>
          </label>
          <div style="display:flex;gap:var(--space-2);margin-top:4px;">
            <input type="text" id="pf-password" class="form-input" placeholder="Type custom password (or leave blank to auto-generate)" style="padding-left:16px;font-family:var(--font-mono);font-size:13px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('pf-password').value = Math.random().toString(36).slice(-8);" style="white-space:nowrap;">🎲 Random</button>
          </div>
          <p style="font-size:11px;color:var(--text-tertiary);margin-top:4px;">Doctor can write a custom password or leave it blank to auto-generate.</p>
        </div>
        ` : ''}
      </div>
    `;
  },

  _showAddPatientModal() {
    this.openModal('Add New Patient', this._getPatientFormHtml(), `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="App._saveNewPatient()">Add Patient</button>
    `);
  },

  async _saveNewPatient() {
    const name = document.getElementById('pf-name').value.trim();
    const diagnosis = document.getElementById('pf-diagnosis').value.trim();
    if (!name || !diagnosis) {
      Toast.warning('Required Fields', 'Please fill in name and diagnosis.');
      return;
    }

    const patientData = {
      name,
      age: parseInt(document.getElementById('pf-age').value) || 30,
      gender: document.getElementById('pf-gender').value,
      phone: document.getElementById('pf-phone').value,
      email: document.getElementById('pf-email').value,
      medicalHistory: document.getElementById('pf-history').value,
      diagnosis,
      treatmentPlan: document.getElementById('pf-plan').value,
      sessionCount: parseInt(document.getElementById('pf-sessions').value) || 8,
      startDate: document.getElementById('pf-start').value,
      endDate: document.getElementById('pf-end').value,
      status: document.getElementById('pf-status').value,
    };

    const customPassword = document.getElementById('pf-password')?.value.trim();
    if (customPassword) {
      patientData.password = customPassword;
    }

    try {
      const created = await DB.add('patients', patientData);
      Toast.success('Patient Added', `${name} has been added successfully.`);
      this.closeModal();

      // Show credentials modal so doctor can copy username/password for patient
      if (created && created.credentials) {
        this._showCredentialModal(created.id || created.patientId);
      } else {
        await DB.init();
        this._renderCurrentPage();
      }
    } catch (err) {
      Toast.error('Error', err.message || 'Failed to add patient');
    }
  },

  _showEditPatientModal(patientId) {
    const patient = DB.getById('patients', patientId);
    if (!patient) return;

    this.openModal('Edit Patient', this._getPatientFormHtml(patient), `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="App._updatePatient('${patientId}')">Save Changes</button>
    `);
  },

  async _updatePatient(patientId) {
    const name = document.getElementById('pf-name').value.trim();
    const diagnosis = document.getElementById('pf-diagnosis').value.trim();
    if (!name || !diagnosis) {
      Toast.warning('Required Fields', 'Please fill in name and diagnosis.');
      return;
    }

    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    try {
      await DB.update('patients', patientId, {
        name,
        avatar: initials,
        age: parseInt(document.getElementById('pf-age').value) || 30,
        gender: document.getElementById('pf-gender').value,
        phone: document.getElementById('pf-phone').value,
        email: document.getElementById('pf-email').value,
        medicalHistory: document.getElementById('pf-history').value,
        diagnosis,
        treatmentPlan: document.getElementById('pf-plan').value,
        sessionCount: parseInt(document.getElementById('pf-sessions').value) || 8,
        startDate: document.getElementById('pf-start').value,
        endDate: document.getElementById('pf-end').value,
        status: document.getElementById('pf-status').value,
      });

      Toast.success('Patient Updated', `${name}'s profile has been updated.`);
      this.closeModal();
      this._renderCurrentPage();
    } catch (err) {
      Toast.error('Error', err.message || 'Failed to update patient');
    }
  },

  async _deletePatient(patientId) {
    const patient = DB.getById('patients', patientId);
    if (!patient) return;
    
    const confirmed = await this.confirm({
      title: 'Delete Patient?',
      message: `Are you sure you want to permanently delete <strong>"${Utils.escapeHtml(patient.name)}"</strong> and all associated clinical session records?`,
      confirmText: 'Delete Patient',
      cancelText: 'Cancel',
      type: 'danger',
      icon: '👤'
    });
    if (!confirmed) return;

    try {
      await DB.remove('patients', patientId);
      Toast.success('Deleted', 'Patient has been removed.');
      await DB.init();
      this._renderCurrentPage();
    } catch (err) {
      Toast.error('Error', err.message || 'Failed to delete patient');
    }
  },

  /* ---- Credential & Access Generator (Doctor Can Write Patient Password) ---- */
  _showCredentialModal(patientId) {
    const patient = DB.getById('patients', patientId);
    if (!patient) return;

    const displayPassword = patient.plainPassword || patient.password || '';

    this.openModal('Patient Credentials & Access Control', `
      <div style="margin-bottom:var(--space-4);">
        <div class="patient-cell" style="margin-bottom:var(--space-4);">
          <div class="patient-avatar" style="background:${patient.avatarColor}">${patient.avatar}</div>
          <div>
            <div class="patient-name">${Utils.escapeHtml(patient.name)}</div>
            <div class="patient-email">
              Status: <span class="status-badge ${patient.status}">${patient.status}</span>
              ${patient.endDate ? ` · <span style="font-size: 11px; color: ${new Date(patient.endDate) < new Date() ? 'var(--danger-500)' : 'var(--success-500)'}; font-weight: 600;">${new Date(patient.endDate) < new Date() ? '⚠️ Expired: ' + patient.endDate : '⏳ Expires: ' + patient.endDate}</span>` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- Doctor Editable Credentials Card -->
      <div class="credential-card" style="margin-top:0;padding:var(--space-5);border:1px solid var(--border-light);background:var(--bg-tertiary);border-radius:var(--radius-xl);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4);">
          <span style="font-size:var(--text-xs);font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.06em;">
            🔑 Patient Login Credentials
          </span>
          <span style="font-size:11px;color:var(--primary-600);font-weight:600;">Doctor Custom Password</span>
        </div>

        <!-- Username field -->
        <div class="form-group" style="margin-bottom:var(--space-3);">
          <label style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:4px;display:block;">Username</label>
          <div style="display:flex;gap:var(--space-2);">
            <input type="text" id="edit-cred-username" class="form-input" value="${Utils.escapeHtml(patient.username || '')}" placeholder="patient.username" style="padding-left:12px;font-family:var(--font-mono);font-size:13px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="Utils.copyToClipboard(document.getElementById('edit-cred-username').value);Toast.success('Copied','Username copied to clipboard');" title="Copy Username" style="padding:0 12px;">📋</button>
          </div>
        </div>

        <!-- Password field (Doctor can write / edit custom password) -->
        <div class="form-group" style="margin-bottom:var(--space-4);">
          <label style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;">
            <span>Password (Doctor can type custom password)</span>
            <span style="cursor:pointer;color:var(--primary-500);font-size:11px;font-weight:600;" onclick="App._toggleCredPasswordVisibility()">👁️ Toggle View</span>
          </label>
          <div style="display:flex;gap:var(--space-2);">
            <input type="text" id="edit-cred-password" class="form-input" value="${Utils.escapeHtml(displayPassword)}" placeholder="Type custom password here..." style="padding-left:12px;font-family:var(--font-mono);font-size:13px;font-weight:600;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="App._generateRandomPassIntoInput()" title="Generate Random Password" style="padding:0 10px;font-size:12px;white-space:nowrap;">🎲 Random</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="Utils.copyToClipboard(document.getElementById('edit-cred-password').value);Toast.success('Copied','Password copied to clipboard');" title="Copy Password" style="padding:0 12px;">📋</button>
          </div>
        </div>

        <!-- Save Custom Password / Credentials Button -->
        <div style="display:flex;gap:var(--space-2);">
          <button type="button" class="btn btn-primary btn-sm" onclick="App._saveCustomCredentials('${patientId}')" style="flex:1;">
            💾 Save & Update Password
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="App._copyFullLoginDetails('${patientId}')" title="Copy full login summary for WhatsApp / SMS">
            📤 Copy All Details
          </button>
        </div>
      </div>

      <!-- Session & Expiration Control -->
      <div style="background:var(--bg-tertiary);border-radius:var(--radius-xl);padding:var(--space-4);margin-top:var(--space-4);border:1px solid var(--border-light);">
        <h4 style="font-size:var(--text-sm);font-weight:700;margin-bottom:var(--space-2);">⏳ Session Plan & Expiration Date</h4>
        <p style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:var(--space-3);">
          When the session plan expires, patient login access is automatically revoked.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-3);">
          <div>
            <label style="font-size:11px;font-weight:600;color:var(--text-tertiary);display:block;margin-bottom:4px;">Total Sessions</label>
            <input type="number" id="quick-sessions" class="form-input" value="${patient.sessionCount || 8}" min="1" max="100" style="padding-left:12px;font-size:13px;">
          </div>
          <div>
            <label style="font-size:11px;font-weight:600;color:var(--text-tertiary);display:block;margin-bottom:4px;">Expiration Date</label>
            <input type="date" id="quick-enddate" class="form-input" value="${patient.endDate || ''}" style="padding-left:12px;font-size:13px;">
          </div>
        </div>
        <button type="button" class="btn btn-primary btn-sm" onclick="App._quickUpdateSessionPlan('${patientId}')" style="width:100%;">💾 Save & Update Access</button>
      </div>

      <div class="cred-actions" style="margin-top:var(--space-4);">
        ${patient.status === 'active' ? `<button type="button" class="btn btn-danger btn-sm" onclick="App._updatePatientAccess('${patientId}', 'locked')">🔒 Revoke Access Now</button>` : ''}
        ${patient.status !== 'active' ? `<button type="button" class="btn btn-accent btn-sm" onclick="App._updatePatientAccess('${patientId}', 'active')">🔓 Restore Active Access</button>` : ''}
      </div>
    `, `
      <button class="btn btn-primary" onclick="App.closeModal();App._renderCurrentPage();">Done</button>
    `);
  },

  async _saveCustomCredentials(patientId) {
    const username = document.getElementById('edit-cred-username')?.value.trim();
    const password = document.getElementById('edit-cred-password')?.value.trim();

    if (!username) {
      Toast.warning('Username Required', 'Please enter a valid username.');
      return;
    }
    if (!password) {
      Toast.warning('Password Required', 'Please enter a password for the patient.');
      return;
    }

    try {
      const res = await API.put(`/patients/${patientId}/credentials`, {
        username,
        password
      });

      const p = DB.getById('patients', patientId);
      if (p) {
        p.username = res.username || username;
        p.plainPassword = res.password || password;
        p.password = res.password || password;
      }

      Toast.success('Password Saved', `Password for "${p ? p.name : username}" is now "${password}"`);
      this._showCredentialModal(patientId);
    } catch (err) {
      Toast.error('Error', err.message || 'Failed to update credentials');
    }
  },

  _generateRandomPassIntoInput() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let pw = '';
    for (let i = 0; i < 8; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    const input = document.getElementById('edit-cred-password');
    if (input) {
      input.value = pw;
      input.type = 'text';
      Toast.info('Random Password Generated', `Generated: ${pw}`);
    }
  },

  _toggleCredPasswordVisibility() {
    const input = document.getElementById('edit-cred-password');
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  },

  _copyFullLoginDetails(patientId) {
    const patient = DB.getById('patients', patientId);
    if (!patient) return;
    const username = document.getElementById('edit-cred-username')?.value || patient.username;
    const password = document.getElementById('edit-cred-password')?.value || patient.plainPassword || patient.password || '';
    const originUrl = window.location.origin;

    const message = `PhysioFlow Patient Portal Login Details:\n• Name: ${patient.name}\n• Portal URL: ${originUrl}\n• Username: ${username}\n• Password: ${password}\n\nPlease keep your credentials safe.`;
    Utils.copyToClipboard(message);
    Toast.success('Copied All Details', 'Login summary copied to clipboard for patient!');
  },

  async _quickUpdateSessionPlan(patientId) {
    const sessionCount = parseInt(document.getElementById('quick-sessions')?.value) || 8;
    const endDate = document.getElementById('quick-enddate')?.value || '';
    const todayStr = new Date().toISOString().split('T')[0];
    const status = (endDate && endDate < todayStr) ? 'expired' : 'active';

    try {
      await API.put(`/patients/${patientId}`, {
        sessionCount,
        endDate,
        status
      });

      const p = DB.getById('patients', patientId);
      if (p) {
        p.sessionCount = sessionCount;
        p.endDate = endDate;
        p.status = status;
      }

      Toast.success('Session Plan Updated', `Access expiration set to ${endDate || 'ongoing'}. Status: ${status}`);
      this._showCredentialModal(patientId);
    } catch (err) {
      Toast.error('Error', err.message || 'Failed to update session plan');
    }
  },

  async _generateNewCredentials(patientId) {
    try {
      const res = await API.put(`/patients/${patientId}/credentials`, {});
      const p = DB.getById('patients', patientId);
      if (p) {
        p.plainPassword = res.password;
        p.password = res.password;
      }
      Toast.success('Credentials Generated', 'New password has been assigned.');
      this._showCredentialModal(patientId);
    } catch (err) {
      Toast.error('Error', err.message || 'Failed to generate credentials');
    }
  },

  async _updatePatientAccess(patientId, status) {
    try {
      await API.put(`/patients/${patientId}/status`, { status });
      const p = DB.getById('patients', patientId);
      if (p) p.status = status;
      Toast.success('Access Updated', `Patient status updated to ${status}.`);
      this._showCredentialModal(patientId);
    } catch (err) {
      Toast.error('Error', err.message || 'Failed to update status');
    }
  },


  /* ============================================
     PATIENT PROFILE
     ============================================ */
  _renderPatientProfile() {
    const patient = DB.getById('patients', this.selectedPatientId);
    if (!patient) return '<div class="empty-state"><div class="empty-icon">❌</div><h4>Patient not found</h4></div>';

    const progress = patient.sessionCount > 0 ? Math.round((patient.completedSessions / patient.sessionCount) * 100) : 0;
    const sessions = DB.query('sessions', s => s.patientId === patient.id);

    return `
      <button class="btn btn-ghost btn-sm" onclick="App.navigate('patients')" style="margin-bottom:var(--space-4);">← Back to Patients</button>

      <div class="profile-header">
        <div class="profile-photo" style="background:linear-gradient(135deg,${patient.avatarColor},${patient.avatarColor}cc);">
          ${patient.avatar}
        </div>
        <div class="profile-info">
          <h2>${Utils.escapeHtml(patient.name)}</h2>
          <div class="profile-meta">
            <span class="profile-meta-item"><span class="icon">📧</span> ${Utils.escapeHtml(patient.email)}</span>
            <span class="profile-meta-item"><span class="icon">📱</span> ${Utils.escapeHtml(patient.phone)}</span>
            <span class="profile-meta-item"><span class="icon">🎂</span> ${patient.age} years, ${patient.gender}</span>
            <span class="profile-meta-item"><span class="status-badge ${patient.status}">${patient.status}</span></span>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:var(--space-4);margin-top:var(--space-5);">
            <div class="patient-stat">
              <div class="stat-num">${patient.completedSessions}/${patient.sessionCount}</div>
              <div class="stat-txt">Sessions</div>
            </div>
            <div class="patient-stat">
              ${createProgressRing(progress, 80, 6)}
            </div>
            <div class="patient-stat">
              <div class="stat-num">${patient.painLevel}/10</div>
              <div class="stat-txt">Pain Level</div>
            </div>
            <div class="patient-stat">
              <div class="stat-num">${Utils.formatDate(patient.startDate)}</div>
              <div class="stat-txt">Start Date</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Details Sections -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5);margin-bottom:var(--space-6);">
        <div class="content-card" style="grid-column:${window.innerWidth < 768 ? '1/-1' : 'auto'};">
          <div class="card-header"><h3>Medical Information</h3></div>
          <div class="card-body">
            <div class="report-row"><span class="report-label">Medical History</span><span class="report-value">${Utils.escapeHtml(patient.medicalHistory)}</span></div>
            <div class="report-row"><span class="report-label">Diagnosis</span><span class="report-value">${Utils.escapeHtml(patient.diagnosis)}</span></div>
            <div class="report-row"><span class="report-label">Treatment Plan</span><span class="report-value">${Utils.escapeHtml(patient.treatmentPlan)}</span></div>
            <div class="report-row"><span class="report-label">Doctor Notes</span><span class="report-value">${Utils.escapeHtml(patient.notes || '—')}</span></div>
          </div>
        </div>
        <div class="content-card" style="grid-column:${window.innerWidth < 768 ? '1/-1' : 'auto'};">
          <div class="card-header">
            <h3>Session Timeline</h3>
            <button class="btn btn-primary btn-sm" onclick="App._showAssignSessionModal('${patient.id}')">+ Assign Session</button>
          </div>
          <div class="card-body">
            <div class="session-timeline">
              ${sessions.slice(0, 6).map(s => `
                <div class="session-item ${s.status}">
                  <div class="session-lock-overlay">🔒</div>
                  <div class="session-header">
                    <span class="session-number">Session ${s.sessionNumber}</span>
                    <span class="session-date">${Utils.formatDate(s.date)}</span>
                  </div>
                  <div class="session-exercises">
                    ${s.exercises.slice(0, 2).map(ex => `
                      <div class="exercise-row">
                        <span class="exercise-icon">${ex.completed ? '✅' : '⬜'}</span>
                        <span class="exercise-details">${Utils.escapeHtml(ex.title)}</span>
                        <span class="exercise-sets">${ex.sets}×${ex.reps}</span>
                      </div>
                    `).join('')}
                  </div>
                  ${s.status !== 'locked' && s.status !== 'completed' ? `
                    <div style="margin-top:var(--space-3);display:flex;gap:var(--space-2);flex-wrap:wrap;">
                      <button class="btn btn-accent btn-sm" onclick="App._unlockNextSession('${patient.id}', ${s.sessionNumber})">✅ Mark Complete</button>
                      <button class="btn btn-secondary btn-sm" onclick="App._showEditSessionModal('${s.id}')">✏️ Edit Session</button>
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async _unlockNextSession(patientId, sessionNumber) {
    try {
      const currentSessionId = `sess-${patientId}-${sessionNumber}`;
      await API.put(`/sessions/${currentSessionId}/complete`, {});
      Toast.success('Session Complete', `Session ${sessionNumber} marked as completed.`);
      await DB.init();
      this.navigate('patient-profile');
    } catch (err) {
      Toast.error('Error', err.message || 'Failed to complete session');
    }
  },


  /* ============================================
     ASSIGN SESSION MODAL
     ============================================ */
  _assignSessionSelectedExercises: [],

  /** Open the assign-session modal, optionally pre-filling a patient */
  _showAssignSessionModal(patientId) {
    this._assignSessionSelectedExercises = [];
    const patients = DB.getAll('patients').filter(p => p.status === 'active' || p.status === 'pending');
    const exercises = DB.getAll('exercises');
    const categories = [...new Set(exercises.map(e => e.category))];

    const categoryIcons = {
      'Neck': '🧘',
      'Shoulder': '💪',
      'Back': '🦴',
      'Knee': '🦵',
      'Hip': '🌉',
      'Ankle': '⬆️',
      'Sports Rehab': '🏃'
    };

    const patientOptions = patients.map(p =>
      `<option value="${p.id}" ${p.id === patientId ? 'selected' : ''}>${Utils.escapeHtml(p.name)} — ${Utils.escapeHtml(p.diagnosis)}</option>`
    ).join('');

    this.openModal('Assign New Session', `
      <div class="form-grid">
        <div class="form-group full-width">
          <label>Select Patient *</label>
          <select id="as-patient" class="form-select" ${patientId ? 'disabled' : ''}>
            <option value="">Choose a patient…</option>
            ${patientOptions}
          </select>
          ${patientId ? `<input type="hidden" id="as-patient-fixed" value="${patientId}">` : ''}
        </div>
        <div class="form-group">
          <label>Session Date *</label>
          <input type="date" id="as-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" style="padding-left:16px">
        </div>
        <div class="form-group">
          <label>Duration</label>
          <select id="as-duration" class="form-select">
            <option value="30 min">30 minutes</option>
            <option value="45 min" selected>45 minutes</option>
            <option value="60 min">60 minutes</option>
            <option value="90 min">90 minutes</option>
          </select>
        </div>
      </div>

      <!-- Exercise picker -->
      <div style="margin-top:var(--space-5);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
          <label style="font-size:var(--text-sm);font-weight:700;color:var(--text-primary);">Select Exercises *</label>
          <div class="as-meta-count-bar">
            <span id="as-exercise-list-count">${exercises.length} exercises available</span>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="as-filter-toolbar">
          <!-- Category filter chips -->
          <div class="as-category-chips">
            <button type="button" class="filter-chip active" data-cat="all" onclick="App._filterAssignExercises('all')">
              <span>🌟</span> All
            </button>
            ${categories.map(c => `
              <button type="button" class="filter-chip" data-cat="${c}" onclick="App._filterAssignExercises('${c}')">
                <span>${categoryIcons[c] || '🏷️'}</span> ${c}
              </button>
            `).join('')}
          </div>

          <!-- Search and Quick actions row -->
          <div class="as-search-row">
            <div class="as-search-input-wrap">
              <span class="as-search-icon">🔍</span>
              <input type="text" id="as-exercise-search" placeholder="Search by exercise name, target area, difficulty..." oninput="App._filterAssignExercises()">
              <span id="as-search-clear" class="as-search-clear" onclick="document.getElementById('as-exercise-search').value='';App._filterAssignExercises();">✕</span>
            </div>
            <div class="as-quick-actions">
              <button type="button" class="as-quick-btn" onclick="App._selectAllFilteredAssignExercises()" title="Select all exercises currently shown">✓ Select Visible</button>
              <button type="button" class="as-quick-btn" style="color:var(--text-tertiary);background:var(--bg-tertiary);border-color:var(--border-light);" onclick="App._clearAllAssignExercises()" title="Clear exercise selection">✕ Clear</button>
            </div>
          </div>
        </div>

        <!-- Exercise list with cards -->
        <div id="as-exercise-list">
          ${exercises.map(ex => {
            const diffClass = (ex.difficulty || 'Easy').toLowerCase();
            return `
            <div class="as-exercise-item" id="as-item-${ex.id}" data-category="${ex.category}" data-title="${Utils.escapeHtml(ex.title).toLowerCase()}" onclick="App._toggleAssignExercise('${ex.id}')">
              <div class="as-checkbox-wrap">
                <input type="checkbox" value="${ex.id}" id="as-chk-${ex.id}">
                <div class="as-checkbox-custom" id="as-chkbox-${ex.id}">✓</div>
              </div>
              <div class="as-exercise-thumb">${ex.thumbnail || '🏋️'}</div>
              <div class="as-exercise-info">
                <div class="as-exercise-title" title="${Utils.escapeHtml(ex.title)}">${Utils.escapeHtml(ex.title)}</div>
                <div class="as-exercise-meta">
                  <span class="as-badge as-badge-cat">${ex.category}</span>
                  <span class="as-badge as-badge-diff ${diffClass}">● ${ex.difficulty || 'Easy'}</span>
                  <span class="as-badge as-badge-dur">⏱️ ${ex.duration || '10 min'}</span>
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Selected exercises config -->
      <div id="as-selected-config" class="as-config-section">
        <div class="as-config-header">
          <div class="as-config-title">
            <span>Prescribed Exercises</span>
            <span id="as-selected-count" class="as-config-count-badge">0 selected</span>
          </div>
          <span id="as-est-duration" class="as-config-est-badge" style="display:none;">⏱️ Est. ~0 mins</span>
        </div>
        <div id="as-config-list" class="as-config-list">
          <div class="as-config-empty-card">
            <span style="font-size:1.6rem;opacity:0.6;">📋</span>
            <span>Click any exercise from the list above to customize sets, reps, and rest timers.</span>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div class="form-group" style="margin-top:var(--space-5);">
        <label>Session Notes / Instructions</label>
        <textarea id="as-notes" class="textarea-field" rows="2" placeholder="Any special instructions for this session…"></textarea>
      </div>

      <!-- Doctor remarks -->
      <div class="form-group">
        <label>Doctor Remarks (visible to patient)</label>
        <textarea id="as-remarks" class="textarea-field" rows="2" placeholder="Remarks for the patient…"></textarea>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="App._saveAssignedSession()">📋 Assign Session</button>
    `, true);
  },

  /** Toggle an exercise in the selection list */
  _toggleAssignExercise(exerciseId) {
    const idx = this._assignSessionSelectedExercises.indexOf(exerciseId);
    if (idx === -1) {
      this._assignSessionSelectedExercises.push(exerciseId);
    } else {
      this._assignSessionSelectedExercises.splice(idx, 1);
    }
    this._syncExerciseCardState(exerciseId);
    this._renderAssignExerciseConfig();
  },

  /** Sync visual card checkbox & active styling */
  _syncExerciseCardState(exerciseId) {
    const isSelected = this._assignSessionSelectedExercises.includes(exerciseId);
    const itemEl = document.getElementById(`as-item-${exerciseId}`);
    const chkEl = document.getElementById(`as-chk-${exerciseId}`);
    if (itemEl) {
      itemEl.classList.toggle('selected', isSelected);
    }
    if (chkEl) {
      chkEl.checked = isSelected;
    }
  },

  /** Select all currently visible/filtered exercises */
  _selectAllFilteredAssignExercises() {
    const items = document.querySelectorAll('#as-exercise-list .as-exercise-item');
    items.forEach(item => {
      if (item.style.display !== 'none') {
        const id = item.id.replace('as-item-', '');
        if (!this._assignSessionSelectedExercises.includes(id)) {
          this._assignSessionSelectedExercises.push(id);
        }
        this._syncExerciseCardState(id);
      }
    });
    this._renderAssignExerciseConfig();
  },

  /** Clear all selected exercises */
  _clearAllAssignExercises() {
    const prev = [...this._assignSessionSelectedExercises];
    this._assignSessionSelectedExercises = [];
    prev.forEach(id => this._syncExerciseCardState(id));
    this._renderAssignExerciseConfig();
  },

  /** Adjust stepper numeric parameters */
  _adjustAssignParam(exerciseId, param, delta) {
    const input = document.getElementById(`as-${param}-${exerciseId}`);
    if (!input) return;
    let val = parseInt(input.value) || 0;
    val += delta;
    if (param === 'sets') val = Math.max(1, Math.min(20, val));
    if (param === 'reps') val = Math.max(1, Math.min(100, val));
    if (param === 'rest') val = Math.max(0, Math.min(300, val));
    input.value = val;
  },

  /** Render config controls for selected exercises */
  _renderAssignExerciseConfig() {
    const configList = document.getElementById('as-config-list');
    const countEl = document.getElementById('as-selected-count');
    const estDurationEl = document.getElementById('as-est-duration');
    if (!configList || !countEl) return;

    const exercises = DB.getAll('exercises');
    const selected = this._assignSessionSelectedExercises;

    countEl.textContent = `${selected.length} selected`;

    if (selected.length === 0) {
      if (estDurationEl) estDurationEl.style.display = 'none';
      configList.innerHTML = `
        <div class="as-config-empty-card">
          <span style="font-size:1.6rem;opacity:0.6;">📋</span>
          <span>Click any exercise from the list above to customize sets, reps, and rest timers.</span>
        </div>
      `;
      return;
    }

    // Estimate session workout duration
    let estMin = selected.length * 5;
    if (estDurationEl) {
      estDurationEl.textContent = `⏱️ Est. ~${estMin} mins`;
      estDurationEl.style.display = 'inline-flex';
    }

    configList.innerHTML = selected.map((exId, index) => {
      const ex = exercises.find(e => e.id === exId);
      if (!ex) return '';
      const existingSets = document.getElementById(`as-sets-${exId}`)?.value || 3;
      const existingReps = document.getElementById(`as-reps-${exId}`)?.value || 10;
      const existingRest = document.getElementById(`as-rest-${exId}`)?.value || 60;

      return `
        <div class="as-config-card" id="as-cfg-${exId}">
          <div class="as-config-step-badge">${index + 1}</div>
          <div class="as-config-main">
            <span style="font-size:1.3rem;">${ex.thumbnail || '🏋️'}</span>
            <div>
              <div class="as-config-name">${Utils.escapeHtml(ex.title)}</div>
              <div style="font-size:11px;color:var(--text-tertiary);">${ex.category} · ${ex.difficulty || 'Easy'}</div>
            </div>
          </div>
          <div class="as-config-steppers">
            <div class="as-stepper-group">
              <span class="as-stepper-label">Sets</span>
              <div class="as-stepper-control">
                <button type="button" class="as-stepper-btn" onclick="App._adjustAssignParam('${exId}', 'sets', -1)">−</button>
                <input type="number" id="as-sets-${exId}" class="as-stepper-input" value="${existingSets}" min="1" max="20">
                <button type="button" class="as-stepper-btn" onclick="App._adjustAssignParam('${exId}', 'sets', 1)">+</button>
              </div>
            </div>

            <div class="as-stepper-group">
              <span class="as-stepper-label">Reps</span>
              <div class="as-stepper-control">
                <button type="button" class="as-stepper-btn" onclick="App._adjustAssignParam('${exId}', 'reps', -1)">−</button>
                <input type="number" id="as-reps-${exId}" class="as-stepper-input" value="${existingReps}" min="1" max="100">
                <button type="button" class="as-stepper-btn" onclick="App._adjustAssignParam('${exId}', 'reps', 1)">+</button>
              </div>
            </div>

            <div class="as-stepper-group">
              <span class="as-stepper-label">Rest (s)</span>
              <div class="as-stepper-control">
                <button type="button" class="as-stepper-btn" onclick="App._adjustAssignParam('${exId}', 'rest', -15)">−</button>
                <input type="number" id="as-rest-${exId}" class="as-stepper-input" value="${existingRest}" min="0" max="300" step="15">
                <button type="button" class="as-stepper-btn" onclick="App._adjustAssignParam('${exId}', 'rest', 15)">+</button>
              </div>
            </div>

            <button type="button" class="as-config-remove-btn" onclick="App._removeAssignExercise('${exId}')" title="Remove exercise from session">✕</button>
          </div>
        </div>
      `;
    }).join('');
  },

  /** Remove an exercise from selection */
  _removeAssignExercise(exerciseId) {
    this._assignSessionSelectedExercises = this._assignSessionSelectedExercises.filter(id => id !== exerciseId);
    this._syncExerciseCardState(exerciseId);
    this._renderAssignExerciseConfig();
  },

  /** Filter exercises in the assignment modal */
  _filterAssignExercises(category) {
    if (category) {
      document.querySelectorAll('#generic-modal-body .filter-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.cat === category);
      });
    }

    const activeCat = document.querySelector('#generic-modal-body .filter-chip.active')?.dataset.cat || 'all';
    const searchInput = document.getElementById('as-exercise-search');
    const searchQuery = (searchInput?.value || '').trim().toLowerCase();
    const clearBtn = document.getElementById('as-search-clear');
    if (clearBtn) {
      clearBtn.style.display = searchQuery ? 'inline-block' : 'none';
    }

    let visibleCount = 0;
    const items = document.querySelectorAll('.as-exercise-item');
    items.forEach(item => {
      const itemCat = item.dataset.category;
      const text = item.textContent.toLowerCase();
      const matchesCat = activeCat === 'all' || itemCat === activeCat;
      const matchesSearch = !searchQuery || text.includes(searchQuery);
      const isVisible = matchesCat && matchesSearch;
      item.style.display = isVisible ? 'flex' : 'none';
      if (isVisible) visibleCount++;
    });

    const countEl = document.getElementById('as-exercise-list-count');
    if (countEl) {
      countEl.textContent = `${visibleCount} of ${items.length} exercises`;
    }

    // Dynamic empty state inside exercise list
    let emptyEl = document.getElementById('as-exercise-empty-msg');
    if (visibleCount === 0) {
      if (!emptyEl) {
        emptyEl = document.createElement('div');
        emptyEl.id = 'as-exercise-empty-msg';
        emptyEl.className = 'as-empty-list';
        document.getElementById('as-exercise-list').appendChild(emptyEl);
      }
      emptyEl.innerHTML = `
        <span class="icon">🔍</span>
        <div style="font-weight:600;font-size:var(--text-sm);color:var(--text-primary);">No exercises found</div>
        <div style="font-size:var(--text-xs);">Try searching for something else or clear the category filter.</div>
      `;
      emptyEl.style.display = 'flex';
    } else if (emptyEl) {
      emptyEl.style.display = 'none';
    }
  },

  /** Save the assigned session */
  async _saveAssignedSession() {
    const patientId = document.getElementById('as-patient-fixed')?.value || document.getElementById('as-patient').value;
    const date = document.getElementById('as-date').value;
    const duration = document.getElementById('as-duration').value;
    const notes = document.getElementById('as-notes').value;
    const remarks = document.getElementById('as-remarks').value;
    const selected = this._assignSessionSelectedExercises;

    if (!patientId) {
      Toast.warning('Patient Required', 'Please select a patient.');
      return;
    }
    if (!date) {
      Toast.warning('Date Required', 'Please select a session date.');
      return;
    }
    if (selected.length === 0) {
      Toast.warning('No Exercises', 'Please select at least one exercise.');
      return;
    }

    const allExercises = DB.getAll('exercises');
    const sessionExercises = selected.map(exId => {
      const ex = allExercises.find(e => e.id === exId);
      return {
        exerciseId: exId,
        title: ex?.title || 'Unknown',
        sets: parseInt(document.getElementById(`as-sets-${exId}`)?.value) || 3,
        reps: parseInt(document.getElementById(`as-reps-${exId}`)?.value) || 10,
        restTime: parseInt(document.getElementById(`as-rest-${exId}`)?.value) || 60,
        duration: ex?.duration || '10 min',
        completed: false,
        instructions: ex?.description || ''
      };
    });

    try {
      await API.post('/sessions', {
        patientId,
        date,
        duration,
        exercises: sessionExercises,
        notes,
        doctorRemarks: remarks
      });

      Toast.success('Session Assigned', `Session has been assigned.`);
      this.closeModal();
      await DB.init();

      if (this.selectedPatientId === patientId) {
        this.navigate('patient-profile');
      } else {
        this.navigate('sessions');
      }
    } catch (err) {
      Toast.error('Error', err.message || 'Failed to assign session');
    }
  },


  /* ============================================
     EDIT SESSION MODAL
     ============================================ */
  _showEditSessionModal(sessionId) {
    const session = DB.getById('sessions', sessionId);
    if (!session) return;

    const patient = DB.getById('patients', session.patientId);
    const allExercises = DB.getAll('exercises');
    const categories = [...new Set(allExercises.map(e => e.category))];

    const categoryIcons = {
      'Neck': '🧘',
      'Shoulder': '💪',
      'Back': '🦴',
      'Knee': '🦵',
      'Hip': '🌉',
      'Ankle': '⬆️',
      'Sports Rehab': '🏃'
    };

    this._assignSessionSelectedExercises = session.exercises.map(e => e.exerciseId);

    this.openModal(`Edit Session ${session.sessionNumber} — ${patient?.name || 'Unknown'}`, `
      <div class="form-grid">
        <div class="form-group">
          <label>Session Date</label>
          <input type="date" id="es-date" class="form-input" value="${session.date}" style="padding-left:16px">
        </div>
        <div class="form-group">
          <label>Duration</label>
          <select id="es-duration" class="form-select">
            <option value="30 min" ${session.duration === '30 min' ? 'selected' : ''}>30 minutes</option>
            <option value="45 min" ${session.duration === '45 min' ? 'selected' : ''}>45 minutes</option>
            <option value="60 min" ${session.duration === '60 min' ? 'selected' : ''}>60 minutes</option>
            <option value="90 min" ${session.duration === '90 min' ? 'selected' : ''}>90 minutes</option>
          </select>
        </div>
      </div>

      <!-- Exercise picker -->
      <div style="margin-top:var(--space-5);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
          <label style="font-size:var(--text-sm);font-weight:700;color:var(--text-primary);">Exercises in Session</label>
          <div class="as-meta-count-bar">
            <span id="as-exercise-list-count">${allExercises.length} exercises available</span>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="as-filter-toolbar">
          <div class="as-category-chips">
            <button type="button" class="filter-chip active" data-cat="all" onclick="App._filterAssignExercises('all')">
              <span>🌟</span> All
            </button>
            ${categories.map(c => `
              <button type="button" class="filter-chip" data-cat="${c}" onclick="App._filterAssignExercises('${c}')">
                <span>${categoryIcons[c] || '🏷️'}</span> ${c}
              </button>
            `).join('')}
          </div>

          <div class="as-search-row">
            <div class="as-search-input-wrap">
              <span class="as-search-icon">🔍</span>
              <input type="text" id="as-exercise-search" placeholder="Search exercises…" oninput="App._filterAssignExercises()">
              <span id="as-search-clear" class="as-search-clear" onclick="document.getElementById('as-exercise-search').value='';App._filterAssignExercises();">✕</span>
            </div>
            <div class="as-quick-actions">
              <button type="button" class="as-quick-btn" onclick="App._selectAllFilteredAssignExercises()">✓ Select Visible</button>
              <button type="button" class="as-quick-btn" style="color:var(--text-tertiary);background:var(--bg-tertiary);border-color:var(--border-light);" onclick="App._clearAllAssignExercises()">✕ Clear</button>
            </div>
          </div>
        </div>

        <!-- Exercise list -->
        <div id="as-exercise-list">
          ${allExercises.map(ex => {
            const isChecked = this._assignSessionSelectedExercises.includes(ex.id);
            const diffClass = (ex.difficulty || 'Easy').toLowerCase();
            return `
            <div class="as-exercise-item ${isChecked ? 'selected' : ''}" id="as-item-${ex.id}" data-category="${ex.category}" data-title="${Utils.escapeHtml(ex.title).toLowerCase()}" onclick="App._toggleAssignExercise('${ex.id}')">
              <div class="as-checkbox-wrap">
                <input type="checkbox" value="${ex.id}" id="as-chk-${ex.id}" ${isChecked ? 'checked' : ''}>
                <div class="as-checkbox-custom" id="as-chkbox-${ex.id}">✓</div>
              </div>
              <div class="as-exercise-thumb">${ex.thumbnail || '🏋️'}</div>
              <div class="as-exercise-info">
                <div class="as-exercise-title" title="${Utils.escapeHtml(ex.title)}">${Utils.escapeHtml(ex.title)}</div>
                <div class="as-exercise-meta">
                  <span class="as-badge as-badge-cat">${ex.category}</span>
                  <span class="as-badge as-badge-diff ${diffClass}">● ${ex.difficulty || 'Easy'}</span>
                  <span class="as-badge as-badge-dur">⏱️ ${ex.duration || '10 min'}</span>
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Selected exercises config -->
      <div id="as-selected-config" class="as-config-section">
        <div class="as-config-header">
          <div class="as-config-title">
            <span>Prescribed Exercises</span>
            <span id="as-selected-count" class="as-config-count-badge">${this._assignSessionSelectedExercises.length} selected</span>
          </div>
          <span id="as-est-duration" class="as-config-est-badge">⏱️ Est. ~${this._assignSessionSelectedExercises.length * 5} mins</span>
        </div>
        <div id="as-config-list" class="as-config-list"></div>
      </div>

      <div class="form-group" style="margin-top:var(--space-5);">
        <label>Session Notes</label>
        <textarea id="es-notes" class="textarea-field" rows="2" placeholder="Session notes…">${Utils.escapeHtml(session.notes || '')}</textarea>
      </div>
      <div class="form-group">
        <label>Doctor Remarks</label>
        <textarea id="es-remarks" class="textarea-field" rows="2" placeholder="Remarks…">${Utils.escapeHtml(session.doctorRemarks || '')}</textarea>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="App._saveEditedSession('${sessionId}')">💾 Save Changes</button>
    `, true);

    requestAnimationFrame(() => {
      this._renderEditExerciseConfig(session);
    });
  },

  /** Render config for edit modal */
  _renderEditExerciseConfig(session) {
    const configList = document.getElementById('as-config-list');
    const countEl = document.getElementById('as-selected-count');
    const estDurationEl = document.getElementById('as-est-duration');
    if (!configList || !countEl) return;

    const allExercises = DB.getAll('exercises');
    const selected = this._assignSessionSelectedExercises;

    countEl.textContent = `${selected.length} selected`;

    if (selected.length === 0) {
      if (estDurationEl) estDurationEl.style.display = 'none';
      configList.innerHTML = `
        <div class="as-config-empty-card">
          <span style="font-size:1.6rem;opacity:0.6;">📋</span>
          <span>Select exercises from the list above.</span>
        </div>
      `;
      return;
    }

    if (estDurationEl) {
      estDurationEl.textContent = `⏱️ Est. ~${selected.length * 5} mins`;
      estDurationEl.style.display = 'inline-flex';
    }

    configList.innerHTML = selected.map((exId, index) => {
      const ex = allExercises.find(e => e.id === exId);
      const existing = session.exercises.find(e => e.exerciseId === exId);
      const sets = existing?.sets || 3;
      const reps = existing?.reps || 10;
      const rest = existing?.restTime || 60;
      if (!ex) return '';
      return `
        <div class="as-config-card" id="as-cfg-${exId}">
          <div class="as-config-step-badge">${index + 1}</div>
          <div class="as-config-main">
            <span style="font-size:1.3rem;">${ex.thumbnail || '🏋️'}</span>
            <div>
              <div class="as-config-name">${Utils.escapeHtml(ex.title)}</div>
              <div style="font-size:11px;color:var(--text-tertiary);">${ex.category} · ${ex.difficulty || 'Easy'}</div>
            </div>
          </div>
          <div class="as-config-steppers">
            <div class="as-stepper-group">
              <span class="as-stepper-label">Sets</span>
              <div class="as-stepper-control">
                <button type="button" class="as-stepper-btn" onclick="App._adjustAssignParam('${exId}', 'sets', -1)">−</button>
                <input type="number" id="as-sets-${exId}" class="as-stepper-input" value="${sets}" min="1" max="20">
                <button type="button" class="as-stepper-btn" onclick="App._adjustAssignParam('${exId}', 'sets', 1)">+</button>
              </div>
            </div>

            <div class="as-stepper-group">
              <span class="as-stepper-label">Reps</span>
              <div class="as-stepper-control">
                <button type="button" class="as-stepper-btn" onclick="App._adjustAssignParam('${exId}', 'reps', -1)">−</button>
                <input type="number" id="as-reps-${exId}" class="as-stepper-input" value="${reps}" min="1" max="100">
                <button type="button" class="as-stepper-btn" onclick="App._adjustAssignParam('${exId}', 'reps', 1)">+</button>
              </div>
            </div>

            <div class="as-stepper-group">
              <span class="as-stepper-label">Rest (s)</span>
              <div class="as-stepper-control">
                <button type="button" class="as-stepper-btn" onclick="App._adjustAssignParam('${exId}', 'rest', -15)">−</button>
                <input type="number" id="as-rest-${exId}" class="as-stepper-input" value="${rest}" min="0" max="300" step="15">
                <button type="button" class="as-stepper-btn" onclick="App._adjustAssignParam('${exId}', 'rest', 15)">+</button>
              </div>
            </div>

            <button type="button" class="as-config-remove-btn" onclick="App._removeAssignExercise('${exId}')" title="Remove exercise">✕</button>
          </div>
        </div>
      `;
    }).join('');
  },

  /** Save edited session */
  async _saveEditedSession(sessionId) {
    const session = DB.getById('sessions', sessionId);
    if (!session) return;

    const date = document.getElementById('es-date').value;
    const duration = document.getElementById('es-duration').value;
    const notes = document.getElementById('es-notes').value;
    const remarks = document.getElementById('es-remarks').value;
    const selected = this._assignSessionSelectedExercises;

    if (selected.length === 0) {
      Toast.warning('No Exercises', 'A session needs at least one exercise.');
      return;
    }

    const allExercises = DB.getAll('exercises');
    const sessionExercises = selected.map(exId => {
      const ex = allExercises.find(e => e.id === exId);
      return {
        exerciseId: exId,
        title: ex?.title || 'Unknown',
        sets: parseInt(document.getElementById(`as-sets-${exId}`)?.value) || 3,
        reps: parseInt(document.getElementById(`as-reps-${exId}`)?.value) || 10,
        restTime: parseInt(document.getElementById(`as-rest-${exId}`)?.value) || 60,
        duration: ex?.duration || '10 min',
        completed: false,
        instructions: ex?.description || ''
      };
    });

    try {
      await API.put(`/sessions/${sessionId}`, {
        date,
        duration,
        exercises: sessionExercises,
        notes,
        doctorRemarks: remarks
      });

      Toast.success('Session Updated', `Session ${session.sessionNumber} has been updated.`);
      this.closeModal();
      await DB.init();
      this.navigate('patient-profile');
    } catch (err) {
      Toast.error('Error', err.message || 'Failed to update session');
    }
  },


  /* ============================================
     SESSIONS
     ============================================ */
  _renderSessions() {
    const sessions = DB.getAll('sessions');
    const patients = DB.getAll('patients');
    const patientMap = {};
    patients.forEach(p => patientMap[p.id] = p);

    // Group by status
    const current = sessions.filter(s => s.status === 'current');
    const completed = sessions.filter(s => s.status === 'completed').slice(-10);

    return `
      <div class="stats-grid" style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); margin-bottom: var(--space-6);">
        <div class="stat-card green">
          <div class="stat-value">${sessions.filter(s => s.status === 'completed').length}</div>
          <div class="stat-label">Completed</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-value">${current.length}</div>
          <div class="stat-label">Current / Active</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-value">${sessions.filter(s => s.status === 'locked').length}</div>
          <div class="stat-label">Upcoming (Locked)</div>
        </div>
      </div>

      <div class="content-card" style="margin-bottom:var(--space-6);">
        <div class="card-header">
          <h3>Active Sessions</h3>
          <button class="btn btn-primary btn-sm" onclick="App._showAssignSessionModal()">+ Assign New Session</button>
        </div>
        <div class="card-body no-pad">
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Session #</th>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Exercises</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${current.map(s => {
                  const p = patientMap[s.patientId];
                  return `
                  <tr>
                    <td>
                      <div class="patient-cell">
                        <div class="patient-avatar" style="background:${p?.avatarColor || '#5c7cfa'}">${p?.avatar || '??'}</div>
                        <div class="patient-name">${Utils.escapeHtml(p?.name || 'Unknown')}</div>
                      </div>
                    </td>
                    <td>Session ${s.sessionNumber}</td>
                    <td>${Utils.formatDate(s.date)}</td>
                    <td>${s.duration}</td>
                    <td>${s.exercises.length} exercises</td>
                    <td><span class="status-badge active">Active</span></td>
                  </tr>`;
                }).join('') || '<tr><td colspan="6" class="text-center" style="padding:var(--space-8);color:var(--text-tertiary);">No active sessions</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="content-card">
        <div class="card-header">
          <h3>Recently Completed (Last 10)</h3>
        </div>
        <div class="card-body no-pad">
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Session #</th>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${completed.reverse().map(s => {
                  const p = patientMap[s.patientId];
                  return `
                  <tr>
                    <td>
                      <div class="patient-cell">
                        <div class="patient-avatar" style="background:${p?.avatarColor || '#5c7cfa'}">${p?.avatar || '??'}</div>
                        <div class="patient-name">${Utils.escapeHtml(p?.name || 'Unknown')}</div>
                      </div>
                    </td>
                    <td>Session ${s.sessionNumber}</td>
                    <td>${Utils.formatDate(s.date)}</td>
                    <td>${s.duration}</td>
                    <td><span class="status-badge completed">Completed</span></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },


  /* ============================================
     CALENDAR
     ============================================ */
  _renderCalendar() {
    const month = this.calendarMonth;
    const year = this.calendarYear;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const events = DB.getAll('calendarEvents');
    const eventMap = {};
    events.forEach(ev => {
      if (!eventMap[ev.date]) eventMap[ev.date] = [];
      eventMap[ev.date].push(ev);
    });

    let daysHtml = '';

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      daysHtml += `<div class="calendar-day other-month"><span>${d}</span></div>`;
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const dayEvents = eventMap[dateStr] || [];

      const dots = dayEvents.map(ev => `<span class="event-dot ${ev.status}"></span>`).join('');

      daysHtml += `
        <div class="calendar-day ${isToday ? 'today' : ''}" onclick="App._showCalendarDay('${dateStr}')">
          <span>${d}</span>
          ${dots ? `<div class="event-dots">${dots}</div>` : ''}
        </div>
      `;
    }

    // Next month fill
    const totalCells = firstDay + daysInMonth;
    const remaining = 7 - (totalCells % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        daysHtml += `<div class="calendar-day other-month"><span>${d}</span></div>`;
      }
    }

    return `
      <div class="calendar-wrapper">
        <div class="calendar-header">
          <div class="calendar-nav">
            <button class="calendar-nav-btn" onclick="App._prevMonth()">◀</button>
            <span class="calendar-month">${monthNames[month]} ${year}</span>
            <button class="calendar-nav-btn" onclick="App._nextMonth()">▶</button>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="App.calendarMonth=${today.getMonth()};App.calendarYear=${today.getFullYear()};App._renderCurrentPage();">Today</button>
        </div>

        <div class="calendar-grid">
          <div class="calendar-day-name">Sun</div>
          <div class="calendar-day-name">Mon</div>
          <div class="calendar-day-name">Tue</div>
          <div class="calendar-day-name">Wed</div>
          <div class="calendar-day-name">Thu</div>
          <div class="calendar-day-name">Fri</div>
          <div class="calendar-day-name">Sat</div>
          ${daysHtml}
        </div>

        <div class="calendar-legend">
          <div class="legend-item"><span class="legend-dot" style="background:var(--success-500)"></span> Completed</div>
          <div class="legend-item"><span class="legend-dot" style="background:var(--primary-500)"></span> Upcoming</div>
          <div class="legend-item"><span class="legend-dot" style="background:var(--danger-500)"></span> Cancelled</div>
          <div class="legend-item"><span class="legend-dot" style="background:var(--warm-500)"></span> Missed</div>
        </div>
      </div>
    `;
  },

  _prevMonth() {
    this.calendarMonth--;
    if (this.calendarMonth < 0) { this.calendarMonth = 11; this.calendarYear--; }
    this._renderCurrentPage();
  },

  _nextMonth() {
    this.calendarMonth++;
    if (this.calendarMonth > 11) { this.calendarMonth = 0; this.calendarYear++; }
    this._renderCurrentPage();
  },

  _showCalendarDay(dateStr) {
    const events = DB.query('calendarEvents', ev => ev.date === dateStr);
    if (events.length === 0) {
      Toast.info('No Sessions', `No sessions scheduled for ${Utils.formatDate(dateStr)}`);
      return;
    }

    this.openModal(`Sessions — ${Utils.formatDate(dateStr)}`, `
      <div style="display:flex;flex-direction:column;gap:var(--space-3);">
        ${events.map(ev => `
          <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);background:var(--bg-tertiary);border-radius:var(--radius-md);">
            <span class="status-badge ${ev.status}">${ev.status}</span>
            <div>
              <div style="font-weight:600;font-size:var(--text-sm);">${Utils.escapeHtml(ev.patientName)}</div>
              <div style="font-size:var(--text-xs);color:var(--text-tertiary);">${ev.time}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `, `<button class="btn btn-primary" onclick="App.closeModal()">Close</button>`);
  },


  /* ============================================
     EXERCISE LIBRARY
     ============================================ */
  _renderExercises() {
    const exercises = DB.getAll('exercises');
    const categories = [...new Set(exercises.map(e => e.category))];

    return `
      <div style="display:flex;justify-space-between;align-items:center;margin-bottom:var(--space-4);flex-wrap:wrap;gap:var(--space-3);">
        <div class="exercise-filters" id="exercise-filters" style="margin-bottom:0;">
          <button class="filter-chip active" data-category="all" onclick="App._filterExercises('all')">All</button>
          ${categories.map(cat => `<button class="filter-chip" data-category="${cat}" onclick="App._filterExercises('${cat}')">${cat}</button>`).join('')}
        </div>
        ${this.currentRole === 'doctor' ? `
          <button class="btn btn-primary btn-sm" onclick="App._showAddExerciseModal()">+ Upload Exercise</button>
        ` : ''}
      </div>

      <div class="exercise-grid" id="exercise-grid">
        ${exercises.map(ex => this._exerciseCardHtml(ex)).join('')}
      </div>
    `;
  },

  _showAddExerciseModal(preselectedVideoFile = null) {
    this.openModal('Upload New Exercise to Database', `
      <div class="form-grid">
        <div class="form-group full-width">
          <label>Exercise Title *</label>
          <input type="text" id="ex-title" class="form-input" placeholder="e.g. Quad Sets / Rotator Cuff Stretch" required style="padding-left:16px">
        </div>
        <div class="form-group">
          <label>Category *</label>
          <select id="ex-category" class="form-select">
            <option value="Knee">Knee</option>
            <option value="Back">Back</option>
            <option value="Shoulder">Shoulder</option>
            <option value="Neck">Neck</option>
            <option value="Hip">Hip</option>
            <option value="Ankle">Ankle</option>
            <option value="Sports Rehab" selected>Sports Rehab</option>
          </select>
        </div>
        <div class="form-group">
          <label>Difficulty</label>
          <select id="ex-difficulty" class="form-select">
            <option value="Easy">Easy</option>
            <option value="Medium" selected>Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
        <div class="form-group">
          <label>Duration</label>
          <input type="text" id="ex-duration" class="form-input" value="10 min" placeholder="e.g. 10 min" style="padding-left:16px">
        </div>
        <div class="form-group">
          <label>Icon / Emoji Thumbnail</label>
          <input type="text" id="ex-thumbnail" class="form-input" value="🏋️" placeholder="🏋️" style="padding-left:16px">
        </div>

        <!-- Video Upload Section -->
        <div class="form-group full-width" style="border: 1px dashed var(--border-medium); padding: var(--space-4); border-radius: var(--radius-lg); background: var(--bg-tertiary);">
          <label style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
            <span>📹 Exercise Video (Upload File or URL)</span>
            <span style="font-size: var(--text-xs); color: var(--text-tertiary);">MP4, MOV, WEBM (Max 500MB)</span>
          </label>
          
          <div style="display: flex; gap: var(--space-3); flex-wrap: wrap; align-items: center; margin-bottom: var(--space-3);">
            <label class="btn btn-secondary btn-sm" style="cursor: pointer; margin: 0;">
              📁 Choose Video File
              <input type="file" id="ex-video-file" accept="video/mp4,video/webm,video/quicktime,video/avi" style="display: none;" onchange="App._onExerciseVideoSelected(this)">
            </label>
            <span id="ex-video-filename" style="font-size: var(--text-xs); color: var(--text-secondary); font-style: italic;">No file chosen</span>
            <button type="button" id="ex-video-clear" onclick="App._clearExerciseVideoFile()" class="btn-ghost btn-sm hidden" style="color: var(--danger-500); padding: 2px 8px; font-size: 11px;">✕ Remove</button>
          </div>

          <div style="position: relative;">
            <input type="url" id="ex-video-url" class="form-input" placeholder="Or paste Video URL / YouTube Link (https://...)" style="padding-left: 16px; font-size: var(--text-xs);">
          </div>
        </div>

        <!-- PDF Handout Section -->
        <div class="form-group full-width">
          <label style="display: flex; justify-content: space-between; align-items: center;">
            <span>📄 PDF Guide / Handout (Optional)</span>
            <span style="font-size: var(--text-xs); color: var(--text-tertiary);">PDF (Max 50MB)</span>
          </label>
          <div style="display: flex; gap: var(--space-3); align-items: center;">
            <label class="btn btn-secondary btn-sm" style="cursor: pointer; margin: 0;">
              📎 Attach PDF
              <input type="file" id="ex-pdf-file" accept="application/pdf" style="display: none;" onchange="document.getElementById('ex-pdf-filename').textContent = this.files[0]?.name || 'No file chosen'">
            </label>
            <span id="ex-pdf-filename" style="font-size: var(--text-xs); color: var(--text-secondary); font-style: italic;">No PDF attached</span>
          </div>
        </div>

        <div class="form-group full-width">
          <label>Instructions / Description</label>
          <textarea id="ex-description" class="textarea-field" rows="3" placeholder="Step-by-step instructions for the exercise…"></textarea>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" id="save-exercise-btn" onclick="App._saveNewExercise()">💾 Save to Database</button>
    `);

    if (preselectedVideoFile) {
      const input = document.getElementById('ex-video-file');
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(preselectedVideoFile);
        input.files = dt.files;
        this._onExerciseVideoSelected(input);
      }
    }
  },

  _onExerciseVideoSelected(input) {
    const file = input.files?.[0];
    const nameEl = document.getElementById('ex-video-filename');
    const clearBtn = document.getElementById('ex-video-clear');
    if (file) {
      nameEl.textContent = `🎬 ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`;
      nameEl.style.fontWeight = '600';
      nameEl.style.color = 'var(--primary-600)';
      clearBtn?.classList.remove('hidden');
    } else {
      nameEl.textContent = 'No file chosen';
      nameEl.style.fontWeight = 'normal';
      nameEl.style.color = 'var(--text-secondary)';
      clearBtn?.classList.add('hidden');
    }
  },

  _clearExerciseVideoFile() {
    const input = document.getElementById('ex-video-file');
    if (input) input.value = '';
    this._onExerciseVideoSelected(input);
  },

  async _saveNewExercise() {
    const title = document.getElementById('ex-title')?.value.trim();
    const category = document.getElementById('ex-category')?.value;
    const difficulty = document.getElementById('ex-difficulty')?.value;
    const duration = document.getElementById('ex-duration')?.value;
    const thumbnail = document.getElementById('ex-thumbnail')?.value || '🏋️';
    const description = document.getElementById('ex-description')?.value;
    const videoUrl = document.getElementById('ex-video-url')?.value.trim();
    const videoFile = document.getElementById('ex-video-file')?.files?.[0];
    const pdfFile = document.getElementById('ex-pdf-file')?.files?.[0];

    if (!title) {
      Toast.warning('Title Required', 'Please enter an exercise title.');
      return;
    }

    const saveBtn = document.getElementById('save-exercise-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Uploading & Saving…';
    }

    try {
      if (videoFile || pdfFile) {
        // Use FormData multipart upload
        const formData = new FormData();
        formData.append('title', title);
        formData.append('category', category);
        formData.append('difficulty', difficulty);
        formData.append('duration', duration);
        formData.append('thumbnail', thumbnail);
        formData.append('description', description || '');
        if (videoUrl) formData.append('videoUrl', videoUrl);
        if (videoFile) formData.append('video', videoFile);
        if (pdfFile) formData.append('pdf', pdfFile);

        await API.upload('/exercises', formData);
      } else {
        // Plain JSON save
        await API.post('/exercises', {
          title,
          category,
          difficulty,
          duration,
          thumbnail,
          description,
          videoUrl: videoUrl || ''
        });
      }

      Toast.success('Exercise Saved', `${title} with media has been added to Cloud Firestore.`);
      this.closeModal();
      await DB.init();
      this._renderCurrentPage();
    } catch (err) {
      Toast.error('Error', err.message || 'Failed to save exercise');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save to Database';
      }
    }
  },

  _exerciseCardHtml(ex) {
    const diffClass = ex.difficulty === 'Easy' ? 'difficulty-easy' : ex.difficulty === 'Medium' ? 'difficulty-medium' : 'difficulty-hard';
    const hasVideo = !!ex.video;
    return `
      <div class="exercise-card" data-category="${ex.category}">
        <div class="exercise-thumb" onclick="App._showExerciseDetail('${ex.id}')" style="cursor: pointer;">
          <span>${ex.thumbnail}</span>
          <div class="play-btn">▶</div>
          ${hasVideo ? `<span style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.6); color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600;">📹 Video</span>` : ''}
        </div>
        <div class="exercise-card-body">
          <h4>${Utils.escapeHtml(ex.title)}</h4>
          <p>${Utils.escapeHtml(ex.description)}</p>
          <div class="exercise-meta">
            <span class="exercise-tag">${ex.category}</span>
            <span class="exercise-tag ${diffClass}">${ex.difficulty}</span>
            <span class="exercise-tag">⏱ ${ex.duration}</span>
          </div>
        </div>
      </div>
    `;
  },

  _filterExercises(category) {
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.category === category);
    });

    document.querySelectorAll('.exercise-card').forEach(card => {
      if (category === 'all' || card.dataset.category === category) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  },

  _showExerciseDetail(exerciseId) {
    const ex = DB.getById('exercises', exerciseId);
    if (!ex) return;

    let videoContentHtml = '';
    const videoSrc = ex.video || '';

    if (videoSrc.includes('youtube.com') || videoSrc.includes('youtu.be')) {
      // YouTube embed
      let embedUrl = videoSrc;
      if (videoSrc.includes('watch?v=')) {
        embedUrl = videoSrc.replace('watch?v=', 'embed/');
      } else if (videoSrc.includes('youtu.be/')) {
        const id = videoSrc.split('youtu.be/')[1]?.split('?')[0];
        embedUrl = `https://www.youtube.com/embed/${id}`;
      }
      videoContentHtml = `
        <div class="video-player-wrapper iframe-mode" style="margin-bottom:var(--space-4);">
          <iframe src="${embedUrl}" style="width:100%;height:100%;border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
      `;
    } else if (videoSrc) {
      // Direct video file or uploaded video (Auto-sizes to vertical/portrait or landscape without forced letterboxing)
      videoContentHtml = `
        <div class="video-player-wrapper" style="margin-bottom:var(--space-4);text-align:center;">
          <video controls playsinline preload="metadata" src="${videoSrc}">
            Your browser does not support HTML5 video.
          </video>
        </div>
      `;
    } else {
      // Placeholder
      videoContentHtml = `
        <div style="text-align:center;margin-bottom:var(--space-5);">
          <div class="video-player-wrapper placeholder-mode" style="max-width:400px;margin:0 auto;">
            <div class="video-placeholder">
              <div style="font-size:4rem;">${ex.thumbnail}</div>
              <div class="play-icon">▶</div>
              <p style="font-size:var(--text-sm);">No video uploaded for this exercise</p>
            </div>
          </div>
        </div>
      `;
    }

    const pdfButtonHtml = ex.pdf ? `
      <a href="${ex.pdf}" target="_blank" class="btn btn-secondary" style="text-decoration:none;">📄 View Exercise PDF Guide</a>
    ` : `
      <button class="btn btn-secondary" onclick="Toast.info('PDF Downloaded','Exercise summary generated.');">📄 Download Summary</button>
    `;

    const isDoctor = this.currentRole === 'doctor';
    const doctorActionsHtml = isDoctor ? `
      ${ex.video ? `<button class="btn btn-danger btn-sm" onclick="App._deleteExerciseVideo('${ex.id}')">🗑️ Delete Video</button>` : ''}
      <button class="btn btn-danger btn-sm" onclick="App._deleteExercise('${ex.id}')">🗑️ Delete Exercise</button>
    ` : '';

    this.openModal(ex.title, `
      ${videoContentHtml}
      <div class="report-row"><span class="report-label">Category</span><span class="report-value">${ex.category}</span></div>
      <div class="report-row"><span class="report-label">Difficulty</span><span class="report-value">${ex.difficulty}</span></div>
      <div class="report-row"><span class="report-label">Duration</span><span class="report-value">${ex.duration}</span></div>
      <div class="report-row"><span class="report-label">Instructions</span><span class="report-value">${Utils.escapeHtml(ex.description || 'No specific instructions provided.')}</span></div>
    `, `
      <div style="display:flex;gap:var(--space-2);width:100%;justify-content:space-between;align-items:center;flex-wrap:wrap;">
        <div style="display:flex;gap:var(--space-2);">
          ${doctorActionsHtml}
        </div>
        <div style="display:flex;gap:var(--space-2);">
          <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
          ${pdfButtonHtml}
        </div>
      </div>
    `);
  },

  async _deleteExerciseVideo(exerciseId) {
    const confirmed = await this.confirm({
      title: 'Delete Video?',
      message: 'Are you sure you want to remove the video from this exercise? The exercise will remain in your library.',
      confirmText: 'Delete Video',
      cancelText: 'Cancel',
      type: 'danger',
      icon: '🎬'
    });
    if (!confirmed) return;

    try {
      await API.delete(`/exercises/${exerciseId}/video`);
      Toast.success('Video Deleted', 'The video has been removed from this exercise.');
      this.closeModal();
      await DB.init();
      this._renderCurrentPage();
    } catch (err) {
      Toast.error('Error', err.message || 'Failed to delete video');
    }
  },

  async _deleteExercise(exerciseId) {
    const ex = DB.getById('exercises', exerciseId);
    const confirmed = await this.confirm({
      title: 'Delete Exercise?',
      message: `Are you sure you want to permanently delete <strong>"${Utils.escapeHtml(ex?.title || 'this exercise')}"</strong> from Cloud Firestore?`,
      confirmText: 'Delete Exercise',
      cancelText: 'Cancel',
      type: 'danger',
      icon: '🗑️'
    });
    if (!confirmed) return;

    try {
      await API.delete(`/exercises/${exerciseId}`);
      Toast.success('Exercise Deleted', 'The exercise has been removed from Cloud Firestore.');
      this.closeModal();
      await DB.init();
      this._renderCurrentPage();
    } catch (err) {
      Toast.error('Error', err.message || 'Failed to delete exercise');
    }
  },


  /* ============================================
     VIDEO MANAGEMENT
     ============================================ */
  _renderVideos() {
    const exercises = DB.getAll('exercises');
    const videoExercises = exercises.filter(e => !!e.video);

    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6);">
        <div class="content-card" style="grid-column:${window.innerWidth < 768 ? '1/-1' : 'auto'};">
          <div class="card-header"><h3>Upload Exercise Video</h3></div>
          <div class="card-body">
            <input type="file" id="video-mgmt-file-input" accept="video/*" style="display:none;" onchange="if(this.files[0]) App._showAddExerciseModal(this.files[0])">
            <div class="upload-area" id="upload-area-video"
              ondragover="event.preventDefault();this.classList.add('dragover')"
              ondragleave="this.classList.remove('dragover')"
              ondrop="event.preventDefault();this.classList.remove('dragover');if(event.dataTransfer.files[0]) App._showAddExerciseModal(event.dataTransfer.files[0]);"
              onclick="document.getElementById('video-mgmt-file-input').click();">
              <div class="upload-icon">🎬</div>
              <p><strong>Click to browse</strong> or drag & drop video files here</p>
              <p class="upload-hint">MP4, MOV, WEBM, AVI — Max 500MB</p>
            </div>
            <div style="margin-top:var(--space-4);text-align:center;">
              <button class="btn btn-primary btn-sm" onclick="App._showAddExerciseModal()">+ Create Exercise with Video</button>
            </div>
          </div>
        </div>

        <div class="content-card" style="grid-column:${window.innerWidth < 768 ? '1/-1' : 'auto'};">
          <div class="card-header">
            <h3>Video Library (${exercises.length} total, ${videoExercises.length} with video)</h3>
          </div>
          <div class="card-body">
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:var(--space-3);max-height:360px;overflow-y:auto;">
              ${exercises.map(ex => `
                <div style="background:var(--bg-tertiary);border-radius:var(--radius-md);overflow:hidden;cursor:pointer;border:1px solid var(--border-light);position:relative;" onclick="App._showExerciseDetail('${ex.id}')">
                  <div style="height:80px;background:linear-gradient(135deg,var(--primary-100),var(--accent-100));display:flex;align-items:center;justify-content:center;font-size:1.75rem;position:relative;">
                    ${ex.thumbnail}
                    ${ex.video ? '<span style="position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,0.7);color:#fff;font-size:9px;padding:1px 5px;border-radius:3px;">▶ Video</span>' : ''}
                  </div>
                  <div style="padding:var(--space-2) var(--space-3);">
                    <div style="font-size:var(--text-xs);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${Utils.escapeHtml(ex.title)}</div>
                    <div style="font-size:10px;color:var(--text-tertiary);">${ex.category} · ${ex.duration}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _simulateUpload(type) {
    const progressEl = document.getElementById(`upload-progress-${type}`);
    const barEl = document.getElementById(`upload-bar-${type}`);
    const pctEl = document.getElementById(`upload-pct-${type}`);
    if (!progressEl) return;

    progressEl.classList.remove('hidden');
    let pct = 0;

    const interval = setInterval(() => {
      pct += Math.floor(Math.random() * 15) + 5;
      if (pct >= 100) {
        pct = 100;
        clearInterval(interval);
        setTimeout(() => {
          progressEl.classList.add('hidden');
          Toast.success('Upload Complete', `${type === 'video' ? 'Video' : 'File'} uploaded successfully.`);
        }, 500);
      }
      barEl.style.width = pct + '%';
      pctEl.textContent = pct + '%';
    }, 300);
  },


  /* ============================================
     PROGRESS TRACKER
     ============================================ */
  _renderProgress() {
    const patients = DB.getAll('patients');

    return `
      <div class="filter-bar" style="margin-bottom:var(--space-6);">
        <select class="select-compact" id="progress-patient-select" onchange="App._renderCurrentPage()">
          <option value="">All Patients</option>
          ${patients.map(p => `<option value="${p.id}" ${p.id === this.selectedPatientId ? 'selected' : ''}>${Utils.escapeHtml(p.name)}</option>`).join('')}
        </select>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:var(--space-5);margin-bottom:var(--space-8);">
        ${[
          { label: 'Avg Pain Reduction', value: 42, color: '#20c997' },
          { label: 'Avg Mobility', value: 78, color: '#5c7cfa' },
          { label: 'Avg Strength', value: 65, color: '#7950f2' },
          { label: 'ROM Improvement', value: 56, color: '#ff922b' },
          { label: 'Attendance Rate', value: 91, color: '#0ca678' },
          { label: 'Completion Rate', value: 73, color: '#fa5252' }
        ].map(item => `
          <div class="content-card" style="padding:var(--space-5);text-align:center;">
            ${createProgressRing(item.value, 100, 7, item.color)}
            <div style="font-size:var(--text-sm);font-weight:600;margin-top:var(--space-3);">${item.label}</div>
          </div>
        `).join('')}
      </div>

      <div class="charts-grid">
        <div class="chart-card">
          <h4>📉 Pain Level Over Time</h4>
          <div class="chart-canvas-wrapper"><canvas id="chart-progress-pain"></canvas></div>
        </div>
        <div class="chart-card">
          <h4>💪 Strength & Mobility</h4>
          <div class="chart-canvas-wrapper"><canvas id="chart-progress-strength"></canvas></div>
        </div>
      </div>
    `;
  },


  /* ============================================
     REPORTS
     ============================================ */
  _renderReports() {
    const patients = DB.getAll('patients');

    return `
      <div class="content-card" style="margin-bottom:var(--space-6);">
        <div class="card-header">
          <h3>Generate Report</h3>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group">
              <label>Select Patient</label>
              <select id="report-patient" class="form-select" onchange="App._generateReportPreview()">
                <option value="">Choose patient…</option>
                ${patients.map(p => `<option value="${p.id}">${Utils.escapeHtml(p.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="display:flex;align-items:flex-end;gap:var(--space-3);">
              <button class="btn btn-primary" onclick="App._generateReportPreview()">📄 Generate Report</button>
              <button class="btn btn-secondary" onclick="window.print()">🖨️ Print</button>
              <button class="btn btn-secondary" onclick="Toast.info('Download','Report PDF download initiated.')">⬇️ Download</button>
            </div>
          </div>
        </div>
      </div>

      <div id="report-output"></div>
    `;
  },

  _generateReportPreview() {
    const patientId = document.getElementById('report-patient')?.value;
    const output = document.getElementById('report-output');
    if (!patientId) {
      output.innerHTML = '<div class="empty-state"><div class="empty-icon">📄</div><h4>Select a patient</h4><p>Choose a patient to generate their treatment report.</p></div>';
      return;
    }

    const patient = DB.getById('patients', patientId);
    const sessions = DB.query('sessions', s => s.patientId === patientId);
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const progress = patient.sessionCount > 0 ? Math.round((patient.completedSessions / patient.sessionCount) * 100) : 0;

    output.innerHTML = `
      <div class="report-preview">
        <div class="report-header-section">
          <h2>🩺 PhysioFlow Treatment Report</h2>
          <p>Generated on ${Utils.formatDate(new Date().toISOString().split('T')[0])}</p>
        </div>

        <div class="report-section">
          <h3>Patient Information</h3>
          <div class="report-row"><span class="report-label">Name</span><span class="report-value">${Utils.escapeHtml(patient.name)}</span></div>
          <div class="report-row"><span class="report-label">Age / Gender</span><span class="report-value">${patient.age} / ${patient.gender}</span></div>
          <div class="report-row"><span class="report-label">Email</span><span class="report-value">${Utils.escapeHtml(patient.email)}</span></div>
          <div class="report-row"><span class="report-label">Phone</span><span class="report-value">${Utils.escapeHtml(patient.phone)}</span></div>
          <div class="report-row"><span class="report-label">Diagnosis</span><span class="report-value">${Utils.escapeHtml(patient.diagnosis)}</span></div>
          <div class="report-row"><span class="report-label">Treatment Plan</span><span class="report-value">${Utils.escapeHtml(patient.treatmentPlan)}</span></div>
        </div>

        <div class="report-section">
          <h3>Treatment Progress</h3>
          <div class="report-row"><span class="report-label">Sessions Completed</span><span class="report-value">${patient.completedSessions} / ${patient.sessionCount}</span></div>
          <div class="report-row"><span class="report-label">Progress</span><span class="report-value">${progress}%</span></div>
          <div class="report-row"><span class="report-label">Current Pain Level</span><span class="report-value">${patient.painLevel} / 10</span></div>
          <div class="report-row"><span class="report-label">Treatment Status</span><span class="report-value"><span class="status-badge ${patient.status}">${patient.status}</span></span></div>
          <div class="report-row"><span class="report-label">Start Date</span><span class="report-value">${Utils.formatDate(patient.startDate)}</span></div>
          <div class="report-row"><span class="report-label">End Date</span><span class="report-value">${Utils.formatDate(patient.endDate)}</span></div>
        </div>

        <div class="report-section">
          <h3>Session Details</h3>
          ${completedSessions.slice(0, 5).map(s => `
            <div style="padding:var(--space-3) 0;border-bottom:1px solid var(--border-light);">
              <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2);">
                <strong>Session ${s.sessionNumber}</strong>
                <span style="color:var(--text-tertiary);font-size:var(--text-sm);">${Utils.formatDate(s.date)}</span>
              </div>
              <div style="font-size:var(--text-sm);color:var(--text-secondary);">
                Exercises: ${s.exercises.map(e => e.title).join(', ')}
              </div>
              ${s.doctorRemarks ? `<div style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:var(--space-1);">Remarks: ${Utils.escapeHtml(s.doctorRemarks)}</div>` : ''}
            </div>
          `).join('')}
        </div>

        <div class="report-section">
          <h3>Doctor Remarks & Recommendations</h3>
          <p style="font-size:var(--text-sm);color:var(--text-secondary);">${Utils.escapeHtml(patient.notes || 'No additional remarks.')}</p>
        </div>
      </div>
    `;
  },


  /* ============================================
     SETTINGS
     ============================================ */
  _renderSettings() {
    const doctor = this.currentRole === 'doctor' ? this.currentUser : null;
    const theme = document.documentElement.getAttribute('data-theme');

    return `
      <div class="settings-grid">
        <div class="settings-section">
          <h3>👤 Profile</h3>
          <div class="setting-row">
            <div class="setting-info">
              <h4>${Utils.escapeHtml(this.currentUser.name)}</h4>
              <p>${Utils.escapeHtml(this.currentUser.email)}</p>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="Toast.info('Edit Profile','Profile editing coming soon.')">Edit</button>
          </div>
          ${doctor ? `
          <div class="setting-row">
            <div class="setting-info">
              <h4>Clinic Name</h4>
              <p>${Utils.escapeHtml(doctor.clinicName || 'Not set')}</p>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="Toast.info('Edit Clinic','Clinic editing coming soon.')">Edit</button>
          </div>
          ` : ''}
        </div>

        <div class="settings-section">
          <h3>🔒 Security</h3>
          <div class="setting-row">
            <div class="setting-info">
              <h4>Change Password</h4>
              <p>Update your account password</p>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="App._showChangePasswordModal()">Change</button>
          </div>
        </div>

        <div class="settings-section">
          <h3>🎨 Appearance</h3>
          <div class="setting-row">
            <div class="setting-info">
              <h4>Dark Mode</h4>
              <p>Switch between light and dark theme</p>
            </div>
            <div class="toggle-switch ${theme === 'dark' ? 'active' : ''}" onclick="App.toggleTheme()"></div>
          </div>
        </div>

        ${doctor ? `
        <div class="settings-section">
          <h3>🔔 Notifications</h3>
          <div class="setting-row">
            <div class="setting-info">
              <h4>New Session Assigned</h4>
              <p>Get notified when sessions are assigned</p>
            </div>
            <div class="toggle-switch active" onclick="this.classList.toggle('active')"></div>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <h4>Patient Feedback</h4>
              <p>Notifications for new patient feedback</p>
            </div>
            <div class="toggle-switch active" onclick="this.classList.toggle('active')"></div>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <h4>Video Uploads</h4>
              <p>Alert when patients upload videos</p>
            </div>
            <div class="toggle-switch active" onclick="this.classList.toggle('active')"></div>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <h4>Treatment Completion</h4>
              <p>Notify when treatments are completed</p>
            </div>
            <div class="toggle-switch active" onclick="this.classList.toggle('active')"></div>
          </div>
        </div>
        ` : ''}

        <div class="settings-section">
          <h3>⚠️ Data Management</h3>
          <div class="setting-row">
            <div class="setting-info">
              <h4>Reset All Data</h4>
              <p>Reset application to demo data (irreversible)</p>
            </div>
            <button class="btn btn-danger btn-sm" onclick="App._handleResetData()">Reset</button>
          </div>
        </div>
      </div>
    `;
  },

  async _handleResetData() {
    const confirmed = await this.confirm({
      title: 'Reset All Data?',
      message: 'Are you sure you want to reset all data back to factory defaults? All unsaved modifications will be lost.',
      confirmText: 'Reset Data',
      cancelText: 'Cancel',
      type: 'danger',
      icon: '⚠️'
    });
    if (!confirmed) return;

    DB.reset();
    Toast.success('Data Reset', 'All data has been reset.');
    this.logout();
  },

  _showChangePasswordModal() {
    this.openModal('Change Password', `
      <div class="form-group">
        <label>Current Password</label>
        <input type="password" id="cp-current" class="form-input" placeholder="Enter current password" style="padding-left:16px">
      </div>
      <div class="form-group">
        <label>New Password</label>
        <input type="password" id="cp-new" class="form-input" placeholder="Enter new password" style="padding-left:16px">
      </div>
      <div class="form-group">
        <label>Confirm New Password</label>
        <input type="password" id="cp-confirm" class="form-input" placeholder="Confirm new password" style="padding-left:16px">
      </div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="App._changePassword()">Update Password</button>
    `);
  },

  _changePassword() {
    const current = document.getElementById('cp-current').value;
    const newPw = document.getElementById('cp-new').value;
    const confirm = document.getElementById('cp-confirm').value;

    if (current !== this.currentUser.password) {
      Toast.error('Incorrect Password', 'Current password is wrong.');
      return;
    }
    if (newPw.length < 6) {
      Toast.warning('Too Short', 'Password must be at least 6 characters.');
      return;
    }
    if (newPw !== confirm) {
      Toast.error('Mismatch', 'Passwords do not match.');
      return;
    }

    const collection = this.currentRole === 'doctor' ? 'doctors' : 'patients';
    DB.update(collection, this.currentUser.id, { password: newPw });
    this.currentUser.password = newPw;
    Toast.success('Password Changed', 'Your password has been updated.');
    this.closeModal();
  },


  /* ============================================
     PATIENT DASHBOARD (Patient Role)
     ============================================ */
  _renderPatientDashboard() {
    const patient = this.currentUser;
    const progress = patient.sessionCount > 0 ? Math.round((patient.completedSessions / patient.sessionCount) * 100) : 0;
    const remaining = patient.sessionCount - patient.completedSessions;
    const sessions = DB.query('sessions', s => s.patientId === patient.id);
    const nextSession = sessions.find(s => s.status === 'current');

    return `
      <div class="welcome-card">
        <h2>${Utils.greeting()}, ${patient.name.split(' ')[0]}! 👋</h2>
        <p>Here's an overview of your treatment progress. Keep up the great work!</p>
      </div>

      <div class="patient-stats-grid">
        <div class="patient-stat">
          ${createProgressRing(progress, 100, 7, '#5c7cfa')}
          <div class="stat-txt" style="margin-top:var(--space-2);">Overall Progress</div>
        </div>
        <div class="patient-stat">
          <div class="stat-icon">✅</div>
          <div class="stat-num">${patient.completedSessions}</div>
          <div class="stat-txt">Completed Sessions</div>
        </div>
        <div class="patient-stat">
          <div class="stat-icon">📅</div>
          <div class="stat-num">${remaining}</div>
          <div class="stat-txt">Remaining Sessions</div>
        </div>
        <div class="patient-stat">
          <div class="stat-icon">📋</div>
          <div class="stat-num">${nextSession ? 'Session ' + nextSession.sessionNumber : 'None'}</div>
          <div class="stat-txt">Next Session</div>
        </div>
        <div class="patient-stat">
          <div class="stat-icon">${patient.painLevel <= 3 ? '😊' : patient.painLevel <= 6 ? '😐' : '😣'}</div>
          <div class="stat-num">${patient.painLevel}/10</div>
          <div class="stat-txt">Pain Level</div>
        </div>
        <div class="patient-stat">
          <div class="stat-icon">📊</div>
          <div class="stat-num"><span class="status-badge ${patient.status}">${patient.status}</span></div>
          <div class="stat-txt">Treatment Status</div>
        </div>
      </div>

      ${nextSession ? `
        <div class="content-card" style="margin-top:var(--space-6);">
          <div class="card-header">
            <h3>📋 Next Session — Session ${nextSession.sessionNumber}</h3>
            <span style="font-size:var(--text-sm);color:var(--text-tertiary);">${Utils.formatDate(nextSession.date)}</span>
          </div>
          <div class="card-body">
            <div class="session-exercises">
              ${nextSession.exercises.map(ex => `
                <div class="exercise-row">
                  <span class="exercise-icon">🏋️</span>
                  <div class="exercise-details">
                    <div style="font-weight:600;">${Utils.escapeHtml(ex.title)}</div>
                    <div style="font-size:var(--text-xs);color:var(--text-tertiary);">${ex.instructions || ''}</div>
                  </div>
                  <span class="exercise-sets">${ex.sets}×${ex.reps} · ${ex.restTime}s rest</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      <div class="content-card" style="margin-top:var(--space-6);">
        <div class="card-header"><h3>📝 Doctor's Notes</h3></div>
        <div class="card-body">
          <p style="font-size:var(--text-sm);color:var(--text-secondary);">${Utils.escapeHtml(patient.notes || 'No notes yet.')}</p>
        </div>
      </div>
    `;
  },


  /* ============================================
     PATIENT SESSIONS VIEW
     ============================================ */
  _patientSessionMedia: {},       // Cache: { sessionId: { exerciseId: [media...] } }
  _patientExpandedExercise: null, // "sessionId__exerciseId" currently expanded

  _renderPatientSessions() {
    const sessions = DB.query('sessions', s => s.patientId === this.currentUser.id);

    // Load media for current sessions in the background
    sessions.filter(s => s.status !== 'locked').forEach(s => {
      if (!this._patientSessionMedia[s.id]) {
        this._loadSessionMedia(s.id);
      }
    });

    return `
      <div class="session-timeline">
        ${sessions.map(s => {
          const mediaMap = this._patientSessionMedia[s.id] || {};

          return `
          <div class="session-item ${s.status}">
            <div class="session-lock-overlay">🔒 Locked</div>
            <div class="session-header">
              <span class="session-number">Session ${s.sessionNumber}</span>
              <div>
                <span class="session-date">${Utils.formatDate(s.date)}</span>
                <span class="status-badge ${s.status}" style="margin-left:var(--space-2)">${s.status}</span>
              </div>
            </div>
            <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-3);">${s.duration}</p>

            <div class="session-exercises" style="display:flex;flex-direction:column;gap:var(--space-2);">
              ${s.exercises.map((ex, idx) => {
                const exKey = `${s.id}__${ex.exerciseId}`;
                const isExpanded = this._patientExpandedExercise === exKey;
                const exerciseMedia = mediaMap[ex.exerciseId] || [];
                const exerciseDb = DB.getById('exercises', ex.exerciseId);

                return `
                <!-- Exercise Card (Clickable) -->
                <div class="pex-card ${isExpanded ? 'expanded' : ''}" id="pex-${exKey.replace('__', '-')}">
                  <!-- Summary Row — always visible, clickable -->
                  <div class="pex-summary" onclick="App._togglePatientExercise('${s.id}', '${ex.exerciseId}')">
                    <div class="pex-left">
                      <span class="pex-check">${ex.completed ? '✅' : '⬜'}</span>
                      <div class="pex-thumb-icon">${exerciseDb?.thumbnail || '🏋️'}</div>
                      <div class="pex-title-group">
                        <div class="pex-title">${Utils.escapeHtml(ex.title)}</div>
                        <div class="pex-tags">
                          <span class="pex-tag">${ex.sets} sets</span>
                          <span class="pex-tag">${ex.reps} reps</span>
                          <span class="pex-tag">⏱ ${ex.duration || '10 min'}</span>
                          ${exerciseMedia.length > 0 ? `<span class="pex-tag pex-tag-media">📹 ${exerciseMedia.length} upload${exerciseMedia.length > 1 ? 's' : ''}</span>` : ''}
                        </div>
                      </div>
                    </div>
                    <div class="pex-chevron">${isExpanded ? '▲' : '▼'}</div>
                  </div>

                  ${isExpanded ? `
                  <!-- Expanded Detail Panel -->
                  <div class="pex-detail">
                    <!-- Workout Stats Grid -->
                    <div class="pex-stats-grid">
                      <div class="pex-stat">
                        <div class="pex-stat-value">${ex.sets}</div>
                        <div class="pex-stat-label">Sets</div>
                      </div>
                      <div class="pex-stat">
                        <div class="pex-stat-value">${ex.reps}</div>
                        <div class="pex-stat-label">Reps</div>
                      </div>
                      <div class="pex-stat">
                        <div class="pex-stat-value">${ex.restTime || 60}s</div>
                        <div class="pex-stat-label">Rest</div>
                      </div>
                      <div class="pex-stat">
                        <div class="pex-stat-value">${ex.duration || '10 min'}</div>
                        <div class="pex-stat-label">Duration</div>
                      </div>
                    </div>

                    ${ex.instructions ? `
                    <div class="pex-instructions">
                      <strong>Instructions:</strong> ${Utils.escapeHtml(ex.instructions)}
                    </div>` : ''}

                    <!-- Uploaded Media Gallery -->
                    ${exerciseMedia.length > 0 ? `
                    <div class="pex-media-section">
                      <div class="pex-media-header">
                        <span class="pex-media-title">📁 Your Uploads (${exerciseMedia.length})</span>
                      </div>
                      <div class="pex-media-grid">
                        ${exerciseMedia.map(m => `
                          <div class="pex-media-card" id="pex-media-${m.id}">
                            ${m.type === 'video' ? `
                              <div class="pex-media-thumb pex-media-video" onclick="App._playPatientMedia('${m.path}', '${m.type}')">
                                <span class="pex-play-icon">▶</span>
                                <span class="pex-media-type-badge">🎬 Video</span>
                              </div>
                            ` : `
                              <div class="pex-media-thumb" onclick="App._playPatientMedia('${m.path}', '${m.type}')" style="background-image:url('${m.path}');background-size:cover;background-position:center;">
                                <span class="pex-media-type-badge">📷 Photo</span>
                              </div>
                            `}
                            <div class="pex-media-info">
                              <div class="pex-media-name" title="${Utils.escapeHtml(m.filename)}">${Utils.escapeHtml(m.filename)}</div>
                              <div class="pex-media-meta">
                                <span>${Utils.formatDate(m.uploadedAt)}</span>
                                <span>${(m.size / (1024 * 1024)).toFixed(1)} MB</span>
                              </div>
                              ${m.note ? `<div class="pex-media-note">${Utils.escapeHtml(m.note)}</div>` : ''}
                            </div>
                            <button class="pex-media-delete" onclick="App._deletePatientMedia('${s.id}', '${m.id}', '${ex.exerciseId}')" title="Delete upload">🗑️</button>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                    ` : ''}

                    <!-- Upload Area (for current sessions only) -->
                    ${s.status === 'current' ? `
                    <div class="pex-upload-section">
                      <div class="pex-upload-header">
                        <span>📤 Upload Workout Video / Photo</span>
                      </div>

                      <!-- Upload dropzone -->
                      <div class="pex-upload-dropzone" id="pex-dropzone-${s.id}-${ex.exerciseId}"
                        onclick="document.getElementById('pex-file-${s.id}-${ex.exerciseId}').click()"
                        ondragover="event.preventDefault();this.classList.add('dragover')"
                        ondragleave="this.classList.remove('dragover')"
                        ondrop="event.preventDefault();this.classList.remove('dragover');App._handlePatientFileDrop(event, '${s.id}', '${ex.exerciseId}')">
                        <div class="pex-upload-icon">🎬</div>
                        <div class="pex-upload-text">Drop your workout video here or <span class="pex-upload-link">click to browse</span></div>
                        <div class="pex-upload-hint">MP4, MOV, WEBM, AVI, JPG, PNG — Max 500 MB</div>
                        <input type="file" id="pex-file-${s.id}-${ex.exerciseId}" accept="video/*,image/*" multiple style="display:none;" onchange="App._handlePatientFileSelect(event, '${s.id}', '${ex.exerciseId}')">
                      </div>

                      <!-- Optional Note -->
                      <div class="pex-upload-note-row" id="pex-note-row-${s.id}-${ex.exerciseId}" style="display:none;">
                        <input type="text" class="pex-upload-note-input" id="pex-note-${s.id}-${ex.exerciseId}" placeholder="Add a note about this workout (optional)…">
                      </div>

                      <!-- Upload Progress -->
                      <div class="pex-upload-progress" id="pex-progress-${s.id}-${ex.exerciseId}" style="display:none;">
                        <div class="pex-progress-info">
                          <span class="pex-progress-filename" id="pex-progress-name-${s.id}-${ex.exerciseId}"></span>
                          <span class="pex-progress-pct" id="pex-progress-pct-${s.id}-${ex.exerciseId}">0%</span>
                        </div>
                        <div class="pex-progress-track">
                          <div class="pex-progress-bar" id="pex-progress-bar-${s.id}-${ex.exerciseId}" style="width:0%"></div>
                        </div>
                      </div>
                    </div>
                    ` : `
                    <div style="font-size:var(--text-xs);color:var(--text-tertiary);padding:var(--space-3) 0;">
                      ${s.status === 'completed' ? '✅ Session completed — uploads are view-only.' : '🔒 Session locked — uploads available when unlocked.'}
                    </div>
                    `}
                  </div>
                  ` : ''}
                </div>`;
              }).join('')}
            </div>

            ${s.doctorRemarks ? `<div style="margin-top:var(--space-3);padding:var(--space-3);background:var(--bg-tertiary);border-radius:var(--radius-md);font-size:var(--text-sm);"><strong>Doctor:</strong> ${Utils.escapeHtml(s.doctorRemarks)}</div>` : ''}
            ${s.patientFeedback ? `<div style="margin-top:var(--space-2);padding:var(--space-3);background:var(--bg-tertiary);border-radius:var(--radius-md);font-size:var(--text-sm);"><strong>Your feedback:</strong> ${Utils.escapeHtml(s.patientFeedback)}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
    `;
  },

  /** Load media for a session from the server */
  async _loadSessionMedia(sessionId) {
    try {
      const data = await API.get(`/sessions/${sessionId}/media`);
      this._patientSessionMedia[sessionId] = data.grouped || {};
    } catch {
      this._patientSessionMedia[sessionId] = {};
    }
  },

  /** Toggle exercise expansion */
  _togglePatientExercise(sessionId, exerciseId) {
    const key = `${sessionId}__${exerciseId}`;
    if (this._patientExpandedExercise === key) {
      this._patientExpandedExercise = null;
    } else {
      this._patientExpandedExercise = key;
    }
    this._renderCurrentPage();
  },

  /** Handle file select from input */
  _handlePatientFileSelect(event, sessionId, exerciseId) {
    const files = event.target.files;
    if (files && files.length > 0) {
      for (const file of files) {
        this._uploadPatientMedia(sessionId, exerciseId, file);
      }
    }
  },

  /** Handle drag-and-drop */
  _handlePatientFileDrop(event, sessionId, exerciseId) {
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      for (const file of files) {
        this._uploadPatientMedia(sessionId, exerciseId, file);
      }
    }
  },

  /** Upload a single file for an exercise */
  async _uploadPatientMedia(sessionId, exerciseId, file) {
    const progressEl = document.getElementById(`pex-progress-${sessionId}-${exerciseId}`);
    const barEl = document.getElementById(`pex-progress-bar-${sessionId}-${exerciseId}`);
    const pctEl = document.getElementById(`pex-progress-pct-${sessionId}-${exerciseId}`);
    const nameEl = document.getElementById(`pex-progress-name-${sessionId}-${exerciseId}`);
    const noteRow = document.getElementById(`pex-note-row-${sessionId}-${exerciseId}`);
    const noteInput = document.getElementById(`pex-note-${sessionId}-${exerciseId}`);

    if (nameEl) nameEl.textContent = file.name;
    if (progressEl) progressEl.style.display = 'block';
    if (noteRow) noteRow.style.display = 'flex';

    Toast.info('Upload Started', `Uploading ${file.name}…`);

    // Build FormData
    const formData = new FormData();
    formData.append('media', file);
    formData.append('note', noteInput?.value || '');

    // Use XMLHttpRequest for progress tracking
    const xhr = new XMLHttpRequest();
    const url = `${API._baseUrl}/sessions/${sessionId}/exercises/${exerciseId}/upload`;

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        if (barEl) barEl.style.width = `${pct}%`;
        if (pctEl) pctEl.textContent = `${pct}%`;
      }
    });

    xhr.addEventListener('load', async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        Toast.success('Upload Complete', `${file.name} uploaded successfully! Your doctor can review it.`);
        // Reload media for this session & re-render
        await this._loadSessionMedia(sessionId);
        if (noteInput) noteInput.value = '';
        this._renderCurrentPage();
      } else {
        const err = JSON.parse(xhr.responseText || '{}');
        Toast.error('Upload Failed', err.error || 'Failed to upload file.');
        if (progressEl) progressEl.style.display = 'none';
      }
    });

    xhr.addEventListener('error', () => {
      Toast.error('Upload Error', 'Network error during upload.');
      if (progressEl) progressEl.style.display = 'none';
    });

    xhr.open('POST', url);
    if (API._token) {
      xhr.setRequestHeader('Authorization', `Bearer ${API._token}`);
    }
    xhr.send(formData);
  },

  /** Play media in a modal */
  _playPatientMedia(path, type) {
    if (type === 'video') {
      this.openModal('Workout Video', `
        <div style="text-align:center;">
          <video controls autoplay style="max-width:100%;max-height:70vh;border-radius:var(--radius-lg);background:#000;">
            <source src="${path}">
          </video>
        </div>
      `, `<button class="btn btn-primary" onclick="App.closeModal()">Close</button>`);
    } else {
      this.openModal('Workout Photo', `
        <div style="text-align:center;">
          <img src="${path}" style="max-width:100%;max-height:70vh;border-radius:var(--radius-lg);">
        </div>
      `, `<button class="btn btn-primary" onclick="App.closeModal()">Close</button>`);
    }
  },

  /** Delete a media upload */
  async _deletePatientMedia(sessionId, mediaId, exerciseId) {
    const confirmed = await this.confirm({
      title: 'Delete Upload?',
      message: 'This will permanently remove this uploaded file.',
      confirmText: 'Delete',
      icon: '🗑️',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await API.delete(`/sessions/${sessionId}/media/${mediaId}`);
      Toast.success('Deleted', 'File removed successfully.');
      await this._loadSessionMedia(sessionId);
      this._renderCurrentPage();
    } catch (err) {
      Toast.error('Error', err.message || 'Failed to delete file.');
    }
  },


  /* ============================================
     PATIENT EXERCISES
     ============================================ */
  _renderPatientExercises() {
    const sessions = DB.query('sessions', s => s.patientId === this.currentUser.id && s.status === 'current');
    const exercises = sessions.length > 0 ? sessions[0].exercises : [];

    if (exercises.length === 0) {
      return '<div class="empty-state"><div class="empty-icon">🏋️</div><h4>No exercises assigned</h4><p>Your doctor hasn\'t assigned exercises for your current session yet.</p></div>';
    }

    return `
      <h3 style="margin-bottom:var(--space-4);font-size:var(--text-lg);font-weight:700;">Current Session Exercises</h3>
      <div class="exercise-grid">
        ${exercises.map(ex => {
          const exercise = DB.getById('exercises', ex.exerciseId);
          return `
          <div class="exercise-card">
            <div class="exercise-thumb">
              <span>${exercise?.thumbnail || '🏋️'}</span>
              <div class="play-btn" onclick="App._showExerciseDetail('${ex.exerciseId}')">▶</div>
            </div>
            <div class="exercise-card-body">
              <h4>${Utils.escapeHtml(ex.title)}</h4>
              <p>${Utils.escapeHtml(ex.instructions || '')}</p>
              <div class="exercise-meta">
                <span class="exercise-tag">${ex.sets} sets × ${ex.reps} reps</span>
                <span class="exercise-tag">⏱ ${ex.duration}</span>
                <span class="exercise-tag">Rest: ${ex.restTime}s</span>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    `;
  },


  /* ============================================
     PATIENT PROGRESS
     ============================================ */
  _renderPatientProgress() {
    const patient = this.currentUser;
    const progress = patient.sessionCount > 0 ? Math.round((patient.completedSessions / patient.sessionCount) * 100) : 0;

    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:var(--space-5);margin-bottom:var(--space-8);">
        ${[
          { label: 'Pain Reduction', value: Math.min(100, 100 - patient.painLevel * 10), color: '#20c997' },
          { label: 'Mobility', value: Math.min(100, 50 + patient.completedSessions * 5), color: '#5c7cfa' },
          { label: 'Strength', value: Math.min(100, 30 + patient.completedSessions * 7), color: '#7950f2' },
          { label: 'Treatment', value: progress, color: '#ff922b' }
        ].map(item => `
          <div class="content-card" style="padding:var(--space-5);text-align:center;">
            ${createProgressRing(item.value, 100, 7, item.color)}
            <div style="font-size:var(--text-sm);font-weight:600;margin-top:var(--space-3);">${item.label}</div>
          </div>
        `).join('')}
      </div>

      <div class="charts-grid">
        <div class="chart-card">
          <h4>📉 My Pain Level Journey</h4>
          <div class="chart-canvas-wrapper"><canvas id="chart-patient-pain"></canvas></div>
        </div>
        <div class="chart-card">
          <h4>📊 Session Completion</h4>
          <div class="chart-canvas-wrapper"><canvas id="chart-patient-completion"></canvas></div>
        </div>
      </div>
    `;
  },


  /* ============================================
     FEEDBACK
     ============================================ */
  _renderFeedback() {
    const feedbackHistory = DB.query('feedback', f => f.patientId === this.currentUser.id);

    return `
      <div class="content-card" style="margin-bottom:var(--space-6);">
        <div class="card-header"><h3>Submit Feedback</h3></div>
        <div class="card-body">
          <div class="feedback-form">
            <div class="form-group">
              <label>Pain Level (1–10)</label>
              <div class="pain-scale" id="pain-scale">
                ${[1,2,3,4,5,6,7,8,9,10].map(n => {
                  const cls = n <= 3 ? 'low' : n <= 6 ? 'mid' : 'high';
                  return `<div class="pain-level ${cls}" data-level="${n}" onclick="App._selectPain(${n})">${n}</div>`;
                }).join('')}
              </div>
            </div>

            <div class="form-group">
              <label>Difficulty</label>
              <select id="fb-difficulty" class="form-select">
                <option value="Easy">Easy</option>
                <option value="Moderate" selected>Moderate</option>
                <option value="Challenging">Challenging</option>
                <option value="Very Hard">Very Hard</option>
              </select>
            </div>

            <div class="form-group">
              <label>Confidence Level (1–10)</label>
              <input type="range" id="fb-confidence" min="1" max="10" value="7" style="width:100%;">
            </div>

            <div class="form-group">
              <label>Comments</label>
              <textarea id="fb-comments" class="textarea-field" placeholder="How did you feel? Any concerns?" rows="3"></textarea>
            </div>

            <div class="form-group">
              <label>Upload Photo/Video (Optional)</label>
              <div class="upload-area" style="padding:var(--space-4);"
                onclick="Toast.info('Upload','File picker would open here.')"
                ondragover="event.preventDefault();this.classList.add('dragover')"
                ondragleave="this.classList.remove('dragover')">
                <p style="font-size:var(--text-sm);">📎 Drop files here or click to browse</p>
              </div>
            </div>

            <label class="checkbox-wrapper">
              <input type="checkbox" id="fb-completed">
              <span>I completed all exercises for this session</span>
            </label>

            <button class="btn btn-primary" onclick="App._submitFeedback()">Submit Feedback</button>
          </div>
        </div>
      </div>

      ${feedbackHistory.length > 0 ? `
        <div class="content-card">
          <div class="card-header"><h3>Previous Feedback</h3></div>
          <div class="card-body">
            ${feedbackHistory.reverse().map(fb => `
              <div style="padding:var(--space-4);border-bottom:1px solid var(--border-light);">
                <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2);">
                  <span style="font-weight:600;font-size:var(--text-sm);">Pain: ${fb.painLevel}/10 · ${fb.difficulty}</span>
                  <span style="font-size:var(--text-xs);color:var(--text-tertiary);">${Utils.formatDate(fb.date)}</span>
                </div>
                <p style="font-size:var(--text-sm);color:var(--text-secondary);">${Utils.escapeHtml(fb.comments)}</p>
                ${fb.doctorReply ? `<div style="margin-top:var(--space-2);padding:var(--space-3);background:var(--bg-tertiary);border-radius:var(--radius-md);font-size:var(--text-sm);"><strong>Dr. Reply:</strong> ${Utils.escapeHtml(fb.doctorReply)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
  },

  _selectedPainLevel: 5,

  _selectPain(level) {
    this._selectedPainLevel = level;
    document.querySelectorAll('.pain-level').forEach(el => {
      el.classList.toggle('selected', parseInt(el.dataset.level) === level);
    });
  },

  async _submitFeedback() {
    const comments = document.getElementById('fb-comments')?.value || '';
    const difficulty = document.getElementById('fb-difficulty')?.value || 'Moderate';
    const confidence = document.getElementById('fb-confidence')?.value || 7;
    const completed = document.getElementById('fb-completed')?.checked || false;

    const sessions = DB.query('sessions', s => s.patientId === this.currentUser.id && s.status === 'current');
    const currentSession = sessions[0];

    try {
      await DB.add('feedback', {
        patientId: this.currentUser.id,
        sessionId: currentSession?.id || '',
        painLevel: this._selectedPainLevel,
        comments,
        difficulty,
        confidence: parseInt(confidence),
        completed,
        doctorReply: '',
        date: new Date().toISOString().split('T')[0]
      });

      Toast.success('Feedback Submitted', 'Thank you! Your doctor will review your feedback.');
      await DB.init();
      this._renderCurrentPage();
    } catch (err) {
      Toast.error('Error', err.message || 'Failed to submit feedback');
    }
  },


  /* ============================================
     CHART INITIALIZATION
     ============================================ */
  _initCharts() {
    // Doctor dashboard charts
    if (document.getElementById('chart-weekly-sessions')) {
      ChartEngine.lineChart('chart-weekly-sessions',
        ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        [{ data: [4, 6, 5, 7, 8, 3, 2], color: 'rgb(92, 124, 250)', fill: true }]
      );
    }

    if (document.getElementById('chart-patient-status')) {
      const patients = DB.getAll('patients');
      ChartEngine.doughnutChart('chart-patient-status',
        [
          patients.filter(p => p.status === 'active').length,
          patients.filter(p => p.status === 'completed').length,
          patients.filter(p => p.status === 'pending').length,
        ],
        ['#5c7cfa', '#20c997', '#ff922b'],
        ['Active', 'Completed', 'Pending']
      );
    }

    if (document.getElementById('chart-pain-trends')) {
      ChartEngine.lineChart('chart-pain-trends',
        ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
        [
          { data: [7, 6, 5, 4, 3, 3], color: 'rgb(250, 82, 82)', fill: true },
          { data: [8, 7, 6, 5, 4, 3], color: 'rgb(255, 146, 43)', fill: false },
        ]
      );
    }

    if (document.getElementById('chart-revenue')) {
      ChartEngine.barChart('chart-revenue',
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        [8200, 9400, 10100, 9800, 11500, 12400],
        ['#5c7cfa', '#20c997', '#7950f2', '#ff922b', '#0ca678', '#fa5252']
      );
    }

    // Progress tracker charts
    if (document.getElementById('chart-progress-pain')) {
      ChartEngine.lineChart('chart-progress-pain',
        ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'],
        [{ data: [8, 7, 6, 5, 4, 4, 3, 3], color: 'rgb(32, 201, 151)', fill: true }]
      );
    }

    if (document.getElementById('chart-progress-strength')) {
      ChartEngine.lineChart('chart-progress-strength',
        ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'],
        [
          { data: [30, 38, 45, 52, 58, 65, 70, 78], color: 'rgb(92, 124, 250)', fill: true },
          { data: [25, 32, 40, 48, 55, 60, 68, 75], color: 'rgb(121, 80, 242)', fill: false },
        ]
      );
    }

    // Patient progress charts
    if (document.getElementById('chart-patient-pain')) {
      const patient = this.currentUser;
      const painData = [];
      for (let i = 0; i < patient.completedSessions; i++) {
        painData.push(Math.max(1, patient.painLevel + (patient.completedSessions - i) - Math.floor(Math.random() * 2)));
      }
      painData.reverse();

      ChartEngine.lineChart('chart-patient-pain',
        painData.map((_, i) => `S${i + 1}`),
        [{ data: painData.length > 0 ? painData : [5], color: 'rgb(250, 82, 82)', fill: true }]
      );
    }

    if (document.getElementById('chart-patient-completion')) {
      const patient = this.currentUser;
      ChartEngine.doughnutChart('chart-patient-completion',
        [patient.completedSessions, patient.sessionCount - patient.completedSessions],
        ['#20c997', '#e9ecef'],
        ['Done', 'Remaining']
      );
    }
  }
};


/* ============================================
   BOOT
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Button ripple effect
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn');
  if (btn) {
    const rect = btn.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    btn.style.setProperty('--ripple-x', x + '%');
    btn.style.setProperty('--ripple-y', y + '%');
  }
});

// Close search on overlay click
document.getElementById('search-overlay')?.addEventListener('click', e => {
  if (e.target === document.getElementById('search-overlay')) {
    App.closeSearch();
  }
});

// Close generic modal on overlay click
document.getElementById('generic-modal')?.addEventListener('click', e => {
  if (e.target === document.getElementById('generic-modal')) {
    App.closeModal();
  }
});

// Window resize: redraw charts
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (App.currentUser) App._initCharts();
  }, 300);
});
