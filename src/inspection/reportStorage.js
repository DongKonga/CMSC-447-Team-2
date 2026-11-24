/**
 * Unified Reports Archive Storage (IndexedDB + Backend API file storage)
 *
 * Stores full inspection metadata and generated PDF blobs in client-side IndexedDB,
 * while syncing metadata and binary PDF documents to the FastAPI backend
 * (/api/v1/inspections & /api/v1/inspections/{id}/pdf) to enable seamless viewing
 * and downloading across devices (including iPads, tablets, and desktop workstations).
 */

const DB_NAME = "StormwaterReportsDB";
const DB_VERSION = 1;
const STORE_NAME = "reports";

/**
 * Dynamically resolves the backend API host.
 * On local desktop/laptop: returns http://localhost:8000
 * On iPad or mobile devices on local network: resolves the host IP (e.g. http://192.168.1.50:8000)
 * @returns {string}
 */
export function getApiBase() {
  if (typeof window !== "undefined" && window.location.hostname && window.location.hostname !== "localhost") {
    return `http://${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
}

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
        store.createIndex("backendReportId", "backendReportId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves an inspection report and its generated PDF binary into the unified archive.
 * Non-blocking sync persists both metadata and PDF binary to the central backend.
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

  // 3. Central Storage Sync: upload metadata and PDF binary to backend API
  syncToBackendAPI(record, pdfBlob).catch((syncErr) => {
    console.warn("Central backend sync info:", syncErr);
  });

  return record;
}

/**
 * Retrieves all saved inspection reports from the archive, combining local IndexedDB
 * storage with central backend reports to ensure availability across devices (iPads, laptops).
 * Ordered newest first.
 *
 * @returns {Promise<Array<Object>>}
 */
export async function getAllReports() {
  let localReports = [];

  // Try loading from IndexedDB first
  try {
    const db = await openReportsDB();
    localReports = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Could not query IndexedDB, checking localStorage:", err);
    try {
      localReports = JSON.parse(localStorage.getItem("saved_inspection_reports") || "[]");
    } catch {
      localReports = [];
    }
  }

  // Fallback to localStorage if IndexedDB returned nothing
  if (!localReports || localReports.length === 0) {
    try {
      localReports = JSON.parse(localStorage.getItem("saved_inspection_reports") || "[]");
    } catch {
      localReports = [];
    }
  }

  // Next, query central backend storage so reports filed on other devices (e.g. iPad) appear
  const apiBase = getApiBase();
  let backendReports = [];
  try {
    const res = await fetch(`${apiBase}/api/v1/inspections`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      // Quick timeout so offline mode doesn't hang the UI
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      backendReports = await res.json();
    }
  } catch (_) {
    // Backend offline or unreachable: continue smoothly with localReports
  }

  // Merge backend reports into archive list
  const merged = [...localReports];
  const localBackendIds = new Set(
    localReports.map((r) => r.backendReportId).filter(Boolean)
  );

  for (const b of backendReports) {
    if (!localBackendIds.has(b.report_id)) {
      // Find if we have a local report for same BMP and date
      const bDate = b.inspection_date ? b.inspection_date.split("T")[0] : "";
      const matchedLocal = merged.find(
        (lr) => lr.bmpId === b.bmp_id && (lr.date === bDate || (lr.savedAt && lr.savedAt.startsWith(bDate)))
      );

      if (matchedLocal) {
        matchedLocal.backendReportId = b.report_id;
        matchedLocal.hasPdf = b.has_pdf || false;
        matchedLocal.pdfUrl = b.has_pdf ? `${apiBase}/api/v1/inspections/${b.report_id}/pdf` : null;
        matchedLocal.rawStatus = b.status;
      } else {
        // Report created from another device (e.g., iPad or desktop)
        let statusNormalized = "functioning";
        if (b.status === "Needs Repair") statusNormalized = "maintenance_required";
        else if (b.status === "Fail") statusNormalized = "downgrade";

        merged.push({
          id: `backend-${b.report_id}`,
          backendReportId: b.report_id,
          bmpId: b.bmp_id,
          facilityType: "Stormwater Facility",
          inspector: b.inspector_name,
          verificationStatus: statusNormalized,
          rawStatus: b.status,
          date: bDate,
          savedAt: b.inspection_date,
          hasPdf: b.has_pdf || false,
          pdfUrl: b.has_pdf ? `${apiBase}/api/v1/inspections/${b.report_id}/pdf` : null,
          conditionNotes: b.condition_notes,
          repairsNeeded: b.repairs_needed,
          isRemoteReport: true,
        });
      }
    }
  }

  // Sort newest first by inspection date on file (formData.date or date)
  merged.sort((a, b) => {
    const parseFileDate = (item) => {
      const d = item.formData?.date || item.date;
      if (d) {
        const t = new Date(d).getTime();
        if (!isNaN(t)) return t;
      }
      if (item.savedAt) {
        const t = new Date(item.savedAt).getTime();
        if (!isNaN(t)) return t;
      }
      return 0;
    };
    const diff = parseFileDate(b) - parseFileDate(a);
    if (diff !== 0) return diff;
    const saveA = a.savedAt ? new Date(a.savedAt).getTime() || 0 : 0;
    const saveB = b.savedAt ? new Date(b.savedAt).getTime() || 0 : 0;
    return saveB - saveA;
  });

  return merged;
}

/**
 * Retrieves a single report by ID including its PDF blob.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getReportById(id) {
  // If this is a backend-only report reference
  if (typeof id === "string" && id.startsWith("backend-")) {
    const reportId = id.replace("backend-", "");
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/api/v1/inspections/${reportId}`);
      if (res.ok) {
        const b = await res.json();
        return {
          id,
          backendReportId: b.report_id,
          bmpId: b.bmp_id,
          facilityType: "Stormwater Facility",
          inspector: b.inspector_name,
          verificationStatus:
            b.status === "Needs Repair"
              ? "maintenance_required"
              : b.status === "Fail"
              ? "downgrade"
              : "functioning",
          rawStatus: b.status,
          date: b.inspection_date ? b.inspection_date.split("T")[0] : "",
          savedAt: b.inspection_date,
          hasPdf: b.has_pdf || false,
          pdfUrl: b.has_pdf ? `${apiBase}/api/v1/inspections/${b.report_id}/pdf` : null,
        };
      }
    } catch (_) {}
  }

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
 * Deletes a report from local archive.
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
 * Helper to sync inspection metadata and binary PDF document to the central FastAPI backend.
 * Works across local dev and remote iPads on the local Wi-Fi.
 */
