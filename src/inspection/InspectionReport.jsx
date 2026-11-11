import React, { useState, useRef } from "react";
import { CHECKLIST_CATEGORIES, determineChecklistCategory } from "./checklistData";
import { generateInspectionPDF } from "./pdfGenerator";
import "./InspectionReport.css";

export function InspectionReport({ bmpAttributes, onBackToMap, currentUser }) {
  // Autopopulated BMP Data
  const [bmpData, setBmpData] = useState(() => {
    if (bmpAttributes) return bmpAttributes;
    try {
      const stored = sessionStorage.getItem("active_inspection_bmp");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn("Failed to read inspection BMP from session", e);
    }
    return {
      BMP_ID: "UMBC-DEMO-BMP-01",
      Facility_T: "Micro-Bioretention",
      Facility_N: "01",
      MDE_SF_Number: "11-SF-0048-01",
      Drainage_A: 7915,
      ESDv__CF_: 762.8,
    };
  });

  // Active CBLP Checklist is automatically determined from Facility_T
  const selectedCategoryKey = determineChecklistCategory(bmpData?.Facility_T);
  const activeCategory =
    CHECKLIST_CATEGORIES[selectedCategoryKey] || CHECKLIST_CATEGORIES.vegetated;

  // Form State: Pre-populated with official CBLP Verification Header elements
  const [formData, setFormData] = useState(() => {
    // Extract service year from MDE SF number if available (e.g., "11-SF-0048" -> "2011", "13-SF-0142" -> "2013")
    const mdeNum =
      bmpData?.MDE_SF_Number || bmpData?.MDE_SF_Num || bmpData?.BMP_ID || "";
    const yearMatch =
      mdeNum.match(/^(\d{2})-SF/i) || mdeNum.match(/UMBC-(\d{2})-SF/i);
    const serviceYear = yearMatch ? `20${yearMatch[1]}` : "";

    const ft = (bmpData?.Facility_T || "").toLowerCase();
    let initialBmpType = "New LID Practice";
    if (ft.includes("pond") || ft.includes("basin")) {
      initialBmpType = "Old Stormwater Practice";
    }

    const defaultProjectName = bmpData?.Facility_T
      ? `${bmpData.Facility_T}${bmpData.Facility_N ? " #" + bmpData.Facility_N : ""} (${bmpData.BMP_ID || "UMBC"})`
      : "UMBC Campus Stormwater Practice";

    return {
      // 1. Official CBLP Header Elements (Exact items from CBLP PDF standard)
      date: new Date().toISOString().split("T")[0],
      projectName: defaultProjectName,
      planBmpNumber: bmpData?.BMP_ID || bmpData?.MDE_SF_Number || "N/A",
      inspectionType: "Verification 1st Inspection for Permit Cycle",
      bmpTypeClassification: initialBmpType,
      placedInServiceDate: serviceYear,
      siteAddress: "UMBC Campus, 1000 Hilltop Circle, Baltimore, MD 21250",
      inspectorName: currentUser?.username || "Inspector",
      inspectorCredentials: "CBLP Certified Professional",
      photoNumbers: "",
      isBmpPresent: "YES",

      // 2. Observations & Checklist Deficiencies
      checkedItems: {},
      observations: {},

      // 3. Verification Determination
      verificationStatus: "functioning",
      actionNotes: "",
      generalNotes: "",
    };
  });

  // Photo Upload & Tablet/Mobile Camera State
  const cameraInputRef = useRef(null);
  const libraryInputRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [activeLightboxImg, setActiveLightboxImg] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);

  // Client-side image compression & loading for tablet/mobile performance
  const processImageFiles = async (fileList) => {
    const files = Array.from(fileList);
    const newPhotos = await Promise.all(
      files.map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const maxDim = 1200;
              let width = img.width;
              let height = img.height;
              if (width > maxDim || height > maxDim) {
                if (width > height) {
                  height = Math.round((height * maxDim) / width);
                  width = maxDim;
                } else {
                  width = Math.round((width * maxDim) / height);
                  height = maxDim;
                }
              }
              const canvas = document.createElement("canvas");
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0, width, height);
              const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.82);
              resolve({
                id: Math.random().toString(36).substring(2, 9),
                name: file.name,
                size: (file.size / 1024).toFixed(1) + " KB",
                dataUrl: compressedDataUrl,
                caption: "",
              });
            };
            img.src = e.target.result;
          };
          reader.readAsDataURL(file);
        });
      })
    );

    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const handleRemovePhoto = (idToRemove) => {
    setPhotos((prev) => prev.filter((p) => p.id !== idToRemove));
  };

  const handleUpdateCaption = (id, caption) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, caption } : p))
    );
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFiles(e.dataTransfer.files);
    }
  };

  // Toggle checklist checkbox
  const handleToggleItem = (itemText) => {
    setFormData((prev) => ({
      ...prev,
      checkedItems: {
        ...prev.checkedItems,
        [itemText]: !prev.checkedItems[itemText],
      },
    }));
  };

  // Change observation text for a component
  const handleObservationChange = (compName, text) => {
    setFormData((prev) => ({
      ...prev,
      observations: {
        ...prev.observations,
        [compName]: text,
      },
    }));
  };

  // Export to PDF using pdf-lib
  const handleExportPDF = async () => {
    setIsExportingPdf(true);
    try {
      const pdfBytes = await generateInspectionPDF({
        bmpData,
        category: activeCategory,
        formData,
        photos,
      });

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      // Open PDF in new tab
      const win = window.open(url, "_blank");
      if (!win) {
        // If popup blocked, create download link
        const a = document.createElement("a");
        a.href = url;
        a.download = `Inspection_${bmpData.BMP_ID || "Report"}_${formData.date}.pdf`;
        a.click();
      }
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Error generating PDF report. Please try again.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Save report locally & prepare for backend API
  const handleSaveReport = () => {
    const reportPayload = {
      id: "insp-" + Date.now(),
      bmpId: bmpData.BMP_ID,
      facilityType: bmpData.Facility_T,
      category: selectedCategoryKey,
      date: formData.date,
      inspector: formData.inspectorName,
      verificationStatus: formData.verificationStatus,
      photos: photos.map((p) => ({ name: p.name, caption: p.caption })),
      checkedItems: formData.checkedItems,
      observations: formData.observations,
      actionNotes: formData.actionNotes,
      generalNotes: formData.generalNotes,
      savedAt: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem("saved_inspection_reports") || "[]");
      existing.unshift(reportPayload);
      localStorage.setItem("saved_inspection_reports", JSON.stringify(existing));
      setSaveStatus("Report successfully saved locally! Ready for database upload.");
      setTimeout(() => setSaveStatus(null), 5000);
    } catch (e) {
      console.error("Save error:", e);
    }
  };

  // Dispatch Email Notification (Mock connection for backend emailer)
  const handleDispatchEmail = () => {
    setDispatchStatus("dispatching");
    setTimeout(() => {
      setDispatchStatus("sent");
    }, 800);
  };

  const isMaintenanceAlert =
    formData.verificationStatus === "maintenance_required" ||
    formData.verificationStatus === "downgrade";

  return (
    <div className="inspection-page-container">
      {/* ======================================================== */}
      {/* TOP NAVBAR                                               */}
      {/* ======================================================== */}
      <header className="inspection-navbar">
        <div className="inspection-navbar-left">
          {onBackToMap && (
            <button
              type="button"
              className="back-to-map-btn"
              onClick={onBackToMap}
              title="Return to GIS Map"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              <span>Back to Map</span>
            </button>
          )}
          <div className="navbar-title-wrap">
            <h1 className="navbar-title">BMP Verification Inspection Form</h1>
            <span className="navbar-subtitle">CBLP Standard Field Assessment</span>
          </div>
        </div>

        <div className="inspection-navbar-actions">
          <button
            type="button"
            className="navbar-btn export-pdf-btn"
            onClick={handleExportPDF}
            disabled={isExportingPdf}
          >
            <span className="material-symbols-outlined">
              {isExportingPdf ? "hourglass_empty" : "picture_as_pdf"}
            </span>
            <span>{isExportingPdf ? "Generating PDF..." : "Export to PDF"}</span>
          </button>

          <button
            type="button"
            className="navbar-btn save-btn"
            onClick={handleSaveReport}
          >
            <span className="material-symbols-outlined">save</span>
            <span>Save Report</span>
          </button>
        </div>
      </header>

      <main className="inspection-content">
        {/* Status Alerts */}
        {saveStatus && (
          <div className="status-toast success-toast" role="alert">
            <span className="material-symbols-outlined">check_circle</span>
            <span>{saveStatus}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* 1. PRACTICE TYPE & ASSIGNED CHECKLIST (TOP OF PAGE)      */}
        {/* ======================================================== */}
        <section className="auto-checklist-card">
          <div className="auto-checklist-left">
            <h2 className="auto-checklist-title">{activeCategory.title} Checklist</h2>
            <p className="auto-checklist-subtitle">{activeCategory.subtitle}</p>
          </div>

          <div className="auto-checklist-right">
            <div className="mapping-info-box">
              <span className="mapping-label">Facility Type</span>
              <span className="mapping-facility">
                {bmpData.Facility_T || "Standard Practice"}
              </span>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 2. CBLP OFFICIAL VERIFICATION DETAILS                    */}
        {/* ======================================================== */}
        <section className="cblp-header-card">
          <div className="cblp-form-body">
            {/* Row 1: Identification */}
            <div className="form-row three-cols">
              <div className="form-field">
                <label htmlFor="insp-date">Date of Inspection</label>
                <input
                  id="insp-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="cblp-input"
                />
              </div>

              <div className="form-field">
                <label htmlFor="proj-name">Project / BMP Name</label>
                <input
                  id="proj-name"
                  type="text"
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  placeholder="e.g. Micro-Bioretention #02"
                  className="cblp-input"
                />
              </div>

              <div className="form-field">
                <label htmlFor="plan-num">Plan / BMP # (if applicable)</label>
                <input
                  id="plan-num"
                  type="text"
                  value={formData.planBmpNumber}
                  onChange={(e) => setFormData({ ...formData, planBmpNumber: e.target.value })}
                  placeholder="e.g. UMBC-11-SF-0048-02"
                  className="cblp-input"
                />
              </div>
            </div>

            {/* Row 2: Inspection Type & BMP Present */}
            <div className="form-row two-cols">
              <div className="form-field">
                <label>Type of Inspection</label>
                <div className="radio-pill-group">
                  {[
                    "Verification 1st Inspection for Permit Cycle",
                    "Verification Re-Inspection To Confirm Corrective Actions",
                  ].map((typeOption) => {
                    const isSelected = formData.inspectionType === typeOption;
                    return (
                      <button
                        key={typeOption}
                        type="button"
                        className={`radio-pill-btn ${isSelected ? "selected" : ""}`}
                        onClick={() => setFormData({ ...formData, inspectionType: typeOption })}
                      >
                        <span className="pill-check-indicator">
                          {isSelected ? "●" : "○"}
                        </span>
                        <span>{typeOption}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-field">
                <label>Is BMP Still Present?</label>
                <div className="presence-toggle-group">
                  <button
                    type="button"
                    className={`presence-btn yes-btn ${formData.isBmpPresent === "YES" ? "active" : ""}`}
                    onClick={() => setFormData({ ...formData, isBmpPresent: "YES" })}
                  >
                    <span className="material-symbols-outlined">check</span>
                    <span>YES</span>
                  </button>
                  <button
                    type="button"
                    className={`presence-btn no-btn ${formData.isBmpPresent === "NO" ? "active" : ""}`}
                    onClick={() => setFormData({ ...formData, isBmpPresent: "NO" })}
                  >
                    <span className="material-symbols-outlined">close</span>
                    <span>NO</span>
                  </button>
                </div>
                {formData.isBmpPresent === "NO" && (
                  <p className="presence-warning">
                    ⚠️ BMP not found at site coordinates. Document conditions and reason below.
                  </p>
                )}
              </div>
            </div>

            {/* Row 3: BMP Practice Classification (BMP Type in PDF) */}
            <div className="form-row single-col">
              <div className="form-field">
                <label>BMP Type (CBLP Classification)</label>
                <div className="radio-pill-group four-cols">
                  {[
                    "Stormwater Retrofit",
                    "New LID Practice",
                    "Old Stormwater Practice",
                    "Homeowner BMP",
                  ].map((bmpTypeOption) => {
                    const isSelected = formData.bmpTypeClassification === bmpTypeOption;
                    return (
                      <button
                        key={bmpTypeOption}
                        type="button"
                        className={`radio-pill-btn ${isSelected ? "selected" : ""}`}
                        onClick={() =>
                          setFormData({ ...formData, bmpTypeClassification: bmpTypeOption })
                        }
                      >
                        <span className="pill-check-indicator">
                          {isSelected ? "●" : "○"}
                        </span>
                        <span>{bmpTypeOption}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Row 4: Dates & Location */}
            <div className="form-row two-cols">
              <div className="form-field">
                <label htmlFor="service-date">Date BMP Placed into Service</label>
                <input
                  id="service-date"
                  type="text"
                  value={formData.placedInServiceDate}
                  onChange={(e) =>
                    setFormData({ ...formData, placedInServiceDate: e.target.value })
                  }
                  placeholder="e.g. 2013 or MM/DD/YYYY"
                  className="cblp-input"
                />
              </div>

              <div className="form-field">
                <label htmlFor="site-addr">Site Address</label>
                <input
                  id="site-addr"
                  type="text"
                  value={formData.siteAddress}
                  onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })}
                  placeholder="Street Address, City, State ZIP"
                  className="cblp-input"
                />
              </div>
            </div>

            {/* Row 5: Inspector & Credentials */}
            <div className="form-row two-cols">
              <div className="form-field">
                <label htmlFor="insp-name">Verification Inspector</label>
                <input
                  id="insp-name"
                  type="text"
                  value={formData.inspectorName}
                  onChange={(e) =>
                    setFormData({ ...formData, inspectorName: e.target.value })
                  }
                  placeholder="Inspector Name"
                  className="cblp-input"
                />
              </div>

              <div className="form-field">
                <label htmlFor="insp-cred">Inspector Credential(s)</label>
                <input
                  id="insp-cred"
                  type="text"
                  value={formData.inspectorCredentials}
                  onChange={(e) =>
                    setFormData({ ...formData, inspectorCredentials: e.target.value })
                  }
                  placeholder="e.g. CBLP, PE, RLA"
                  className="cblp-input"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 2. SITE INSPECTION PHOTOS & CAMERA UPLOAD                */}
        {/* ======================================================== */}
        <section className="photo-upload-section">
          {/* Hidden inputs: One for Camera capture, one for Library/Files */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handleFileInputChange}
          />
          <input
            ref={libraryInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={handleFileInputChange}
          />

          <div className="photo-section-header">
            <div className="photo-header-text">
              <div className="photo-badge">
                <span className="material-symbols-outlined">add_a_photo</span>
                <span>Field Documentation Photos</span>
              </div>
              <h2 className="photo-section-title">Site Photos & Photographic Evidence</h2>
              <p className="photo-section-desc">
                Take photos in the field using your tablet or phone camera, or choose from your photo
                library/files. Photos are automatically compressed for field performance and appended directly to the PDF inspection report.
              </p>
            </div>

            {/* Quick Action Buttons for Mobile / Tablet */}
            <div className="photo-action-buttons">
              <button
                type="button"
                className="photo-action-btn camera-action-btn"
                onClick={() => cameraInputRef.current?.click()}
              >
                <span className="material-symbols-outlined">photo_camera</span>
                <span>Take Picture</span>
              </button>
              <button
                type="button"
                className="photo-action-btn library-action-btn"
                onClick={() => libraryInputRef.current?.click()}
              >
                <span className="material-symbols-outlined">photo_library</span>
                <span>Library / Files</span>
              </button>
            </div>
          </div>

          {/* Drag & Drop Area / Click-to-upload */}
          <div
            className={`photo-dropzone ${isDragging ? "dragging" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => libraryInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                libraryInputRef.current?.click();
              }
            }}
          >
            <div className="dropzone-content">
              <span className="material-symbols-outlined dropzone-icon">
                {isDragging ? "file_download" : "cloud_upload"}
              </span>
              <div className="dropzone-texts">
                <p className="dropzone-main">
                  <strong>Tap to select photos</strong> or drag and drop image files here
                </p>
                <p className="dropzone-sub">
                  Supports JPEG, PNG, HEIC, WebP &bull; High-res images auto-optimized &bull;{" "}
                  {photos.length} photo{photos.length === 1 ? "" : "s"} attached
                </p>
              </div>
            </div>
          </div>

          {/* Uploaded Photos Grid */}
          {photos.length > 0 && (
            <div className="attached-photos-container">
              <div className="attached-photos-header">
                <span className="attached-count">
                  <span className="material-symbols-outlined">collections</span>
                  <span>{photos.length} Attached Photo{photos.length === 1 ? "" : "s"}</span>
                </span>
                <span className="attached-help">
                  Click any thumbnail to preview full size. Enter component captions for the PDF.
                </span>
              </div>

              <div className="photos-grid">
                {photos.map((photo, idx) => (
                  <div key={photo.id} className="photo-card">
                    <div
                      className="photo-thumb-wrapper"
                      onClick={() => setActiveLightboxImg(photo)}
                      title="Click to view full size"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={photo.caption || photo.name}
                        className="photo-thumb-img"
                      />
                      <div className="photo-thumb-overlay">
                        <span className="material-symbols-outlined">zoom_in</span>
                      </div>
                      <span className="photo-index-tag">#{idx + 1}</span>
                    </div>

                    <div className="photo-card-body">
                      <div className="photo-meta-row">
                        <span className="photo-filename" title={photo.name}>
                          {photo.name}
                        </span>
                        <span className="photo-filesize">{photo.size}</span>
                      </div>

                      <div className="photo-caption-row">
                        <input
                          type="text"
                          value={photo.caption}
                          onChange={(e) => handleUpdateCaption(photo.id, e.target.value)}
                          placeholder="Caption (e.g. Inflow weir, Vegetation)"
                          className="photo-caption-input"
                        />
                        <button
                          type="button"
                          className="photo-delete-btn"
                          onClick={() => handleRemovePhoto(photo.id)}
                          title="Remove photo"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ======================================================== */}
        {/* 4. FIELD OBSERVATIONS & VERIFICATION CHECKLIST           */}
        {/* ======================================================== */}
        <section className="checklist-components-section">
          <div className="section-title-wrap">
            <h2>Field Observations & Verification Checklist</h2>
            <p>
              Inspection items tailored to {bmpData.Facility_T || "this practice"}. Check any
              observed deficiencies and record component-specific notes.
            </p>
          </div>

          <div className="components-list">
            {activeCategory.components.map((comp, compIdx) => (
              <div key={compIdx} className="component-card">
                <div className="component-card-header">
                  <span className="component-index">0{compIdx + 1}</span>
                  <h3 className="component-name">{comp.name}</h3>
                </div>

                <div className="check-items-list">
                  {comp.checkItems.map((item, itemIdx) => {
                    const checked = !!formData.checkedItems[item];
                    return (
                      <label
                        key={itemIdx}
                        className={`check-item-row ${checked ? "is-flagged" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleItem(item)}
                          className="item-checkbox"
                        />
                        <span className="item-text">{item}</span>
                        {checked && (
                          <span className="flag-badge">
                            <span className="material-symbols-outlined">warning</span>
                            <span>Issue Observed</span>
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>

                <div className="component-observation-box">
                  <label htmlFor={`obs-${compIdx}`}>
                    <span className="material-symbols-outlined">edit_note</span>
                    <span>{comp.observationPrompt}</span>
                  </label>
                  <textarea
                    id={`obs-${compIdx}`}
                    rows={2}
                    value={formData.observations[comp.name] || ""}
                    onChange={(e) => handleObservationChange(comp.name, e.target.value)}
                    placeholder="Enter specific field measurements, photos taken, or notes..."
                    className="observation-textarea"
                  ></textarea>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ======================================================== */}
        {/* 4. VERIFICATION DETERMINATION SECTION                   */}
        {/* ======================================================== */}
        <section className="verification-card">
          <div className="verification-header">
            <span className="material-symbols-outlined text-amber-400">verified</span>
            <div>
              <h3>Final Verification Determination</h3>
              <p>Official CBLP Pollutant Removal Function Assessment</p>
            </div>
          </div>

          <div className="verification-options">
            <label
              className={`verification-option-row ${
                formData.verificationStatus === "functioning" ? "selected functioning" : ""
              }`}
            >
              <input
                type="radio"
                name="verificationStatus"
                value="functioning"
                checked={formData.verificationStatus === "functioning"}
                onChange={(e) =>
                  setFormData({ ...formData, verificationStatus: e.target.value })
                }
                className="verif-radio"
              />
              <div className="verif-label-wrap">
                <span className="verif-title">
                  BMP is functioning properly and as designed for pollutant removal.
                </span>
                <span className="verif-desc">
                  No critical maintenance required. Routine seasonal upkeep conforms to plan.
                </span>
              </div>
            </label>

            <label
              className={`verification-option-row ${
                formData.verificationStatus === "maintenance_required"
                  ? "selected maintenance"
                  : ""
              }`}
            >
              <input
                type="radio"
                name="verificationStatus"
                value="maintenance_required"
                checked={formData.verificationStatus === "maintenance_required"}
                onChange={(e) =>
                  setFormData({ ...formData, verificationStatus: e.target.value })
                }
                className="verif-radio"
              />
              <div className="verif-label-wrap">
                <span className="verif-title text-red-400">
                  BMP requires corrective or preventative maintenance or rehabilitation to
                  maintain its function for pollutant removal. Actions to be completed within
                  one year.
                </span>
                <span className="verif-desc">
                  Sediment clogging, structural damage, or vegetation loss threatens facility
                  function. Triggers automated notification.
                </span>
              </div>
            </label>

            <label
              className={`verification-option-row ${
                formData.verificationStatus === "downgrade" ? "selected downgrade" : ""
              }`}
            >
              <input
                type="radio"
                name="verificationStatus"
                value="downgrade"
                checked={formData.verificationStatus === "downgrade"}
                onChange={(e) =>
                  setFormData({ ...formData, verificationStatus: e.target.value })
                }
                className="verif-radio"
              />
              <div className="verif-label-wrap">
                <span className="verif-title text-red-400">
                  BMP recommended to be downgraded for pollutant removal.
                </span>
                <span className="verif-desc">
                  Severe failure, bypass, or inability to restore designed treatment capacity.
                  Triggers automated notification.
                </span>
              </div>
            </label>
          </div>

          {/* Conditional Action Notes when Maintenance or Downgrade selected */}
          {isMaintenanceAlert && (
            <div className="action-notes-card">
              <label htmlFor="action-notes">
                <span className="material-symbols-outlined text-red-400">construction</span>
                <span>Actions to be completed within one year / Downgrade Rationale:</span>
              </label>
              <textarea
                id="action-notes"
                rows={3}
                value={formData.actionNotes}
                onChange={(e) => setFormData({ ...formData, actionNotes: e.target.value })}
                placeholder="List specific corrective actions needed (e.g., vacuum sweep permeable joints, replace dead sedum, excavate 6 inches of forebay sediment)..."
                className="action-notes-textarea"
                required
              ></textarea>
            </div>
          )}

          {/* General Notes */}
          <div className="general-notes-box">
            <label htmlFor="general-notes">
              <span className="material-symbols-outlined">comment</span>
              <span>General Inspector Comments & Notes:</span>
            </label>
            <textarea
              id="general-notes"
              rows={2}
              value={formData.generalNotes}
              onChange={(e) => setFormData({ ...formData, generalNotes: e.target.value })}
              placeholder="Additional site notes, weather conditions during inspection, etc..."
              className="observation-textarea"
            ></textarea>
          </div>

          {/* ======================================================== */}
          {/* 5. CONDITIONAL MAINTENANCE EMAIL DISPATCH BANNER        */}
          {/* ======================================================== */}
          {isMaintenanceAlert && (
            <div className="maintenance-dispatch-banner">
              <div className="dispatch-banner-content">
                <div className="dispatch-banner-icon">
                  <span className="material-symbols-outlined">send_and_archive</span>
                </div>
                <div className="dispatch-banner-text">
                  <h4>Maintenance / Downgrade Notification Triggered</h4>
                  <p>
                    Because this facility requires corrective actions or downgrade, an automated
                    dispatch email will be routed to the Facilities Maintenance team with this
                    completed report.
                  </p>
                </div>
              </div>

              <div className="dispatch-action-row">
                <button
                  type="button"
                  className="dispatch-email-btn"
                  onClick={handleDispatchEmail}
                  disabled={dispatchStatus === "dispatching"}
                >
                  <span className="material-symbols-outlined">
                    {dispatchStatus === "dispatching" ? "sync" : "forward_to_inbox"}
                  </span>
                  <span>
                    {dispatchStatus === "dispatching"
                      ? "Connecting to Backend Emailer..."
                      : dispatchStatus === "sent"
                      ? "Email Notification Queued!"
                      : "Send Maintenance Notification Email"}
                  </span>
                </button>
              </div>

              {dispatchStatus === "sent" && (
                <div className="dispatch-success-box">
                  <span className="material-symbols-outlined">check_circle</span>
                  <div>
                    <strong>Ready for Backend API:</strong> Email notification payload prepared
                    for <code>facilities-alerts@umbc.edu</code> for BMP{" "}
                    <code>{bmpData.BMP_ID}</code>. Backend team can hook their endpoint right into
                    this trigger!
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Bottom Actions */}
        <section className="bottom-actions-card">
          <div className="bottom-actions-left">
            <span>Form Status: Ready to export or file</span>
          </div>
          <div className="bottom-actions-right">
            <button
              type="button"
              className="navbar-btn export-pdf-btn"
              onClick={handleExportPDF}
              disabled={isExportingPdf}
            >
              <span className="material-symbols-outlined">picture_as_pdf</span>
              <span>{isExportingPdf ? "Exporting..." : "Download Completed PDF"}</span>
            </button>
            <button
              type="button"
              className="navbar-btn save-btn"
              onClick={handleSaveReport}
            >
              <span className="material-symbols-outlined">save</span>
              <span>Save & Submit Inspection</span>
            </button>
          </div>
        </section>

        {/* ======================================================== */}
        {/* LIGHTBOX MODAL FOR PREVIEWING ATTACHED PHOTOS            */}
        {/* ======================================================== */}
        {activeLightboxImg && (
          <div
            className="lightbox-overlay"
            onClick={() => setActiveLightboxImg(null)}
          >
            <div
              className="lightbox-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="lightbox-header">
                <div className="lightbox-title-box">
                  <span className="material-symbols-outlined">photo</span>
                  <span className="lightbox-filename">{activeLightboxImg.name}</span>
                  <span className="lightbox-filesize">({activeLightboxImg.size})</span>
                </div>
                <button
                  type="button"
                  className="lightbox-close-btn"
                  onClick={() => setActiveLightboxImg(null)}
                  title="Close Preview"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="lightbox-img-wrap">
                <img
                  src={activeLightboxImg.dataUrl}
                  alt={activeLightboxImg.caption || activeLightboxImg.name}
                  className="lightbox-img"
                />
              </div>

              {activeLightboxImg.caption && (
                <div className="lightbox-caption-box">
                  <span className="material-symbols-outlined">subtitles</span>
                  <span>{activeLightboxImg.caption}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
