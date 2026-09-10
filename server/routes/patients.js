/* ============================================
   PhysioFlow — Patient Routes
   Doctor creates patients, controls access
   ============================================ */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../firebase');
const { authenticate, requireDoctor } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/patients
 * List all patients (doctor only, with search/filter/sort)
 */
router.get('/', requireDoctor, async (req, res) => {
  try {
    const db = getDb();
    const { search, status, sort, doctorId } = req.query;

    let query = db.collection('patients');

    // Filter by doctor
    if (doctorId) {
      query = query.where('doctorId', '==', doctorId);
    }

    // Filter by status
    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    let patients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Remove password hashes from response
    patients = patients.map(({ password_hash, ...p }) => p);

    // Search filter (client-side for Firestore)
    if (search) {
      const q = search.toLowerCase();
      patients = patients.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.diagnosis.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sort === 'name') {
      patients.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'date') {
      patients.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    } else if (sort === 'status') {
      patients.sort((a, b) => a.status.localeCompare(b.status));
    }

    res.json(patients);
  } catch (err) {
    console.error('Get patients error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/patients/:id
 * Get patient by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('patients').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const { password_hash, ...patient } = { id: doc.id, ...doc.data() };
    res.json(patient);
  } catch (err) {
    console.error('Get patient error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/patients
 * Doctor creates a new patient — generates credentials & initial sessions
 */
router.post('/', requireDoctor, async (req, res) => {
  try {
    const db = getDb();
    const data = req.body;

    if (!data.name || !data.diagnosis) {
      return res.status(400).json({ error: 'Name and diagnosis are required' });
    }

    // Generate credentials (or use custom credentials provided by doctor)
    const username = (data.username && data.username.trim())
      ? data.username.trim().toLowerCase()
      : data.name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
    const plainPassword = (data.password && data.password.trim())
      ? data.password.trim()
      : _randomPassword(8);
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const colors = ['#5c7cfa', '#20c997', '#ff922b', '#7950f2', '#fa5252', '#0ca678', '#e8590c'];
    const initials = data.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const patientId = 'pat-' + uuidv4().slice(0, 8);

    const patient = {
      username,
      password_hash: passwordHash,
      plainPassword, // Stored temporarily for doctor to see — doctor controls access
      name: data.name,
      age: parseInt(data.age) || 30,
      gender: data.gender || 'Male',
      phone: data.phone || '',
      email: data.email || '',
      photo: '',
      avatar: initials,
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
      medicalHistory: data.medicalHistory || '',
      diagnosis: data.diagnosis,
      treatmentPlan: data.treatmentPlan || '',
      sessionCount: parseInt(data.sessionCount) || 8,
      completedSessions: 0,
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      endDate: data.endDate || '',
      status: data.status || 'active',
      painLevel: 5,
      doctorId: req.user.id,
      notes: '',
      createdAt: new Date().toISOString(),
    };

    await db.collection('patients').doc(patientId).set(patient);

    // Generate initial sessions
    const exercises = await db.collection('exercises').get();
    const exercisePool = exercises.docs.map(d => ({ id: d.id, ...d.data() }));

    const batch = db.batch();
    for (let i = 1; i <= patient.sessionCount; i++) {
      const date = new Date(patient.startDate);
      date.setDate(date.getDate() + (i - 1) * 4);

      const shuffled = [...exercisePool].sort(() => 0.5 - Math.random());
      const sessionExercises = shuffled.slice(0, 3).map(ex => ({
        exerciseId: ex.id,
        title: ex.title,
        sets: 3,
        reps: 10,
        restTime: 60,
        duration: ex.duration,
        completed: false,
        instructions: ex.description,
      }));

      const sessionId = `sess-${patientId}-${i}`;
      batch.set(db.collection('sessions').doc(sessionId), {
        patientId,
        sessionNumber: i,
        date: date.toISOString().split('T')[0],
        status: i === 1 ? 'current' : 'locked',
        exercises: sessionExercises,
        doctorRemarks: '',
        patientFeedback: '',
        notes: `Session ${i} scheduled.`,
        duration: '45 min',
      });
    }
    await batch.commit();

    // Return patient with credentials (doctor sees them to give to patient)
    const { password_hash: _, ...safePatient } = patient;
    res.status(201).json({
      ...safePatient,
      id: patientId,
      credentials: { username, password: plainPassword },
    });
  } catch (err) {
    console.error('Create patient error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/patients/:id
 * Update patient info
 */
router.put('/:id', requireDoctor, async (req, res) => {
  try {
    const db = getDb();
    const data = req.body;
    const patientId = req.params.id;

    const doc = await db.collection('patients').doc(patientId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const initials = data.name
      ? data.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : doc.data().avatar;

    const updates = {};
    const allowedFields = ['name', 'age', 'gender', 'phone', 'email', 'medicalHistory',
      'diagnosis', 'treatmentPlan', 'sessionCount', 'startDate', 'endDate', 'status', 'notes', 'painLevel'];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) updates[field] = data[field];
    });

    if (data.name) updates.avatar = initials;
    updates.updatedAt = new Date().toISOString();

    await db.collection('patients').doc(patientId).update(updates);

    const updated = await db.collection('patients').doc(patientId).get();
    const { password_hash: _, ...safePatient } = { id: updated.id, ...updated.data() };

    res.json(safePatient);
  } catch (err) {
    console.error('Update patient error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/patients/:id
 * Delete patient + cascade sessions/feedback
 */
router.delete('/:id', requireDoctor, async (req, res) => {
  try {
    const db = getDb();
    const patientId = req.params.id;

    const doc = await db.collection('patients').doc(patientId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Delete sessions
    const sessions = await db.collection('sessions').where('patientId', '==', patientId).get();
    const batch1 = db.batch();
    sessions.docs.forEach(d => batch1.delete(d.ref));
    await batch1.commit();

    // Delete feedback
    const feedback = await db.collection('feedback').where('patientId', '==', patientId).get();
    const batch2 = db.batch();
    feedback.docs.forEach(d => batch2.delete(d.ref));
    await batch2.commit();

    // Delete patient
    await db.collection('patients').doc(patientId).delete();

    res.json({ message: 'Patient deleted successfully' });
  } catch (err) {
    console.error('Delete patient error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/patients/:id/credentials
 * Generate or update credentials (doctor controls patient password & username)
 */
router.put('/:id/credentials', requireDoctor, async (req, res) => {
  try {
    const db = getDb();
    const patientId = req.params.id;
    const { password, username } = req.body;

    const doc = await db.collection('patients').doc(patientId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patient = doc.data();
    const newUsername = (username && username.trim()) ? username.trim().toLowerCase() : patient.username;
    const newPassword = (password && password.trim()) ? password.trim() : _randomPassword(10);
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updates = {
      username: newUsername,
      password_hash: passwordHash,
      plainPassword: newPassword,
      updatedAt: new Date().toISOString(),
    };

    await db.collection('patients').doc(patientId).update(updates);

    res.json({
      username: newUsername,
      password: newPassword,
      message: 'Patient credentials updated successfully.',
    });
  } catch (err) {
    console.error('Credentials error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/patients/:id/status
 * Doctor controls patient access — activate, deactivate, lock
 */
router.put('/:id/status', requireDoctor, async (req, res) => {
  try {
    const db = getDb();
    const { status } = req.body;
    const validStatuses = ['active', 'pending', 'completed', 'deactivated', 'locked'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const doc = await db.collection('patients').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    await db.collection('patients').doc(req.params.id).update({ status });

    res.json({ message: `Patient status updated to ${status}` });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/** Helper: generate random password */
function _randomPassword(len = 10) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let pw = '';
  for (let i = 0; i < len; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

module.exports = router;
