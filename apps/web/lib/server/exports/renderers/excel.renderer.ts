import ExcelJS from "exceljs";
import type { ExportDataBundle } from "../export.types";
import {
  COMMON_EXPORT_COLUMNS,
  ASTHMA_EXPORT_COLUMNS,
  COPD_EXPORT_COLUMNS,
  ILD_EXPORT_COLUMNS,
  BRONCHIECTASIS_EXPORT_COLUMNS,
  POST_ICU_EXPORT_COLUMNS,
  DISEASE_FIELD_CODEBOOK,
  type ColumnDefinition,
} from "../codebook";
import type { LongitudinalPatientData } from "../aggregation/longitudinal-transformer";

// ── Palette Tokens ──────────────────────────────────────────────────────────
const COLORS = {
  NAVY_HEADER: "FF0F2B48",       // Deep Navy
  TEAL_GROUP: "FF0F4C5C",        // Deep Teal for Section 1 & 3
  CYAN_GROUP: "FF134E5E",        // Cyan Teal for Section 2
  BLUE_GROUP: "FF1E3A8A",        // Royal Navy for Disease Section
  COL_HEADER_BG: "FF0A2540",     // Column header background
  SUBTITLE_BG: "FFFEF9E7",       // Light Cream for subtitle row
  SUBTITLE_TEXT: "FF334155",     // Slate text for subtitle
  ROW_EVEN_BG: "FFF8FAFC",       // Zebra striping
  ROW_ODD_BG: "FFFFFFFF",
  BORDER_DARK: "FF0A192F",
  BORDER_LIGHT: "FFE2E8F0",
  TEXT_DARK: "FF0F172A",
  TEXT_MUTED: "FF64748B",
};

function applyTitleBanner(ws: ExcelJS.Worksheet, title: string, colCount: number) {
  const row = ws.getRow(1);
  row.height = 30;
  ws.mergeCells(1, 1, 1, colCount);

  const cell = row.getCell(1);
  cell.value = title;
  cell.font = { name: "Calibri", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.NAVY_HEADER } };
  cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  row.commit();
}

function applySubtitleBanner(ws: ExcelJS.Worksheet, subtitle: string, colCount: number) {
  const row = ws.getRow(2);
  row.height = 24;
  ws.mergeCells(2, 1, 2, colCount);

  const cell = row.getCell(1);
  cell.value = subtitle;
  cell.font = { name: "Calibri", size: 9.5, italic: true, color: { argb: COLORS.SUBTITLE_TEXT } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.SUBTITLE_BG } };
  cell.alignment = { vertical: "middle", horizontal: "left", indent: 1, wrapText: true };
  cell.border = {
    bottom: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
  };
  row.commit();
}

function applyGroupedHeaderRow(
  ws: ExcelJS.Worksheet,
  diseaseName?: string,
  diseaseColCount = 0,
) {
  const row = ws.getRow(3);
  row.height = 24;

  // Section 1: Patient identity and baseline (Cols 1-21)
  ws.mergeCells(3, 1, 3, 21);
  const cell1 = row.getCell(1);
  cell1.value = "Patient identity and baseline";
  cell1.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
  cell1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.TEAL_GROUP } };
  cell1.alignment = { vertical: "middle", horizontal: "center" };

  // Section 2: Patient dashboard — longitudinal (Cols 22-52)
  ws.mergeCells(3, 22, 3, 52);
  const cell2 = row.getCell(22);
  cell2.value = "Patient dashboard — longitudinal";
  cell2.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
  cell2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.CYAN_GROUP } };
  cell2.alignment = { vertical: "middle", horizontal: "center" };

  // Section 3: Doctor dashboard — longitudinal (Cols 53-62)
  ws.mergeCells(3, 53, 3, 62);
  const cell3 = row.getCell(53);
  cell3.value = "Doctor dashboard — longitudinal";
  cell3.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
  cell3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.TEAL_GROUP } };
  cell3.alignment = { vertical: "middle", horizontal: "center" };

  // Section 4: <Disease> questions — longitudinal (Cols 63 to End)
  if (diseaseName && diseaseColCount > 0) {
    const endCol = 62 + diseaseColCount;
    ws.mergeCells(3, 63, 3, endCol);
    const cell4 = row.getCell(63);
    cell4.value = `${diseaseName} questions — longitudinal`;
    cell4.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
    cell4.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.BLUE_GROUP } };
    cell4.alignment = { vertical: "middle", horizontal: "center" };
  }

  const totalCols = 62 + diseaseColCount;
  for (let c = 1; c <= totalCols; c++) {
    const cCell = row.getCell(c);
    cCell.border = {
      top: { style: "thin", color: { argb: COLORS.BORDER_DARK } },
      bottom: { style: "thin", color: { argb: COLORS.BORDER_DARK } },
      left: { style: "thin", color: { argb: COLORS.BORDER_DARK } },
      right: { style: "thin", color: { argb: COLORS.BORDER_DARK } },
    };
  }

  row.commit();
}

