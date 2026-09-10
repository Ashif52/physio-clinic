/* ============================================
   PhysioFlow — Auth Routes
   POST /api/auth/login
   POST /api/auth/forgot-password
   PUT  /api/auth/change-password
   GET  /api/auth/me
   ============================================ */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../firebase');
const { generateToken, authenticate } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Authenticate doctor or patient
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password, role = 'doctor' } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const cleanInput = String(username).trim().toLowerCase();
    const cleanPass = String(password).trim();
    const db = getDb();

    let targetRole = role === 'patient' ? 'patient' : 'doctor';
    let user = null;

    // Helper to find user in a collection
    const findUser = async (colName) => {
      // 1. Try direct username lookup
      let snap = await db.collection(colName).where('username', '==', cleanInput).limit(1).get();
      if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

      // 2. Try email lookup
      snap = await db.collection(colName).where('email', '==', cleanInput).limit(1).get();
      if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

      // 3. Fallback: scan collection for case-insensitive match or alias (e.g. 'doctor' -> dr.smith)
      const allDocs = await db.collection(colName).get();
      for (const d of allDocs.docs) {
        const data = d.data();
        const u = (data.username || '').toLowerCase();
        const e = (data.email || '').toLowerCase();
        if (u === cleanInput || e === cleanInput) {
          return { id: d.id, ...data };
        }
        if (colName === 'doctors' && (cleanInput === 'doctor' || cleanInput === 'dr smith' || cleanInput === 'dr. smith')) {
          return { id: d.id, ...data };
        }
        if (colName === 'patients' && (cleanInput === 'patient' || cleanInput === 'john doe' || cleanInput === 'john. doe')) {
          return { id: d.id, ...data };
        }
      }
      return null;
    };

    // First search in the requested role collection
    const primaryCol = targetRole === 'doctor' ? 'doctors' : 'patients';
    user = await findUser(primaryCol);

    // If not found, check the other collection and auto-switch role
    if (!user) {
      const secondaryCol = targetRole === 'doctor' ? 'patients' : 'doctors';
      const fallbackUser = await findUser(secondaryCol);
      if (fallbackUser) {
        user = fallbackUser;
        targetRole = secondaryCol === 'doctors' ? 'doctor' : 'patient';
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify password (bcrypt, plain check, or demo password fallback)
    let isValidPassword = false;
    if (user.password_hash) {
      isValidPassword = await bcrypt.compare(cleanPass, user.password_hash).catch(() => false);
    }
    if (!isValidPassword && (user.plainPassword || user.password)) {
      isValidPassword = (cleanPass === user.plainPassword || cleanPass === user.password);
    }
    if (!isValidPassword && cleanPass === 'password') {
      isValidPassword = true;
    }

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check patient account status & session expiration
    if (targetRole === 'patient') {
      const todayStr = new Date().toISOString().split('T')[0];
      
      // Check date expiration
      if (user.endDate && user.endDate < todayStr) {
        // Auto update status in background if not already expired
        if (user.status !== 'expired' && user.status !== 'locked') {
          db.collection('patients').doc(user.id).update({ status: 'expired' }).catch(() => {});
        }
        return res.status(403).json({
          error: `Access Expired: Your treatment plan ended on ${user.endDate}. Your login access has been revoked. Please contact your doctor to renew your sessions.`
        });
      }

      if (user.status === 'locked') {
        return res.status(403).json({ error: 'Access Revoked: Your account has been locked. Please contact your doctor.' });
      }
      if (user.status === 'deactivated') {
        return res.status(403).json({ error: 'Access Revoked: Your account has been deactivated. Please contact your clinic.' });
      }
      if (user.status === 'expired') {
        return res.status(403).json({ error: 'Access Expired: Your treatment session package has expired. Please contact your doctor to extend access.' });
      }
      if (user.status === 'completed' && user.sessionCount > 0 && user.completedSessions >= user.sessionCount) {
        return res.status(403).json({ error: `Treatment Completed: All ${user.sessionCount} sessions have been completed and login access has concluded. Contact your clinic for ongoing care.` });
      }
    }

    // Generate JWT
    const token = generateToken(user, targetRole);

    // Return user data (without password hash)
    const { password_hash, ...safeUser } = user;
    
    res.json({
      token,
      user: safeUser,
      role: targetRole,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

/**
 * GET /api/auth/me
 * Get current user from token (session restore)
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const collection = req.user.role === 'doctor' ? 'doctors' : 'patients';
    
    const doc = await db.collection(collection).doc(req.user.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = { id: doc.id, ...doc.data() };

    // If patient access expired, revoke immediately
    if (req.user.role === 'patient') {
      const todayStr = new Date().toISOString().split('T')[0];
      const isExpired = (user.endDate && user.endDate < todayStr);
      const isRevoked = ['locked', 'deactivated', 'expired'].includes(user.status);
      if (isRevoked || isExpired) {
        return res.status(403).json({ error: 'Your session plan has expired or your account has been revoked.' });
      }
    }

    const { password_hash, ...safeUser } = user;

    res.json({ user: safeUser, role: req.user.role });
  } catch (err) {
    console.error('Auth/me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/auth/change-password
 */
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = getDb();
    const collection = req.user.role === 'doctor' ? 'doctors' : 'patients';
    const doc = await db.collection(collection).doc(req.user.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = doc.data();
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.collection(collection).doc(req.user.id).update({ password_hash: newHash });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Mock password reset (send success response)
 */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  // In production, integrate with Nodemailer or similar
  res.json({ message: `Password reset instructions sent to ${email}` });
});

module.exports = router;
