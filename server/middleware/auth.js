/* ============================================
   PhysioFlow — JWT Authentication Middleware
   ============================================ */

const jwt = require('jsonwebtoken');
const { getDb } = require('../firebase');

const JWT_SECRET = process.env.JWT_SECRET || 'physioflow_super_secret_key';

/**
 * Generate a JWT token for a user
 */
function generateToken(user, role) {
  return jwt.sign(
    { id: user.id, role, username: user.username },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * Verify JWT and attach user to req
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Require doctor role
 */
function requireDoctor(req, res, next) {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Doctor access required' });
  }
  next();
}

/**
 * Require patient role & ensure active non-expired session
 */
async function requirePatient(req, res, next) {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Patient access required' });
  }

  try {
    const db = getDb();
    const doc = await db.collection('patients').doc(req.user.id).get();
    if (!doc.exists) {
      return res.status(401).json({ error: 'Patient account not found' });
    }
    const patient = doc.data();
    const todayStr = new Date().toISOString().split('T')[0];
    const isExpired = (patient.endDate && patient.endDate < todayStr);
    const isRevoked = ['locked', 'deactivated', 'expired'].includes(patient.status);
    if (isRevoked || isExpired) {
      return res.status(403).json({
        error: 'Your treatment session plan has expired or login access has been revoked. Please contact your clinic.'
      });
    }
    next();
  } catch (err) {
    console.error('requirePatient verification error:', err);
    next();
  }
}

module.exports = { generateToken, authenticate, requireDoctor, requirePatient };

