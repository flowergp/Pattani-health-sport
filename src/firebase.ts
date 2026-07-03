import { initializeApp } from "firebase/app";
import { initializeFirestore, setLogLevel } from "firebase/firestore";

// New Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBmITE7up6mCfJLDtRHvPlUHcftnHQG8So",
  authDomain: "ptnsports-25886.firebaseapp.com",
  projectId: "ptnsports-25886",
  storageBucket: "ptnsports-25886.firebasestorage.app",
  messagingSenderId: "396135126232",
  appId: "1:396135126232:web:b99a9ff5289307f9ef33ad",
  measurementId: "G-QWXRPP2ZW8"
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
});

