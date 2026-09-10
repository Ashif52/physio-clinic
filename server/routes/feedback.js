/* ============================================
   PhysioFlow — Feedback Routes
   ============================================ */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../firebase');
const { authenticate, requireDoctor } = require('../middleware/auth');

router.use(authenticate);

/**
 * GET /api/feedback
 * Get feedback (filtered by patient_id)
 */
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { patientId } = req.query;

    let query = db.collection('feedback');

    // If patient, only show their feedback
    if (req.user.role === 'patient') {
      query = query.where('patientId', '==', req.user.id);
    } else if (patientId) {
      query = query.where('patientId', '==', patientId);
    }

    const snapshot = await query.get();
    const feedback = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort by date descending
    feedback.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(feedback);
  } catch (err) {
    console.error('Get feedback error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/feedback
 * Patient submits feedback
 */
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { sessionId, painLevel, comments, difficulty, confidence, completed } = req.body;

    const feedbackId = 'fb-' + uuidv4().slice(0, 8);

    const feedback = {
      patientId: req.user.id,
      sessionId: sessionId || '',
      painLevel: painLevel || 5,
      comments: comments || '',
      difficulty: difficulty || 'Moderate',
      confidence: parseInt(confidence) || 7,
      completed: completed || false,
      doctorReply: '',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    await db.collection('feedback').doc(feedbackId).set(feedback);

    res.status(201).json({ id: feedbackId, ...feedback });
  } catch (err) {
    console.error('Create feedback error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/feedback/:id/reply
 * Doctor replies to feedback
 */
router.put('/:id/reply', requireDoctor, async (req, res) => {
  try {
    const db = getDb();
    const { reply } = req.body;

    const doc = await db.collection('feedback').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    await db.collection('feedback').doc(req.params.id).update({
      doctorReply: reply || '',
      repliedAt: new Date().toISOString(),
    });

    res.json({ message: 'Reply added successfully' });
  } catch (err) {
    console.error('Reply feedback error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
