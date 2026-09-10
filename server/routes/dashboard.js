/* ============================================
   PhysioFlow — Dashboard Routes
   Aggregated stats for doctor + patient
   ============================================ */

const express = require('express');
const router = express.Router();
const { getDb } = require('../firebase');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

/**
 * GET /api/dashboard/stats
 * Aggregated stats for doctor dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    const db = getDb();

    // Get all patients
    const patientsSnap = await db.collection('patients').get();
    const patients = patientsSnap.docs.map(d => d.data());

    const active = patients.filter(p => p.status === 'active').length;
    const completed = patients.filter(p => p.status === 'completed').length;
    const pending = patients.filter(p => p.status === 'pending').length;

    // Get today's sessions
    const today = new Date().toISOString().split('T')[0];
    const sessionsSnap = await db.collection('sessions').get();
    const allSessions = sessionsSnap.docs.map(d => d.data());
    const todaySessions = allSessions.filter(s => s.date === today).length;
    const completedSessions = allSessions.filter(s => s.status === 'completed').length;

    // Get today's calendar events
    const calendarSnap = await db.collection('calendarEvents')
      .where('date', '==', today)
      .get();
    const todayClients = calendarSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Weekly session data (for charts)
    const weekDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const count = allSessions.filter(s => s.date === dateStr).length;
      weekDays.push({ day: dayName, count });
    }

    res.json({
      totalPatients: patients.length,
      activePatients: active,
      completedTreatments: completed,
      pendingReviews: pending,
      todaySessions: todaySessions || todayClients.length,
      todayClients,
      completedSessions,
      totalSessions: allSessions.length,
      weeklySessionData: weekDays,
      patientsByStatus: { active, completed, pending },
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/dashboard/patient-stats
 * Stats for patient dashboard
 */
router.get('/patient-stats', async (req, res) => {
  try {
    const db = getDb();
    const patientId = req.user.id;

    // Get patient
    const patientDoc = await db.collection('patients').doc(patientId).get();
    if (!patientDoc.exists) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    const patient = patientDoc.data();

    // Get sessions
    const sessionsSnap = await db.collection('sessions')
      .where('patientId', '==', patientId)
      .get();
    const sessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    sessions.sort((a, b) => a.sessionNumber - b.sessionNumber);

    const nextSession = sessions.find(s => s.status === 'current');
    const progress = patient.sessionCount > 0
      ? Math.round((patient.completedSessions / patient.sessionCount) * 100)
      : 0;

    res.json({
      progress,
      completedSessions: patient.completedSessions,
      totalSessions: patient.sessionCount,
      remaining: patient.sessionCount - patient.completedSessions,
      painLevel: patient.painLevel,
      status: patient.status,
      nextSession,
      notes: patient.notes,
      diagnosis: patient.diagnosis,
      treatmentPlan: patient.treatmentPlan,
    });
  } catch (err) {
    console.error('Patient stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
