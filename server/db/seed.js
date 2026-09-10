/* ============================================
   PhysioFlow — Firestore Seed Script
   
   Seeds Firestore with demo data:
   - 1 doctor
   - 10 patients  
   - 20 exercises
   - Generated sessions, feedback, calendar events
   
   Run: node db/seed.js
   ============================================ */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { initFirebase, getDb } = require('../firebase');

async function seed() {
  console.log('🌱 Starting Firestore seed...\n');

  initFirebase();
  const db = getDb();

  // ---- Clear existing data ----
  console.log('🗑️  Clearing existing data...');
  const collections = ['doctors', 'patients', 'exercises', 'sessions', 'feedback', 'calendarEvents'];
  for (const col of collections) {
    const snap = await db.collection(col).get();
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    if (snap.docs.length > 0) await batch.commit();
    console.log(`   ✓ Cleared ${col} (${snap.docs.length} docs)`);
  }

  // ---- Hash passwords ----
  const passwordHash = await bcrypt.hash('password', 10);

  // ============================================
  // DOCTORS
  // ============================================
  console.log('\n👨‍⚕️ Seeding doctors...');
  const doctor = {
    username: 'dr.smith',
    password_hash: passwordHash,
    name: 'Dr. Sarah Smith',
    email: 'sarah.smith@physioflow.com',
    phone: '+1 (555) 234-5678',
    specialty: 'Sports Rehabilitation',
    avatar: 'SS',
    clinicName: 'PhysioFlow Wellness Clinic',
    clinicLogo: '',
    notifications: { newSession: true, feedback: true, videoUpload: true, treatmentComplete: true },
  };
  await db.collection('doctors').doc('doc-1').set(doctor);
  console.log('   ✓ Dr. Sarah Smith (dr.smith / password)');

  // ============================================
  // EXERCISES (Doctor's library — stored in DB)
  // ============================================
  console.log('\n🏋️ Seeding exercises...');
  const exercises = [
    { id: 'ex-1', title: 'Neck Flexion Stretch', category: 'Neck', description: 'Gently tilt head forward bringing chin to chest. Hold 15–30 seconds.', difficulty: 'Easy', duration: '5 min', thumbnail: '🧘', video: '', pdf: '' },
    { id: 'ex-2', title: 'Cervical Rotation', category: 'Neck', description: 'Slowly rotate head side to side, maintaining chin level. Repeat 10 times each direction.', difficulty: 'Easy', duration: '5 min', thumbnail: '🔄', video: '', pdf: '' },
    { id: 'ex-3', title: 'Shoulder Pendulum Swing', category: 'Shoulder', description: 'Lean forward and let the arm swing in small circles. Gradually increase circle size.', difficulty: 'Easy', duration: '5 min', thumbnail: '🔘', video: '', pdf: '' },
    { id: 'ex-4', title: 'External Rotation with Band', category: 'Shoulder', description: 'Secure resistance band at elbow height. Rotate forearm outward keeping elbow at side.', difficulty: 'Medium', duration: '10 min', thumbnail: '💪', video: '', pdf: '' },
    { id: 'ex-5', title: 'Cat-Cow Stretch', category: 'Back', description: 'On hands and knees, alternate between arching and rounding the spine. 10 repetitions.', difficulty: 'Easy', duration: '5 min', thumbnail: '🐱', video: '', pdf: '' },
    { id: 'ex-6', title: 'Bird Dog Exercise', category: 'Back', description: 'From hands and knees, extend opposite arm and leg. Hold 5 seconds. 10 reps each side.', difficulty: 'Medium', duration: '10 min', thumbnail: '🐕', video: '', pdf: '' },
    { id: 'ex-7', title: 'Dead Bug', category: 'Back', description: 'Lying on back with arms extended, slowly lower opposite arm and leg. Core engaged throughout.', difficulty: 'Medium', duration: '8 min', thumbnail: '🪲', video: '', pdf: '' },
    { id: 'ex-8', title: 'Straight Leg Raise', category: 'Knee', description: 'Lying down, tighten thigh muscles and lift leg 6 inches. Hold 5 seconds. 3 sets of 10.', difficulty: 'Easy', duration: '8 min', thumbnail: '🦵', video: '', pdf: '' },
    { id: 'ex-9', title: 'Wall Sit', category: 'Knee', description: 'Slide back down wall until knees at 90°. Hold 20–60 seconds. Repeat 5 times.', difficulty: 'Medium', duration: '10 min', thumbnail: '🧱', video: '', pdf: '' },
    { id: 'ex-10', title: 'Terminal Knee Extension', category: 'Knee', description: 'With band behind knee, push knee straight against resistance. 3 sets of 12.', difficulty: 'Medium', duration: '10 min', thumbnail: '🔗', video: '', pdf: '' },
    { id: 'ex-11', title: 'Hip Bridge', category: 'Hip', description: 'Lying on back with knees bent, lift hips to create straight line from shoulders to knees.', difficulty: 'Easy', duration: '8 min', thumbnail: '🌉', video: '', pdf: '' },
    { id: 'ex-12', title: 'Clamshell Exercise', category: 'Hip', description: 'Lying on side with knees bent, open top knee while keeping feet together. 3 sets of 15.', difficulty: 'Easy', duration: '8 min', thumbnail: '🐚', video: '', pdf: '' },
    { id: 'ex-13', title: 'Ankle Alphabet', category: 'Ankle', description: 'Trace the alphabet in the air with your foot. Repeat 3 times with each foot.', difficulty: 'Easy', duration: '5 min', thumbnail: '🔤', video: '', pdf: '' },
    { id: 'ex-14', title: 'Calf Raise', category: 'Ankle', description: 'Stand on edge of step, rise up on toes then lower heels below step level. 3 sets of 15.', difficulty: 'Medium', duration: '8 min', thumbnail: '⬆️', video: '', pdf: '' },
    { id: 'ex-15', title: 'Single-Leg Balance', category: 'Ankle', description: 'Stand on one leg for 30 seconds. Progress to eyes closed. 5 reps each leg.', difficulty: 'Easy', duration: '5 min', thumbnail: '⚖️', video: '', pdf: '' },
    { id: 'ex-16', title: 'Plank Hold', category: 'Sports Rehab', description: 'Maintain push-up position with forearms on ground. Hold 30–60 seconds. 3 sets.', difficulty: 'Medium', duration: '8 min', thumbnail: '🏋️', video: '', pdf: '' },
    { id: 'ex-17', title: 'Lateral Band Walk', category: 'Sports Rehab', description: 'Place band around ankles and walk sideways maintaining tension. 3 sets of 20 steps.', difficulty: 'Medium', duration: '10 min', thumbnail: '🏃', video: '', pdf: '' },
    { id: 'ex-18', title: 'Box Jump', category: 'Sports Rehab', description: 'Jump onto a stable box/platform. Step down. Progress height gradually. 3 sets of 8.', difficulty: 'Hard', duration: '12 min', thumbnail: '📦', video: '', pdf: '' },
    { id: 'ex-19', title: 'Resistance Band Row', category: 'Back', description: 'Secure band in front of you. Pull elbows back squeezing shoulder blades. 3 sets of 12.', difficulty: 'Medium', duration: '10 min', thumbnail: '🚣', video: '', pdf: '' },
    { id: 'ex-20', title: 'Agility Ladder Drill', category: 'Sports Rehab', description: 'Perform quick feet drills through agility ladder. Various patterns. 5 min continuous.', difficulty: 'Hard', duration: '10 min', thumbnail: '⚡', video: '', pdf: '' },
  ];

  const exBatch = db.batch();
  for (const ex of exercises) {
    exBatch.set(db.collection('exercises').doc(ex.id), {
      title: ex.title,
      category: ex.category,
      description: ex.description,
      difficulty: ex.difficulty,
      duration: ex.duration,
      thumbnail: ex.thumbnail,
      video: ex.video,
      pdf: ex.pdf,
      createdBy: 'doc-1',
      createdAt: new Date().toISOString(),
    });
  }
  await exBatch.commit();
  console.log(`   ✓ ${exercises.length} exercises seeded`);

  // ============================================
  // PATIENTS
  // ============================================
  console.log('\n👥 Seeding patients...');
  const patients = [
    { id: 'pat-1', username: 'john.doe', name: 'John Doe', age: 34, gender: 'Male', phone: '+1 (555) 111-0001', email: 'john.doe@email.com', avatarColor: '#5c7cfa', medicalHistory: 'ACL reconstruction 2024', diagnosis: 'Post-operative ACL rehabilitation', treatmentPlan: 'Progressive strength and mobility program — 12 sessions over 8 weeks', sessionCount: 12, completedSessions: 8, startDate: '2026-04-01', endDate: '2026-06-30', status: 'active', painLevel: 3, notes: 'Progressing well. Cleared for light jogging.' },
    { id: 'pat-2', username: 'jane.wilson', name: 'Jane Wilson', age: 28, gender: 'Female', phone: '+1 (555) 111-0002', email: 'jane.wilson@email.com', avatarColor: '#20c997', medicalHistory: 'Chronic lower back pain', diagnosis: 'Lumbar disc herniation L4-L5', treatmentPlan: 'Core stabilization and posture correction — 10 sessions', sessionCount: 10, completedSessions: 10, startDate: '2026-02-15', endDate: '2026-05-15', status: 'completed', painLevel: 2, notes: 'Treatment completed successfully.' },
    { id: 'pat-3', username: 'mike.chen', name: 'Michael Chen', age: 45, gender: 'Male', phone: '+1 (555) 111-0003', email: 'mike.chen@email.com', avatarColor: '#ff922b', medicalHistory: 'Tennis elbow, right arm', diagnosis: 'Lateral epicondylitis', treatmentPlan: 'Eccentric exercises and manual therapy — 8 sessions', sessionCount: 8, completedSessions: 5, startDate: '2026-05-01', endDate: '2026-07-15', status: 'active', painLevel: 5, notes: 'Moderate improvement. Adjusting exercise intensity.' },
    { id: 'pat-4', username: 'emma.brown', name: 'Emma Brown', age: 62, gender: 'Female', phone: '+1 (555) 111-0004', email: 'emma.brown@email.com', avatarColor: '#7950f2', medicalHistory: 'Total knee replacement — right knee', diagnosis: 'Post TKR rehabilitation', treatmentPlan: 'Range of motion and strength training — 15 sessions', sessionCount: 15, completedSessions: 3, startDate: '2026-05-20', endDate: '2026-09-01', status: 'active', painLevel: 6, notes: 'Early post-op phase. Focus on extension and flexion.' },
    { id: 'pat-5', username: 'alex.kumar', name: 'Alex Kumar', age: 22, gender: 'Male', phone: '+1 (555) 111-0005', email: 'alex.kumar@email.com', avatarColor: '#0ca678', medicalHistory: 'Shoulder dislocation — sports injury', diagnosis: 'Anterior shoulder instability', treatmentPlan: 'Rotator cuff strengthening and proprioception — 10 sessions', sessionCount: 10, completedSessions: 7, startDate: '2026-04-10', endDate: '2026-07-10', status: 'active', painLevel: 2, notes: 'Near completion. Excellent compliance.' },
    { id: 'pat-6', username: 'lisa.park', name: 'Lisa Park', age: 38, gender: 'Female', phone: '+1 (555) 111-0006', email: 'lisa.park@email.com', avatarColor: '#fa5252', medicalHistory: 'Plantar fasciitis — bilateral', diagnosis: 'Chronic plantar fasciitis', treatmentPlan: 'Stretching, orthotics, and shockwave therapy — 6 sessions', sessionCount: 6, completedSessions: 6, startDate: '2026-03-01', endDate: '2026-05-01', status: 'completed', painLevel: 1, notes: 'Discharged. Symptom-free.' },
    { id: 'pat-7', username: 'tom.martin', name: 'Thomas Martin', age: 55, gender: 'Male', phone: '+1 (555) 111-0007', email: 'tom.martin@email.com', avatarColor: '#e8590c', medicalHistory: 'Cervical spondylosis', diagnosis: 'Degenerative disc disease C5-C6', treatmentPlan: 'Neck strengthening and postural education — 10 sessions', sessionCount: 10, completedSessions: 2, startDate: '2026-06-01', endDate: '2026-08-30', status: 'active', painLevel: 7, notes: 'High pain levels. Gentle approach required.' },
    { id: 'pat-8', username: 'sophia.lee', name: 'Sophia Lee', age: 30, gender: 'Female', phone: '+1 (555) 111-0008', email: 'sophia.lee@email.com', avatarColor: '#5c7cfa', medicalHistory: "Runner's knee", diagnosis: 'Patellofemoral pain syndrome', treatmentPlan: 'VMO strengthening and biomechanical assessment — 8 sessions', sessionCount: 8, completedSessions: 0, startDate: '2026-06-15', endDate: '2026-08-15', status: 'pending', painLevel: 4, notes: 'Initial assessment scheduled.' },
    { id: 'pat-9', username: 'david.jones', name: 'David Jones', age: 48, gender: 'Male', phone: '+1 (555) 111-0009', email: 'david.jones@email.com', avatarColor: '#20c997', medicalHistory: 'Frozen shoulder — left', diagnosis: 'Adhesive capsulitis', treatmentPlan: 'Joint mobilization and stretching — 12 sessions', sessionCount: 12, completedSessions: 9, startDate: '2026-03-15', endDate: '2026-07-15', status: 'active', painLevel: 4, notes: 'Significant ROM improvement noted.' },
    { id: 'pat-10', username: 'amy.taylor', name: 'Amy Taylor', age: 26, gender: 'Female', phone: '+1 (555) 111-0010', email: 'amy.taylor@email.com', avatarColor: '#ff922b', medicalHistory: 'Ankle sprain — grade II', diagnosis: 'Lateral ankle ligament injury', treatmentPlan: 'RICE protocol then progressive strengthening — 6 sessions', sessionCount: 6, completedSessions: 4, startDate: '2026-05-10', endDate: '2026-07-01', status: 'active', painLevel: 3, notes: 'Weight-bearing now tolerated. Good progress.' },
  ];

  const patBatch = db.batch();
  for (const p of patients) {
    const initials = p.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    patBatch.set(db.collection('patients').doc(p.id), {
      username: p.username,
      password_hash: passwordHash,
      plainPassword: 'password',
      name: p.name,
      age: p.age,
      gender: p.gender,
      phone: p.phone,
      email: p.email,
      photo: '',
      avatar: initials,
      avatarColor: p.avatarColor,
      medicalHistory: p.medicalHistory,
      diagnosis: p.diagnosis,
      treatmentPlan: p.treatmentPlan,
      sessionCount: p.sessionCount,
      completedSessions: p.completedSessions,
      startDate: p.startDate,
      endDate: p.endDate,
      status: p.status,
      painLevel: p.painLevel,
      doctorId: 'doc-1',
      notes: p.notes,
      createdAt: new Date().toISOString(),
    });
  }
  await patBatch.commit();
  console.log(`   ✓ ${patients.length} patients seeded`);

  // ============================================
  // SESSIONS
  // ============================================
  console.log('\n📋 Seeding sessions...');
  let sessionCount = 0;

  for (const patient of patients) {
    // Batch in groups of up to 500 (Firestore limit)
    const batch = db.batch();
    for (let i = 1; i <= patient.sessionCount; i++) {
      const date = new Date(patient.startDate);
      date.setDate(date.getDate() + (i - 1) * 4);
      const isCompleted = i <= patient.completedSessions;
      const isCurrent = i === patient.completedSessions + 1;

      // Pick 3-4 random exercises
      const shuffled = [...exercises].sort(() => 0.5 - Math.random());
      const sessionExercises = shuffled.slice(0, 3 + Math.floor(Math.random() * 2)).map(ex => ({
        exerciseId: ex.id,
        title: ex.title,
        sets: Math.floor(Math.random() * 3) + 2,
        reps: (Math.floor(Math.random() * 4) + 2) * 5,
        restTime: [30, 45, 60, 90][Math.floor(Math.random() * 4)],
        duration: ex.duration,
        completed: isCompleted,
        instructions: ex.description,
      }));

      const sessionId = `sess-${patient.id}-${i}`;
      batch.set(db.collection('sessions').doc(sessionId), {
        patientId: patient.id,
        sessionNumber: i,
        date: date.toISOString().split('T')[0],
        status: isCompleted ? 'completed' : isCurrent ? 'current' : 'locked',
        exercises: sessionExercises,
        doctorRemarks: isCompleted ? 'Good progress. Continue as planned.' : '',
        patientFeedback: isCompleted ? 'Feeling better after this session.' : '',
        notes: isCompleted ? `Session ${i} completed successfully.` : `Session ${i} scheduled.`,
        duration: `${30 + Math.floor(Math.random() * 30)} min`,
      });
      sessionCount++;
    }
    await batch.commit();
  }
  console.log(`   ✓ ${sessionCount} sessions seeded`);

  // ============================================
  // FEEDBACK
  // ============================================
  console.log('\n💬 Seeding feedback...');
  let fbCount = 0;
  const fbBatch = db.batch();
  for (const patient of patients.filter(p => p.completedSessions > 0)) {
    for (let i = 1; i <= Math.min(patient.completedSessions, 3); i++) {
      const feedbackId = `fb-${patient.id}-${i}`;
      fbBatch.set(db.collection('feedback').doc(feedbackId), {
        patientId: patient.id,
        sessionId: `sess-${patient.id}-${i}`,
        painLevel: Math.max(1, patient.painLevel - i + 1),
        comments: 'Exercise was manageable. Felt good afterward.',
        difficulty: ['Easy', 'Moderate', 'Challenging'][Math.floor(Math.random() * 3)],
        confidence: Math.floor(Math.random() * 5) + 6,
        completed: true,
        doctorReply: i === 1 ? 'Great progress! Keep up the good work.' : '',
        date: new Date(new Date(patient.startDate).getTime() + (i - 1) * 4 * 86400000).toISOString().split('T')[0],
      });
      fbCount++;
    }
  }
  await fbBatch.commit();
  console.log(`   ✓ ${fbCount} feedback entries seeded`);

  // ============================================
  // CALENDAR EVENTS
  // ============================================
  console.log('\n📅 Seeding calendar events...');
  const calBatch = db.batch();
  const statuses = ['completed', 'upcoming', 'cancelled', 'missed'];
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  let evCount = 0;

  for (let d = 1; d <= 28; d += 2) {
    if (Math.random() > 0.4) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const p = patients[Math.floor(Math.random() * patients.length)];
      calBatch.set(db.collection('calendarEvents').doc(`cal-${d}-${evCount}`), {
        date: dateStr,
        status: statuses[Math.floor(Math.random() * 4)],
        patientName: p.name,
        time: `${9 + Math.floor(Math.random() * 8)}:${Math.random() > 0.5 ? '00' : '30'}`,
      });
      evCount++;
    }
  }

  // Ensure today has events
  const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  calBatch.set(db.collection('calendarEvents').doc('cal-today-1'), {
    date: todayStr, status: 'upcoming', patientName: 'John Doe', time: '10:00',
  });
  calBatch.set(db.collection('calendarEvents').doc('cal-today-2'), {
    date: todayStr, status: 'completed', patientName: 'Michael Chen', time: '09:00',
  });
  calBatch.set(db.collection('calendarEvents').doc('cal-today-3'), {
    date: todayStr, status: 'upcoming', patientName: 'Emma Brown', time: '14:00',
  });
  evCount += 3;

  await calBatch.commit();
  console.log(`   ✓ ${evCount} calendar events seeded`);

  // ============================================
  // DONE
  // ============================================
  console.log('\n─────────────────────────────────');
  console.log('✅ Firestore seed complete!');
  console.log('─────────────────────────────────');
  console.log('\n📌 Demo Credentials:');
  console.log('   Doctor:  dr.smith / password');
  console.log('   Patient: john.doe / password');
  console.log('   (All patients use "password")\n');

  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
