/* ============================================
   PhysioFlow — Template Configuration
   
   This file defines the template settings that
   developers can customize per client deployment.
   Change these values to rebrand for any clinic.
   ============================================ */

module.exports = {
  // ---- Client Branding ----
  clientName: process.env.CLIENT_NAME || 'PhysioFlow',
  clientTagline: process.env.CLIENT_TAGLINE || 'Premium Physiotherapy Management',
  clientLogo: '', // URL or base64 logo
  
  // ---- Theme Defaults ----
  primaryColor: '#5c7cfa',
  accentColor: '#20c997',
  
  // ---- Feature Flags ----
  features: {
    patientLogin: true,        // Allow patients to log in
    videoUploads: true,        // Allow video uploads
    patientFeedback: true,     // Allow patient feedback
    reportGeneration: true,    // Allow report generation
    calendarView: true,        // Show calendar
    progressTracking: true,    // Show progress tracking
  },

  // ---- Session Defaults ----
  defaults: {
    sessionDuration: '45 min',
    maxSessions: 100,
    defaultSets: 3,
    defaultReps: 10,
    defaultRestTime: 60,
  },

  // ---- Roles ----
  roles: {
    doctor: {
      label: 'Physiotherapist',
      canCreatePatients: true,
      canRevokeAccess: true,
      canManageExercises: true,
      canViewReports: true,
      canManageCalendar: true,
    },
    patient: {
      label: 'Patient',
      canViewSessions: true,
      canSubmitFeedback: true,
      canViewProgress: true,
      canUploadMedia: true,
    }
  }
};