async function syncToBackendAPI(record, pdfBlob) {
  const apiBase = getApiBase();
  let backendStatus = "Pass";
  const st = String(record.verificationStatus || record.status || "").trim().toLowerCase();
  if (st.includes("fail") || st.includes("downgrade")) {
    backendStatus = "Fail";
  } else if (st.includes("repair") || st.includes("maintenance")) {
    backendStatus = "Needs Repair";
  }

  const payload = {
    bmp_id: String(record.bmpId || "BMP-UNKNOWN").substring(0, 50),
    inspector_name: String(record.inspector || record.inspectorName || "Inspector").substring(0, 100),
    status: backendStatus,
    condition_notes: record.generalNotes || record.actionNotes || "Saved via CBLP Verification Form",
    repairs_needed: record.actionNotes || null,
  };

  // 1. Post inspection record
  let savedInspection = null;
  try {
    const res = await fetch(`${apiBase}/api/v1/inspections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      savedInspection = await res.json();
      record.backendReportId = savedInspection.report_id;
    }
  } catch (err) {
    // If backend is unavailable, return early without failing
    return;
  }

  // 2. Upload binary PDF if available and inspection was recorded
  if (savedInspection && savedInspection.report_id && (pdfBlob || record.pdfBlob)) {
    const binaryBlob = pdfBlob || record.pdfBlob;
    const cleanBmpId = String(record.bmpId || "Inspection").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${cleanBmpId}_${record.date || savedInspection.report_id}.pdf`;

    try {
      const uploadRes = await fetch(
        `${apiBase}/api/v1/inspections/${savedInspection.report_id}/pdf?filename=${encodeURIComponent(fileName)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/pdf" },
          body: binaryBlob,
        }
      );

      if (uploadRes.ok) {
        record.hasPdf = true;
        record.pdfUrl = `${apiBase}/api/v1/inspections/${savedInspection.report_id}/pdf`;

        // Update IndexedDB record with backendReportId and pdfUrl
        try {
          const db = await openReportsDB();
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          store.put(record);
        } catch (_) {}
      }
    } catch (uploadErr) {
      console.warn("Could not upload PDF binary to backend endpoint:", uploadErr);
    }
  }
}