function applyColumnHeaders(ws: ExcelJS.Worksheet, columns: ColumnDefinition[]) {
  const row = ws.getRow(4);
  row.height = 34;

  columns.forEach((col, idx) => {
    const cell = row.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.COL_HEADER_BG } };
    cell.alignment = {
      vertical: "middle",
      horizontal: col.align === "right" ? "right" : col.align === "center" ? "center" : "left",
      wrapText: false,
    };
    cell.border = {
      top: { style: "thin", color: { argb: COLORS.BORDER_DARK } },
      bottom: { style: "medium", color: { argb: COLORS.BORDER_DARK } },
      left: { style: "thin", color: { argb: COLORS.BORDER_DARK } },
      right: { style: "thin", color: { argb: COLORS.BORDER_DARK } },
    };
  });

  row.commit();

  // Set worksheet column widths
  columns.forEach((col, idx) => {
    ws.getColumn(idx + 1).width = col.width;
  });

  // Enable AutoFilter on Row 4
  ws.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: columns.length },
  };
}

function renderDataRows(
  ws: ExcelJS.Worksheet,
  rows: Record<string, unknown>[],
  columns: ColumnDefinition[],
) {
  rows.forEach((rowData, rIdx) => {
    const rowNum = 5 + rIdx;
    const row = ws.getRow(rowNum);
    row.height = 22;
    const isEven = rIdx % 2 === 1;

    columns.forEach((col, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      const val = rowData[col.header];

      // Clean missing data rule: null/undefined/"" stays empty cell
      if (val !== null && val !== undefined && val !== "") {
        if (col.isNumeric && typeof val === "number") {
          cell.value = val;
          cell.numFmt = Number.isInteger(val) ? "#,##0" : "0.0";
        } else if (typeof val === "number") {
          cell.value = val;
        } else {
          cell.value = String(val);
        }
      } else {
        cell.value = null; // Blank cell in Excel
      }

      cell.font = { name: "Calibri", size: 9.5, color: { argb: COLORS.TEXT_DARK } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? COLORS.ROW_EVEN_BG : COLORS.ROW_ODD_BG },
      };
      cell.border = {
        top: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
        bottom: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
        left: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
        right: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: col.align,
        wrapText: Boolean(col.wrapText),
      };
    });

    row.commit();
  });
}

