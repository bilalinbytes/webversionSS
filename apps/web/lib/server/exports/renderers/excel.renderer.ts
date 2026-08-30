import ExcelJS from "exceljs";
import type {
  ExportDataBundle,
  PatientExportRecord,
} from "../export.types";
import { getRiskColorStyles } from "../aggregation/risk-level";

interface FixedColumnDef {
  header: string;
  key: keyof PatientExportRecord;
  width: number;
  align: "left" | "center" | "right";
  wrapText?: boolean;
}

const FIXED_REGISTRY_COLUMNS: FixedColumnDef[] = [
  { header: "S No.",               key: "sno",                         width: 7,   align: "center" },
  { header: "File No.",            key: "fileNo",                      width: 12,  align: "center" },
  { header: "UHID",                key: "uhid",                        width: 14,  align: "center" },
  { header: "Patient Name",        key: "name",                        width: 22,  align: "left"   },
  { header: "Age",                 key: "age",                         width: 7,   align: "center" },
  { header: "Sex",                 key: "sex",                         width: 7,   align: "center" },
  { header: "Occupation",          key: "occupation",                  width: 18,  align: "left"   },
  { header: "Other Occupation",    key: "otherOccupation",             width: 18,  align: "left"   },
  { header: "Significant Exposure",key: "significantExposure",         width: 22,  align: "left",  wrapText: true },
  { header: "Mobile No.",          key: "mobile",                      width: 15,  align: "center" },
  { header: "Alternate Mobile",    key: "alternateMobile",             width: 15,  align: "center" },
  { header: "Date of Enrollment",  key: "dateOfEnroll",                width: 14,  align: "center" },
  { header: "Primary Diagnosis",   key: "primaryDiagnosis",            width: 28,  align: "left",  wrapText: true },
  { header: "Disease Subtype",     key: "diseaseSubtype",              width: 24,  align: "left",  wrapText: true },
  { header: "Co-morbidities",      key: "comorbidities",               width: 28,  align: "left",  wrapText: true },

  // Baseline Physiological Data
  { header: "Baseline SpO2 (%)",   key: "baselineSpo2",                width: 14,  align: "right"  },
  { header: "Baseline HR (BPM)",   key: "baselineHr",                  width: 14,  align: "right"  },
  { header: "Baseline 6MWD (m)",   key: "sixMwd",                      width: 13,  align: "right"  },
  { header: "Baseline FEV1 (L)",   key: "observedFev",                 width: 14,  align: "right"  },
  { header: "Baseline FVC (L)",    key: "observedFvc",                 width: 14,  align: "right"  },
  { header: "Baseline FEV1/FVC (%)",key: "fev1Fvc",                    width: 14,  align: "right"  },
  { header: "Baseline FEV1 % Pred",key: "pctPredictedFev1",            width: 13,  align: "right"  },
  { header: "Baseline FVC % Pred", key: "pctPredictedFvc",             width: 13,  align: "right"  },
  { header: "Baseline DLCO (%)",   key: "dlco",                        width: 12,  align: "right"  },
  { header: "Respiratory Support", key: "respiratorySupport",          width: 24,  align: "left",  wrapText: true },

  // Latest & Longitudinal PFT Progression
  { header: "Latest FEV1 (L)",     key: "latestFev1",                  width: 13,  align: "right"  },
  { header: "Latest FVC (L)",      key: "latestFvc",                   width: 13,  align: "right"  },
  { header: "Latest FEV1/FVC (%)", key: "latestFev1Fvc",               width: 14,  align: "right"  },
  { header: "Latest DLCO (%)",     key: "latestDlco",                  width: 12,  align: "right"  },
  { header: "Longitudinal PFT Progression", key: "longitudinalPftHistory", width: 44, align: "left", wrapText: true },

  // App Engagement & Telemetry Surveillance
  { header: "Days in Period",      key: "totalDaysInPeriod",           width: 13,  align: "center" },
  { header: "Days Logged in App",  key: "daysLogged",                  width: 14,  align: "center" },
  { header: "Logging %",           key: "adherencePct",                width: 12,  align: "right"  },
  { header: "Avg Resting SpO2 (%)",key: "avgSpo2Rest",                 width: 14,  align: "right"  },
  { header: "Worst Resting SpO2",  key: "worstSpo2",                   width: 14,  align: "right"  },
  { header: "Avg Exertion SpO2",   key: "avgSpo2Exertion",             width: 14,  align: "right"  },
  { header: "Worst Exertion SpO2", key: "worstSpo2Exertion",           width: 15,  align: "right"  },
  { header: "Avg Heart Rate",      key: "avgHeartRate",                width: 13,  align: "right"  },
  { header: "Worst Heart Rate",    key: "worstHeartRate",              width: 14,  align: "right"  },
  { header: "Avg AQI",             key: "avgAqi",                      width: 10,  align: "right"  },
  { header: "Worst AQI",           key: "worstAqi",                    width: 10,  align: "right"  },
  { header: "Latest mMRC",         key: "latestMmrc",                  width: 12,  align: "center" },
  { header: "Worst mMRC",          key: "worstMmrc",                   width: 12,  align: "center" },
  { header: "Risk Status",         key: "riskLevel",                   width: 13,  align: "center" },
  { header: "Active Alert",        key: "alertStatus",                 width: 15,  align: "center" },

  // Symptoms Surveillance & Consolidated Logs History
  { header: "Reported Symptoms Summary", key: "allSymptomsSummary",    width: 44,  align: "left",  wrapText: true },
  { header: "Consolidated Daily Logs History", key: "longitudinalLogsHistory", width: 52, align: "left", wrapText: true },

  // Medications History & Compliance
  { header: "Active Prescribed Medications", key: "currentMeds",       width: 40,  align: "left",  wrapText: true },
  { header: "Newly Added Medications", key: "newlyAddedMeds",          width: 28,  align: "left",  wrapText: true },
  { header: "Discontinued Medications History", key: "discontinuedMedsHistory", width: 36, align: "left", wrapText: true },
  { header: "Medication Compliance Rate", key: "medicationComplianceSummary", width: 28, align: "left", wrapText: true },

  // Quality of Life (HRQoL) & Disease-Specific Details
  { header: "Quality of Life (KBILD / HRQoL)", key: "kbildSubscoresInterpretation", width: 34, align: "left", wrapText: true },
  { header: "Disease-Specific Dashboard Details", key: "diseaseSpecificMetricsSummary", width: 38, align: "left", wrapText: true },
];

