/* ============================================
   PhysioFlow — Exercise Routes
   Doctor can CRUD exercises stored in Firestore
   ============================================ */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../firebase');
const { authenticate, requireDoctor } = require('../middleware/auth');

// ---- File Upload Config ----
const uploadsDir = path.join(__dirname, '..', 'uploads', 'exercises');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `exercise-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|mov|avi|webm|pdf|jpg|jpeg|png|gif/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext || mime) {
      cb(null, true);
    } else {
      cb(new Error('Only video, PDF, and image files are allowed'));
    }
  },
});

router.use(authenticate);

/**
 * GET /api/exercises
 * List all exercises (with category filter)
 */
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { category } = req.query;

    let query = db.collection('exercises');
    if (category && category !== 'all') {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.get();
    const exercises = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort by title
    exercises.sort((a, b) => a.title.localeCompare(b.title));

    res.json(exercises);
  } catch (err) {
    console.error('Get exercises error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/exercises/:id
 * Get exercise details
 */
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('exercises').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error('Get exercise error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/exercises
 * Doctor creates/uploads a new exercise (stored in Firestore)
 */
router.post('/', requireDoctor, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'pdf', maxCount: 1 },
]), async (req, res) => {
  try {
    const db = getDb();
    const { title, category, description, difficulty, duration, thumbnail } = req.body;

    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category are required' });
    }

    const exerciseId = 'ex-' + uuidv4().slice(0, 8);

    const exercise = {
      title,
      category,
      description: description || '',
      difficulty: difficulty || 'Medium',
      duration: duration || '10 min',
      thumbnail: thumbnail || '🏋️',
      video: req.files?.video ? `/uploads/exercises/${req.files.video[0].filename}` : (req.body.video || req.body.videoUrl || ''),
      pdf: req.files?.pdf ? `/uploads/exercises/${req.files.pdf[0].filename}` : (req.body.pdf || req.body.pdfUrl || ''),
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
    };

    await db.collection('exercises').doc(exerciseId).set(exercise);

    res.status(201).json({ id: exerciseId, ...exercise });
  } catch (err) {
    console.error('Create exercise error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/exercises/:id
 * Doctor updates an exercise
 */
router.put('/:id', requireDoctor, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'pdf', maxCount: 1 },
]), async (req, res) => {
  try {
    const db = getDb();
    const exerciseId = req.params.id;

    const doc = await db.collection('exercises').doc(exerciseId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    const updates = {};
    const allowedFields = ['title', 'category', 'description', 'difficulty', 'duration', 'thumbnail', 'video', 'pdf'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (req.files?.video) {
      updates.video = `/uploads/exercises/${req.files.video[0].filename}`;
    }
    if (req.files?.pdf) {
      updates.pdf = `/uploads/exercises/${req.files.pdf[0].filename}`;
    }

    updates.updatedAt = new Date().toISOString();

    await db.collection('exercises').doc(exerciseId).update(updates);

    const updated = await db.collection('exercises').doc(exerciseId).get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error('Update exercise error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/exercises/:id/video
 * Doctor deletes just the video from an exercise
 */
router.delete('/:id/video', requireDoctor, async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('exercises').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    const exData = doc.data();
    if (exData.video && exData.video.startsWith('/uploads/exercises/')) {
      const filePath = path.join(__dirname, '..', exData.video);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { console.warn('Could not delete file:', e); }
      }
    }

    await db.collection('exercises').doc(req.params.id).update({
      video: '',
      updatedAt: new Date().toISOString()
    });

    res.json({ message: 'Video removed from exercise successfully' });
  } catch (err) {
    console.error('Delete exercise video error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/exercises/:id
 * Doctor deletes an exercise and its uploaded files
 */
router.delete('/:id', requireDoctor, async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('exercises').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    const exData = doc.data();

    // Delete local video file if present
    if (exData.video && exData.video.startsWith('/uploads/exercises/')) {
      const filePath = path.join(__dirname, '..', exData.video);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { console.warn('Could not delete file:', e); }
      }
    }

    // Delete local PDF file if present
    if (exData.pdf && exData.pdf.startsWith('/uploads/exercises/')) {
      const filePath = path.join(__dirname, '..', exData.pdf);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { console.warn('Could not delete file:', e); }
      }
    }

    await db.collection('exercises').doc(req.params.id).delete();

    res.json({ message: 'Exercise deleted successfully' });
  } catch (err) {
    console.error('Delete exercise error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

