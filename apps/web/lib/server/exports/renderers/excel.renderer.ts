import ExcelJS from "exceljs";
import type { ExportDataBundle, PatientExportRecord } from "../export.types";
import { getRiskColorStyles } from "../aggregation/risk-level";

interface ColumnDef {
  header: string;
  key: keyof PatientExportRecord;
  width: number;
  align: "left" | "center" | "right";
  wrapText?: boolean;
}

const REGISTRY_COLUMNS: ColumnDef[] = [
  { header: "S No.",               key: "sno",               width: 7,   align: "center" },
  { header: "File No.",            key: "fileNo",            width: 13,  align: "center" },
  { header: "UHID",                key: "uhid",              width: 15,  align: "center" },
  { header: "Mobile No.",          key: "mobile",            width: 15,  align: "center" },
  { header: "Name",                key: "name",              width: 22,  align: "left"   },
  { header: "Age",                 key: "age",               width: 7,   align: "center" },
  { header: "Sex",                 key: "sex",               width: 7,   align: "center" },
  { header: "Occupation",          key: "occupation",        width: 16,  align: "left"   },
  { header: "Smoker",              key: "smoker",            width: 10,  align: "center" },
  { header: "Symptomatic",         key: "symptomatic",       width: 14,  align: "center" },
  { header: "Date of Enroll",      key: "dateOfEnroll",      width: 15,  align: "center" },
  { header: "Histopathology",      key: "histopathology",    width: 20,  align: "left"   },
  { header: "Complete diag",       key: "completeDiag",      width: 32,  align: "left",  wrapText: true },
  { header: "Type of connective",  key: "typeOfConnective",  width: 20,  align: "left"   },
  { header: "Co-morbidities",      key: "comorbidities",     width: 32,  align: "left",  wrapText: true },
  { header: "6MWD",                key: "sixMwd",            width: 10,  align: "right"  },
  { header: "FEV1/FVC",            key: "fev1Fvc",           width: 12,  align: "right"  },
  { header: "observed FEV",        key: "observedFev",       width: 14,  align: "right"  },
  { header: "% predicted FEV1",    key: "pctPredictedFev1",  width: 16,  align: "right"  },
  { header: "Observed FVC",        key: "observedFvc",       width: 14,  align: "right"  },
  { header: "% predicted FVC",     key: "pctPredictedFvc",   width: 16,  align: "right"  },
  { header: "Dlco",                key: "dlco",              width: 10,  align: "right"  },
  { header: "Baseline SpO2 (%)",   key: "baselineSpo2",      width: 16,  align: "right"  },
  { header: "Baseline HR (bpm)",   key: "baselineHr",        width: 16,  align: "right"  },
  { header: "Worst SpO2 (%)",      key: "worstSpo2",         width: 15,  align: "right"  },
  { header: "Worst mMRC (0-4)",    key: "worstMmrc",         width: 16,  align: "center" },
  { header: "Worst Risk Score",    key: "worstRiskScore",    width: 16,  align: "center" },
  { header: "Risk Level",          key: "riskLevel",         width: 14,  align: "center" },
  { header: "Alert Status",        key: "alertStatus",       width: 16,  align: "center" },
  { header: "Total Logs",          key: "totalLogs",         width: 12,  align: "right"  },
  { header: "Adherence %",         key: "adherencePct",      width: 14,  align: "right"  },
  { header: "Current Meds",        key: "currentMeds",       width: 44,  align: "left",  wrapText: true },
  { header: "Respiratory Support", key: "respiratorySupport",width: 22,  align: "left"   },
];

function applyMainHeaderStyles(row: ExcelJS.Row, columnCount: number) {
  row.height = 30;
  for (let i = 1; i <= columnCount; i++) {
    const cell = row.getCell(i);
    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F2B48" }, // Navy
    };
    cell.border = {
      top:    { style: "thin", color: { argb: "FF0A192F" } },
      left:   { style: "thin", color: { argb: "FF0A192F" } },
      bottom: { style: "medium", color: { argb: "FF0A192F" } },
      right:  { style: "thin", color: { argb: "FF0A192F" } },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "left",
      wrapText: false,
    };
  }
  row.commit();
}

function applySubSheetHeaderStyles(row: ExcelJS.Row, columnCount: number) {
  row.height = 26;
  for (let i = 1; i <= columnCount; i++) {
    const cell = row.getCell(i);
    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E6091" }, // Azure Blue
    };
    cell.border = {
      top:    { style: "thin", color: { argb: "FF1A4971" } },
      left:   { style: "thin", color: { argb: "FF1A4971" } },
      bottom: { style: "medium", color: { argb: "FF1A4971" } },
      right:  { style: "thin", color: { argb: "FF1A4971" } },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "left",
      wrapText: false,
    };
  }
  row.commit();
}

