// dump.js
import { writeFileSync } from "fs";
import { Parser } from "json2csv";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// ----- CONFIG -----
const PROJECT_ID = "qualtrics-game-backend";
// Choose ONE of these:
// a) root collection (e.g., "events")
const ROOT_COLLECTION = "events";
// b) OR set to null and use COLLECTION_GROUP below
const COLLECTION_GROUP = null; // e.g., "events" to pull all subcollections named "events"
// Optional filters
const SINCE_EPOCH_MS = null; // e.g., Date.parse("2025-08-27T00:00:00Z")
const UNTIL_EPOCH_MS = null; // e.g., Date.parse("2025-08-29T00:00:00Z")
// -------------------

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();

const asPlain = v => {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(asPlain);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, asPlain(x)]));
  }
  return v;
};

async function fetchDocs() {
  let q;
  if (COLLECTION_GROUP) {
    q = db.collectionGroup(COLLECTION_GROUP);
  } else {
    q = db.collection(ROOT_COLLECTION);
  }
  if (SINCE_EPOCH_MS) q = q.where("clientTimestamp", ">=", SINCE_EPOCH_MS);
  if (UNTIL_EPOCH_MS) q = q.where("clientTimestamp", "<", UNTIL_EPOCH_MS);

  const snap = await q.get();
  const rows = [];
  snap.forEach(doc => {
    const data = doc.data() || {};
    rows.push({ _path: doc.ref.path, _id: doc.id, ...asPlain(data) });
  });
  return rows;
}

function writeJSONCSV(name, rows) {
  writeFileSync(`${name}.json`, JSON.stringify(rows, null, 2), "utf8");

  // Flatten objects for CSV by stringifying nested values
  const flat = rows.map(r =>
    Object.fromEntries(
      Object.entries(r).map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : v])
    )
  );
  const fields = Array.from(flat.reduce((s, r) => { Object.keys(r).forEach(k => s.add(k)); return s; }, new Set()));
  const csv = new Parser({ fields }).parse(flat);
  writeFileSync(`${name}.csv`, csv, "utf8");
}

const outName = COLLECTION_GROUP ? `dump_${COLLECTION_GROUP}_group` : `dump_${ROOT_COLLECTION}`;
fetchDocs().then(rows => {
  writeJSONCSV(outName, rows);
  console.log(`✅ Exported ${rows.length} docs → ${outName}.json, ${outName}.csv`);
}).catch(err => {
  console.error("❌ Export failed:", err);
  process.exit(1);
});
