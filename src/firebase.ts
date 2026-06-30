import { initializeApp } from "firebase/app";
import { initializeFirestore, setLogLevel } from "firebase/firestore";

// Config matches firebase-applet-config.json
const firebaseConfig = {
  projectId: "long-smoke-jwjrd",
  appId: "1:769527903239:web:1981d65d477dce4426a6a2",
  apiKey: "AIzaSyDw_VONXunFXPTs5PSwQFwHku48vtavFjQ",
  authDomain: "long-smoke-jwjrd.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-sportstournament-0ab39319-6c78-455f-b2fd-9fb0d12953a0",
  storageBucket: "long-smoke-jwjrd.firebasestorage.app",
  messagingSenderId: "769527903239"
};

const app = initializeApp(firebaseConfig);

// Silence internal Firestore SDK logs/errors in console to prevent quota alert clutter
try {
  setLogLevel("silent");
} catch (e) {
  console.log("Failed to set Firestore log level to silent: ", e);
}

export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, firebaseConfig.firestoreDatabaseId);

