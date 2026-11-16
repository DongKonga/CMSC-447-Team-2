import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

/**
 * Generates an Inspection Report PDF based on the autopopulated BMP metadata,
 * checklist responses, and verification determination.
 *
 * @param {Object} options
 * @param {Object} options.bmpData - Stormwater metadata from the ArcGIS layer
 * @param {Object} options.category - Active CBLP category definition
 * @param {Object} options.formData - User checklist selections & notes
 * @param {Array} [options.photos] - Attached site inspection photos
 * @returns {Promise<Uint8Array>} PDF document bytes
 */
export async function generateInspectionPDF({ bmpData, category, formData, photos = [] }) {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Executive Navy & Slate Palette (Option A: Streamlined, Professional & Cohesive)
  const colorNavy = rgb(0.06, 0.13, 0.24); // #0f223d - Deep Executive Navy
  const colorNavyLight = rgb(0.12, 0.2, 0.32); // #1f3352 - Slate Navy for component headers
  const colorDark = rgb(0.08, 0.11, 0.15); // #141c26 - Crisp Charcoal Body Text
  const colorGray = rgb(0.4, 0.46, 0.54); // #66758a - Slate Gray for Secondary Labels
  const colorLightGray = rgb(0.95, 0.97, 0.99); // #f2f5f9 - Clean Card Tint
  const colorBorder = rgb(0.8, 0.85, 0.91); // #ccd9e8 - Subtle Slate Border
  const colorWhite = rgb(1, 1, 1);

  let page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();
  const margin = 40;
  const contentWidth = width - margin * 2;
  let y = height - margin;

  function checkPageSpace(requiredSpace) {
    if (y - requiredSpace < margin + 30) {
      page = pdfDoc.addPage([612, 792]);
      y = height - margin;
      drawPageHeader(true);
    }
  }

  function drawPageHeader(isContinuation = false) {
    if (isContinuation) {
      page.drawText(`BMP Inspection Report — ${bmpData.BMP_ID || "Unknown BMP"} (Cont.)`, {
        x: margin,
        y: y,
        size: 9,
        font: fontOblique,
        color: colorGray,
      });
      y -= 20;
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 0.5,
        color: colorBorder,
      });
      y -= 15;
    }
  }

  // Helper to split a long word into chunks that each fit within maxWidth
  function splitLongWord(word, font, size, maxWidth) {
    const chunks = [];
    let cur = "";
    for (const char of word) {
      if (font.widthOfTextAtSize(cur + char, size) <= maxWidth) {
        cur += char;
      } else {
        if (cur) chunks.push(cur);
        cur = char;
      }
    }
    if (cur) chunks.push(cur);
    return chunks;
  }

  // Robust multi-line text wrapper supporting newlines, paragraph breaks, and long unbroken words
  function wrapText(text, font, size, maxWidth) {
    if (!text) return [];
    const paragraphs = String(text).split(/\r?\n/);
    const allLines = [];

    for (const para of paragraphs) {
      const trimmedPara = para.trim();
      if (!trimmedPara) {
        continue;
      }

      const rawWords = trimmedPara.split(/\s+/);
      const words = [];
      for (const w of rawWords) {
        if (font.widthOfTextAtSize(w, size) > maxWidth) {
          words.push(...splitLongWord(w, font, size, maxWidth));
        } else {
          words.push(w);
        }
      }

      let currentLine = "";
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (font.widthOfTextAtSize(testLine, size) <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) allLines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) {
        allLines.push(currentLine);
      }
    }
    return allLines;
  }

  // Format date strings to standard MM/DD/YYYY format
  function formatDateToMMDDYYYY(dateVal) {
    if (!dateVal) return "N/A";
    const str = String(dateVal).trim();
    if (!str || str.toLowerCase() === "n/a") return "N/A";
    // 4-digit year only (e.g. "2013") -> preserve as year
    if (/^\d{4}$/.test(str)) return str;
    // Year-Month (e.g. "2013-05") -> "05/2013"
    const ymMatch = str.match(/^(\d{4})[/-](\d{1,2})$/);
    if (ymMatch) {
      return `${ymMatch[2].padStart(2, "0")}/${ymMatch[1]}`;
    }
    // YYYY-MM-DD or YYYY/MM/DD
    const ymdMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (ymdMatch) {
      return `${ymdMatch[2].padStart(2, "0")}/${ymdMatch[3].padStart(2, "0")}/${ymdMatch[1]}`;
    }
    // MM/DD/YYYY or MM-DD-YYYY
    const mdyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (mdyMatch) {
      return `${mdyMatch[1].padStart(2, "0")}/${mdyMatch[2].padStart(2, "0")}/${mdyMatch[3]}`;
    }
    // Fallback Date object parsing
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      const y = parsed.getFullYear();
      return `${m}/${d}/${y}`;
    }
    return str;
  }

  // ==========================================
  // DOCUMENT HEADER (Executive Navy Banner)
  // ==========================================
  page.drawRectangle({
    x: margin,
    y: y - 52,
    width: contentWidth,
    height: 52,
    color: colorNavy,
  });

  page.drawText("STORMWATER BMP INSPECTION REPORT", {
    x: margin + 14,
    y: y - 22,
    size: 15,
    font: fontBold,
    color: colorWhite,
  });

  page.drawText("Chesapeake Bay Landscape Professional (CBLP) Verification Standard", {
    x: margin + 14,
    y: y - 40,
    size: 9,
    font: fontRegular,
    color: rgb(0.88, 0.93, 0.99),
  });

  y -= 66;

  // ==========================================
  // CBLP VERIFICATION INSPECTION HEADER (PDF STANDARD)
  // ==========================================
  page.drawText("CBLP VERIFICATION INSPECTION DETAILS", {
    x: margin,
    y: y,
    size: 9,
    font: fontBold,
    color: colorGray,
  });
  y -= 12;

  const headerBoxHeight = 152;
  page.drawRectangle({
    x: margin,
    y: y - headerBoxHeight,
    width: contentWidth,
    height: headerBoxHeight,
    color: colorLightGray,
    borderColor: colorBorder,
    borderWidth: 1,
  });

  // Vertical divider between Col 1 and Col 2 for rows 1-7
  const midX = margin + Math.floor(contentWidth / 2); // 40 + 266 = 306
  page.drawLine({
    start: { x: midX, y: y - 8 },
    end: { x: midX, y: y - 128 },
    thickness: 0.5,
    color: colorBorder,
  });

  // Horizontal divider above full-width Address row (Row 8)
  page.drawLine({
    start: { x: margin + 8, y: y - 132 },
    end: { x: margin + contentWidth - 8, y: y - 132 },
    thickness: 0.5,
    color: colorBorder,
  });

  // Coordinates
  const col1LabelX = margin + 12; // 52
  const col1ValX = margin + 112;  // 152
  const col2LabelX = midX + 12;   // 318
  const col2ValX = midX + 115;    // 421

  const rowH = 17.5;
  const startY = y - 16;

  // Clean project name (strip any redundant "(UMBC...)" ID at the end)
  let cleanProjectName = (formData.projectName || bmpData.Facility_T || "N/A").trim();
  cleanProjectName = cleanProjectName.replace(/\s*\([^)]*\)$/, "");
  const projWidth = fontRegular.widthOfTextAtSize(cleanProjectName, 8.5);
  const maxProjWidth = midX - col1ValX - 6; // ~148pt
  let projFontSize = 8.5;
  if (projWidth > maxProjWidth) {
    projFontSize = Math.max(7, (maxProjWidth / projWidth) * 8.5);
    if (fontRegular.widthOfTextAtSize(cleanProjectName, projFontSize) > maxProjWidth) {
      const projLines = wrapText(cleanProjectName, fontRegular, projFontSize, maxProjWidth);
      cleanProjectName = projLines[0] || cleanProjectName;
    }
  }

  // Row 1: Date of Inspection | Plan / BMP #
  const formattedInspDate = formatDateToMMDDYYYY(formData.date);
  page.drawText("Date of Inspection:", { x: col1LabelX, y: startY, size: 8, font: fontBold, color: colorGray });
  page.drawText(formattedInspDate, { x: col1ValX, y: startY, size: 8.5, font: fontBold, color: colorDark });

  page.drawText("Plan / BMP #:", { x: col2LabelX, y: startY, size: 8, font: fontBold, color: colorGray });
  page.drawText(`${formData.planBmpNumber || bmpData.BMP_ID || "N/A"}`, { x: col2ValX, y: startY, size: 8.5, font: fontBold, color: colorDark });

  // Row 2: Project / Facility Name | Facility Type (GIS)
  page.drawText("Project / Facility:", { x: col1LabelX, y: startY - rowH, size: 8, font: fontBold, color: colorGray });
  page.drawText(cleanProjectName, { x: col1ValX, y: startY - rowH, size: projFontSize, font: fontRegular, color: colorDark });

  page.drawText("Facility Type (GIS):", { x: col2LabelX, y: startY - rowH, size: 8, font: fontBold, color: colorGray });
  page.drawText(`${bmpData.Facility_T || "N/A"}`, { x: col2ValX, y: startY - rowH, size: 8.5, font: fontRegular, color: colorDark });

  // Row 3: Type of Inspection | Is BMP Present?
  const inspType = (formData.inspectionType || "1st Inspection for Permit Cycle").replace("Verification ", "");
  page.drawText("Inspection Type:", { x: col1LabelX, y: startY - rowH * 2, size: 8, font: fontBold, color: colorGray });
  page.drawText(`[X] ${inspType}`, { x: col1ValX, y: startY - rowH * 2, size: 8, font: fontRegular, color: colorDark });

  page.drawText("Is BMP Present?", { x: col2LabelX, y: startY - rowH * 2, size: 8, font: fontBold, color: colorGray });
  page.drawText(`[${formData.isBmpPresent === "YES" ? "X" : " "}] YES     [${formData.isBmpPresent === "NO" ? "X" : " "}] NO`, {
    x: col2ValX,
    y: startY - rowH * 2,
    size: 8.5,
    font: fontBold,
    color: colorDark,
  });

  // Row 4: BMP Type (CBLP) | Placed in Service
  const formattedPlacedDate = formData.placedInServiceDate ? formatDateToMMDDYYYY(formData.placedInServiceDate) : "N/A";
  page.drawText("BMP Type (CBLP):", { x: col1LabelX, y: startY - rowH * 3, size: 8, font: fontBold, color: colorGray });
  page.drawText(`[X] ${formData.bmpTypeClassification || "New LID Practice"}`, { x: col1ValX, y: startY - rowH * 3, size: 8.5, font: fontRegular, color: colorDark });

  page.drawText("Placed in Service:", { x: col2LabelX, y: startY - rowH * 3, size: 8, font: fontBold, color: colorGray });
  page.drawText(formattedPlacedDate, { x: col2ValX, y: startY - rowH * 3, size: 8.5, font: fontRegular, color: colorDark });

  // Row 5: MDE Permit # | Drainage Area & ESD
  page.drawText("MDE Permit #:", { x: col1LabelX, y: startY - rowH * 4, size: 8, font: fontBold, color: colorGray });
  page.drawText(`${bmpData.MDE_SF_Number || bmpData.MDE_SF_Num || "N/A"}`, { x: col1ValX, y: startY - rowH * 4, size: 8.5, font: fontRegular, color: colorDark });

  const daEsd = `${bmpData.Drainage_A ? bmpData.Drainage_A.toLocaleString() + " sq ft" : "N/A"} | ${bmpData.ESDv__CF_ ? bmpData.ESDv__CF_ + " CF" : "N/A"}`;
  page.drawText("Drainage / ESDv:", { x: col2LabelX, y: startY - rowH * 4, size: 8, font: fontBold, color: colorGray });
  page.drawText(daEsd, { x: col2ValX, y: startY - rowH * 4, size: 8.5, font: fontRegular, color: colorDark });

  // Row 6: Verification Inspector | Inspector Credential(s)
  page.drawText("Inspector:", { x: col1LabelX, y: startY - rowH * 5, size: 8, font: fontBold, color: colorGray });
  page.drawText(`${formData.inspectorName || "Inspector"}`, { x: col1ValX, y: startY - rowH * 5, size: 8.5, font: fontRegular, color: colorDark });

  page.drawText("Credential(s):", { x: col2LabelX, y: startY - rowH * 5, size: 8, font: fontBold, color: colorGray });
  page.drawText(`${formData.inspectorCredentials || "CBLP Professional"}`, { x: col2ValX, y: startY - rowH * 5, size: 8.5, font: fontRegular, color: colorDark });

  // Row 7: Assigned Checklist | Attached Photos
  page.drawText("Assigned Checklist:", { x: col1LabelX, y: startY - rowH * 6, size: 8, font: fontBold, color: colorGray });
  page.drawText(`${category.title} (${category.pdfPages})`, { x: col1ValX, y: startY - rowH * 6, size: 8.5, font: fontBold, color: colorDark });

  const photoStr = photos && photos.length > 0 ? `${photos.length} Attached (See Photographic Log)` : "None attached";
  page.drawText("Attached Photos:", { x: col2LabelX, y: startY - rowH * 6, size: 8, font: fontBold, color: colorGray });
  page.drawText(photoStr, { x: col2ValX, y: startY - rowH * 6, size: 8.5, font: fontRegular, color: colorDark });

  // Row 8: Site Address (Full Width at bottom)
  page.drawText("Site Address:", { x: col1LabelX, y: y - 144, size: 8, font: fontBold, color: colorGray });
  page.drawText(`${formData.siteAddress || "UMBC Campus, 1000 Hilltop Circle, Baltimore, MD 21250"}`, {
    x: col1ValX,
    y: y - 144,
    size: 8.5,
    font: fontRegular,
    color: colorDark,
  });

  y -= headerBoxHeight + 18;

  // ==========================================
  // CHECKLIST COMPONENTS
  // ==========================================
  for (const comp of category.components) {
    checkPageSpace(50 + comp.checkItems.length * 15);

    // Component Header banner
    page.drawRectangle({
      x: margin,
      y: y - 18,
      width: contentWidth,
      height: 18,
      color: colorNavyLight,
    });

    page.drawText(comp.name.toUpperCase(), {
      x: margin + 8,
      y: y - 13,
      size: 9.5,
      font: fontBold,
      color: colorWhite,
    });
    y -= 26;

    // Check items
    for (const item of comp.checkItems) {
      const isChecked = formData.checkedItems && formData.checkedItems[item];
      const fontToUse = isChecked ? fontBold : fontRegular;
      const itemLines = wrapText(item, fontToUse, 8.5, contentWidth - 36);
      const itemSpace = 14 + (itemLines.length - 1) * 11;
      checkPageSpace(itemSpace);

      // Draw checkbox box
      page.drawRectangle({
        x: margin + 10,
        y: y - 9,
        width: 10,
        height: 10,
        borderColor: isChecked ? colorNavy : colorGray,
        borderWidth: 1,
        color: isChecked ? rgb(0.92, 0.95, 0.99) : colorWhite,
      });

      if (isChecked) {
        page.drawText("X", {
          x: margin + 12,
          y: y - 8,
          size: 8,
          font: fontBold,
          color: colorNavy,
        });
      }

      for (let i = 0; i < itemLines.length; i++) {
        page.drawText(itemLines[i], {
          x: margin + 26,
          y: y - 8 - i * 11,
          size: 8.5,
          font: fontToUse,
          color: colorDark,
        });
      }

      y -= itemSpace;
    }

    // Component observation notes
    const obsText = formData.observations && formData.observations[comp.name];
    if (obsText && obsText.trim()) {
      const obsLines = wrapText(`Notes: ${obsText.trim()}`, fontOblique, 8, contentWidth - 36);
      checkPageSpace(obsLines.length * 11 + 6);
      for (let i = 0; i < obsLines.length; i++) {
        page.drawText(obsLines[i], {
          x: margin + 26,
          y: y - 6 - i * 11,
          size: 8,
          font: fontOblique,
          color: colorGray,
        });
      }
      y -= obsLines.length * 11 + 6;
    }

    // Component Plan Verification (Shaded Box matching CBLP PDF standard)
    if (comp.verifications && comp.verifications.length > 0) {
      for (const v of comp.verifications) {
        const isVerifChecked = formData.verificationChecks && formData.verificationChecks[v.id];
        const verifNote = formData.verificationNotes && formData.verificationNotes[v.id];
        const hasUserNote = !!(verifNote && verifNote.trim());

        // Wrap the verification question label cleanly
        const labelLines = wrapText(v.label, fontBold, 7.5, contentWidth - 110);
        const labelH = Math.max(12, labelLines.length * 9.5);

        // Wrap discrepancy note lines if provided
        let noteLines = [];
        if (hasUserNote) {
          noteLines = wrapText(verifNote.trim(), fontOblique, 7.5, contentWidth - 36);
        }

        // Calculate dynamic height of the shaded box so NOTHING is ever clipped
        const noteBlockH = hasUserNote
          ? 11 + noteLines.length * 9.5
          : 10;
        const boxHeight = Math.max(30, 8 + labelH + noteBlockH + 4);

        checkPageSpace(boxHeight + 8);

        // Shaded background box (matching CBLP shaded verification column)
        page.drawRectangle({
          x: margin + 10,
          y: y - boxHeight,
          width: contentWidth - 20,
          height: boxHeight,
          color: rgb(0.93, 0.95, 0.98),
          borderColor: colorBorder,
          borderWidth: 0.8,
        });

        // "VERIFICATION" header tag
        page.drawText("VERIFICATION", {
          x: margin + 16,
          y: y - 11,
          size: 7.5,
          font: fontBold,
          color: colorNavy,
        });

        // Verification checkbox box
        page.drawRectangle({
          x: margin + 85,
          y: y - 13,
          width: 9,
          height: 9,
          borderColor: isVerifChecked ? colorNavy : colorDark,
          borderWidth: 1,
          color: isVerifChecked ? rgb(0.9, 0.94, 0.98) : colorWhite,
        });

        if (isVerifChecked) {
          page.drawText("X", {
            x: margin + 86.5,
            y: y - 12,
            size: 7.5,
            font: fontBold,
            color: colorNavy,
          });
        }

        // Draw verification question label (all lines)
        for (let l = 0; l < labelLines.length; l++) {
          page.drawText(labelLines[l], {
            x: margin + 98,
            y: y - 11 - l * 9.5,
            size: 7.5,
            font: fontBold,
            color: colorDark,
          });
        }

        // Draw discrepancy notes block without truncation
        const noteStartY = y - 8 - labelH;
        if (hasUserNote) {
          page.drawText(v.notePrompt || "If different from plan, note how it is different:", {
            x: margin + 16,
            y: noteStartY,
            size: 7,
            font: fontBold,
            color: colorNavy,
          });
          for (let n = 0; n < noteLines.length; n++) {
            page.drawText(noteLines[n], {
              x: margin + 16,
              y: noteStartY - 9.5 - n * 9.5,
              size: 7.5,
              font: fontOblique,
              color: colorDark,
            });
          }
        } else {
          page.drawText(`${v.notePrompt || "If different from plan, note how it is different:"} (Conforms to plan)`, {
            x: margin + 16,
            y: noteStartY,
            size: 7,
            font: fontOblique,
            color: colorGray,
          });
        }

        y -= boxHeight + 6;
      }
    }

    y -= 6;
  }

  // ==========================================
  // VERIFICATION DETERMINATION SECTION
  // ==========================================
  checkPageSpace(130);

  page.drawRectangle({
    x: margin,
    y: y - 22,
    width: contentWidth,
    height: 22,
    color: colorNavy,
  });

  page.drawText("VERIFICATION DETERMINATION", {
    x: margin + 10,
    y: y - 15,
    size: 10.5,
    font: fontBold,
    color: colorWhite,
  });

  y -= 32;

  const verifications = [
    {
      id: "functioning",
      label: "BMP is functioning properly and as designed for pollutant removal.",
    },
    {
      id: "maintenance_required",
      label:
        "BMP requires corrective or preventative maintenance or rehabilitation to maintain its function for pollutant removal. Actions to be completed within one year.",
      isAlert: true,
    },
    {
      id: "downgrade",
      label: "BMP recommended to be downgraded for pollutant removal.",
      isAlert: true,
    },
  ];

  for (const v of verifications) {
    const isSelected = formData.verificationStatus === v.id;
    const fontToUse = isSelected ? fontBold : fontRegular;
    const maxTextWidth = contentWidth - 36;
    const lines = wrapText(v.label, fontToUse, 8.5, maxTextWidth);
    const requiredSpace = 16 + (lines.length - 1) * 12 + 8;

    checkPageSpace(requiredSpace);

    page.drawCircle({
      x: margin + 14,
      y: y - 4,
      size: 5,
      borderColor: isSelected ? colorNavy : colorGray,
      borderWidth: 1.2,
      color: isSelected ? colorNavy : colorWhite,
    });

    if (isSelected) {
      page.drawCircle({
        x: margin + 14,
        y: y - 4,
        size: 2,
        color: colorWhite,
      });
    }

    for (let i = 0; i < lines.length; i++) {
      page.drawText(lines[i], {
        x: margin + 28,
        y: y - 7 - i * 12,
        size: 8.5,
        font: fontToUse,
        color: colorDark,
      });
    }

    y -= 14 + (lines.length - 1) * 12 + 8;
  }

  // Maintenance action description / downgrade notes
  if (formData.actionNotes && formData.actionNotes.trim()) {
    const rawNotes = formData.actionNotes.trim();
    const actionLines = wrapText(rawNotes, fontRegular, 8, contentWidth - 24);
    const boxHeight = 22 + actionLines.length * 11 + 6;
    checkPageSpace(boxHeight + 10);

    page.drawRectangle({
      x: margin,
      y: y - boxHeight,
      width: contentWidth,
      height: boxHeight,
      color: rgb(0.95, 0.97, 0.99),
      borderColor: colorBorder,
      borderWidth: 1,
    });

    page.drawText("Action / Maintenance Items to Complete within 1 Year:", {
      x: margin + 10,
      y: y - 14,
      size: 8,
      font: fontBold,
      color: colorNavy,
    });

    for (let i = 0; i < actionLines.length; i++) {
      page.drawText(actionLines[i], {
        x: margin + 10,
        y: y - 26 - i * 11,
        size: 8,
        font: fontRegular,
        color: colorDark,
      });
    }

    y -= boxHeight + 12;
  }

  // General Comments
  if (formData.generalNotes && formData.generalNotes.trim()) {
    checkPageSpace(28);

    page.drawText("General Inspector Comments:", {
      x: margin,
      y: y - 10,
      size: 8.5,
      font: fontBold,
      color: colorNavy,
    });
    y -= 14;

    const commentLines = wrapText(formData.generalNotes.trim(), fontOblique, 8, contentWidth);
    for (let i = 0; i < commentLines.length; i++) {
      checkPageSpace(13);
      page.drawText(commentLines[i], {
        x: margin,
        y: y - 10,
        size: 8,
        font: fontOblique,
        color: colorDark,
      });
      y -= 11.5;
    }
    y -= 8;
  }

  // Sign-off line
  checkPageSpace(45);
  y -= 10;
  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + 220, y },
    thickness: 1,
    color: colorDark,
  });
  page.drawLine({
    start: { x: width - margin - 150, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: colorDark,
  });

  if (formattedInspDate && formattedInspDate !== "N/A") {
    page.drawText(formattedInspDate, {
      x: width - margin - 145,
      y: y + 3,
      size: 8.5,
      font: fontBold,
      color: colorDark,
    });
  }

  page.drawText("Certified Inspector Signature", {
    x: margin,
    y: y - 12,
    size: 8,
    font: fontRegular,
    color: colorGray,
  });
  page.drawText("Date", {
    x: width - margin - 150,
    y: y - 12,
    size: 8,
    font: fontRegular,
    color: colorGray,
  });

  // ==========================================
  // ATTACHED SITE INSPECTION PHOTOS (APPENDIX)
  // ==========================================
  if (photos && photos.length > 0) {
    let photoPage = pdfDoc.addPage([612, 792]);
    let photoY = height - margin;

    // Header banner
    photoPage.drawRectangle({
      x: margin,
      y: photoY - 44,
      width: contentWidth,
      height: 44,
      color: colorNavy,
    });
    photoPage.drawText("SITE INSPECTION PHOTOGRAPHIC LOG", {
      x: margin + 14,
      y: photoY - 20,
      size: 13,
      font: fontBold,
      color: colorWhite,
    });
    photoPage.drawText(
      `Facility: ${bmpData.BMP_ID || "N/A"} (${bmpData.Facility_T || "Stormwater BMP"}) — Total Attached Photos: ${photos.length}`,
      {
        x: margin + 14,
        y: photoY - 34,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.88, 0.93, 0.99),
      }
    );
    photoY -= 60;

    const colWidth = 256;
    const colGap = 20;
    const rowHeight = 235;
    const imgMaxH = 135;

    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];

      // After every 4 photos (2 rows of 2), create a new page
      if (i > 0 && i % 4 === 0) {
        photoPage = pdfDoc.addPage([612, 792]);
        photoY = height - margin;
        photoPage.drawText(
          `Site Inspection Photos — ${bmpData.BMP_ID || "BMP"} (Page ${Math.floor(i / 4) + 1})`,
          {
            x: margin,
            y: photoY,
            size: 9,
            font: fontOblique,
            color: colorGray,
          }
        );
        photoY -= 25;
      }

      const colIndex = i % 2;
      const rowIndex = Math.floor((i % 4) / 2);
      const currentY = photoY - rowIndex * rowHeight;
      const currentX = margin + colIndex * (colWidth + colGap);

      // Card container background & border
      photoPage.drawRectangle({
        x: currentX,
        y: currentY - rowHeight + 15,
        width: colWidth,
        height: rowHeight - 15,
        color: colorLightGray,
        borderColor: colorBorder,
        borderWidth: 0.8,
      });

      try {
        if (p.dataUrl && p.dataUrl.includes(",")) {
          const base64Data = p.dataUrl.split(",")[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let b = 0; b < binaryString.length; b++) {
            bytes[b] = binaryString.charCodeAt(b);
          }

          let embeddedImage;
          if (p.dataUrl.startsWith("data:image/png")) {
            embeddedImage = await pdfDoc.embedPng(bytes);
          } else {
            embeddedImage = await pdfDoc.embedJpg(bytes);
          }

          const imgDims = embeddedImage.scaleToFit(colWidth - 16, imgMaxH);
          const drawX = currentX + (colWidth - imgDims.width) / 2;
          const drawY = currentY - 8 - imgDims.height;

          photoPage.drawImage(embeddedImage, {
            x: drawX,
            y: drawY,
            width: imgDims.width,
            height: imgDims.height,
          });

          // Photo title (wrapped, up to 2 lines)
          const title = `Photo #${i + 1}: ${p.name || "Site Image"}`;
          const titleLines = wrapText(title, fontBold, 8, colWidth - 16);
          const titleStartY = currentY - 14 - imgMaxH;
          const displayedTitleLines = Math.min(titleLines.length, 2);
          for (let t = 0; t < displayedTitleLines; t++) {
            photoPage.drawText(titleLines[t], {
              x: currentX + 8,
              y: titleStartY - t * 9.5,
              size: 8,
              font: fontBold,
              color: colorDark,
            });
          }

          // Caption (wrapped across up to 4 lines, no hard truncation)
          const captionText =
            p.caption && p.caption.trim() ? p.caption.trim() : "No caption provided";
          const captionLines = wrapText(`Caption: ${captionText}`, fontOblique, 7.5, colWidth - 16);
          const captionStartY = titleStartY - displayedTitleLines * 9.5 - 3;
          const maxCaptionLines = Math.min(captionLines.length, 4);
          for (let c = 0; c < maxCaptionLines; c++) {
            photoPage.drawText(captionLines[c], {
              x: currentX + 8,
              y: captionStartY - c * 9.5,
              size: 7.5,
              font: fontOblique,
              color: colorGray,
            });
          }
        }
      } catch (imgErr) {
        console.warn("Could not embed image into PDF:", imgErr);
        photoPage.drawText(`[Photo #${i + 1}: ${p.name || "Image"}]`, {
          x: currentX + 12,
          y: currentY - imgMaxH / 2,
          size: 8.5,
          font: fontBold,
          color: colorGray,
        });
      }
    }
  }

  return await pdfDoc.save();
}
