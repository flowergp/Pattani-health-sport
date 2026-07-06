import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import * as fs from 'fs';
const cfg = JSON.parse(fs.readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8'));
const app = initializeApp({ apiKey: cfg.apiKey, authDomain: cfg.authDomain, projectId: cfg.projectId });
const db = initializeFirestore(app, {});
async function tryOp(name: string, fn: () => Promise<any>) {
  try { const r = await fn(); console.log('OK  ', name, r ?? ''); }
  catch (e: any) { console.log('FAIL', name, '->', e.code || e.message); }
}
await tryOp('read matches/_all', async () => {
  const s = await getDoc(doc(db, 'matches', '_all'));
  return 'exists: ' + s.exists();
});
await tryOp('write+delete matches/_ping', async () => {
  await setDoc(doc(db, 'matches', '_ping'), { ok: true });
  await deleteDoc(doc(db, 'matches', '_ping'));
  return 'written+deleted';
});
await tryOp('read users/_all', async () => {
  const s = await getDoc(doc(db, 'users', '_all'));
  return 'exists: ' + s.exists();
});
process.exit(0);