// ── 1. Render Read Me Sheet ─────────────────────────────────────────────────
function renderReadMeSheet(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet("Read Me", {
    properties: { defaultRowHeight: 20, showGridLines: true },
  });

  // Title
  ws.mergeCells(1, 1, 1, 6);
  const titleRow = ws.getRow(1);
  titleRow.height = 36;
  const titleCell = titleRow.getCell(1);
  titleCell.value = "O2Plus disease-specific longitudinal research export";
  titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.NAVY_HEADER } };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  titleRow.commit();

  // Purpose Row
  ws.mergeCells(3, 1, 3, 6);
  const purposeRow = ws.getRow(3);
  purposeRow.height = 30;
  const purposeCell = purposeRow.getCell(1);
  purposeCell.value =
    "Purpose: One patient occupies one row in each applicable disease sheet. The workbook preserves the original patient row and separates longitudinal values so research users can see first, latest, change, and every recorded date/value pair.";
  purposeCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: COLORS.TEXT_DARK } };
  purposeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.SUBTITLE_BG } };
  purposeCell.alignment = { vertical: "middle", horizontal: "left", indent: 1, wrapText: true };
  purposeRow.commit();

  // Table Header (Row 5)
  const headers = [
    "Sheet",
    "Who appears",
    "What it captures",
    "Mobile fields",
    "Schema fields (when recorded)",
    "Do not use as",
  ];
  const widths = [18, 26, 44, 28, 36, 38];

  const headerRow = ws.getRow(5);
  headerRow.height = 28;
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.TEAL_GROUP } };
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    cell.border = {
      top: { style: "thin", color: { argb: COLORS.BORDER_DARK } },
      bottom: { style: "medium", color: { argb: COLORS.BORDER_DARK } },
      left: { style: "thin", color: { argb: COLORS.BORDER_DARK } },
      right: { style: "thin", color: { argb: COLORS.BORDER_DARK } },
    };
    ws.getColumn(i + 1).width = widths[i]!;
  });
  headerRow.commit();

  // Table Data Rows
  const tableData = [
    [
      "All Patients",
      "Every exported patient",
      "Patient dashboard, daily logs, trends, medication, doctor instructions, appointments and PFT history",
      "Common daily-log fields",
      "None",
      "A replacement for raw event storage",
    ],
    [
      "Asthma",
      "Asthma diagnosis",
      "Rescue puffs, PEFR, night waking, controller inhaler, and any recorded asthma-control data",
      "4 direct mobile questions",
      "PEFR personal best and asthma-control fields",
      "A made-up ACT/GINA score",
    ],
    [
      "COPD",
      "COPD diagnosis",
      "Energy, chest heaviness, sputum, sleep, exercise tolerance and wheeze",
      "7 direct mobile questions",
      "Steps, cough frequency, haemoptysis and exercise-good fields",
      "A CAT score (not captured in the mobile code)",
    ],
    [
      "ILD",
      "ILD diagnosis",
      "K-BILD score, antifibrotic adherence, rash and diarrhoea",
      "4 direct mobile questions",
      "K-BILD Q1–Q15 responses, answered count and previous score",
      "A new clinical score",
    ],
    [
      "Bronchiectasis",
      "Bronchiectasis diagnosis",
      "Clearance, sputum, fever, malaise, edema and wheeze",
      "7 direct mobile questions",
      "Recorded temperature and haemoptysis volume",
      "A flare score that the app does not capture",
    ],
    [
      "Post ICU",
      "Post-ICU / ICU / PICS diagnosis",
      "Energy, sleep quality, anxiety, fever and confusion",
      "5 direct mobile questions",
      "Sputum, clearance, temperature, malaise and haemoptysis fields",
      "Sarcopenia or functional-recovery scores",
    ],
  ];

  tableData.forEach((rowVals, rIdx) => {
    const row = ws.getRow(6 + rIdx);
    row.height = 36;
    const isEven = rIdx % 2 === 1;

    rowVals.forEach((val, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = val;
      cell.font = {
        name: "Calibri",
        size: 9.5,
        bold: cIdx === 0,
        color: { argb: COLORS.TEXT_DARK },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? COLORS.ROW_EVEN_BG : COLORS.ROW_ODD_BG },
      };
      cell.border = {
        top: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
        bottom: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
        left: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
        right: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
      };
      cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true, indent: 1 };
    });
    row.commit();
  });

  // Longitudinal Export Rules
  const rulesRowStart = 14;
  ws.mergeCells(rulesRowStart, 1, rulesRowStart, 6);
  const rulesHeader = ws.getRow(rulesRowStart);
  rulesHeader.height = 24;
  const rhCell = rulesHeader.getCell(1);
  rhCell.value = "Longitudinal Export Rules & Governance:";
  rhCell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: COLORS.TEXT_DARK } };
  rhCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  rulesHeader.commit();

  const rules = [
    "• Numeric fields show first, latest and change (calculated as latest - first when both exist).",
    "• History fields contain the complete date-stamped sequence in chronological order as YYYY-MM-DD=value.",
    "• Blank means not recorded — it is never converted to 0, false, or 'None'.",
    "• Disease-specific fields follow the Disease Field Codebook exactly.",
    "• Fields marked '[schema, when recorded]' remain blank when no source value exists.",
    "• The workbook is an analytical/export view and does not replace normalized raw event storage.",
  ];

  rules.forEach((rule, idx) => {
    const rowNum = rulesRowStart + 1 + idx;
    ws.mergeCells(rowNum, 1, rowNum, 6);
    const r = ws.getRow(rowNum);
    r.height = 20;
    const c = r.getCell(1);
    c.value = rule;
    c.font = { name: "Calibri", size: 9.5, color: { argb: COLORS.TEXT_MUTED } };
    c.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    r.commit();
  });
}

