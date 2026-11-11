import React, { useState } from "react";
import { CHECKLIST_CATEGORIES, determineChecklistCategory } from "./checklistData";
import { generateInspectionPDF } from "./pdfGenerator";
import cblpPdfUrl from "../assets/CBLP BMP Checklists_v7_Verification_022023.pdf";
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

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    inspectorName: currentUser?.username || "Inspector",
    checkedItems: {},
    observations: {},
    verificationStatus: "functioning",
    actionNotes: "",
    generalNotes: "",
  });

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);

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
        {/* 1. AUTOPOPULATED BMP METADATA CARD                      */}
        {/* ======================================================== */}
        <section className="metadata-card">
          <div className="metadata-header">
            <div className="metadata-badge">
              <span className="material-symbols-outlined">layers</span>
              <span>Autopopulated Stormwater Data</span>
            </div>
            <span className="bmp-id-tag">{bmpData.BMP_ID || "N/A"}</span>
          </div>

          <div className="metadata-grid">
            <div className="metadata-field">
              <label>Facility Type</label>
              <div className="metadata-val">{bmpData.Facility_T || "N/A"}</div>
            </div>

            <div className="metadata-field">
              <label>Facility Name / No.</label>
              <div className="metadata-val">{bmpData.Facility_N || "N/A"}</div>
            </div>

            <div className="metadata-field">
              <label>MDE SF Number</label>
              <div className="metadata-val">
                {bmpData.MDE_SF_Number || bmpData.MDE_SF_Num || "N/A"}
              </div>
            </div>

            <div className="metadata-field">
              <label>Contributing Drainage Area</label>
              <div className="metadata-val">
                {bmpData.Drainage_A ? `${bmpData.Drainage_A.toLocaleString()} sq ft` : "N/A"}
              </div>
            </div>

            <div className="metadata-field">
              <label>ESD Volume (CF)</label>
              <div className="metadata-val">
                {bmpData.ESDv__CF_ ? `${bmpData.ESDv__CF_.toLocaleString()} CF` : "N/A"}
              </div>
            </div>

            <div className="metadata-field">
              <label>Assigned CBLP Checklist</label>
              <div className="metadata-val highlight-val">
                {activeCategory.title} ({activeCategory.pdfPages})
              </div>
            </div>

            <div className="metadata-field editable-field">
              <label htmlFor="insp-date">Inspection Date</label>
              <input
                id="insp-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="metadata-input"
              />
            </div>

            <div className="metadata-field editable-field">
              <label htmlFor="insp-name">Certified Inspector</label>
              <input
                id="insp-name"
                type="text"
                value={formData.inspectorName}
                onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
                placeholder="Inspector Name"
                className="metadata-input"
              />
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 2. AUTOMATICALLY ASSIGNED CHECKLIST                      */}
        {/* ======================================================== */}
        <section className="auto-checklist-card">
          <div className="auto-checklist-left">
            <div className="auto-badge-row">
              <span className="auto-badge">
                <span className="material-symbols-outlined">auto_awesome</span>
                <span>Auto-Selected From Facility Type</span>
              </span>
              <span className="pdf-badge">
                <span className="material-symbols-outlined">picture_as_pdf</span>
                <span>CBLP Standard: {activeCategory.pdfPages}</span>
              </span>
            </div>
            <h2 className="auto-checklist-title">{activeCategory.title} Checklist</h2>
            <p className="auto-checklist-subtitle">{activeCategory.subtitle}</p>
          </div>

          <div className="auto-checklist-right">
            <div className="mapping-info-box">
              <span className="mapping-label">Mapped from Facility Type</span>
              <span className="mapping-facility">
                {bmpData.Facility_T || "Standard Practice"}
              </span>
            </div>
            {cblpPdfUrl && (
              <a
                href={cblpPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="view-ref-btn"
                title="View original CBLP PDF checklist in new tab"
              >
                <span className="material-symbols-outlined">open_in_new</span>
                <span>View Original CBLP PDF</span>
              </a>
            )}
          </div>
        </section>

        {/* ======================================================== */}
        {/* 3. INTERACTIVE CHECKLIST ITEMS                          */}
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
      </main>
    </div>
  );
}
