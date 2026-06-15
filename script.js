/* ============================================
   PHYSIOFLOW — Main Application Logic
   Vanilla JavaScript (ES6+)
   All data persisted via LocalStorage
   ============================================ */

'use strict';

/* ============================================
   1. DEMO / SEED DATA
   ============================================ */
const DEMO_DATA = {
  doctors: [
    {
      id: 'doc-1',
      username: 'dr.smith',
      password: 'password',
      name: 'Dr. Sarah Smith',
      email: 'sarah.smith@physioflow.com',
      phone: '+1 (555) 234-5678',
      specialty: 'Sports Rehabilitation',
      avatar: 'SS',
      clinicName: 'PhysioFlow Wellness Clinic',
      clinicLogo: '',
      notifications: { newSession: true, feedback: true, videoUpload: true, treatmentComplete: true }
    }
  ],
  patients: [
    { id: 'pat-1', username: 'john.doe', password: 'password', name: 'John Doe', age: 34, gender: 'Male', phone: '+1 (555) 111-0001', email: 'john.doe@email.com', photo: '', avatar: 'JD', avatarColor: '#5c7cfa', medicalHistory: 'ACL reconstruction 2024', diagnosis: 'Post-operative ACL rehabilitation', treatmentPlan: 'Progressive strength and mobility program — 12 sessions over 8 weeks', sessionCount: 12, completedSessions: 8, startDate: '2026-04-01', endDate: '2026-06-30', status: 'active', painLevel: 3, doctorId: 'doc-1', notes: 'Progressing well. Cleared for light jogging.' },
    { id: 'pat-2', username: 'jane.wilson', password: 'password', name: 'Jane Wilson', age: 28, gender: 'Female', phone: '+1 (555) 111-0002', email: 'jane.wilson@email.com', photo: '', avatar: 'JW', avatarColor: '#20c997', medicalHistory: 'Chronic lower back pain', diagnosis: 'Lumbar disc herniation L4-L5', treatmentPlan: 'Core stabilization and posture correction — 10 sessions', sessionCount: 10, completedSessions: 10, startDate: '2026-02-15', endDate: '2026-05-15', status: 'completed', painLevel: 2, doctorId: 'doc-1', notes: 'Treatment completed successfully.' },
    { id: 'pat-3', username: 'mike.chen', password: 'password', name: 'Michael Chen', age: 45, gender: 'Male', phone: '+1 (555) 111-0003', email: 'mike.chen@email.com', photo: '', avatar: 'MC', avatarColor: '#ff922b', medicalHistory: 'Tennis elbow, right arm', diagnosis: 'Lateral epicondylitis', treatmentPlan: 'Eccentric exercises and manual therapy — 8 sessions', sessionCount: 8, completedSessions: 5, startDate: '2026-05-01', endDate: '2026-07-15', status: 'active', painLevel: 5, doctorId: 'doc-1', notes: 'Moderate improvement. Adjusting exercise intensity.' },
    { id: 'pat-4', username: 'emma.brown', password: 'password', name: 'Emma Brown', age: 62, gender: 'Female', phone: '+1 (555) 111-0004', email: 'emma.brown@email.com', photo: '', avatar: 'EB', avatarColor: '#7950f2', medicalHistory: 'Total knee replacement — right knee', diagnosis: 'Post TKR rehabilitation', treatmentPlan: 'Range of motion and strength training — 15 sessions', sessionCount: 15, completedSessions: 3, startDate: '2026-05-20', endDate: '2026-09-01', status: 'active', painLevel: 6, doctorId: 'doc-1', notes: 'Early post-op phase. Focus on extension and flexion.' },
    { id: 'pat-5', username: 'alex.kumar', password: 'password', name: 'Alex Kumar', age: 22, gender: 'Male', phone: '+1 (555) 111-0005', email: 'alex.kumar@email.com', photo: '', avatar: 'AK', avatarColor: '#0ca678', medicalHistory: 'Shoulder dislocation — sports injury', diagnosis: 'Anterior shoulder instability', treatmentPlan: 'Rotator cuff strengthening and proprioception — 10 sessions', sessionCount: 10, completedSessions: 7, startDate: '2026-04-10', endDate: '2026-07-10', status: 'active', painLevel: 2, doctorId: 'doc-1', notes: 'Near completion. Excellent compliance.' },
    { id: 'pat-6', username: 'lisa.park', password: 'password', name: 'Lisa Park', age: 38, gender: 'Female', phone: '+1 (555) 111-0006', email: 'lisa.park@email.com', photo: '', avatar: 'LP', avatarColor: '#fa5252', medicalHistory: 'Plantar fasciitis — bilateral', diagnosis: 'Chronic plantar fasciitis', treatmentPlan: 'Stretching, orthotics, and shockwave therapy — 6 sessions', sessionCount: 6, completedSessions: 6, startDate: '2026-03-01', endDate: '2026-05-01', status: 'completed', painLevel: 1, doctorId: 'doc-1', notes: 'Discharged. Symptom-free.' },
    { id: 'pat-7', username: 'tom.martin', password: 'password', name: 'Thomas Martin', age: 55, gender: 'Male', phone: '+1 (555) 111-0007', email: 'tom.martin@email.com', photo: '', avatar: 'TM', avatarColor: '#e8590c', medicalHistory: 'Cervical spondylosis', diagnosis: 'Degenerative disc disease C5-C6', treatmentPlan: 'Neck strengthening and postural education — 10 sessions', sessionCount: 10, completedSessions: 2, startDate: '2026-06-01', endDate: '2026-08-30', status: 'active', painLevel: 7, doctorId: 'doc-1', notes: 'High pain levels. Gentle approach required.' },
    { id: 'pat-8', username: 'sophia.lee', password: 'password', name: 'Sophia Lee', age: 30, gender: 'Female', phone: '+1 (555) 111-0008', email: 'sophia.lee@email.com', photo: '', avatar: 'SL', avatarColor: '#5c7cfa', medicalHistory: 'Runner\'s knee', diagnosis: 'Patellofemoral pain syndrome', treatmentPlan: 'VMO strengthening and biomechanical assessment — 8 sessions', sessionCount: 8, completedSessions: 0, startDate: '2026-06-15', endDate: '2026-08-15', status: 'pending', painLevel: 4, doctorId: 'doc-1', notes: 'Initial assessment scheduled.' },
    { id: 'pat-9', username: 'david.jones', password: 'password', name: 'David Jones', age: 48, gender: 'Male', phone: '+1 (555) 111-0009', email: 'david.jones@email.com', photo: '', avatar: 'DJ', avatarColor: '#20c997', medicalHistory: 'Frozen shoulder — left', diagnosis: 'Adhesive capsulitis', treatmentPlan: 'Joint mobilization and stretching — 12 sessions', sessionCount: 12, completedSessions: 9, startDate: '2026-03-15', endDate: '2026-07-15', status: 'active', painLevel: 4, doctorId: 'doc-1', notes: 'Significant ROM improvement noted.' },
    { id: 'pat-10', username: 'amy.taylor', password: 'password', name: 'Amy Taylor', age: 26, gender: 'Female', phone: '+1 (555) 111-0010', email: 'amy.taylor@email.com', photo: '', avatar: 'AT', avatarColor: '#ff922b', medicalHistory: 'Ankle sprain — grade II', diagnosis: 'Lateral ankle ligament injury', treatmentPlan: 'RICE protocol then progressive strengthening — 6 sessions', sessionCount: 6, completedSessions: 4, startDate: '2026-05-10', endDate: '2026-07-01', status: 'active', painLevel: 3, doctorId: 'doc-1', notes: 'Weight-bearing now tolerated. Good progress.' }
  ],
  exercises: [
    { id: 'ex-1', title: 'Neck Flexion Stretch', category: 'Neck', description: 'Gently tilt head forward bringing chin to chest. Hold 15–30 seconds.', difficulty: 'Easy', duration: '5 min', thumbnail: '🧘', video: '', pdf: '' },
    { id: 'ex-2', title: 'Cervical Rotation', category: 'Neck', description: 'Slowly rotate head side to side, maintaining chin level. Repeat 10 times each direction.', difficulty: 'Easy', duration: '5 min', thumbnail: '🔄', video: '', pdf: '' },
    { id: 'ex-3', title: 'Shoulder Pendulum Swing', category: 'Shoulder', description: 'Lean forward and let the arm swing in small circles. Gradually increase circle size.', difficulty: 'Easy', duration: '5 min', thumbnail: '🔘', video: '', pdf: '' },
    { id: 'ex-4', title: 'External Rotation with Band', category: 'Shoulder', description: 'Secure resistance band at elbow height. Rotate forearm outward keeping elbow at side.', difficulty: 'Medium', duration: '10 min', thumbnail: '💪', video: '', pdf: '' },
    { id: 'ex-5', title: 'Cat-Cow Stretch', category: 'Back', description: 'On hands and knees, alternate between arching and rounding the spine. 10 repetitions.', difficulty: 'Easy', duration: '5 min', thumbnail: '🐱', video: '', pdf: '' },
    { id: 'ex-6', title: 'Bird Dog Exercise', category: 'Back', description: 'From hands and knees, extend opposite arm and leg. Hold 5 seconds. 10 reps each side.', difficulty: 'Medium', duration: '10 min', thumbnail: '🐕', video: '', pdf: '' },
    { id: 'ex-7', title: 'Dead Bug', category: 'Back', description: 'Lying on back with arms extended, slowly lower opposite arm and leg. Core engaged throughout.', difficulty: 'Medium', duration: '8 min', thumbnail: '🪲', video: '', pdf: '' },
    { id: 'ex-8', title: 'Straight Leg Raise', category: 'Knee', description: 'Lying down, tighten thigh muscles and lift leg 6 inches. Hold 5 seconds. 3 sets of 10.', difficulty: 'Easy', duration: '8 min', thumbnail: '🦵', video: '', pdf: '' },
    { id: 'ex-9', title: 'Wall Sit', category: 'Knee', description: 'Slide back down wall until knees at 90°. Hold 20–60 seconds. Repeat 5 times.', difficulty: 'Medium', duration: '10 min', thumbnail: '🧱', video: '', pdf: '' },
    { id: 'ex-10', title: 'Terminal Knee Extension', category: 'Knee', description: 'With band behind knee, push knee straight against resistance. 3 sets of 12.', difficulty: 'Medium', duration: '10 min', thumbnail: '🔗', video: '', pdf: '' },
    { id: 'ex-11', title: 'Hip Bridge', category: 'Hip', description: 'Lying on back with knees bent, lift hips to create straight line from shoulders to knees.', difficulty: 'Easy', duration: '8 min', thumbnail: '🌉', video: '', pdf: '' },
    { id: 'ex-12', title: 'Clamshell Exercise', category: 'Hip', description: 'Lying on side with knees bent, open top knee while keeping feet together. 3 sets of 15.', difficulty: 'Easy', duration: '8 min', thumbnail: '🐚', video: '', pdf: '' },
    { id: 'ex-13', title: 'Ankle Alphabet', category: 'Ankle', description: 'Trace the alphabet in the air with your foot. Repeat 3 times with each foot.', difficulty: 'Easy', duration: '5 min', thumbnail: '🔤', video: '', pdf: '' },
    { id: 'ex-14', title: 'Calf Raise', category: 'Ankle', description: 'Stand on edge of step, rise up on toes then lower heels below step level. 3 sets of 15.', difficulty: 'Medium', duration: '8 min', thumbnail: '⬆️', video: '', pdf: '' },
    { id: 'ex-15', title: 'Single-Leg Balance', category: 'Ankle', description: 'Stand on one leg for 30 seconds. Progress to eyes closed. 5 reps each leg.', difficulty: 'Easy', duration: '5 min', thumbnail: '⚖️', video: '', pdf: '' },
    { id: 'ex-16', title: 'Plank Hold', category: 'Sports Rehab', description: 'Maintain push-up position with forearms on ground. Hold 30–60 seconds. 3 sets.', difficulty: 'Medium', duration: '8 min', thumbnail: '🏋️', video: '', pdf: '' },
    { id: 'ex-17', title: 'Lateral Band Walk', category: 'Sports Rehab', description: 'Place band around ankles and walk sideways maintaining tension. 3 sets of 20 steps.', difficulty: 'Medium', duration: '10 min', thumbnail: '🏃', video: '', pdf: '' },
    { id: 'ex-18', title: 'Box Jump', category: 'Sports Rehab', description: 'Jump onto a stable box/platform. Step down. Progress height gradually. 3 sets of 8.', difficulty: 'Hard', duration: '12 min', thumbnail: '📦', video: '', pdf: '' },
    { id: 'ex-19', title: 'Resistance Band Row', category: 'Back', description: 'Secure band in front of you. Pull elbows back squeezing shoulder blades. 3 sets of 12.', difficulty: 'Medium', duration: '10 min', thumbnail: '🚣', video: '', pdf: '' },
    { id: 'ex-20', title: 'Agility Ladder Drill', category: 'Sports Rehab', description: 'Perform quick feet drills through agility ladder. Various patterns. 5 min continuous.', difficulty: 'Hard', duration: '10 min', thumbnail: '⚡', video: '', pdf: '' }
  ],
  sessions: [],
  feedback: [],
  calendarEvents: []
};

