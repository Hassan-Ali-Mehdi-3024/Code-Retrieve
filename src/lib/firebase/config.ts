
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Log the config to help diagnose
console.log("Firebase Config Loaded:", firebaseConfig);

if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error(
    "CRITICAL Firebase configuration is missing. Please check your .env file and ensure NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and NEXT_PUBLIC_FIREBASE_PROJECT_ID are correctly set."
  );
  // This log helps confirm if the variables are even reaching this point as expected.
  // Firebase will likely throw its own error, but this provides an earlier warning.
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (e: any) {
    console.error("Error initializing Firebase app:", e.message);
    console.error("Firebase config that was used during initialization attempt:", firebaseConfig);
    // Throw a more specific error to halt execution if Firebase itself can't initialize.
    throw new Error(
      `Failed to initialize Firebase app: ${e.message}. Review the console for the configuration that was attempted and verify your .env file and Firebase project settings.`
    );
  }
} else {
  app = getApp();
}

try {
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e: any) {
  console.error("Error getting Auth or Firestore instance after app initialization:", e.message);
  // This error means the app object might exist, but services can't be retrieved.
  throw new Error(
    `Failed to get Firebase Auth/Firestore services: ${e.message}. This usually points to a problem with the Firebase app object or an incomplete/corrupted initialization. Check previous Firebase initialization logs.`
  );
}

export { app, auth, db };
