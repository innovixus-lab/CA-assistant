import admin from 'firebase-admin';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase Admin SDK (uses Application Default Credentials on Cloud Run,
// or GOOGLE_APPLICATION_CREDENTIALS env var locally)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: firebaseConfig.projectId,
    });
  } catch {
    // Fallback: initialize without explicit credentials (works on Cloud Run)
    admin.initializeApp({ projectId: firebaseConfig.projectId });
  }
}

export const adminDb = admin.firestore();
export default admin;
