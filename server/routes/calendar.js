/* ============================================
   PhysioFlow — Calendar Routes
   Doctor gets daily client schedule
   ============================================ */

const express = require('express');
const router = express.Router();
const { getDb } = require('../firebase');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

/**
 * GET /api/calendar
 * Get calendar events — doctor sees which clients are scheduled today and all days
 */
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { date, month, year } = req.query;

    const snapshot = await db.collection('calendarEvents').get();
    let events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter by specific date
    if (date) {
      events = events.filter(ev => ev.date === date);
    }

    // Filter by month/year
    if (month && year) {
      const prefix = `${year}-${String(parseInt(month) + 1).padStart(2, '0')}`;
      events = events.filter(ev => ev.date && ev.date.startsWith(prefix));
    }

    // Sort by date then time
    events.sort((a, b) => {
      const dateComp = (a.date || '').localeCompare(b.date || '');
      if (dateComp !== 0) return dateComp;
      return (a.time || '').localeCompare(b.time || '');
    });

    res.json(events);
  } catch (err) {
    console.error('Get calendar error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/calendar/today
 * Doctor gets today's client schedule
 */
router.get('/today', async (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    const snapshot = await db.collection('calendarEvents')
      .where('date', '==', today)
      .get();

    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    events.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    res.json({
      date: today,
      totalClients: events.length,
      events,
    });
  } catch (err) {
    console.error('Get today calendar error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/calendar
 * Add calendar event
 */
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { date, status, patientName, time } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const docRef = await db.collection('calendarEvents').add({
      date,
      status: status || 'upcoming',
      patientName: patientName || '',
      time: time || '10:00',
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ id: docRef.id, date, status, patientName, time });
  } catch (err) {
    console.error('Create calendar event error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