function applyHeaderStyle(row: ExcelJS.Row, bgArgb: string, colCount: number) {
  row.height = 32;
  for (let cIdx = 1; cIdx <= colCount; cIdx++) {
    const cell = row.getCell(cIdx);
    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: bgArgb },
    };
    cell.border = {
      top:    { style: "thin", color: { argb: "FF0A192F" } },
      left:   { style: "thin", color: { argb: "FF0A192F" } },
      bottom: { style: "medium", color: { argb: "FF0A192F" } },
      right:  { style: "thin", color: { argb: "FF0A192F" } },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: false,
    };
  }
  row.commit();
}

function applyStandardDataRowStyle(row: ExcelJS.Row, isEven: boolean, colDefs: { align?: "left" | "center" | "right"; wrapText?: boolean }[]) {
  row.height = 22;
  colDefs.forEach((col, cIdx) => {
    const cell = row.getCell(cIdx + 1);
    cell.font = {
      name: "Calibri",
      size: 10,
      color: { argb: "FF1A2E35" },
    };
    cell.border = {
      top:    { style: "thin", color: { argb: "FFE2E8F0" } },
      left:   { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      right:  { style: "thin", color: { argb: "FFE2E8F0" } },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: col.align ?? "left",
      wrapText: col.wrapText ?? false,
    };
    if (isEven) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF8FAFC" },
      };
    }
  });
  row.commit();
}

export async function renderExcelRegistry(bundle: ExportDataBundle): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "O2Plus Clinical Platform";
  wb.created = new Date();
  wb.modified = new Date();

  // ═══════════════════════════════════════════════════════════════════════════
  // SHEET 1: Master Patient Registry (One Single Row per Patient)
  // ═══════════════════════════════════════════════════════════════════════════
  const wsRegistry = wb.addWorksheet("Master Patient Registry", {
    properties: { defaultRowHeight: 22 },
    views: [{ state: "frozen", ySplit: 1, xSplit: 2, activeCell: "C2" }],
  });

  wsRegistry.columns = FIXED_REGISTRY_COLUMNS.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  applyHeaderStyle(wsRegistry.getRow(1), "FF0F2B48", FIXED_REGISTRY_COLUMNS.length);
  wsRegistry.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: FIXED_REGISTRY_COLUMNS.length },
  };

  const riskColIdx = FIXED_REGISTRY_COLUMNS.findIndex((c) => c.key === "riskLevel") + 1;

  bundle.records.forEach((record, idx) => {
    const row = wsRegistry.addRow({ ...record });
    const isEven = idx % 2 === 1;
    applyStandardDataRowStyle(row, isEven, FIXED_REGISTRY_COLUMNS);

    // Conditional Formatting for Risk Level
    if (riskColIdx > 0) {
      const riskStyles = getRiskColorStyles(record.riskLevel);
      const riskCell = row.getCell(riskColIdx);
      riskCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: riskStyles.fillColor },
      };
      riskCell.font = {
        name: "Calibri",
        size: 10,
        bold: riskStyles.bold,
        color: { argb: riskStyles.fontColor },
      };
    }
  });

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
