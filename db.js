// db.js - Fast IndexedDB-cached SQLite loader (v3.0)
const DB_STORE = "OldNorseCache";
const DB_KEY = "old_norse_db_v3";

function getCachedBytes() {
  return new Promise(resolve => {
    try {
      const req = indexedDB.open(DB_STORE, 1);
      req.onupgradeneeded = () => req.result.createObjectStore("files");
      req.onsuccess = () => {
        const tx = req.result.transaction("files", "readonly");
        const getReq = tx.objectStore("files").get(DB_KEY);
        getReq.onsuccess = () => resolve(getReq.result || null);
        getReq.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch (_) {
      resolve(null);
    }
  });
}

function setCachedBytes(bytes) {
  try {
    const req = indexedDB.open(DB_STORE, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("files");
    req.onsuccess = () => {
      const tx = req.result.transaction("files", "readwrite");
      tx.objectStore("files").put(bytes, DB_KEY);
    };
  } catch (_) {}
}

export async function initDictionaryDb(onStatus) {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
  }
  const [SQL, cached] = await Promise.all([
    window.initSqlJs({ locateFile: f => `./${f}` }),
    getCachedBytes()
  ]);

  let bytes = cached;
  if (!bytes) {
    if (onStatus) onStatus("Downloading dictionary (first time only)...");
    const resp = await fetch("./old_norse.db.gz");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const buf = await new Response(
      resp.body.pipeThrough(new DecompressionStream("gzip"))
    ).arrayBuffer();
    bytes = new Uint8Array(buf);
    setCachedBytes(bytes);
  }

  return new SQL.Database(bytes);
}
