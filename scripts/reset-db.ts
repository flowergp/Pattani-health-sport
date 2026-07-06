import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, writeBatch, doc, setDoc } from "firebase/firestore";
import { getInitialMatches } from "../src/initialData.js";

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appletConfig = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../firebase-applet-config.json"), "utf8")
);

const firebaseConfig = {
  apiKey: appletConfig.apiKey,
  authDomain: appletConfig.authDomain,
  projectId: appletConfig.projectId,
  storageBucket: appletConfig.storageBucket,
  messagingSenderId: appletConfig.messagingSenderId,
  appId: appletConfig.appId
};

const app = initializeApp(firebaseConfig);
const databaseId = appletConfig.firestoreDatabaseId || "(default)";
const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, databaseId);

async function main() {
  console.log("Starting reset of matches in Firestore...");
  const defaultMatches = getInitialMatches();

  // The app now stores all matches in ONE document: matches/_all.
  // Clean up any legacy per-match docs, then write the consolidated doc.
  console.log("Fetching legacy per-match docs to delete...");
  const snap = await getDocs(collection(db, "matches"));
  const legacyIds = snap.docs.map(d => d.id).filter(id => id !== "_all");
  const deleteChunkSize = 400;
  for (let i = 0; i < legacyIds.length; i += deleteChunkSize) {
    const chunkIds = legacyIds.slice(i, i + deleteChunkSize);
    const deleteBatch = writeBatch(db);
    chunkIds.forEach(id => {
      deleteBatch.delete(doc(db, "matches", id));
    });
    await deleteBatch.commit();
    console.log(`Deleted legacy chunk ${i} to ${i + chunkIds.length}`);
  }

  console.log(`Writing ${defaultMatches.length} default matches into matches/_all...`);
  await setDoc(doc(db, "matches", "_all"), { matches: defaultMatches });
  console.log("Reset finished successfully!");
  process.exit(0);
}

main().catch(err => {
  console.error("Error running reset script:", err);
  process.exit(1);
});
