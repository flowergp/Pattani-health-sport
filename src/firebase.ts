import { initializeApp } from "firebase/app";
import { initializeFirestore, setLogLevel } from "firebase/firestore";
import appletConfig from "../firebase-applet-config.json";

// Default/Production configuration
const prodConfig = {
  apiKey: "AIzaSyBmITE7up6mCfJLDtRHvPlUHcftnHQG8So",
  authDomain: "ptnsports-25886.firebaseapp.com",
  databaseURL: "https://ptnsports-25886-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ptnsports-25886",
  storageBucket: "ptnsports-25886.firebasestorage.app",
  messagingSenderId: "396135126232",
  appId: "1:396135126232:web:b99a9ff5289307f9ef33ad",
  measurementId: "G-QWXRPP2ZW8"
};

// Detect if we are running in the sandbox/preview environment (anything that is NOT the production hosting domain)
const isProduction =
  typeof window !== "undefined" &&
  (window.location.hostname === "ptnsports-25886.web.app" ||
    window.location.hostname === "ptnsports-25886.firebaseapp.com" ||
    window.location.hostname.includes("ptnsports"));

// Always use the production configuration to connect to ptnsports-25886
const firebaseConfig = prodConfig;

const app = initializeApp(firebaseConfig);

// Silence internal Firestore SDK logs/errors in console to prevent quota alert clutter
try {
  setLogLevel("silent");
} catch (e) {
  console.log("Failed to set Firestore log level to silent: ", e);
}

// Always use default database for ptnsports-25886
const databaseId = "(default)";

export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  databaseId: databaseId
});


