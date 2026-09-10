/* ============================================
   PhysioFlow — Settings Routes
   ============================================ */

const express = require('express');
const router = express.Router();
const { getDb } = require('../firebase');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

/**
 * GET /api/settings
 * Get user settings/profile
 */
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const collection = req.user.role === 'doctor' ? 'doctors' : 'patients';
    
    const doc = await db.collection(collection).doc(req.user.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password_hash, ...settings } = { id: doc.id, ...doc.data() };
    res.json(settings);
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/settings
 * Update profile/clinic info
 */
router.put('/', async (req, res) => {
  try {
    const db = getDb();
    const collection = req.user.role === 'doctor' ? 'doctors' : 'patients';
    const data = req.body;

    const allowedDoctorFields = ['name', 'email', 'phone', 'specialty', 'clinicName', 'clinicLogo', 'notifications'];
    const allowedPatientFields = ['name', 'email', 'phone'];

    const allowedFields = req.user.role === 'doctor' ? allowedDoctorFields : allowedPatientFields;

    const updates = {};
    allowedFields.forEach(field => {
      if (data[field] !== undefined) updates[field] = data[field];
    });

    updates.updatedAt = new Date().toISOString();

    await db.collection(collection).doc(req.user.id).update(updates);

    const updated = await db.collection(collection).doc(req.user.id).get();
    const { password_hash, ...settings } = { id: updated.id, ...updated.data() };

    res.json(settings);
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