// ── 2. Render Codebook Sheet ────────────────────────────────────────────────
function renderCodebookSheet(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet("Disease Field Codebook", {
    properties: { defaultRowHeight: 20, showGridLines: true },
  });

  applyTitleBanner(ws, "O2Plus Disease Field Codebook", 4);
  applySubtitleBanner(
    ws,
    "Standardized definitions, capture sources, and workbook longitudinal treatments for all disease-specific fields.",
    4,
  );

  const headerRow = ws.getRow(3);
  headerRow.height = 28;
  const cols = [
    { name: "Disease", width: 18 },
    { name: "Field", width: 36 },
    { name: "Capture source", width: 62 },
    { name: "Workbook treatment", width: 42 },
  ];

  cols.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.name;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.TEAL_GROUP } };
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    cell.border = {
      top: { style: "thin", color: { argb: COLORS.BORDER_DARK } },
      bottom: { style: "medium", color: { argb: COLORS.BORDER_DARK } },
      left: { style: "thin", color: { argb: COLORS.BORDER_DARK } },
      right: { style: "thin", color: { argb: COLORS.BORDER_DARK } },
    };
    ws.getColumn(idx + 1).width = col.width;
  });
  headerRow.commit();

  DISEASE_FIELD_CODEBOOK.forEach((item, idx) => {
    const rowNum = 4 + idx;
    const row = ws.getRow(rowNum);
    row.height = 22;
    const isEven = idx % 2 === 1;

    const values = [item.disease, item.field, item.captureSource, item.treatment];
    values.forEach((val, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = val;
      cell.font = {
        name: "Calibri",
        size: 9.5,
        bold: cIdx === 0 || cIdx === 1,
        color: { argb: COLORS.TEXT_DARK },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? COLORS.ROW_EVEN_BG : COLORS.ROW_ODD_BG },
      };
      cell.border = {
        top: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
        bottom: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
        left: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
        right: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
      };
      cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    });
    row.commit();
  });

  ws.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: 4 },
  };
}

// ── 3. Render Patient Sheet (All Patients & Disease Sheets) ─────────────────
function renderPatientSheet(
  wb: ExcelJS.Workbook,
  sheetName: string,
  title: string,
  subtitle: string,
  columns: ColumnDefinition[],
  rows: Record<string, unknown>[],
  diseaseName?: string,
  diseaseColCount = 0,
) {
  const ws = wb.addWorksheet(sheetName, {
    properties: { defaultRowHeight: 22, showGridLines: true },
    views: [{ state: "frozen", xSplit: 4, ySplit: 4, activeCell: "E5" }],
  });

  applyTitleBanner(ws, title, columns.length);
  applySubtitleBanner(ws, subtitle, columns.length);
  applyGroupedHeaderRow(ws, diseaseName, diseaseColCount);
  applyColumnHeaders(ws, columns);
  renderDataRows(ws, rows, columns);
}

