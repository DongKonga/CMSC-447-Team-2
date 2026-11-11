import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

/**
 * Generates an Inspection Report PDF based on the autopopulated BMP metadata,
 * checklist responses, and verification determination.
 *
 * @param {Object} options
 * @param {Object} options.bmpData - Stormwater metadata from the ArcGIS layer
 * @param {Object} options.category - Active CBLP category definition
 * @param {Object} options.formData - User checklist selections & notes
 * @returns {Promise<Uint8Array>} PDF document bytes
 */
export async function generateInspectionPDF({ bmpData, category, formData }) {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Palette
  const colorDark = rgb(0.04, 0.06, 0.1); // #0b0f19
  const colorGold = rgb(1.0, 0.76, 0.05); // #ffc20e
  const colorGray = rgb(0.39, 0.45, 0.55); // #64748b
  const colorLightGray = rgb(0.94, 0.96, 0.98); // #f1f5f9
  const colorBorder = rgb(0.8, 0.84, 0.9);
  const colorAlertRed = rgb(0.85, 0.15, 0.15);
  const colorSuccessGreen = rgb(0.1, 0.6, 0.25);

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

  // ==========================================
  // DOCUMENT HEADER
  // ==========================================
  page.drawRectangle({
    x: margin,
    y: y - 52,
    width: contentWidth,
    height: 52,
    color: colorDark,
    borderColor: colorGold,
    borderWidth: 1.5,
  });

  page.drawText("STORMWATER BMP INSPECTION REPORT", {
    x: margin + 14,
    y: y - 22,
    size: 15,
    font: fontBold,
    color: colorGold,
  });

  page.drawText("Chesapeake Bay Landscape Professional (CBLP) Verification Standard", {
    x: margin + 14,
    y: y - 40,
    size: 9,
    font: fontRegular,
    color: rgb(0.9, 0.95, 1.0),
  });

  y -= 66;

  // ==========================================
  // AUTOPOPULATED BMP METADATA CARD
  // ==========================================
  page.drawText("BMP FACILITY METADATA (AUTOPROVIDE)", {
    x: margin,
    y: y,
    size: 9,
    font: fontBold,
    color: colorGray,
  });
  y -= 12;

  const metaBoxHeight = 72;
  page.drawRectangle({
    x: margin,
    y: y - metaBoxHeight,
    width: contentWidth,
    height: metaBoxHeight,
    color: colorLightGray,
    borderColor: colorBorder,
    borderWidth: 1,
  });

  const col1X = margin + 12;
  const col2X = margin + 190;
  const col3X = margin + 360;

  // Row 1
  page.drawText(`BMP ID:`, { x: col1X, y: y - 18, size: 8.5, font: fontBold, color: colorGray });
  page.drawText(`${bmpData.BMP_ID || "N/A"}`, { x: col1X + 55, y: y - 18, size: 9, font: fontBold, color: colorDark });

  page.drawText(`Facility Type:`, { x: col2X, y: y - 18, size: 8.5, font: fontBold, color: colorGray });
  page.drawText(`${bmpData.Facility_T || "N/A"}`, { x: col2X + 68, y: y - 18, size: 9, font: fontRegular, color: colorDark });

  page.drawText(`Inspection Date:`, { x: col3X, y: y - 18, size: 8.5, font: fontBold, color: colorGray });
  page.drawText(`${formData.date || new Date().toLocaleDateString()}`, { x: col3X + 78, y: y - 18, size: 9, font: fontBold, color: colorDark });

  // Row 2
  page.drawText(`MDE SF #:`, { x: col1X, y: y - 36, size: 8.5, font: fontBold, color: colorGray });
  page.drawText(`${bmpData.MDE_SF_Number || bmpData.MDE_SF_Num || "N/A"}`, { x: col1X + 55, y: y - 36, size: 9, font: fontRegular, color: colorDark });

  page.drawText(`Facility Name/No:`, { x: col2X, y: y - 36, size: 8.5, font: fontBold, color: colorGray });
  page.drawText(`${bmpData.Facility_N || "N/A"}`, { x: col2X + 80, y: y - 36, size: 9, font: fontRegular, color: colorDark });

  page.drawText(`Inspector:`, { x: col3X, y: y - 36, size: 8.5, font: fontBold, color: colorGray });
  page.drawText(`${formData.inspectorName || "Inspector"}`, { x: col3X + 78, y: y - 36, size: 9, font: fontRegular, color: colorDark });

  // Row 3
  page.drawText(`Drainage Area:`, { x: col1X, y: y - 54, size: 8.5, font: fontBold, color: colorGray });
  page.drawText(`${bmpData.Drainage_A ? `${bmpData.Drainage_A} sq ft` : "N/A"}`, { x: col1X + 75, y: y - 54, size: 9, font: fontRegular, color: colorDark });

  page.drawText(`ESD Volume:`, { x: col2X, y: y - 54, size: 8.5, font: fontBold, color: colorGray });
  page.drawText(`${bmpData.ESDv__CF_ ? `${bmpData.ESDv__CF_} CF` : "N/A"}`, { x: col2X + 68, y: y - 54, size: 9, font: fontRegular, color: colorDark });

  page.drawText(`Checklist:`, { x: col3X, y: y - 54, size: 8.5, font: fontBold, color: colorGray });
  page.drawText(`${category.title}`, { x: col3X + 78, y: y - 54, size: 9, font: fontBold, color: colorDark });

  y -= metaBoxHeight + 18;

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
      color: rgb(0.12, 0.18, 0.28),
    });

    page.drawText(comp.name.toUpperCase(), {
      x: margin + 8,
      y: y - 13,
      size: 9.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    y -= 26;

    // Check items
    for (const item of comp.checkItems) {
      checkPageSpace(16);
      const isChecked = formData.checkedItems && formData.checkedItems[item];

      // Draw checkbox box
      page.drawRectangle({
        x: margin + 10,
        y: y - 9,
        width: 10,
        height: 10,
        borderColor: isChecked ? colorAlertRed : colorGray,
        borderWidth: 1,
        color: isChecked ? rgb(1, 0.9, 0.9) : rgb(1, 1, 1),
      });

      if (isChecked) {
        page.drawText("X", {
          x: margin + 12,
          y: y - 8,
          size: 8,
          font: fontBold,
          color: colorAlertRed,
        });
      }

      page.drawText(item, {
        x: margin + 26,
        y: y - 8,
        size: 8.5,
        font: fontRegular,
        color: isChecked ? colorAlertRed : colorDark,
      });

      y -= 14;
    }

    // Component observation notes
    const obsText = formData.observations && formData.observations[comp.name];
    if (obsText && obsText.trim()) {
      checkPageSpace(26);
      page.drawText(`Notes: ${obsText.trim()}`, {
        x: margin + 26,
        y: y - 6,
        size: 8,
        font: fontOblique,
        color: colorGray,
      });
      y -= 14;
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
    color: colorDark,
  });

  page.drawText("VERIFICATION DETERMINATION", {
    x: margin + 10,
    y: y - 15,
    size: 10.5,
    font: fontBold,
    color: colorGold,
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
    checkPageSpace(26);
    const isSelected = formData.verificationStatus === v.id;

    page.drawCircle({
      x: margin + 15,
      y: y - 3,
      size: 5,
      borderColor: isSelected ? (v.isAlert ? colorAlertRed : colorSuccessGreen) : colorGray,
      borderWidth: 1.2,
      color: isSelected ? (v.isAlert ? colorAlertRed : colorSuccessGreen) : rgb(1, 1, 1),
    });

    if (isSelected) {
      page.drawCircle({
        x: margin + 15,
        y: y - 3,
        size: 2.2,
        color: rgb(1, 1, 1),
      });
    }

    page.drawText(v.label, {
      x: margin + 28,
      y: y - 6,
      size: 8.5,
      font: isSelected ? fontBold : fontRegular,
      color: isSelected ? (v.isAlert ? colorAlertRed : colorSuccessGreen) : colorDark,
    });

    y -= 20;
  }

  // Maintenance action description / downgrade notes
  if (formData.actionNotes && formData.actionNotes.trim()) {
    checkPageSpace(35);
    page.drawRectangle({
      x: margin,
      y: y - 28,
      width: contentWidth,
      height: 28,
      color: rgb(1, 0.95, 0.9),
      borderColor: colorAlertRed,
      borderWidth: 1,
    });

    page.drawText(`Action / Maintenance Items to Complete within 1 Year:`, {
      x: margin + 8,
      y: y - 12,
      size: 8,
      font: fontBold,
      color: colorAlertRed,
    });
    page.drawText(`${formData.actionNotes.trim()}`, {
      x: margin + 8,
      y: y - 23,
      size: 8,
      font: fontRegular,
      color: colorDark,
    });
    y -= 36;
  }

  // General Comments
  if (formData.generalNotes && formData.generalNotes.trim()) {
    checkPageSpace(30);
    page.drawText(`General Inspector Comments: ${formData.generalNotes.trim()}`, {
      x: margin,
      y: y,
      size: 8.5,
      font: fontOblique,
      color: colorDark,
    });
    y -= 20;
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

  return await pdfDoc.save();
}
