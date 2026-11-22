import React, { useState, useEffect, useMemo } from "react";
import { getAllReports, getReportById } from "../inspection/reportStorage";
import { generateInspectionPDF, formatDateToMMDDYYYY } from "../inspection/pdfGenerator";
import { CHECKLIST_CATEGORIES } from "../inspection/checklistData";
import "./ReportsArchive.css";

export function ReportsArchive({ onBackToMap, currentUser }) {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search, Filter, Sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "functioning" | "maintenance_needed" | "failed"
  const [dateFilter, setDateFilter] = useState("");
  const [sortBy, setSortBy] = useState("date-desc"); // "date-desc" | "date-asc" | "bmp-asc"

  // PDF Modal Viewer state
  const [activePdfUrl, setActivePdfUrl] = useState(null);
  const [activeReport, setActiveReport] = useState(null);
  const [isGeneratingPdfModal, setIsGeneratingPdfModal] = useState(false);

  // Load reports from unified storage on mount
  useEffect(() => {
    loadArchiveReports();
  }, []);

  const loadArchiveReports = async () => {
    setIsLoading(true);
    try {
      const data = await getAllReports();
      setReports(data || []);
    } catch (err) {
      console.error("Failed to load archive reports:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Status Counts
  const counts = useMemo(() => {
    const res = { all: reports.length, functioning: 0, maintenance_needed: 0, failed: 0 };
    for (const r of reports) {
      const st = r.verificationStatus;
      if (st === "functioning" || st === "Pass") res.functioning++;
      else if (st === "maintenance_needed" || st === "Needs Repair") res.maintenance_needed++;
      else if (st === "failed" || st === "Fail") res.failed++;
    }
    return res;
  }, [reports]);

  // Filtered and Sorted reports
  const filteredReports = useMemo(() => {
    let result = [...reports];

    // 1. Search Query (BMP ID, Facility, Inspector, Notes)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((r) => {
        const bmp = (r.bmpId || "").toLowerCase();
        const facility = (r.facilityType || "").toLowerCase();
        const inspector = (r.inspector || r.inspectorName || "").toLowerCase();
        const project = (r.formData?.projectName || "").toLowerCase();
        return bmp.includes(q) || facility.includes(q) || inspector.includes(q) || project.includes(q);
      });
    }

    // 2. Status Filter
    if (statusFilter !== "all") {
      result = result.filter((r) => {
        const st = r.verificationStatus;
        if (statusFilter === "functioning") return st === "functioning" || st === "Pass";
        if (statusFilter === "maintenance_needed") return st === "maintenance_needed" || st === "Needs Repair";
        if (statusFilter === "failed") return st === "failed" || st === "Fail";
        return true;
      });
    }

    // 3. Date Filter (exact match or partial)
    if (dateFilter) {
      result = result.filter((r) => {
        if (!r.date) return false;
        return r.date.startsWith(dateFilter);
      });
    }

    // 4. Sorting
    result.sort((a, b) => {
      if (sortBy === "date-desc") {
        const dateA = new Date(a.date || a.savedAt || 0).getTime();
        const dateB = new Date(b.date || b.savedAt || 0).getTime();
        return dateB - dateA;
      }
      if (sortBy === "date-asc") {
        const dateA = new Date(a.date || a.savedAt || 0).getTime();
        const dateB = new Date(b.date || b.savedAt || 0).getTime();
        return dateA - dateB;
      }
      if (sortBy === "bmp-asc") {
        return (a.bmpId || "").localeCompare(b.bmpId || "");
      }
      return 0;
    });

    return result;
  }, [reports, searchQuery, statusFilter, dateFilter, sortBy]);

  // Helper to resolve or generate a PDF Blob for a report
  const resolvePdfBlob = async (report) => {
    // If the report already has a binary blob stored
    if (report.pdfBlob) {
      if (report.pdfBlob instanceof Blob) return report.pdfBlob;
      return new Blob([report.pdfBlob], { type: "application/pdf" });
    }

    // Try retrieving full record from IndexedDB by ID
    if (report.id) {
      const fullRecord = await getReportById(report.id);
      if (fullRecord?.pdfBlob) {
        if (fullRecord.pdfBlob instanceof Blob) return fullRecord.pdfBlob;
        return new Blob([fullRecord.pdfBlob], { type: "application/pdf" });
      }
    }

    // Otherwise, dynamically reconstruct PDF using pdfGenerator
    const bmpData = report.bmpData || {
      BMP_ID: report.bmpId || "BMP-UNKNOWN",
      Facility_T: report.facilityType || "Stormwater Facility",
    };
    const category = CHECKLIST_CATEGORIES[report.category] || CHECKLIST_CATEGORIES.vegetated;
    const formData = report.formData || {
      date: report.date || new Date().toISOString().split("T")[0],
      inspectorName: report.inspector || "Inspector",
      verificationStatus: report.verificationStatus || "functioning",
    };
    const photos = report.photos || [];

    const pdfBytes = await generateInspectionPDF({
      bmpData,
      category,
      formData,
      photos,
    });
    return new Blob([pdfBytes], { type: "application/pdf" });
  };

  // Open PDF Modal Preview
  const handleOpenPdfPreview = async (report) => {
    setIsGeneratingPdfModal(true);
    setActiveReport(report);
    try {
      const blob = await resolvePdfBlob(report);
      const url = URL.createObjectURL(blob);
      setActivePdfUrl(url);
    } catch (err) {
      console.error("Failed to render PDF preview:", err);
      alert("Unable to load PDF preview. Please try again.");
      setActiveReport(null);
    } finally {
      setIsGeneratingPdfModal(false);
    }
  };

  // Close PDF Modal Preview
  const handleClosePdfPreview = () => {
    if (activePdfUrl) {
      URL.revokeObjectURL(activePdfUrl);
    }
    setActivePdfUrl(null);
    setActiveReport(null);
  };

  // Download PDF
  const handleDownloadPdf = async (e, report) => {
    e.stopPropagation();
    try {
      const blob = await resolvePdfBlob(report);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeBmp = (report.bmpId || "Report").replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `Inspection_${safeBmp}_${report.date || "Report"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) {
      console.error("Failed to download PDF:", err);
      alert("Could not download PDF. Please try again.");
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status) => {
    if (status === "functioning" || status === "Pass") {
      return (
        <span className="archive-status-badge status-pass">
          <span className="status-dot"></span> Pass
        </span>
      );
    }
    if (status === "maintenance_needed" || status === "Needs Repair") {
      return (
        <span className="archive-status-badge status-repair">
          <span className="status-dot"></span> Needs Repair
        </span>
      );
    }
    return (
      <span className="archive-status-badge status-fail">
        <span className="status-dot"></span> Fail
      </span>
    );
  };

  return (
    <div className="reports-archive-container">
      {/* ======================================================== */}
      {/* ARCHIVE NAVBAR                                            */}
      {/* ======================================================== */}
      <header className="archive-navbar">
        <div className="archive-navbar-left">
          <button
            type="button"
            className="back-to-map-btn"
            onClick={onBackToMap}
            title="Return to Campus Map"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Return to Campus Map</span>
          </button>

          <div className="archive-title-wrap">
            <h1 className="archive-title">Stormwater Reports Archive</h1>
            <span className="archive-subtitle">
              CBLP Verification Inspection Records & PDF Library
            </span>
          </div>
        </div>

        <div className="archive-navbar-right">
          <div className="archive-user-tag">
            <span className="material-symbols-outlined">account_circle</span>
            <span>{currentUser?.displayName || currentUser?.username || "Inspector"}</span>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* TOOLBAR: SEARCH & FILTERS                                 */}
      {/* ======================================================== */}
      <section className="archive-toolbar-section">
        <div className="archive-toolbar-top">
          {/* Search Box */}
          <div className="archive-search-box">
            <span className="material-symbols-outlined search-icon">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by BMP ID, facility name, inspector..."
              className="archive-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>

          {/* Date Picker Filter */}
          <div className="archive-date-filter-wrap">
            <span className="material-symbols-outlined date-icon">calendar_month</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="archive-date-input"
              title="Filter by Inspection Date"
            />
            {dateFilter && (
              <button
                type="button"
                className="clear-date-btn"
                onClick={() => setDateFilter("")}
                title="Clear date filter"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="archive-sort-wrap">
            <label htmlFor="sort-select" className="sort-label">Sort:</label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="archive-sort-select"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="bmp-asc">BMP ID (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="archive-status-tabs">
          <button
            type="button"
            className={`status-tab ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All Reports ({counts.all})
          </button>
          <button
            type="button"
            className={`status-tab tab-pass ${statusFilter === "functioning" ? "active" : ""}`}
            onClick={() => setStatusFilter("functioning")}
          >
            Pass ({counts.functioning})
          </button>
          <button
            type="button"
            className={`status-tab tab-repair ${statusFilter === "maintenance_needed" ? "active" : ""}`}
            onClick={() => setStatusFilter("maintenance_needed")}
          >
            Needs Repair ({counts.maintenance_needed})
          </button>
          <button
            type="button"
            className={`status-tab tab-fail ${statusFilter === "failed" ? "active" : ""}`}
            onClick={() => setStatusFilter("failed")}
          >
            Fail ({counts.failed})
          </button>
        </div>
      </section>

      {/* ======================================================== */}
      {/* WORD-TEMPLATE STYLE GRID GALLERY                          */}
      {/* ======================================================== */}
      <main className="archive-content">
        <div className="archive-results-bar">
          <span className="results-count">
            Showing <strong>{filteredReports.length}</strong> of <strong>{reports.length}</strong> reports
          </span>
          {(searchQuery || statusFilter !== "all" || dateFilter) && (
            <button
              type="button"
              className="reset-filters-btn"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setDateFilter("");
              }}
            >
              <span className="material-symbols-outlined">restart_alt</span>
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="archive-loading-state">
            <span className="material-symbols-outlined spin-icon">progress_activity</span>
            <p>Loading archived reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="archive-empty-state">
            <div className="empty-icon-wrap">
              <span className="material-symbols-outlined">folder_open</span>
            </div>
            {reports.length === 0 ? (
              <>
                <h3 className="empty-title">No Saved Reports in Archive</h3>
                <p className="empty-description">
                  Inspection reports will automatically appear here once completed.
                  Go to the campus map, select any stormwater facility, click <strong>"Conduct Inspection Report"</strong>,
                  and click <strong>"Save Report"</strong> or <strong>"Export to PDF"</strong>.
                </p>
                <button
                  type="button"
                  className="empty-cta-btn"
                  onClick={onBackToMap}
                >
                  <span className="material-symbols-outlined">map</span>
                  <span>Return to Campus Map</span>
                </button>
              </>
            ) : (
              <>
                <h3 className="empty-title">No Reports Match Current Filters</h3>
                <p className="empty-description">
                  Try adjusting your search terms, date, or status filter to see other archived reports.
                </p>
                <button
                  type="button"
                  className="empty-cta-btn"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setDateFilter("");
                  }}
                >
                  <span className="material-symbols-outlined">restart_alt</span>
                  <span>Clear All Filters</span>
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="template-grid">
            {filteredReports.map((report) => {
              const displayDate = formatDateToMMDDYYYY(report.date || report.savedAt);
              return (
                <article
                  key={report.id}
                  className="template-card"
                  onClick={() => handleOpenPdfPreview(report)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleOpenPdfPreview(report);
                    }
                  }}
                >
                  {/* Document Sheet Thumbnail (Word-Template preview) */}
                  <div className="template-sheet-preview">
                    {/* Header Banner */}
                    <div className="sheet-navy-header">
                      <span className="sheet-header-title">STORMWATER BMP REPORT</span>
                      <span className="sheet-header-code">{report.bmpId || "BMP"}</span>
                    </div>

                    {/* Simulated Document Lines */}
                    <div className="sheet-body-lines">
                      <div className="sheet-line line-wide"></div>
                      <div className="sheet-line line-mid"></div>
                      <div className="sheet-line-grid">
                        <div className="sheet-line line-short"></div>
                        <div className="sheet-line line-short"></div>
                      </div>
                      <div className="sheet-line line-full"></div>
                      <div className="sheet-line line-wide"></div>
                    </div>

                    {/* Watermark Status Seal */}
                    <div className="sheet-seal-badge">
                      {renderStatusBadge(report.verificationStatus)}
                    </div>

                    {/* Hover Overlay */}
                    <div className="sheet-hover-overlay">
                      <div className="sheet-hover-btn">
                        <span className="material-symbols-outlined">visibility</span>
                        <span>View PDF</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Metadata Footer */}
                  <div className="template-card-footer">
                    <div className="card-top-row">
                      <h3 className="card-bmp-id" title={report.bmpId}>
                        {report.bmpId || "BMP Practice"}
                      </h3>
                      {renderStatusBadge(report.verificationStatus)}
                    </div>

                    <p className="card-facility-type" title={report.facilityType}>
                      {report.facilityType || "Stormwater Facility"}
                    </p>

                    <div className="card-meta-row">
                      <div className="meta-item">
                        <span className="material-symbols-outlined">calendar_today</span>
                        <span>{displayDate}</span>
                      </div>
                      <div className="meta-item">
                        <span className="material-symbols-outlined">person</span>
                        <span title={report.inspector || "Inspector"}>
                          {report.inspector || "Inspector"}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="card-action-bar">
                      <button
                        type="button"
                        className="card-action-btn view-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPdfPreview(report);
                        }}
                      >
                        <span className="material-symbols-outlined">visibility</span>
                        <span>View PDF</span>
                      </button>
                      <button
                        type="button"
                        className="card-action-btn download-btn"
                        onClick={(e) => handleDownloadPdf(e, report)}
                        title="Download PDF"
                      >
                        <span className="material-symbols-outlined">download</span>
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* INTERACTIVE PDF MODAL VIEWER                              */}
      {/* ======================================================== */}
      {(activePdfUrl || isGeneratingPdfModal) && (
        <div className="archive-modal-overlay" onClick={handleClosePdfPreview}>
          <div
            className="archive-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="archive-modal-header">
              <div className="archive-modal-title-box">
                <span className="material-symbols-outlined title-icon">picture_as_pdf</span>
                <div>
                  <h2 className="archive-modal-title">
                    {activeReport?.bmpId || "Inspection Report"} — PDF Preview
                  </h2>
                  <span className="archive-modal-subtitle">
                    {activeReport?.facilityType} &bull; Inspected {formatDateToMMDDYYYY(activeReport?.date)} &bull; {activeReport?.inspector || "Inspector"}
                  </span>
                </div>
              </div>

              <div className="archive-modal-actions">
                {activeReport && (
                  <button
                    type="button"
                    className="modal-action-btn modal-download-btn"
                    onClick={(e) => handleDownloadPdf(e, activeReport)}
                  >
                    <span className="material-symbols-outlined">download</span>
                    <span>Download PDF</span>
                  </button>
                )}
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={handleClosePdfPreview}
                  title="Close preview"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="archive-modal-body">
              {isGeneratingPdfModal ? (
                <div className="modal-loading-box">
                  <span className="material-symbols-outlined spin-icon">progress_activity</span>
                  <p>Rendering inspection document...</p>
                </div>
              ) : activePdfUrl ? (
                <iframe
                  src={activePdfUrl}
                  title="Inspection Report PDF"
                  className="pdf-iframe-viewer"
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