// ── Main Workbook Renderer ──────────────────────────────────────────────────
export async function renderExcelRegistry(bundle: ExportDataBundle): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "O2Plus Longitudinal Research Platform";
  wb.created = new Date();
  wb.modified = new Date();

  const patients: LongitudinalPatientData[] = bundle.longitudinalPatients ?? [];

  const instructionSubtitle =
    "One patient per row. Numeric fields show first, latest, and change; every History field stores the complete date-stamped sequence as YYYY-MM-DD=value. Blank means not recorded — it is not a zero.";

  // 1. Read Me Sheet
  renderReadMeSheet(wb);

  // 2. All Patients Sheet
  const allCommonRows = patients.map((p) => p.commonRow);
  renderPatientSheet(
    wb,
    "All Patients",
    "O2Plus All Patients — longitudinal research export",
    instructionSubtitle,
    COMMON_EXPORT_COLUMNS,
    allCommonRows,
  );

  // 3. Asthma Sheet
  const asthmaPatients = patients.filter((p) => {
    const eff = (p.effectiveDashboard || "").toLowerCase();
    const prim = (p.primaryDiagnosis || "").toLowerCase();
    return eff.includes("asthma") || prim.includes("asthma");
  });
  renderPatientSheet(
    wb,
    "Asthma",
    "O2Plus Asthma — longitudinal research export",
    instructionSubtitle,
    ASTHMA_EXPORT_COLUMNS,
    asthmaPatients.map((p) => p.asthmaRow ?? p.commonRow),
    "Asthma",
    24,
  );

  // 4. COPD Sheet
  const copdPatients = patients.filter((p) => {
    const eff = (p.effectiveDashboard || "").toLowerCase();
    const prim = (p.primaryDiagnosis || "").toLowerCase();
    return eff.includes("copd") || prim.includes("copd") || prim.includes("emphysema") || prim.includes("chronic bronchitis");
  });
  renderPatientSheet(
    wb,
    "COPD",
    "O2Plus COPD — longitudinal research export",
    instructionSubtitle,
    COPD_EXPORT_COLUMNS,
    copdPatients.map((p) => p.copdRow ?? p.commonRow),
    "COPD",
    30,
  );

  // 5. ILD Sheet
  const ildPatients = patients.filter((p) => {
    const eff = (p.effectiveDashboard || "").toLowerCase();
    const prim = (p.primaryDiagnosis || "").toLowerCase();
    return eff.includes("ild") || prim.includes("ild") || prim.includes("fibrosis") || prim.includes("nsip") || prim.includes("uip") || prim.includes("hp") || prim.includes("sarcoidosis");
  });
  renderPatientSheet(
    wb,
    "ILD",
    "O2Plus ILD — longitudinal research export",
    instructionSubtitle,
    ILD_EXPORT_COLUMNS,
    ildPatients.map((p) => p.ildRow ?? p.commonRow),
    "ILD",
    20,
  );

  // 6. Bronchiectasis Sheet
  const bronchPatients = patients.filter((p) => {
    const eff = (p.effectiveDashboard || "").toLowerCase();
    const prim = (p.primaryDiagnosis || "").toLowerCase();
    return eff.includes("bronch") || prim.includes("bronch");
  });
  renderPatientSheet(
    wb,
    "Bronchiectasis",
    "O2Plus Bronchiectasis — longitudinal research export",
    instructionSubtitle,
    BRONCHIECTASIS_EXPORT_COLUMNS,
    bronchPatients.map((p) => p.bronchRow ?? p.commonRow),
    "Bronchiectasis",
    22,
  );

  // 7. Post ICU Sheet
  const postIcuPatients = patients.filter((p) => {
    const eff = (p.effectiveDashboard || "").toLowerCase();
    const prim = (p.primaryDiagnosis || "").toLowerCase();
    return eff.includes("post_icu") || eff.includes("icu") || prim.includes("icu") || prim.includes("post-icu") || prim.includes("pics");
  });
  renderPatientSheet(
    wb,
    "Post ICU",
    "O2Plus Post ICU — longitudinal research export",
    instructionSubtitle,
    POST_ICU_EXPORT_COLUMNS,
    postIcuPatients.map((p) => p.postIcuRow ?? p.commonRow),
    "Post ICU",
    32,
  );

  // 8. Disease Field Codebook Sheet
  renderCodebookSheet(wb);

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
