import { initializeApp } from "firebase/app";
import { initializeFirestore, setLogLevel } from "firebase/firestore";
import appletConfig from "../firebase-applet-config.json";

// Default/Production configuration
const prodConfig = {
  apiKey: "AIzaSyBmITE7up6mCfJLDtRHvPlUHcftnHQG8So",
  authDomain: "ptnsports-25886.firebaseapp.com",
  projectId: "ptnsports-25886",
  storageBucket: "ptnsports-25886.firebasestorage.app",
  messagingSenderId: "396135126232",
  appId: "1:396135126232:web:b99a9ff5289307f9ef33ad",
  measurementId: "G-QWXRPP2ZW8"
};

// Detect if we are running in the sandbox/preview environment
const isSandbox =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("googleusercontent.com") ||
   window.location.hostname.includes("usercontent.google.com") ||
   window.location.hostname.includes("localhost") ||
   window.location.hostname === "127.0.0.1" ||
   window.location.hostname === "0.0.0.0");

const firebaseConfig = isSandbox && appletConfig.projectId
  ? {
      apiKey: appletConfig.apiKey,
      authDomain: appletConfig.authDomain,
      projectId: appletConfig.projectId,
      storageBucket: appletConfig.storageBucket,
      messagingSenderId: appletConfig.messagingSenderId,
      appId: appletConfig.appId,
      measurementId: appletConfig.measurementId || ""
    }
  : prodConfig;

const app = initializeApp(firebaseConfig);

// Silence internal Firestore SDK logs/errors in console to prevent quota alert clutter
try {
  setLogLevel("silent");
} catch (e) {
  console.log("Failed to set Firestore log level to silent: ", e);
}

// Specify firestoreDatabaseId if sandbox uses a named database
const databaseId = isSandbox && appletConfig.firestoreDatabaseId
  ? appletConfig.firestoreDatabaseId
  : "(default)";

export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  databaseId: databaseId
});


