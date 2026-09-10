/* ============================================
   PhysioFlow — Session Routes
   ============================================ */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../firebase');
const { authenticate, requireDoctor } = require('../middleware/auth');

router.use(authenticate);

/**
 * GET /api/sessions
 * List sessions with filters (patient_id, status)
 */
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { patientId, status } = req.query;

    let query = db.collection('sessions');

    if (patientId) {
      query = query.where('patientId', '==', patientId);
    }

    // If patient role, only show their sessions
    if (req.user.role === 'patient') {
      query = query.where('patientId', '==', req.user.id);
    }

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort by session number
    sessions.sort((a, b) => a.sessionNumber - b.sessionNumber);

    res.json(sessions);
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/sessions/:id
 * Get session details
 */
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('sessions').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error('Get session error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/sessions
 * Assign new session (doctor only)
 */
router.post('/', requireDoctor, async (req, res) => {
  try {
    const db = getDb();
    const { patientId, date, duration, exercises, notes, doctorRemarks } = req.body;

    if (!patientId || !date || !exercises || exercises.length === 0) {
      return res.status(400).json({ error: 'Patient, date, and exercises are required' });
    }

    // Get patient
    const patientDoc = await db.collection('patients').doc(patientId).get();
    if (!patientDoc.exists) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Determine session number
    const existingSessions = await db.collection('sessions')
      .where('patientId', '==', patientId)
      .get();

    const sessionNumbers = existingSessions.docs.map(d => d.data().sessionNumber);
    const nextNumber = sessionNumbers.length > 0 ? Math.max(...sessionNumbers) + 1 : 1;

    // Check if there's a current session
    const hasCurrentSession = existingSessions.docs.some(d => d.data().status === 'current');
    const newStatus = hasCurrentSession ? 'locked' : 'current';

    const sessionId = 'sess-' + uuidv4().slice(0, 8);

    const session = {
      patientId,
      sessionNumber: nextNumber,
      date,
      status: newStatus,
      exercises,
      doctorRemarks: doctorRemarks || '',
      patientFeedback: '',
      notes: notes || `Session ${nextNumber} assigned by doctor.`,
      duration: duration || '45 min',
      createdAt: new Date().toISOString(),
    };

    await db.collection('sessions').doc(sessionId).set(session);

    // Update patient session count
    const patient = patientDoc.data();
    await db.collection('patients').doc(patientId).update({
      sessionCount: patient.sessionCount + 1,
    });

    // Add calendar event
    await db.collection('calendarEvents').add({
      date,
      status: 'upcoming',
      patientName: patient.name,
      time: '10:00',
    });

    res.status(201).json({ id: sessionId, ...session });
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/sessions/:id
 * Edit session (doctor only)
 */
router.put('/:id', requireDoctor, async (req, res) => {
  try {
    const db = getDb();
    const sessionId = req.params.id;
    const { date, duration, exercises, notes, doctorRemarks } = req.body;

    const doc = await db.collection('sessions').doc(sessionId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const updates = {};
    if (date) updates.date = date;
    if (duration) updates.duration = duration;
    if (exercises) updates.exercises = exercises;
    if (notes !== undefined) updates.notes = notes;
    if (doctorRemarks !== undefined) updates.doctorRemarks = doctorRemarks;
    updates.updatedAt = new Date().toISOString();

    await db.collection('sessions').doc(sessionId).update(updates);

    const updated = await db.collection('sessions').doc(sessionId).get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error('Update session error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/sessions/:id/complete
 * Mark session complete + unlock next
 */
router.put('/:id/complete', requireDoctor, async (req, res) => {
  try {
    const db = getDb();
    const sessionId = req.params.id;

    const doc = await db.collection('sessions').doc(sessionId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = doc.data();

    // Mark as completed
    await db.collection('sessions').doc(sessionId).update({ status: 'completed' });

    // Unlock next session
    const nextSessions = await db.collection('sessions')
      .where('patientId', '==', session.patientId)
      .where('sessionNumber', '==', session.sessionNumber + 1)
      .limit(1)
      .get();

    if (!nextSessions.empty) {
      await nextSessions.docs[0].ref.update({ status: 'current' });
    }

    // Update patient completed count
    const patientDoc = await db.collection('patients').doc(session.patientId).get();
    if (patientDoc.exists) {
      const patient = patientDoc.data();
      const newCompleted = patient.completedSessions + 1;
      const updates = { completedSessions: newCompleted };
      if (newCompleted >= patient.sessionCount) {
        updates.status = 'completed';
      }
      await db.collection('patients').doc(session.patientId).update(updates);
    }

    res.json({ message: `Session ${session.sessionNumber} marked as completed` });
  } catch (err) {
    console.error('Complete session error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


/**
 * POST /api/sessions/:id/exercises/:exerciseId/upload
 * Upload workout video/photo for a specific exercise in a session (patient)
 */
const multer = require('multer');
const path = require('path');

const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'workouts');
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${req.params.id}_${req.params.exerciseId}_${Date.now()}${ext}`;
    cb(null, name);
  }
});

const mediaUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowed = /mp4|mov|webm|avi|jpg|jpeg|png|gif|heic/i;
    const ext = path.extname(file.originalname);
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported. Use MP4, MOV, WEBM, AVI, JPG, PNG, GIF.'));
    }
  }
});

router.post('/:id/exercises/:exerciseId/upload', mediaUpload.single('media'), async (req, res) => {
  try {
    const db = getDb();
    const { id: sessionId, exerciseId } = req.params;

    // Verify session exists
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionDoc.data();

    // Check exercise is part of this session
    const exercise = session.exercises.find(e => e.exerciseId === exerciseId);
    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found in this session' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = `/uploads/workouts/${req.file.filename}`;
    const isVideo = /mp4|mov|webm|avi/i.test(path.extname(req.file.originalname));

    // Create media record
    const mediaId = 'media-' + uuidv4().slice(0, 8);
    const mediaRecord = {
      id: mediaId,
      sessionId,
      exerciseId,
      patientId: session.patientId,
      type: isVideo ? 'video' : 'photo',
      filename: req.file.originalname,
      path: filePath,
      size: req.file.size,
      note: req.body.note || '',
      uploadedAt: new Date().toISOString(),
    };

    await db.collection('workoutMedia').doc(mediaId).set(mediaRecord);

    res.status(201).json(mediaRecord);
  } catch (err) {
    console.error('Upload workout media error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

/**
 * GET /api/sessions/:id/media
 * Get all uploaded media for a session
 */
router.get('/:id/media', async (req, res) => {
  try {
    const db = getDb();
    const sessionId = req.params.id;

    const snapshot = await db.collection('workoutMedia')
      .where('sessionId', '==', sessionId)
      .get();

    const media = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Group by exerciseId
    const grouped = {};
    media.forEach(m => {
      if (!grouped[m.exerciseId]) grouped[m.exerciseId] = [];
      grouped[m.exerciseId].push(m);
    });

    res.json({ media, grouped });
  } catch (err) {
    console.error('Get session media error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/sessions/:id/media/:mediaId
 * Delete a specific media upload
 */
router.delete('/:id/media/:mediaId', async (req, res) => {
  try {
    const db = getDb();
    const { mediaId } = req.params;
    const fs = require('fs');

    const doc = await db.collection('workoutMedia').doc(mediaId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const mediaData = doc.data();

    // Delete file from disk
    const filePath = path.join(__dirname, '..', mediaData.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete record
    await db.collection('workoutMedia').doc(mediaId).delete();

    res.json({ message: 'Media deleted successfully' });
  } catch (err) {
    console.error('Delete media error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