/* Generate sessions for demo patients */
function generateDemoSessions() {
  const sessions = [];
  const exercisePool = DEMO_DATA.exercises;

  DEMO_DATA.patients.forEach(patient => {
    for (let i = 1; i <= patient.sessionCount; i++) {
      const date = new Date(patient.startDate);
      date.setDate(date.getDate() + (i - 1) * 4);
      const isCompleted = i <= patient.completedSessions;
      const isCurrent = i === patient.completedSessions + 1;

      // Pick 3-4 random exercises
      const shuffled = [...exercisePool].sort(() => 0.5 - Math.random());
      const sessionExercises = shuffled.slice(0, 3 + Math.floor(Math.random() * 2)).map(ex => ({
        exerciseId: ex.id,
        title: ex.title,
        sets: Math.floor(Math.random() * 3) + 2,
        reps: (Math.floor(Math.random() * 4) + 2) * 5,
        restTime: [30, 45, 60, 90][Math.floor(Math.random() * 4)],
        duration: ex.duration,
        completed: isCompleted,
        instructions: ex.description
      }));

      sessions.push({
        id: `sess-${patient.id}-${i}`,
        patientId: patient.id,
        sessionNumber: i,
        date: date.toISOString().split('T')[0],
        status: isCompleted ? 'completed' : isCurrent ? 'current' : 'locked',
        exercises: sessionExercises,
        doctorRemarks: isCompleted ? 'Good progress. Continue as planned.' : '',
        patientFeedback: isCompleted ? 'Feeling better after this session.' : '',
        notes: isCompleted ? `Session ${i} completed successfully.` : `Session ${i} scheduled.`,
        duration: `${30 + Math.floor(Math.random() * 30)} min`
      });
    }
  });

  return sessions;
}

