/**
 * Unified Reports Archive Storage (IndexedDB + Backend API sync)
 *
 * Stores full inspection metadata and generated PDF blobs in client-side IndexedDB,
 * while non-intrusively syncing metadata to the FastAPI backend at /api/v1/inspections.
 */

const DB_NAME = "StormwaterReportsDB";
const DB_VERSION = 1;
const STORE_NAME = "reports";

/**
 * Open or initialize the IndexedDB instance
 * @returns {Promise<IDBDatabase>}
 */
export function openReportsDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this browser environment."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("bmpId", "bmpId", { unique: false });
        store.createIndex("date", "date", { unique: false });
        store.createIndex("savedAt", "savedAt", { unique: false });
        store.createIndex("verificationStatus", "verificationStatus", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves an inspection report and its generated PDF binary into the unified archive.
 *
 * @param {Object} reportData - Form data and BMP metadata
 * @param {Blob|Uint8Array} [pdfBlob] - Compiled PDF document blob
 * @returns {Promise<Object>} The saved report record
 */
export async function saveReportArchive(reportData, pdfBlob = null) {
  const recordId = reportData.id || "insp-" + Date.now();
  const record = {
    ...reportData,
    id: recordId,
    pdfBlob: pdfBlob || reportData.pdfBlob || null,
    savedAt: reportData.savedAt || new Date().toISOString(),
  };

  // 1. Save into IndexedDB
  try {
    const db = await openReportsDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const putReq = store.put(record);
      putReq.onsuccess = () => resolve(record);
      putReq.onerror = () => reject(putReq.error);
    });
  } catch (err) {
    console.warn("IndexedDB save failed, falling back to localStorage:", err);
  }

  // 2. Keep localStorage updated with metadata (excluding large blob to stay under 5MB)
  try {
    const metaCopy = { ...record };
    delete metaCopy.pdfBlob;
    const existing = JSON.parse(localStorage.getItem("saved_inspection_reports") || "[]");
    const existingIdx = existing.findIndex((r) => r.id === recordId);
    if (existingIdx >= 0) {
      existing[existingIdx] = metaCopy;
    } else {
      existing.unshift(metaCopy);
    }
    localStorage.setItem("saved_inspection_reports", JSON.stringify(existing));
  } catch (lsErr) {
    console.warn("localStorage sync warning:", lsErr);
  }

  // 3. Non-blocking sync with backend API (without altering backend or throwing errors)
  syncToBackendAPI(record).catch(() => {});

  return record;
}

/**
 * Retrieves all saved inspection reports from the archive, ordered newest first.
 * @returns {Promise<Array<Object>>}
 */
export async function getAllReports() {
  let reports = [];

  // Try loading from IndexedDB first
  try {
    const db = await openReportsDB();
    reports = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Could not query IndexedDB, checking localStorage:", err);
    try {
      reports = JSON.parse(localStorage.getItem("saved_inspection_reports") || "[]");
    } catch {
      reports = [];
    }
  }

  // If reports list is empty, also try fallback from localStorage
  if (!reports || reports.length === 0) {
    try {
      reports = JSON.parse(localStorage.getItem("saved_inspection_reports") || "[]");
    } catch {
      reports = [];
    }
  }

  // Sort newest first
  reports.sort((a, b) => {
    const timeA = new Date(a.savedAt || a.date).getTime() || 0;
    const timeB = new Date(b.savedAt || b.date).getTime() || 0;
    return timeB - timeA;
  });

  return reports;
}

/**
 * Retrieves a single report by ID including its PDF blob.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getReportById(id) {
  try {
    const db = await openReportsDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("Error retrieving report by ID from IndexedDB:", err);
    return null;
  }
}

/**
 * Deletes a report from the archive.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteReportFromArchive(id) {
  try {
    const db = await openReportsDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to delete from IndexedDB:", err);
  }

  try {
    const existing = JSON.parse(localStorage.getItem("saved_inspection_reports") || "[]");
    const filtered = existing.filter((r) => r.id !== id);
    localStorage.setItem("saved_inspection_reports", JSON.stringify(filtered));
  } catch (_) {}

  return true;
}

/**
 * Helper to sync inspection metadata to the FastAPI backend if available
 */
async function syncToBackendAPI(record) {
  try {
    let backendStatus = "Pass";
    if (record.verificationStatus === "maintenance_needed") {
      backendStatus = "Needs Repair";
    } else if (record.verificationStatus === "failed") {
      backendStatus = "Fail";
    }

    const payload = {
      bmp_id: String(record.bmpId || "BMP-UNKNOWN").substring(0, 50),
      inspector_name: String(record.inspector || record.inspectorName || "Inspector").substring(0, 100),
      status: backendStatus,
      condition_notes: record.generalNotes || record.actionNotes || "Saved via CBLP Verification Form",
      repairs_needed: record.actionNotes || null,
    };

    await fetch("http://localhost:8000/api/v1/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (_) {
    // Silently ignore if backend is not running or offline
  }
}
