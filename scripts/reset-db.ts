import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { getInitialMatches } from "../src/initialData.js";

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
const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, firebaseConfig.firestoreDatabaseId);

async function main() {
  console.log("Starting reset of matches in Firestore...");
  const defaultMatches = getInitialMatches();
  
  console.log("Fetching existing matches to delete...");
  const snap = await getDocs(collection(db, "matches"));
  
  // We can delete them in batches of 400
  const docIds = snap.docs.map(d => d.id);
  const deleteChunkSize = 400;
  for (let i = 0; i < docIds.length; i += deleteChunkSize) {
    const chunkIds = docIds.slice(i, i + deleteChunkSize);
    const deleteBatch = writeBatch(db);
    chunkIds.forEach(id => {
      deleteBatch.delete(doc(db, "matches", id));
    });
    await deleteBatch.commit();
    console.log(`Deleted chunk ${i} to ${i + chunkIds.length}`);
  }
  
  console.log(`Writing ${defaultMatches.length} default matches...`);
  const chunkSize = 200;
  for (let i = 0; i < defaultMatches.length; i += chunkSize) {
    const chunk = defaultMatches.slice(i, i + chunkSize);
    const writeBatchInstance = writeBatch(db);
    chunk.forEach((match) => {
      const matchRef = doc(db, "matches", match.id);
      writeBatchInstance.set(matchRef, match);
    });
    await writeBatchInstance.commit();
    console.log(`Committed write chunk ${i} to ${i + chunk.length}`);
  }
  console.log("Reset finished successfully!");
  process.exit(0);
}

main().catch(err => {
  console.error("Error running reset script:", err);
  process.exit(1);
});
