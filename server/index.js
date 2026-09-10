/* ============================================
   PhysioFlow — Express Server Entry Point
   
   Template backend system for physiotherapy
   clinic management. Uses Firebase Firestore.
   ============================================ */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initFirebase } = require('./firebase');
const config = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Initialize Firebase ----
initFirebase();

// ---- Middleware ----
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Serve Frontend (static files from parent directory) ----
app.use(express.static(path.join(__dirname, '..')));

// ---- Serve uploaded files ----
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---- API Routes ----
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/exercises', require('./routes/exercises'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/settings', require('./routes/settings'));

// ---- Template Config Endpoint ----
// Frontend can fetch this to get branding/feature flags
app.get('/api/config', (req, res) => {
  res.json({
    clientName: config.clientName,
    clientTagline: config.clientTagline,
    clientLogo: config.clientLogo,
    primaryColor: config.primaryColor,
    accentColor: config.accentColor,
    features: config.features,
    defaults: config.defaults,
    roles: config.roles,
  });
});

// ---- Health Check ----
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: config.clientName, timestamp: new Date().toISOString() });
});

// ---- Catch-all: serve index.html for SPA routes ----
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ---- Error Handler ----
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ---- Start Server ----
app.listen(PORT, () => {
  console.log(`\n🩺 ${config.clientName} Backend`);
  console.log(`   ${config.clientTagline}`);
  console.log(`   ─────────────────────────────────`);
  console.log(`   🌐 Server:    http://localhost:${PORT}`);
  console.log(`   🔥 Firebase:  physioflow-clinic`);
  console.log(`   📦 API:       http://localhost:${PORT}/api`);
  console.log(`   ─────────────────────────────────\n`);
});

module.exports = app;