export async function renderExcelRegistry(bundle: ExportDataBundle): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "O2Plus Clinical Platform";
  wb.created = new Date();
  wb.modified = new Date();

  // ── Sheet 1: Patient Registry (Single Flat Table for All Patients / Cohorts) ─
  const ws = wb.addWorksheet("Patient Registry", {
    properties: { defaultRowHeight: 22 },
    views: [{ state: "frozen", ySplit: 1, xSplit: 0, activeCell: "A2" }],
  });

  ws.columns = REGISTRY_COLUMNS.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  // 1. Header Styling: Bright yellow background (#FFFF00), bold black text, Calibri 11
  applyMainHeaderStyles(ws.getRow(1), REGISTRY_COLUMNS.length);

  // 2. Enable AutoFilter across all 33 columns
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: REGISTRY_COLUMNS.length },
  };

  // 3. Populate Data Rows (Exactly ONE row per patient)
  bundle.records.forEach((record, idx) => {
    const row = ws.addRow(record);
    row.height = 22;

    const isEven = idx % 2 === 1;

    REGISTRY_COLUMNS.forEach((col, cIdx) => {
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
        horizontal: col.align,
        wrapText: col.wrapText ?? false,
      };

      if (isEven) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" }, // Very light row shading
        };
      }
    });

    // 4. Conditional Formatting for Risk Level (Column 28)
    const riskStyles = getRiskColorStyles(record.riskLevel);
    const riskCell = row.getCell(28);
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

    row.commit();
  });

  // ── MULTI-SHEET LOGIC FOR SINGLE PATIENT ONLY ──────────────────────────────
  if (bundle.scope === "single_patient") {
    // Sheet 2: Daily Clinical Logs
    if (bundle.singlePatientLogs && bundle.singlePatientLogs.length > 0) {
      const logSheet = wb.addWorksheet("Daily Clinical Logs", {
        properties: { defaultRowHeight: 20 },
        views: [{ state: "frozen", ySplit: 1, xSplit: 0, activeCell: "A2" }],
      });

      const LOG_COLS = [
        { header: "Date",                   key: "date",                 width: 14, align: "center" },
        { header: "SpO2 Rest (%)",          key: "spo2Rest",             width: 15, align: "right"  },
        { header: "SpO2 Walk (%)",          key: "spo2Walk",             width: 15, align: "right"  },
        { header: "mMRC Grade",             key: "mmrc",                 width: 12, align: "center" },
        { header: "AQI Value",              key: "aqi",                  width: 12, align: "right"  },
        { header: "VAS Symptoms",           key: "vasSymptoms",          width: 32, align: "left"   },
        { header: "Medication Compliance",  key: "medicationCompliance", width: 28, align: "left"   },
        { header: "Risk Score",             key: "riskScore",            width: 12, align: "center" },
        { header: "Clinical Observations",  key: "clinicalNotes",        width: 36, align: "left"   },
      ] as const;

      logSheet.columns = LOG_COLS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
      applySubSheetHeaderStyles(logSheet.getRow(1), LOG_COLS.length);

      logSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: LOG_COLS.length },
      };

      bundle.singlePatientLogs.forEach((l, lIdx) => {
        const row = logSheet.addRow(l);
        row.height = 20;
        const isEven = lIdx % 2 === 1;

        LOG_COLS.forEach((col, cIdx) => {
          const cell = row.getCell(cIdx + 1);
          cell.font = { name: "Calibri", size: 10, color: { argb: "FF1A2E35" } };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
          cell.alignment = { vertical: "middle", horizontal: col.align as ExcelJS.Alignment["horizontal"] };
          if (isEven) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
          }
        });
        row.commit();
      });
    }

    // Sheet 3: Alerts
    if (bundle.singlePatientAlerts && bundle.singlePatientAlerts.length > 0) {
      const alertSheet = wb.addWorksheet("Alerts", {
        properties: { defaultRowHeight: 20 },
        views: [{ state: "frozen", ySplit: 1, xSplit: 0, activeCell: "A2" }],
      });

      const ALERT_COLS = [
        { header: "Alert Date", key: "date", width: 16, align: "center" },
        { header: "Alert Type", key: "alertType", width: 18, align: "left" },
        { header: "Severity", key: "severity", width: 14, align: "center" },
        { header: "Status", key: "status", width: 16, align: "center" },
        { header: "Trigger Reason", key: "reason", width: 44, align: "left" },
      ] as const;

      alertSheet.columns = ALERT_COLS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
      applySubSheetHeaderStyles(alertSheet.getRow(1), ALERT_COLS.length);

      alertSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: ALERT_COLS.length },
      };

      bundle.singlePatientAlerts.forEach((a, aIdx) => {
        const row = alertSheet.addRow(a);
        row.height = 20;
        const isEven = aIdx % 2 === 1;

        ALERT_COLS.forEach((col, cIdx) => {
          const cell = row.getCell(cIdx + 1);
          cell.font = { name: "Calibri", size: 10, color: { argb: "FF1A2E35" } };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
          cell.alignment = { vertical: "middle", horizontal: col.align as ExcelJS.Alignment["horizontal"] };
          if (isEven) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
          }
        });
        row.commit();
      });
    }

    // Sheet 4: Medications
    if (bundle.singlePatientMeds && bundle.singlePatientMeds.length > 0) {
      const medSheet = wb.addWorksheet("Medications", {
        properties: { defaultRowHeight: 20 },
        views: [{ state: "frozen", ySplit: 1, xSplit: 0, activeCell: "A2" }],
      });

      const MED_COLS = [
        { header: "Drug Name", key: "drugName", width: 26, align: "left" },
        { header: "Route", key: "route", width: 14, align: "left" },
        { header: "Dose", key: "dose", width: 14, align: "left" },
        { header: "Frequency", key: "frequency", width: 14, align: "left" },
        { header: "Start Date", key: "startDate", width: 14, align: "center" },
        { header: "End Date", key: "endDate", width: 14, align: "center" },
        { header: "Status", key: "status", width: 14, align: "center" },
      ] as const;

      medSheet.columns = MED_COLS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
      applySubSheetHeaderStyles(medSheet.getRow(1), MED_COLS.length);

      medSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: MED_COLS.length },
      };

      bundle.singlePatientMeds.forEach((m, mIdx) => {
        const row = medSheet.addRow(m);
        row.height = 20;
        const isEven = mIdx % 2 === 1;

        MED_COLS.forEach((col, cIdx) => {
          const cell = row.getCell(cIdx + 1);
          cell.font = { name: "Calibri", size: 10, color: { argb: "FF1A2E35" } };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
          cell.alignment = { vertical: "middle", horizontal: col.align as ExcelJS.Alignment["horizontal"] };
          if (isEven) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
          }
        });
        row.commit();
      });
    }

    // Sheet 5: PFT History (Cleanly extracted without raw JSON)
    if (bundle.singlePatientPfts && bundle.singlePatientPfts.length > 0) {
      const pftSheet = wb.addWorksheet("PFT History", {
        properties: { defaultRowHeight: 20 },
        views: [{ state: "frozen", ySplit: 1, xSplit: 0, activeCell: "A2" }],
      });

      const PFT_COLS = [
        { header: "Test Date", key: "testDate", width: 14, align: "center" },
        { header: "FEV1/FVC (%)", key: "fev1FvcRatio", width: 15, align: "right" },
        { header: "Observed FEV1 (L)", key: "observedFev", width: 16, align: "right" },
        { header: "% Predicted FEV1", key: "pctPredictedFev1", width: 18, align: "right" },
        { header: "Observed FVC (L)", key: "observedFvc", width: 16, align: "right" },
        { header: "% Predicted FVC", key: "pctPredictedFvc", width: 18, align: "right" },
        { header: "DLCO (%)", key: "dlco", width: 12, align: "right" },
        { header: "6MWD (m)", key: "sixMwd", width: 12, align: "right" },
        { header: "Baseline SpO2 (%)", key: "baselineSpo2", width: 18, align: "right" },
        { header: "Baseline HR (bpm)", key: "baselineHr", width: 18, align: "right" },
      ] as const;

      pftSheet.columns = PFT_COLS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
      applySubSheetHeaderStyles(pftSheet.getRow(1), PFT_COLS.length);

      pftSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: PFT_COLS.length },
      };

      bundle.singlePatientPfts.forEach((p, pIdx) => {
        const row = pftSheet.addRow(p);
        row.height = 20;
        const isEven = pIdx % 2 === 1;

        PFT_COLS.forEach((col, cIdx) => {
          const cell = row.getCell(cIdx + 1);
          cell.font = { name: "Calibri", size: 10, color: { argb: "FF1A2E35" } };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
          cell.alignment = { vertical: "middle", horizontal: col.align as ExcelJS.Alignment["horizontal"] };
          if (isEven) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
          }
        });
        row.commit();
      });
    }
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
