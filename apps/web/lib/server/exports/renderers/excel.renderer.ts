import ExcelJS from "exceljs";
import type { ExportDataBundle, FormattedDailyLogColumnSet, PatientExportRecord } from "../export.types";
import { getRiskColorStyles } from "../aggregation/risk-level";

interface FixedColumnDef {
  header: string;
  key: keyof PatientExportRecord;
  width: number;
  align: "left" | "center" | "right";
  wrapText?: boolean;
}

const FIXED_REGISTRY_COLUMNS: FixedColumnDef[] = [
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

interface DailyFieldDef {
  suffix: string;
  width: number;
  align: "left" | "center" | "right";
  wrapText?: boolean;
  getter: (d: FormattedDailyLogColumnSet) => string | number;
}

const DAILY_FIELD_TEMPLATES: DailyFieldDef[] = [
  { suffix: "Date",                   width: 14, align: "center", getter: (d) => d.logDate },
  { suffix: "AQI",                    width: 10, align: "right",  getter: (d) => d.aqi },
  { suffix: "SpO2 Rest (%)",          width: 15, align: "right",  getter: (d) => d.spo2Rest },
  { suffix: "SpO2 Exertion (%)",      width: 17, align: "right",  getter: (d) => d.spo2Exertion },
  { suffix: "Heart Rate (bpm)",       width: 16, align: "right",  getter: (d) => d.heartRate },
  { suffix: "Medication Adherence",   width: 24, align: "left",   getter: (d) => d.medicationAdherence },
  { suffix: "mMRC (0-4)",             width: 12, align: "center", getter: (d) => d.mmrc },
  { suffix: "Symptoms Severity",      width: 28, align: "left",   getter: (d) => d.symptomsVas, wrapText: true },
  { suffix: "Drug Side Effects",      width: 22, align: "left",   getter: (d) => d.sideEffects, wrapText: true },
  { suffix: "K-BILD Score",           width: 16, align: "center", getter: (d) => d.kbild },
  { suffix: "Asthma Control Score",   width: 24, align: "left",   getter: (d) => d.asthmaControl },
  { suffix: "Sputum / Hemoptysis",    width: 28, align: "left",   getter: (d) => d.sputumHemoptysis, wrapText: true },
  { suffix: "Disease Specific Data",  width: 32, align: "left",   getter: (d) => d.diseaseSpecific, wrapText: true },
];

export async function renderExcelRegistry(bundle: ExportDataBundle): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "O2Plus Clinical Platform";
  wb.created = new Date();
  wb.modified = new Date();

  // Determine maximum number of daily log entries across all patients
  const maxLogsActual = bundle.records.reduce((max, r) => Math.max(max, r.dailyLogs?.length ?? 0), 0);
  
  // Excel hard maximum is 16,384 columns. 33 fixed columns + (maxLogs * 13)
  const maxAllowedLogBlocks = Math.floor((16384 - FIXED_REGISTRY_COLUMNS.length) / DAILY_FIELD_TEMPLATES.length);
  const maxLogBlocks = Math.min(maxLogsActual, maxAllowedLogBlocks);

  // Single Flat Sheet for Patient Registry (1 Patient = 1 Row)
  const ws = wb.addWorksheet("Patient Registry", {
    properties: { defaultRowHeight: 22 },
    views: [{ state: "frozen", ySplit: 1, xSplit: 5, activeCell: "F2" }],
  });

  // 1. Build dynamic columns array
  const dynamicColumns: { header: string; key: string; width: number }[] = [];

  // Add 33 Fixed columns
  FIXED_REGISTRY_COLUMNS.forEach((col) => {
    dynamicColumns.push({
      header: col.header,
      key: col.key as string,
      width: col.width,
    });
  });

  // Add dynamic horizontal log columns
  for (let dayIdx = 0; dayIdx < maxLogBlocks; dayIdx++) {
    const logNumber = dayIdx + 1;
    DAILY_FIELD_TEMPLATES.forEach((tpl) => {
      dynamicColumns.push({
        header: `Log ${logNumber} - ${tpl.suffix}`,
        key: `log_${logNumber}_${tpl.suffix.replace(/[^a-zA-Z0-9]/g, "_")}`,
        width: tpl.width,
      });
    });
  }

  ws.columns = dynamicColumns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  const totalCols = dynamicColumns.length;

  // 2. Style Header Row
  const headerRow = ws.getRow(1);
  headerRow.height = 32;

  for (let cIdx = 1; cIdx <= totalCols; cIdx++) {
    const cell = headerRow.getCell(cIdx);
    const isFixed = cIdx <= FIXED_REGISTRY_COLUMNS.length;
    
    // Compute day block index if it's a dynamic log column
    let blockBg = "FF0F2B48"; // Default Navy for fixed columns
    if (!isFixed) {
      const dynamicColOffset = cIdx - FIXED_REGISTRY_COLUMNS.length - 1;
      const dayBlockIndex = Math.floor(dynamicColOffset / DAILY_FIELD_TEMPLATES.length);
      // Alternating deep clinical blue tones for consecutive day blocks
      blockBg = dayBlockIndex % 2 === 0 ? "FF1A4971" : "FF1E6091";
    }

    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: blockBg },
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
  headerRow.commit();

  // 3. Enable AutoFilter across all generated columns
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: totalCols },
  };

  // 4. Populate Data Rows (Exactly ONE row per patient)
  bundle.records.forEach((record, idx) => {
    // Build row data object containing fixed properties + dynamic log properties
    const rowData: Record<string, unknown> = { ...record };

    const patDailyLogs = record.dailyLogs ?? [];
    for (let dayIdx = 0; dayIdx < maxLogBlocks; dayIdx++) {
      const logNumber = dayIdx + 1;
      const logEntry = patDailyLogs[dayIdx];

      DAILY_FIELD_TEMPLATES.forEach((tpl) => {
        const colKey = `log_${logNumber}_${tpl.suffix.replace(/[^a-zA-Z0-9]/g, "_")}`;
        rowData[colKey] = logEntry ? tpl.getter(logEntry) : "—";
      });
    }

    const row = ws.addRow(rowData);
    row.height = 22;
    const isEven = idx % 2 === 1;

    // Apply formatting to fixed columns
    FIXED_REGISTRY_COLUMNS.forEach((col, cIdx) => {
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
          fgColor: { argb: "FFF8FAFC" },
        };
      }
    });

    // Conditional Formatting for Risk Level (Column 28)
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

    // Apply formatting to dynamic daily log columns
    let currentCellIndex = FIXED_REGISTRY_COLUMNS.length + 1;
    for (let dayIdx = 0; dayIdx < maxLogBlocks; dayIdx++) {
      const hasLog = dayIdx < patDailyLogs.length;

      DAILY_FIELD_TEMPLATES.forEach((tpl) => {
        const cell = row.getCell(currentCellIndex);
        cell.font = {
          name: "Calibri",
          size: 10,
          color: { argb: hasLog ? "FF1A2E35" : "FFA0AEC0" },
        };
        cell.border = {
          top:    { style: "thin", color: { argb: "FFE2E8F0" } },
          left:   { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right:  { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: tpl.align,
          wrapText: tpl.wrapText ?? false,
        };

        if (isEven) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8FAFC" },
          };
        }

        currentCellIndex++;
      });
    }

    row.commit();
  });

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
