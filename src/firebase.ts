import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCMBS0rzdYy4uDuNfXjclD8AwlvUMVMFCY",
  authDomain: "ptnsport-ad49e.firebaseapp.com",
  databaseURL: "https://ptnsport-ad49e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ptnsport-ad49e",
  storageBucket: "ptnsport-ad49e.firebasestorage.app",
  messagingSenderId: "940657150029",
  appId: "1:940657150029:web:f2a3811c145743dbad7404"
};

const app = initializeApp(firebaseConfig);

// Silence internal Firestore SDK logs/errors in console to prevent quota alert clutter
try {
  setLogLevel("silent");
} catch (e) {
  console.log("Failed to set Firestore log level to silent: ", e);
}

// Persistent local cache: repeat visits are served from IndexedDB and only
// changed documents are re-read from the server, keeping daily read quota low.
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