/* Generate calendar events */
function generateCalendarEvents() {
  const events = [];
  const statuses = ['completed', 'upcoming', 'cancelled', 'missed'];
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();

  for (let d = 1; d <= 28; d += 2) {
    if (Math.random() > 0.4) {
      events.push({
        date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        status: statuses[Math.floor(Math.random() * 4)],
        patientName: DEMO_DATA.patients[Math.floor(Math.random() * DEMO_DATA.patients.length)].name,
        time: `${9 + Math.floor(Math.random() * 8)}:${Math.random() > 0.5 ? '00' : '30'}`
      });
    }
  }

  // Ensure today has events
  const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  events.push({ date: todayStr, status: 'upcoming', patientName: 'John Doe', time: '10:00' });
  events.push({ date: todayStr, status: 'completed', patientName: 'Michael Chen', time: '09:00' });

  return events;
}

/* Generate feedback entries */
function generateDemoFeedback() {
  const fb = [];
  DEMO_DATA.patients.filter(p => p.completedSessions > 0).forEach(patient => {
    for (let i = 1; i <= Math.min(patient.completedSessions, 3); i++) {
      fb.push({
        id: `fb-${patient.id}-${i}`,
        patientId: patient.id,
        sessionId: `sess-${patient.id}-${i}`,
        painLevel: Math.max(1, patient.painLevel - i + 1),
        comments: 'Exercise was manageable. Felt good afterward.',
        difficulty: ['Easy', 'Moderate', 'Challenging'][Math.floor(Math.random() * 3)],
        confidence: Math.floor(Math.random() * 5) + 6,
        completed: true,
        doctorReply: i === 1 ? 'Great progress! Keep up the good work.' : '',
        date: new Date(new Date(patient.startDate).getTime() + (i - 1) * 4 * 86400000).toISOString().split('T')[0]
      });
    }
  });
  return fb;
}


/* ============================================
   2. DATA LAYER (LocalStorage)
   ============================================ */
const DB = {
  _key: 'physioflow_data',

  init() {
    if (!localStorage.getItem(this._key)) {
      DEMO_DATA.sessions = generateDemoSessions();
      DEMO_DATA.calendarEvents = generateCalendarEvents();
      DEMO_DATA.feedback = generateDemoFeedback();
      localStorage.setItem(this._key, JSON.stringify(DEMO_DATA));
    }
  },

  _getData() {
    return JSON.parse(localStorage.getItem(this._key) || '{}');
  },

  _save(data) {
    localStorage.setItem(this._key, JSON.stringify(data));
  },

  getAll(collection) {
    return this._getData()[collection] || [];
  },

  getById(collection, id) {
    return this.getAll(collection).find(item => item.id === id);
  },

  add(collection, item) {
    const data = this._getData();
    if (!data[collection]) data[collection] = [];
    data[collection].push(item);
    this._save(data);
    return item;
  },

  update(collection, id, updates) {
    const data = this._getData();
    const idx = (data[collection] || []).findIndex(item => item.id === id);
    if (idx !== -1) {
      data[collection][idx] = { ...data[collection][idx], ...updates };
      this._save(data);
      return data[collection][idx];
    }
    return null;
  },

  remove(collection, id) {
    const data = this._getData();
    data[collection] = (data[collection] || []).filter(item => item.id !== id);
    this._save(data);
  },

  query(collection, filterFn) {
    return this.getAll(collection).filter(filterFn);
  },

  reset() {
    localStorage.removeItem(this._key);
    this.init();
  }
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
  init() {
    DB.init();
    Toast.init();
    this._bindKeyboard();
    this._applyTheme();

    // Check remembered session
    const remembered = localStorage.getItem('physioflow_session');
    if (remembered) {
      try {
        const session = JSON.parse(remembered);
        this.currentUser = session.user;
        this.currentRole = session.role;
        this._enterApp();
      } catch { /* ignore */ }
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

  /* ---- LOGIN ---- */
  switchLoginTab(tab) {
    this.loginTab = tab;
    document.querySelectorAll('.login-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
      t.setAttribute('aria-selected', t.dataset.tab === tab);
    });
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

  handleLogin(e) {
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

    setTimeout(() => {
      // Authenticate
      let user = null;
      let role = null;

      if (this.loginTab === 'doctor') {
        user = DB.getAll('doctors').find(d => d.username === username && d.password === password);
        role = 'doctor';
      } else {
        user = DB.getAll('patients').find(p => p.username === username && p.password === password);
        role = 'patient';
      }

      if (!user) {
        Toast.error('Login Failed', 'Invalid username or password');
        document.getElementById('login-btn-text').textContent = 'Sign In';
        document.getElementById('login-spinner').classList.add('hidden');
        return;
      }

      // Check locked/deactivated
      if (role === 'patient' && user.status === 'locked') {
        Toast.error('Account Locked', 'Your account has been locked after treatment completion.');
        document.getElementById('login-btn-text').textContent = 'Sign In';
        document.getElementById('login-spinner').classList.add('hidden');
        return;
      }
      if (role === 'patient' && user.status === 'deactivated') {
        Toast.error('Account Deactivated', 'Your account has been deactivated. Contact your doctor.');
        document.getElementById('login-btn-text').textContent = 'Sign In';
        document.getElementById('login-spinner').classList.add('hidden');
        return;
      }

      this.currentUser = user;
      this.currentRole = role;

      // Remember me
      if (document.getElementById('remember-me').checked) {
        localStorage.setItem('physioflow_session', JSON.stringify({ user, role }));
      }

      Toast.success('Welcome!', `Signed in as ${user.name}`);
      this._enterApp();
    }, 800);
  },

  logout() {
    this.currentUser = null;
    this.currentRole = null;
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


  /* ============================================
     DOCTOR DASHBOARD
     ============================================ */
  _renderDoctorDashboard() {
    const patients = DB.getAll('patients');
    const sessions = DB.getAll('sessions');
    const active = patients.filter(p => p.status === 'active').length;
    const todaySessions = sessions.filter(s => s.date === new Date().toISOString().split('T')[0]).length;
    const completed = patients.filter(p => p.status === 'completed').length;
    const pending = patients.filter(p => p.status === 'pending').length;

    return `
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card blue">
          <div class="stat-card-header">
            <div class="stat-card-icon">👥</div>
            <span class="stat-trend up">↑ 12%</span>
          </div>
          <div class="stat-value">${active}</div>
          <div class="stat-label">Active Patients</div>
        </div>
        <div class="stat-card green">
          <div class="stat-card-header">
            <div class="stat-card-icon">📋</div>
            <span class="stat-trend up">↑ 5%</span>
          </div>
          <div class="stat-value">${todaySessions || 4}</div>
          <div class="stat-label">Today's Sessions</div>
        </div>
        <div class="stat-card purple">
          <div class="stat-card-header">
            <div class="stat-card-icon">✅</div>
          </div>
          <div class="stat-value">${completed}</div>
          <div class="stat-label">Completed Treatments</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-card-header">
            <div class="stat-card-icon">⏳</div>
          </div>
          <div class="stat-value">${pending}</div>
          <div class="stat-label">Pending Reviews</div>
        </div>
        <div class="stat-card teal">
          <div class="stat-card-header">
            <div class="stat-card-icon">📅</div>
          </div>
          <div class="stat-value">8</div>
          <div class="stat-label">Upcoming This Week</div>
        </div>
        <div class="stat-card red">
          <div class="stat-card-header">
            <div class="stat-card-icon">💰</div>
            <span class="stat-trend up">↑ 18%</span>
          </div>
          <div class="stat-value">$12.4k</div>
          <div class="stat-label">Revenue (Monthly)</div>
        </div>
      </div>

      <!-- Charts -->
      <div class="charts-grid">
        <div class="chart-card">
          <h4>📈 Weekly Sessions</h4>
          <div class="chart-canvas-wrapper"><canvas id="chart-weekly-sessions"></canvas></div>
        </div>
        <div class="chart-card">
          <h4>🎯 Patient Status</h4>
          <div class="chart-canvas-wrapper"><canvas id="chart-patient-status"></canvas></div>
        </div>
        <div class="chart-card">
          <h4>📊 Pain Level Trends</h4>
          <div class="chart-canvas-wrapper"><canvas id="chart-pain-trends"></canvas></div>
        </div>
        <div class="chart-card">
          <h4>📉 Monthly Revenue</h4>
          <div class="chart-canvas-wrapper"><canvas id="chart-revenue"></canvas></div>
        </div>
      </div>

      <!-- Recent Patients -->
      <div class="content-card">
        <div class="card-header">
          <h3>Recent Patients</h3>
          <button class="btn btn-primary btn-sm" onclick="App.navigate('patients')">View All</button>
        </div>
        <div class="card-body no-pad">
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Diagnosis</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Next Session</th>
                </tr>
              </thead>
              <tbody>
                ${patients.slice(0, 5).map(p => {
                  const progress = p.sessionCount > 0 ? Math.round((p.completedSessions / p.sessionCount) * 100) : 0;
                  return `
                  <tr style="cursor:pointer" onclick="App.selectedPatientId='${p.id}';App.navigate('patient-profile')">
                    <td>
                      <div class="patient-cell">
                        <div class="patient-avatar" style="background:${p.avatarColor}">${p.avatar}</div>
                        <div>
                          <div class="patient-name">${Utils.escapeHtml(p.name)}</div>
                          <div class="patient-email">${Utils.escapeHtml(p.email)}</div>
                        </div>
                      </div>
                    </td>
                    <td>${Utils.escapeHtml(p.diagnosis)}</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:8px;">
                        <div class="progress-bar-track" style="width:80px;">
                          <div class="progress-bar-fill" style="width:${progress}%"></div>
                        </div>
                        <span style="font-size:var(--text-xs);font-weight:600;">${progress}%</span>
                      </div>
                    </td>
                    <td><span class="status-badge ${p.status}">${p.status}</span></td>
                    <td>${Utils.formatDate(p.startDate)}</td>
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
      </div>
    `;
  },

  _showAddPatientModal() {
    this.openModal('Add New Patient', this._getPatientFormHtml(), `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="App._saveNewPatient()">Add Patient</button>
    `);
  },

  _saveNewPatient() {
    const name = document.getElementById('pf-name').value.trim();
    const diagnosis = document.getElementById('pf-diagnosis').value.trim();
    if (!name || !diagnosis) {
      Toast.warning('Required Fields', 'Please fill in name and diagnosis.');
      return;
    }

    const colors = ['#5c7cfa', '#20c997', '#ff922b', '#7950f2', '#fa5252', '#0ca678', '#e8590c'];
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const patient = {
      id: 'pat-' + Utils.uid(),
      username: Utils.usernameFromName(name),
      password: Utils.randomPassword(8),
      name,
      age: parseInt(document.getElementById('pf-age').value) || 30,
      gender: document.getElementById('pf-gender').value,
      phone: document.getElementById('pf-phone').value,
      email: document.getElementById('pf-email').value,
      photo: '',
      avatar: initials,
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
      medicalHistory: document.getElementById('pf-history').value,
      diagnosis,
      treatmentPlan: document.getElementById('pf-plan').value,
      sessionCount: parseInt(document.getElementById('pf-sessions').value) || 8,
      completedSessions: 0,
      startDate: document.getElementById('pf-start').value,
      endDate: document.getElementById('pf-end').value,
      status: document.getElementById('pf-status').value,
      painLevel: 5,
      doctorId: this.currentUser.id,
      notes: ''
    };

    DB.add('patients', patient);

    // Generate sessions for the new patient
    const exercisePool = DB.getAll('exercises');
    for (let i = 1; i <= patient.sessionCount; i++) {
      const date = new Date(patient.startDate);
      date.setDate(date.getDate() + (i - 1) * 4);
      const shuffled = [...exercisePool].sort(() => 0.5 - Math.random());
      const sessionExercises = shuffled.slice(0, 3).map(ex => ({
        exerciseId: ex.id, title: ex.title,
        sets: 3, reps: 10, restTime: 60, duration: ex.duration,
        completed: false, instructions: ex.description
      }));

      DB.add('sessions', {
        id: `sess-${patient.id}-${i}`,
        patientId: patient.id,
        sessionNumber: i,
        date: date.toISOString().split('T')[0],
        status: i === 1 ? 'current' : 'locked',
        exercises: sessionExercises,
        doctorRemarks: '',
        patientFeedback: '',
        notes: `Session ${i} scheduled.`,
        duration: '45 min'
      });
    }

    Toast.success('Patient Added', `${name} has been added successfully.`);
    this.closeModal();
    this.navigate('patients');
  },

  _showEditPatientModal(patientId) {
    const patient = DB.getById('patients', patientId);
    if (!patient) return;

    this.openModal('Edit Patient', this._getPatientFormHtml(patient), `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="App._updatePatient('${patientId}')">Save Changes</button>
    `);
  },

  _updatePatient(patientId) {
    const name = document.getElementById('pf-name').value.trim();
    const diagnosis = document.getElementById('pf-diagnosis').value.trim();
    if (!name || !diagnosis) {
      Toast.warning('Required Fields', 'Please fill in name and diagnosis.');
      return;
    }

    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    DB.update('patients', patientId, {
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
    this.navigate('patients');
  },

  _deletePatient(patientId) {
    const patient = DB.getById('patients', patientId);
    if (!patient) return;
    this.openModal('Delete Patient', `
      <div style="text-align:center;padding:var(--space-4);">
        <div style="font-size:3rem;margin-bottom:var(--space-4);">⚠️</div>
        <h4 style="margin-bottom:var(--space-2);">Are you sure?</h4>
        <p style="color:var(--text-secondary);font-size:var(--text-sm);">
          This will permanently delete <strong>${Utils.escapeHtml(patient.name)}</strong> and all their session data.
        </p>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="App._confirmDeletePatient('${patientId}')">Delete Patient</button>
    `);
  },

  _confirmDeletePatient(patientId) {
    DB.remove('patients', patientId);
    // Also remove sessions
    const data = JSON.parse(localStorage.getItem('physioflow_data'));
    data.sessions = data.sessions.filter(s => s.patientId !== patientId);
    data.feedback = (data.feedback || []).filter(f => f.patientId !== patientId);
    localStorage.setItem('physioflow_data', JSON.stringify(data));

    Toast.success('Deleted', 'Patient has been removed.');
    this.closeModal();
    this.navigate('patients');
  },

  /* ---- Credential Generator ---- */
  _showCredentialModal(patientId) {
    const patient = DB.getById('patients', patientId);
    if (!patient) return;

    this.openModal('Patient Credentials', `
      <div style="margin-bottom:var(--space-4);">
        <div class="patient-cell" style="margin-bottom:var(--space-4);">
          <div class="patient-avatar" style="background:${patient.avatarColor}">${patient.avatar}</div>
          <div>
            <div class="patient-name">${Utils.escapeHtml(patient.name)}</div>
            <div class="patient-email">Status: <span class="status-badge ${patient.status}">${patient.status}</span></div>
          </div>
        </div>
      </div>

      <div class="credential-card">
        <div class="credential-row">
          <span class="credential-label">Username</span>
          <span class="credential-value" id="cred-user">${Utils.escapeHtml(patient.username)}</span>
          <button class="copy-btn" onclick="Utils.copyToClipboard('${patient.username}');Toast.success('Copied','Username copied to clipboard')" title="Copy">📋</button>
        </div>
        <div class="credential-row">
          <span class="credential-label">Password</span>
          <span class="credential-value" id="cred-pass">${Utils.escapeHtml(patient.password)}</span>
          <button class="copy-btn" onclick="Utils.copyToClipboard('${patient.password}');Toast.success('Copied','Password copied to clipboard')" title="Copy">📋</button>
        </div>
      </div>

      <div class="cred-actions">
        <button class="btn btn-secondary btn-sm" onclick="App._generateNewCredentials('${patientId}')">🔄 Generate New</button>
        <button class="btn btn-secondary btn-sm" onclick="App._resetPassword('${patientId}')">🔑 Reset Password</button>
        ${patient.status === 'active' ? `<button class="btn btn-secondary btn-sm" onclick="App._deactivateAccount('${patientId}')">🚫 Deactivate</button>` : ''}
        ${patient.status === 'deactivated' ? `<button class="btn btn-accent btn-sm" onclick="App._activateAccount('${patientId}')">✅ Activate</button>` : ''}
        ${patient.status === 'completed' ? `<button class="btn btn-secondary btn-sm" onclick="App._lockAccount('${patientId}')">🔒 Lock Account</button>` : ''}
      </div>
    `, `
      <button class="btn btn-primary" onclick="App.closeModal()">Done</button>
    `);
  },

  _generateNewCredentials(patientId) {
    const patient = DB.getById('patients', patientId);
    const newPassword = Utils.randomPassword(10);
    DB.update('patients', patientId, { password: newPassword });
    Toast.success('Credentials Generated', 'New password has been generated.');
    this._showCredentialModal(patientId);
  },

  _resetPassword(patientId) {
    const newPassword = Utils.randomPassword(10);
    DB.update('patients', patientId, { password: newPassword });
    Toast.success('Password Reset', 'A new password has been assigned.');
    this._showCredentialModal(patientId);
  },

  _deactivateAccount(patientId) {
    DB.update('patients', patientId, { status: 'deactivated' });
    Toast.warning('Account Deactivated', 'Patient account has been deactivated.');
    this._showCredentialModal(patientId);
  },

  _activateAccount(patientId) {
    DB.update('patients', patientId, { status: 'active' });
    Toast.success('Account Activated', 'Patient account has been activated.');
    this._showCredentialModal(patientId);
  },

  _lockAccount(patientId) {
    DB.update('patients', patientId, { status: 'locked' });
    Toast.info('Account Locked', 'Patient account has been locked after treatment completion.');
    this._showCredentialModal(patientId);
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

  _unlockNextSession(patientId, sessionNumber) {
    // Mark current as completed
    const currentSessionId = `sess-${patientId}-${sessionNumber}`;
    DB.update('sessions', currentSessionId, { status: 'completed' });

    // Unlock next session
    const nextSessionId = `sess-${patientId}-${sessionNumber + 1}`;
    const nextSession = DB.getById('sessions', nextSessionId);
    if (nextSession) {
      DB.update('sessions', nextSessionId, { status: 'current' });
    }

    // Update patient completed count
    const patient = DB.getById('patients', patientId);
    if (patient) {
      const newCompleted = patient.completedSessions + 1;
      const updates = { completedSessions: newCompleted };
      if (newCompleted >= patient.sessionCount) {
        updates.status = 'completed';
      }
      DB.update('patients', patientId, updates);
    }

    Toast.success('Session Complete', `Session ${sessionNumber} marked as completed.`);
    this.navigate('patient-profile');
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
        <label style="font-size:var(--text-sm);font-weight:600;display:block;margin-bottom:var(--space-3);">Select Exercises *</label>

        <!-- Category filter -->
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3);">
          <button class="filter-chip active" data-cat="all" onclick="App._filterAssignExercises('all')">All</button>
          ${categories.map(c => `<button class="filter-chip" data-cat="${c}" onclick="App._filterAssignExercises('${c}')">${c}</button>`).join('')}
        </div>

        <!-- Search -->
        <div class="filter-bar" style="margin-bottom:var(--space-3);">
          <div class="search-input" style="flex:1;">
            <span class="icon">🔍</span>
            <input type="text" id="as-exercise-search" placeholder="Search exercises…" oninput="App._filterAssignExercises()">
          </div>
        </div>

        <!-- Exercise list with checkboxes -->
        <div id="as-exercise-list" style="max-height:240px;overflow-y:auto;border:1px solid var(--border-light);border-radius:var(--radius-md);">
          ${exercises.map(ex => `
            <label class="as-exercise-item" data-category="${ex.category}" style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--border-light);cursor:pointer;transition:background 0.15s;">
              <input type="checkbox" value="${ex.id}" onchange="App._toggleAssignExercise('${ex.id}')" style="width:18px;height:18px;accent-color:var(--primary-500);cursor:pointer;flex-shrink:0;">
              <span style="font-size:1.2rem;">${ex.thumbnail}</span>
              <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:var(--text-sm);">${Utils.escapeHtml(ex.title)}</div>
                <div style="font-size:var(--text-xs);color:var(--text-tertiary);">${ex.category} · ${ex.difficulty} · ${ex.duration}</div>
              </div>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Selected exercises config -->
      <div id="as-selected-config" style="margin-top:var(--space-5);">
        <label style="font-size:var(--text-sm);font-weight:600;display:block;margin-bottom:var(--space-3);">Configure Selected Exercises <span id="as-selected-count" style="color:var(--text-tertiary);">(0 selected)</span></label>
        <div id="as-config-list" style="display:flex;flex-direction:column;gap:var(--space-3);"></div>
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
    this._renderAssignExerciseConfig();
  },

  /** Render config controls for selected exercises */
  _renderAssignExerciseConfig() {
    const configList = document.getElementById('as-config-list');
    const countEl = document.getElementById('as-selected-count');
    const exercises = DB.getAll('exercises');
    const selected = this._assignSessionSelectedExercises;

    countEl.textContent = `(${selected.length} selected)`;

    if (selected.length === 0) {
      configList.innerHTML = '<div style="color:var(--text-tertiary);font-size:var(--text-sm);padding:var(--space-3);">Select exercises above to configure sets, reps, and rest time.</div>';
      return;
    }

    configList.innerHTML = selected.map(exId => {
      const ex = exercises.find(e => e.id === exId);
      if (!ex) return '';
      return `
        <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);background:var(--bg-tertiary);border-radius:var(--radius-md);flex-wrap:wrap;">
          <span style="font-size:1.2rem;">${ex.thumbnail}</span>
          <div style="flex:1;min-width:100px;">
            <div style="font-weight:600;font-size:var(--text-sm);">${Utils.escapeHtml(ex.title)}</div>
          </div>
          <div style="display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap;">
            <label style="font-size:var(--text-xs);color:var(--text-tertiary);">Sets</label>
            <input type="number" id="as-sets-${exId}" value="3" min="1" max="20" style="width:50px;padding:4px 8px;background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:var(--radius-sm);font-size:var(--text-sm);color:var(--text-primary);text-align:center;">
            <label style="font-size:var(--text-xs);color:var(--text-tertiary);">Reps</label>
            <input type="number" id="as-reps-${exId}" value="10" min="1" max="100" style="width:50px;padding:4px 8px;background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:var(--radius-sm);font-size:var(--text-sm);color:var(--text-primary);text-align:center;">
            <label style="font-size:var(--text-xs);color:var(--text-tertiary);">Rest(s)</label>
            <input type="number" id="as-rest-${exId}" value="60" min="0" max="300" step="15" style="width:60px;padding:4px 8px;background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:var(--radius-sm);font-size:var(--text-sm);color:var(--text-primary);text-align:center;">
            <button onclick="App._removeAssignExercise('${exId}')" style="color:var(--danger-500);cursor:pointer;font-size:1rem;background:none;border:none;padding:4px;" title="Remove">✕</button>
          </div>
        </div>
      `;
    }).join('');
  },

  /** Remove an exercise from selection */
  _removeAssignExercise(exerciseId) {
    this._assignSessionSelectedExercises = this._assignSessionSelectedExercises.filter(id => id !== exerciseId);
    // Uncheck the checkbox
    const checkbox = document.querySelector(`#as-exercise-list input[value="${exerciseId}"]`);
    if (checkbox) checkbox.checked = false;
    this._renderAssignExerciseConfig();
  },

  /** Filter exercises in the assignment modal */
  _filterAssignExercises(category) {
    // Update chip active state
    if (category) {
      document.querySelectorAll('#generic-modal-body .filter-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.cat === category);
      });
    }

    const activeCat = document.querySelector('#generic-modal-body .filter-chip.active')?.dataset.cat || 'all';
    const searchQuery = (document.getElementById('as-exercise-search')?.value || '').toLowerCase();

    document.querySelectorAll('.as-exercise-item').forEach(item => {
      const itemCat = item.dataset.category;
      const text = item.textContent.toLowerCase();
      const matchesCat = activeCat === 'all' || itemCat === activeCat;
      const matchesSearch = !searchQuery || text.includes(searchQuery);
      item.style.display = (matchesCat && matchesSearch) ? '' : 'none';
    });
  },

  /** Save the assigned session */
  _saveAssignedSession() {
    const patientId = document.getElementById('as-patient-fixed')?.value || document.getElementById('as-patient').value;
    const date = document.getElementById('as-date').value;
    const duration = document.getElementById('as-duration').value;
    const notes = document.getElementById('as-notes').value;
    const remarks = document.getElementById('as-remarks').value;
    const selected = this._assignSessionSelectedExercises;

    // Validation
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

    const patient = DB.getById('patients', patientId);
    if (!patient) {
      Toast.error('Error', 'Patient not found.');
      return;
    }

    // Build exercise list with configured sets/reps/rest
    const exercises = DB.getAll('exercises');
    const sessionExercises = selected.map(exId => {
      const ex = exercises.find(e => e.id === exId);
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

    // Determine session number (next in sequence)
    const existingSessions = DB.query('sessions', s => s.patientId === patientId);
    const nextNumber = existingSessions.length > 0
      ? Math.max(...existingSessions.map(s => s.sessionNumber)) + 1
      : 1;

    // Determine status: if no current session exists, make this one current; otherwise locked
    const hasCurrentSession = existingSessions.some(s => s.status === 'current');
    const newStatus = hasCurrentSession ? 'locked' : 'current';

    const sessionId = 'sess-' + Utils.uid();

    DB.add('sessions', {
      id: sessionId,
      patientId: patientId,
      sessionNumber: nextNumber,
      date: date,
      status: newStatus,
      exercises: sessionExercises,
      doctorRemarks: remarks,
      patientFeedback: '',
      notes: notes || `Session ${nextNumber} assigned by doctor.`,
      duration: duration
    });

    // Update patient session count
    DB.update('patients', patientId, {
      sessionCount: patient.sessionCount + 1
    });

    // Add calendar event
    DB.add('calendarEvents', {
      date: date,
      status: 'upcoming',
      patientName: patient.name,
      time: '10:00'
    });

    Toast.success('Session Assigned', `Session ${nextNumber} has been assigned to ${patient.name} with ${sessionExercises.length} exercises.`);
    this.closeModal();

    // Navigate based on context
    if (this.selectedPatientId === patientId) {
      this.navigate('patient-profile');
    } else {
      this.navigate('sessions');
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

    // Pre-select the exercises that are already in the session
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
        <label style="font-size:var(--text-sm);font-weight:600;display:block;margin-bottom:var(--space-3);">Exercises</label>
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3);">
          <button class="filter-chip active" data-cat="all" onclick="App._filterAssignExercises('all')">All</button>
          ${categories.map(c => `<button class="filter-chip" data-cat="${c}" onclick="App._filterAssignExercises('${c}')">${c}</button>`).join('')}
        </div>
        <div id="as-exercise-list" style="max-height:200px;overflow-y:auto;border:1px solid var(--border-light);border-radius:var(--radius-md);">
          ${allExercises.map(ex => {
            const isChecked = this._assignSessionSelectedExercises.includes(ex.id);
            return `
            <label class="as-exercise-item" data-category="${ex.category}" style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--border-light);cursor:pointer;transition:background 0.15s;">
              <input type="checkbox" value="${ex.id}" ${isChecked ? 'checked' : ''} onchange="App._toggleAssignExercise('${ex.id}')" style="width:18px;height:18px;accent-color:var(--primary-500);cursor:pointer;flex-shrink:0;">
              <span style="font-size:1.2rem;">${ex.thumbnail}</span>
              <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:var(--text-sm);">${Utils.escapeHtml(ex.title)}</div>
                <div style="font-size:var(--text-xs);color:var(--text-tertiary);">${ex.category} · ${ex.difficulty} · ${ex.duration}</div>
              </div>
            </label>`;
          }).join('')}
        </div>
      </div>

      <!-- Selected exercises config -->
      <div id="as-selected-config" style="margin-top:var(--space-5);">
        <label style="font-size:var(--text-sm);font-weight:600;display:block;margin-bottom:var(--space-3);">Configure Exercises <span id="as-selected-count" style="color:var(--text-tertiary);">(${this._assignSessionSelectedExercises.length} selected)</span></label>
        <div id="as-config-list" style="display:flex;flex-direction:column;gap:var(--space-3);"></div>
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

    // Render config with existing values after modal opens
    requestAnimationFrame(() => {
      this._renderEditExerciseConfig(session);
    });
  },

  /** Render config for edit modal, using existing session values where available */
  _renderEditExerciseConfig(session) {
    const configList = document.getElementById('as-config-list');
    const countEl = document.getElementById('as-selected-count');
    const allExercises = DB.getAll('exercises');
    const selected = this._assignSessionSelectedExercises;

    countEl.textContent = `(${selected.length} selected)`;

    if (selected.length === 0) {
      configList.innerHTML = '<div style="color:var(--text-tertiary);font-size:var(--text-sm);padding:var(--space-3);">Select exercises above.</div>';
      return;
    }

    configList.innerHTML = selected.map(exId => {
      const ex = allExercises.find(e => e.id === exId);
      // Look for existing config in the session
      const existing = session.exercises.find(e => e.exerciseId === exId);
      const sets = existing?.sets || 3;
      const reps = existing?.reps || 10;
      const rest = existing?.restTime || 60;
      if (!ex) return '';
      return `
        <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);background:var(--bg-tertiary);border-radius:var(--radius-md);flex-wrap:wrap;">
          <span style="font-size:1.2rem;">${ex.thumbnail}</span>
          <div style="flex:1;min-width:100px;"><div style="font-weight:600;font-size:var(--text-sm);">${Utils.escapeHtml(ex.title)}</div></div>
          <div style="display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap;">
            <label style="font-size:var(--text-xs);color:var(--text-tertiary);">Sets</label>
            <input type="number" id="as-sets-${exId}" value="${sets}" min="1" max="20" style="width:50px;padding:4px 8px;background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:var(--radius-sm);font-size:var(--text-sm);color:var(--text-primary);text-align:center;">
            <label style="font-size:var(--text-xs);color:var(--text-tertiary);">Reps</label>
            <input type="number" id="as-reps-${exId}" value="${reps}" min="1" max="100" style="width:50px;padding:4px 8px;background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:var(--radius-sm);font-size:var(--text-sm);color:var(--text-primary);text-align:center;">
            <label style="font-size:var(--text-xs);color:var(--text-tertiary);">Rest(s)</label>
            <input type="number" id="as-rest-${exId}" value="${rest}" min="0" max="300" step="15" style="width:60px;padding:4px 8px;background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:var(--radius-sm);font-size:var(--text-sm);color:var(--text-primary);text-align:center;">
            <button onclick="App._removeAssignExercise('${exId}')" style="color:var(--danger-500);cursor:pointer;font-size:1rem;background:none;border:none;padding:4px;" title="Remove">✕</button>
          </div>
        </div>
      `;
    }).join('');
  },

  /** Save edited session */
  _saveEditedSession(sessionId) {
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

    DB.update('sessions', sessionId, {
      date: date,
      duration: duration,
      exercises: sessionExercises,
      notes: notes,
      doctorRemarks: remarks
    });

    Toast.success('Session Updated', `Session ${session.sessionNumber} has been updated.`);
    this.closeModal();
    this.navigate('patient-profile');
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
      <div class="exercise-filters" id="exercise-filters">
        <button class="filter-chip active" data-category="all" onclick="App._filterExercises('all')">All</button>
        ${categories.map(cat => `<button class="filter-chip" data-category="${cat}" onclick="App._filterExercises('${cat}')">${cat}</button>`).join('')}
      </div>

      <div class="exercise-grid" id="exercise-grid">
        ${exercises.map(ex => this._exerciseCardHtml(ex)).join('')}
      </div>
    `;
  },

  _exerciseCardHtml(ex) {
    const diffClass = ex.difficulty === 'Easy' ? 'difficulty-easy' : ex.difficulty === 'Medium' ? 'difficulty-medium' : 'difficulty-hard';
    return `
      <div class="exercise-card" data-category="${ex.category}">
        <div class="exercise-thumb">
          <span>${ex.thumbnail}</span>
          <div class="play-btn" onclick="App._showExerciseDetail('${ex.id}')">▶</div>
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

    this.openModal(ex.title, `
      <div style="text-align:center;margin-bottom:var(--space-5);">
        <div class="video-player-wrapper" style="max-width:400px;margin:0 auto;background:linear-gradient(135deg,var(--primary-100),var(--accent-100));">
          <div class="video-placeholder">
            <div style="font-size:4rem;">${ex.thumbnail}</div>
            <div class="play-icon">▶</div>
            <p style="font-size:var(--text-sm);">Exercise Video Preview</p>
          </div>
        </div>
      </div>
      <div class="report-row"><span class="report-label">Category</span><span class="report-value">${ex.category}</span></div>
      <div class="report-row"><span class="report-label">Difficulty</span><span class="report-value">${ex.difficulty}</span></div>
      <div class="report-row"><span class="report-label">Duration</span><span class="report-value">${ex.duration}</span></div>
      <div class="report-row"><span class="report-label">Instructions</span><span class="report-value">${Utils.escapeHtml(ex.description)}</span></div>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
      <button class="btn btn-primary" onclick="Toast.info('PDF Downloaded','Exercise PDF has been generated.');App.closeModal();">📄 Download PDF</button>
    `);
  },


  /* ============================================
     VIDEO MANAGEMENT
     ============================================ */
  _renderVideos() {
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6);">
        <div class="content-card" style="grid-column:${window.innerWidth < 768 ? '1/-1' : 'auto'};">
          <div class="card-header"><h3>Upload Exercise Video</h3></div>
          <div class="card-body">
            <div class="upload-area" id="upload-area-video"
              ondragover="event.preventDefault();this.classList.add('dragover')"
              ondragleave="this.classList.remove('dragover')"
              ondrop="event.preventDefault();this.classList.remove('dragover');App._simulateUpload('video')"
              onclick="App._simulateUpload('video')">
              <div class="upload-icon">🎬</div>
              <p>Drag & drop video files here or click to browse</p>
              <p class="upload-hint">MP4, MOV, AVI — Max 500MB</p>
            </div>
            <div id="upload-progress-video" class="upload-progress hidden">
              <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2);">
                <span style="font-size:var(--text-sm);font-weight:600;">Uploading…</span>
                <span style="font-size:var(--text-sm);color:var(--text-tertiary);" id="upload-pct-video">0%</span>
              </div>
              <div class="progress-bar-track">
                <div class="progress-bar-fill" id="upload-bar-video" style="width:0%"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="content-card" style="grid-column:${window.innerWidth < 768 ? '1/-1' : 'auto'};">
          <div class="card-header"><h3>Video Library</h3></div>
          <div class="card-body">
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-3);">
              ${DB.getAll('exercises').slice(0, 8).map(ex => `
                <div style="background:var(--bg-tertiary);border-radius:var(--radius-md);overflow:hidden;cursor:pointer;" onclick="App._showExerciseDetail('${ex.id}')">
                  <div style="height:80px;background:linear-gradient(135deg,var(--primary-100),var(--accent-100));display:flex;align-items:center;justify-content:center;font-size:1.75rem;">
                    ${ex.thumbnail}
                  </div>
                  <div style="padding:var(--space-2) var(--space-3);">
                    <div style="font-size:var(--text-xs);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${Utils.escapeHtml(ex.title)}</div>
                    <div style="font-size:var(--text-xs);color:var(--text-tertiary);">${ex.duration}</div>
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
            <button class="btn btn-danger btn-sm" onclick="if(confirm('Reset all data to defaults?')){DB.reset();Toast.success('Data Reset','All data has been reset.');App.logout();}">Reset</button>
          </div>
        </div>
      </div>
    `;
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
  _renderPatientSessions() {
    const sessions = DB.query('sessions', s => s.patientId === this.currentUser.id);

    return `
      <div class="session-timeline">
        ${sessions.map(s => `
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
            <div class="session-exercises">
              ${s.exercises.map(ex => `
                <div class="exercise-row">
                  <span class="exercise-icon">${ex.completed ? '✅' : '⬜'}</span>
                  <div class="exercise-details">
                    <div style="font-weight:500;">${Utils.escapeHtml(ex.title)}</div>
                  </div>
                  <span class="exercise-sets">${ex.sets}×${ex.reps} · ${ex.duration}</span>
                </div>
              `).join('')}
            </div>
            ${s.doctorRemarks ? `<div style="margin-top:var(--space-3);padding:var(--space-3);background:var(--bg-tertiary);border-radius:var(--radius-md);font-size:var(--text-sm);"><strong>Doctor:</strong> ${Utils.escapeHtml(s.doctorRemarks)}</div>` : ''}
            ${s.patientFeedback ? `<div style="margin-top:var(--space-2);padding:var(--space-3);background:var(--bg-tertiary);border-radius:var(--radius-md);font-size:var(--text-sm);"><strong>Your feedback:</strong> ${Utils.escapeHtml(s.patientFeedback)}</div>` : ''}

            ${s.status === 'current' ? `
              <div style="margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--border-light);">
                <div class="upload-area" style="padding:var(--space-4);"
                  onclick="App._simulatePatientUpload()"
                  ondragover="event.preventDefault();this.classList.add('dragover')"
                  ondragleave="this.classList.remove('dragover')"
                  ondrop="event.preventDefault();this.classList.remove('dragover');App._simulatePatientUpload()">
                  <p style="font-size:var(--text-sm);">📎 Upload your workout video or photo</p>
                </div>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  },

  _simulatePatientUpload() {
    Toast.success('Upload Started', 'Your video is being uploaded…');
    setTimeout(() => Toast.success('Upload Complete', 'Video uploaded successfully! Your doctor will review it.'), 2000);
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

  _submitFeedback() {
    const comments = document.getElementById('fb-comments')?.value || '';
    const difficulty = document.getElementById('fb-difficulty')?.value || 'Moderate';
    const confidence = document.getElementById('fb-confidence')?.value || 7;
    const completed = document.getElementById('fb-completed')?.checked || false;

    const sessions = DB.query('sessions', s => s.patientId === this.currentUser.id && s.status === 'current');
    const currentSession = sessions[0];

    DB.add('feedback', {
      id: 'fb-' + Utils.uid(),
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

    Toast.success('Feedback Submitted', 'Thank you for your feedback! Your doctor will review it.');
    this.navigate('feedback');
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
