import ExcelJS from "exceljs";
import type {
  ExportDataBundle,
  PatientExportRecord,
  IldTrackRecord,
  AsthmaTrackRecord,
  CopdTrackRecord,
  BronchTrackRecord,
  PostIcuTrackRecord,
  DetailedMedicationRecord,
  DetailedPftRecord,
  DetailedAlertRecord,
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
  { header: "S No.",               key: "sno",               width: 7,   align: "center" },
  { header: "Name",                key: "name",              width: 22,  align: "left"   },
  { header: "Age",                 key: "age",               width: 7,   align: "center" },
  { header: "Sex",                 key: "sex",               width: 7,   align: "center" },
  { header: "Occupation",          key: "occupation",        width: 18,  align: "left"   },
  { header: "Mobile No.",          key: "mobile",            width: 15,  align: "center" },
  { header: "Diagnosis",           key: "primaryDiagnosis",  width: 32,  align: "left",  wrapText: true },
  { header: "Co-morbidities",      key: "comorbidities",     width: 28,  align: "left",  wrapText: true },
  { header: "6MWD (m)",            key: "sixMwd",            width: 11,  align: "right"  },
  { header: "Baseline FEV1 (L)",   key: "observedFev",       width: 14,  align: "right"  },
  { header: "Baseline FVC (L)",    key: "observedFvc",       width: 14,  align: "right"  },
  { header: "FEV1 % Pred",         key: "pctPredictedFev1",  width: 13,  align: "right"  },
  { header: "FVC % Pred",          key: "pctPredictedFvc",   width: 13,  align: "right"  },
  { header: "FEV1/FVC (%)",        key: "fev1Fvc",           width: 13,  align: "right"  },
  { header: "DLCO (%)",            key: "dlco",              width: 11,  align: "right"  },
  { header: "Baseline HR (BPM)",   key: "baselineHr",        width: 15,  align: "right"  },
  { header: "Baseline SpO2 (%)",   key: "baselineSpo2",      width: 15,  align: "right"  },
  { header: "Respiratory Support", key: "respiratorySupport",width: 26,  align: "left",  wrapText: true },
  { header: "Medications Prescribed in Last Visit", key: "currentMeds", width: 46, align: "left", wrapText: true },
  { header: "Days in Period",      key: "totalDaysInPeriod", width: 14,  align: "center" },
  { header: "Days Logged in App",  key: "daysLogged",        width: 16,  align: "center" },
  { header: "Logging %",           key: "adherencePct",      width: 13,  align: "right"  },
  { header: "Risk Status",         key: "riskLevel",         width: 14,  align: "center" },
  { header: "File No.",            key: "fileNo",            width: 12,  align: "center" },
  { header: "UHID",                key: "uhid",              width: 14,  align: "center" },
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

  // ═══════════════════════════════════════════════════════════════════════════
  // SHEET 2: ILD Clinical Track (All 15 KBILD responses, scores & HRQoL)
  // ═══════════════════════════════════════════════════════════════════════════
  if (bundle.ildTrackRecords && bundle.ildTrackRecords.length > 0) {
    const wsIld = wb.addWorksheet("ILD Clinical Track", {
      properties: { defaultRowHeight: 22 },
      views: [{ state: "frozen", ySplit: 1, xSplit: 3, activeCell: "D2" }],
    });

    const ildCols: { header: string; key: keyof IldTrackRecord; width: number; align: "left" | "center" | "right"; wrapText?: boolean }[] = [
      { header: "S No.",                    key: "sno",                       width: 7,  align: "center" },
      { header: "UHID",                     key: "uhid",                      width: 14, align: "center" },
      { header: "Patient Name",             key: "name",                      width: 20, align: "left"   },
      { header: "Age",                      key: "age",                       width: 6,  align: "center" },
      { header: "Sex",                      key: "sex",                       width: 6,  align: "center" },
      { header: "ILD Subtype",              key: "ildSubtype",                width: 24, align: "left"   },
      { header: "Log Date",                 key: "logDate",                   width: 13, align: "center" },
      { header: "SpO2 Rest (%)",            key: "spo2Rest",                  width: 14, align: "right"  },
      { header: "SpO2 Exertion (%)",        key: "spo2Exertion",              width: 16, align: "right"  },
      { header: "Heart Rate (bpm)",         key: "heartRate",                 width: 15, align: "right"  },
      { header: "mMRC (0-4)",               key: "mmrc",                      width: 11, align: "center" },
      { header: "AQI",                      key: "aqi",                       width: 9,  align: "right"  },
      { header: "Med Adherence",            key: "medicationAdherence",       width: 22, align: "left"   },
      { header: "Q1: Breathless Stairs",    key: "kbildQ1_breathlessStairs",  width: 22, align: "left"   },
      { header: "Q2: Chest Tightness",      key: "kbildQ2_chestTight",        width: 22, align: "left"   },
      { header: "Q3: Worry About Disease",  key: "kbildQ3_worryComplaint",    width: 22, align: "left"   },
      { header: "Q4: Avoid Breathless Acts",key: "kbildQ4_avoidBreathless",   width: 22, align: "left"   },
      { header: "Q5: In Control of Lung",   key: "kbildQ5_inControl",         width: 22, align: "left"   },
      { header: "Q6: Feeling Fed Up/Down",  key: "kbildQ6_feelingDown",       width: 22, align: "left"   },
      { header: "Q7: Air Hunger / Urge",    key: "kbildQ7_airHunger",         width: 22, align: "left"   },
      { header: "Q8: Anxious From Disease", key: "kbildQ8_anxious",           width: 22, align: "left"   },
      { header: "Q9: Wheezing Sounds",      key: "kbildQ9_wheeze",            width: 22, align: "left"   },
      { header: "Q10: Disease Getting Worse",key: "kbildQ10_gettingWorse",    width: 22, align: "left"   },
      { header: "Q11: Interfered with Job", key: "kbildQ11_interferedTasks",  width: 22, align: "left"   },
      { header: "Q12: Expect to Worsen",    key: "kbildQ12_expectWorse",      width: 22, align: "left"   },
      { header: "Q13: Limit Groceries",     key: "kbildQ13_carryGroceries",   width: 22, align: "left"   },
      { header: "Q14: End of Life Thoughts",key: "kbildQ14_endOfLife",        width: 22, align: "left"   },
      { header: "Q15: Financial Strain",    key: "kbildQ15_financial",        width: 22, align: "left"   },
      { header: "KBILD Total Score (0-100)",key: "kbildTotalScore",           width: 22, align: "center" },
      { header: "Psychological Subscore",   key: "kbildPsychologicalSubscore",width: 20, align: "center" },
      { header: "Breathless & Activity Sub",key: "kbildBreathlessSubscore",   width: 22, align: "center" },
      { header: "Chest Symptoms Subscore",  key: "kbildChestSubscore",        width: 20, align: "center" },
      { header: "Clinical HRQoL Interpretation", key: "kbildInterpretation",  width: 32, align: "left", wrapText: true },
      { header: "Risk Level",               key: "clinicalRiskLevel",         width: 14, align: "center" },
      { header: "Alert Flag",               key: "alertFlag",                 width: 24, align: "center" },
    ];

    wsIld.columns = ildCols.map((col) => ({ header: col.header, key: col.key, width: col.width }));
    applyHeaderStyle(wsIld.getRow(1), "FF0F766E", ildCols.length); // Jade Teal Header
    wsIld.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ildCols.length } };

    bundle.ildTrackRecords.forEach((record, idx) => {
      const row = wsIld.addRow({ ...record });
      applyStandardDataRowStyle(row, idx % 2 === 1, ildCols);

      // Highlight KBILD Score cell
      const kCell = row.getCell(29);
      kCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF0F766E" } };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHEET 3: Asthma Clinical Track (GINA Questions, PEFR & Control Class)
  // ═══════════════════════════════════════════════════════════════════════════
  if (bundle.asthmaTrackRecords && bundle.asthmaTrackRecords.length > 0) {
    const wsAsthma = wb.addWorksheet("Asthma Clinical Track", {
      properties: { defaultRowHeight: 22 },
      views: [{ state: "frozen", ySplit: 1, xSplit: 3, activeCell: "D2" }],
    });

    const asthmaCols: { header: string; key: keyof AsthmaTrackRecord; width: number; align: "left" | "center" | "right"; wrapText?: boolean }[] = [
      { header: "S No.",                    key: "sno",                       width: 7,  align: "center" },
      { header: "UHID",                     key: "uhid",                      width: 14, align: "center" },
      { header: "Patient Name",             key: "name",                      width: 20, align: "left"   },
      { header: "Age",                      key: "age",                       width: 6,  align: "center" },
      { header: "Sex",                      key: "sex",                       width: 6,  align: "center" },
      { header: "Log Date",                 key: "logDate",                   width: 13, align: "center" },
      { header: "SpO2 Rest (%)",            key: "spo2Rest",                  width: 14, align: "right"  },
      { header: "Heart Rate (bpm)",         key: "heartRate",                 width: 15, align: "right"  },
      { header: "mMRC (0-4)",               key: "mmrc",                      width: 11, align: "center" },
      { header: "AQI",                      key: "aqi",                       width: 9,  align: "right"  },
      { header: "Med Adherence",            key: "medicationAdherence",       width: 22, align: "left"   },
      { header: "Daytime Symptoms >2x/wk",  key: "daytimeSymptoms",           width: 22, align: "center" },
      { header: "Night Waking",             key: "nightWaking",               width: 16, align: "center" },
      { header: "Reliever Inhaler >2x/wk",  key: "relieverUse",               width: 22, align: "center" },
      { header: "Activity Limitation",      key: "activityLimitation",        width: 20, align: "center" },
      { header: "Rescue Puffs",             key: "rescuePuffsCount",          width: 14, align: "center" },
      { header: "PEFR Reading (L/min)",     key: "pefrReading",               width: 18, align: "right"  },
      { header: "PEFR % Best",              key: "pefrPctPersonalBest",       width: 14, align: "right"  },
      { header: "Inhaler Technique",        key: "inhalerAdherence",          width: 18, align: "left"   },
      { header: "Triggers Noted",           key: "triggersReported",          width: 24, align: "left"   },
      { header: "GINA Control Criteria Score", key: "asthmaControlScore",     width: 24, align: "center" },
      { header: "GINA Clinical Classification",key: "ginaClassification",      width: 28, align: "left"   },
      { header: "Clinical Action Recommendation",key: "actionRecommendation",  width: 44, align: "left", wrapText: true },
      { header: "Risk Level",               key: "clinicalRiskLevel",         width: 14, align: "center" },
    ];

    wsAsthma.columns = asthmaCols.map((col) => ({ header: col.header, key: col.key, width: col.width }));
    applyHeaderStyle(wsAsthma.getRow(1), "FF1E6091", asthmaCols.length); // Royal Blue Header
    wsAsthma.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: asthmaCols.length } };

    bundle.asthmaTrackRecords.forEach((record, idx) => {
      const row = wsAsthma.addRow({ ...record });
      applyStandardDataRowStyle(row, idx % 2 === 1, asthmaCols);

      // Highlight GINA Classification
      const gCell = row.getCell(22);
      const isUncontrolled = record.ginaClassification.includes("Poorly") || record.ginaClassification.includes("Uncontrolled");
      gCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: isUncontrolled ? "FFDC2626" : "FF0369A1" } };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHEET 4: COPD Clinical Track (Sputum, Hemoptysis, Cardinal Anthonisen)
  // ═══════════════════════════════════════════════════════════════════════════
  if (bundle.copdTrackRecords && bundle.copdTrackRecords.length > 0) {
    const wsCopd = wb.addWorksheet("COPD Clinical Track", {
      properties: { defaultRowHeight: 22 },
      views: [{ state: "frozen", ySplit: 1, xSplit: 3, activeCell: "D2" }],
    });

    const copdCols: { header: string; key: keyof CopdTrackRecord; width: number; align: "left" | "center" | "right"; wrapText?: boolean }[] = [
      { header: "S No.",                    key: "sno",                       width: 7,  align: "center" },
      { header: "UHID",                     key: "uhid",                      width: 14, align: "center" },
      { header: "Patient Name",             key: "name",                      width: 20, align: "left"   },
      { header: "Age",                      key: "age",                       width: 6,  align: "center" },
      { header: "Sex",                      key: "sex",                       width: 6,  align: "center" },
      { header: "COPD Stage",               key: "copdStage",                 width: 22, align: "left"   },
      { header: "Log Date",                 key: "logDate",                   width: 13, align: "center" },
      { header: "SpO2 Rest (%)",            key: "spo2Rest",                  width: 14, align: "right"  },
      { header: "SpO2 Exertion (%)",        key: "spo2Exertion",              width: 16, align: "right"  },
      { header: "Heart Rate (bpm)",         key: "heartRate",                 width: 15, align: "right"  },
      { header: "mMRC (0-4)",               key: "mmrc",                      width: 11, align: "center" },
      { header: "AQI",                      key: "aqi",                       width: 9,  align: "right"  },
      { header: "Med Adherence",            key: "medicationAdherence",       width: 22, align: "left"   },
      { header: "Sputum Volume",            key: "sputumVolume",              width: 18, align: "left"   },
      { header: "Sputum Colour",            key: "sputumColour",              width: 18, align: "left"   },
      { header: "Sputum Purulence",         key: "sputumPurulence",           width: 18, align: "center" },
      { header: "Hemoptysis Present",       key: "hemoptysisPresent",         width: 16, align: "center" },
      { header: "Hemoptysis Volume",        key: "hemoptysisVolume",          width: 18, align: "left"   },
      { header: "Rescue Inhaler Puffs",     key: "rescueInhalerPuffs",        width: 16, align: "center" },
      { header: "Energy Level (1-10)",      key: "energyLevel",               width: 16, align: "center" },
      { header: "Dyspnea on Exertion",      key: "dyspneaExertion",           width: 18, align: "center" },
      { header: "Fever Recorded",           key: "feverRecorded",             width: 14, align: "center" },
      { header: "Cardinal Criteria Count",  key: "cardinalSymptomsCount",     width: 22, align: "center" },
      { header: "COPD Exacerbation Severity",key: "copdExacerbationType",     width: 32, align: "left"   },
      { header: "GOLD Action Recommendation",key: "actionRecommendation",     width: 44, align: "left", wrapText: true },
      { header: "Risk Level",               key: "clinicalRiskLevel",         width: 14, align: "center" },
    ];

    wsCopd.columns = copdCols.map((col) => ({ header: col.header, key: col.key, width: col.width }));
    applyHeaderStyle(wsCopd.getRow(1), "FFB45309", copdCols.length); // Warm Amber Header
    wsCopd.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: copdCols.length } };

    bundle.copdTrackRecords.forEach((record, idx) => {
      const row = wsCopd.addRow({ ...record });
      applyStandardDataRowStyle(row, idx % 2 === 1, copdCols);

      // Highlight Exacerbation Cell
      const exCell = row.getCell(24);
      const isSevere = record.copdExacerbationType.includes("Type 1") || record.copdExacerbationType.includes("Hemoptysis");
      exCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: isSevere ? "FFDC2626" : "FFB45309" } };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHEET 5: Bronchiectasis Track (ACT Clearance, Sputum & Flare Index)
  // ═══════════════════════════════════════════════════════════════════════════
  if (bundle.bronchTrackRecords && bundle.bronchTrackRecords.length > 0) {
    const wsBronch = wb.addWorksheet("Bronchiectasis Track", {
      properties: { defaultRowHeight: 22 },
      views: [{ state: "frozen", ySplit: 1, xSplit: 3, activeCell: "D2" }],
    });

    const bronchCols: { header: string; key: keyof BronchTrackRecord; width: number; align: "left" | "center" | "right"; wrapText?: boolean }[] = [
      { header: "S No.",                    key: "sno",                       width: 7,  align: "center" },
      { header: "UHID",                     key: "uhid",                      width: 14, align: "center" },
      { header: "Patient Name",             key: "name",                      width: 20, align: "left"   },
      { header: "Age",                      key: "age",                       width: 6,  align: "center" },
      { header: "Sex",                      key: "sex",                       width: 6,  align: "center" },
      { header: "Etiology",                 key: "etiology",                  width: 24, align: "left"   },
      { header: "Log Date",                 key: "logDate",                   width: 13, align: "center" },
      { header: "SpO2 Rest (%)",            key: "spo2Rest",                  width: 14, align: "right"  },
      { header: "Heart Rate (bpm)",         key: "heartRate",                 width: 15, align: "right"  },
      { header: "mMRC (0-4)",               key: "mmrc",                      width: 11, align: "center" },
      { header: "AQI",                      key: "aqi",                       width: 9,  align: "right"  },
      { header: "Med Adherence",            key: "medicationAdherence",       width: 22, align: "left"   },
      { header: "Clearance (ACT) Done",     key: "airwayClearanceDone",       width: 18, align: "center" },
      { header: "Clearance Technique Used", key: "clearanceTechnique",        width: 26, align: "left"   },
      { header: "Ease of Clearance (1-5)",  key: "easeOfClearance",           width: 18, align: "center" },
      { header: "Sputum Volume",            key: "sputumVolume",              width: 18, align: "left"   },
      { header: "Sputum Colour",            key: "sputumColour",              width: 18, align: "left"   },
      { header: "Hemoptysis Present",       key: "hemoptysisPresent",         width: 16, align: "center" },
      { header: "Hemoptysis Severity",      key: "hemoptysisSeverity",        width: 18, align: "left"   },
      { header: "Antibiotics Active",       key: "antibioticCourseActive",    width: 18, align: "center" },
      { header: "Temperature",              key: "temperatureF",              width: 14, align: "center" },
      { header: "Flare Severity Index",     key: "flareSeverityIndex",        width: 18, align: "center" },
      { header: "Flare Risk Status",        key: "flareRiskStatus",           width: 28, align: "left"   },
      { header: "Action Recommendation",    key: "actionRecommendation",      width: 44, align: "left", wrapText: true },
      { header: "Risk Level",               key: "clinicalRiskLevel",         width: 14, align: "center" },
    ];

    wsBronch.columns = bronchCols.map((col) => ({ header: col.header, key: col.key, width: col.width }));
    applyHeaderStyle(wsBronch.getRow(1), "FF0284C7", bronchCols.length); // Ocean Blue Header
    wsBronch.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: bronchCols.length } };

    bundle.bronchTrackRecords.forEach((record, idx) => {
      const row = wsBronch.addRow({ ...record });
      applyStandardDataRowStyle(row, idx % 2 === 1, bronchCols);

      // Highlight Flare Cell
      const fCell = row.getCell(23);
      const isFlare = record.flareRiskStatus.includes("Flare") || record.flareRiskStatus.includes("Alert");
      fCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: isFlare ? "FFDC2626" : "FF0284C7" } };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHEET 6: Post-ICU Recovery Track (Mobility, Weakness & PICS Trajectory)
  // ═══════════════════════════════════════════════════════════════════════════
  if (bundle.postIcuTrackRecords && bundle.postIcuTrackRecords.length > 0) {
    const wsPostIcu = wb.addWorksheet("Post-ICU Recovery Track", {
      properties: { defaultRowHeight: 22 },
      views: [{ state: "frozen", ySplit: 1, xSplit: 3, activeCell: "D2" }],
    });

    const postIcuCols: { header: string; key: keyof PostIcuTrackRecord; width: number; align: "left" | "center" | "right"; wrapText?: boolean }[] = [
      { header: "S No.",                    key: "sno",                       width: 7,  align: "center" },
      { header: "UHID",                     key: "uhid",                      width: 14, align: "center" },
      { header: "Patient Name",             key: "name",                      width: 20, align: "left"   },
      { header: "Age",                      key: "age",                       width: 6,  align: "center" },
      { header: "Sex",                      key: "sex",                       width: 6,  align: "center" },
      { header: "ICU Discharge Date",       key: "icuDischargeDate",          width: 16, align: "center" },
      { header: "Log Date",                 key: "logDate",                   width: 13, align: "center" },
      { header: "SpO2 Rest (%)",            key: "spo2Rest",                  width: 14, align: "right"  },
      { header: "SpO2 Exertion (%)",        key: "spo2Exertion",              width: 16, align: "right"  },
      { header: "Heart Rate (bpm)",         key: "heartRate",                 width: 15, align: "right"  },
      { header: "mMRC (0-4)",               key: "mmrc",                      width: 11, align: "center" },
      { header: "AQI",                      key: "aqi",                       width: 9,  align: "right"  },
      { header: "Med Adherence",            key: "medicationAdherence",       width: 22, align: "left"   },
      { header: "Mobility Level",           key: "functionalMobilityLevel",   width: 22, align: "left"   },
      { header: "Walk Distance (m)",        key: "walkDistanceMeters",        width: 16, align: "right"  },
      { header: "ICU Muscle Weakness (0-10)",key: "icuMuscleWeakness",        width: 22, align: "center" },
      { header: "Fatigue VAS (0-10)",       key: "fatigueVas",                width: 18, align: "center" },
      { header: "Dyspnea on Exertion",      key: "dyspneaExertion",           width: 18, align: "center" },
      { header: "Sleep Quality (0-10)",     key: "sleepQuality",              width: 18, align: "center" },
      { header: "Nutritional Intake",       key: "nutritionIntake",           width: 18, align: "center" },
      { header: "Mental Clarity / Delirium",key: "mentalClarity",             width: 22, align: "left"   },
      { header: "Functional Recovery Index (0-100)",key: "functionalRecoveryIndex",width: 26, align: "center" },
      { header: "PICS Recovery Trajectory", key: "picsRecoveryTrajectory",    width: 32, align: "left"   },
      { header: "Rehabilitation Action",    key: "actionRecommendation",      width: 44, align: "left", wrapText: true },
      { header: "Risk Level",               key: "clinicalRiskLevel",         width: 14, align: "center" },
    ];

    wsPostIcu.columns = postIcuCols.map((col) => ({ header: col.header, key: col.key, width: col.width }));
    applyHeaderStyle(wsPostIcu.getRow(1), "FF4338CA", postIcuCols.length); // Indigo Purple Header
    wsPostIcu.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: postIcuCols.length } };

    bundle.postIcuTrackRecords.forEach((record, idx) => {
      const row = wsPostIcu.addRow({ ...record });
      applyStandardDataRowStyle(row, idx % 2 === 1, postIcuCols);

      // Highlight Functional Index
      const idxCell = row.getCell(22);
      idxCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF4338CA" } };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SINGLE PATIENT EXTENDED SHEETS: Medications, PFT & Alerts
  // ═══════════════════════════════════════════════════════════════════════════
  if (bundle.singlePatientMeds && bundle.singlePatientMeds.length > 0) {
    const wsMeds = wb.addWorksheet("Prescriptions & Regimens", {
      properties: { defaultRowHeight: 22 },
      views: [{ state: "frozen", ySplit: 1 }],
    });

    const medCols = [
      { header: "Drug Name",  key: "drugName",  width: 26, align: "left" as const },
      { header: "Route",      key: "route",     width: 16, align: "center" as const },
      { header: "Dose",       key: "dose",      width: 16, align: "center" as const },
      { header: "Frequency",  key: "frequency", width: 18, align: "left" as const },
      { header: "Start Date", key: "startDate", width: 14, align: "center" as const },
      { header: "End Date",   key: "endDate",   width: 14, align: "center" as const },
      { header: "Status",     key: "status",    width: 14, align: "center" as const },
    ];

    wsMeds.columns = medCols.map((c) => ({ header: c.header, key: c.key, width: c.width }));
    applyHeaderStyle(wsMeds.getRow(1), "FF1E293B", medCols.length);

    bundle.singlePatientMeds.forEach((m, idx) => {
      const row = wsMeds.addRow({ ...m });
      applyStandardDataRowStyle(row, idx % 2 === 1, medCols);
    });
  }

  if (bundle.singlePatientPfts && bundle.singlePatientPfts.length > 0) {
    const wsPft = wb.addWorksheet("PFT Spirometry & 6MWD", {
      properties: { defaultRowHeight: 22 },
      views: [{ state: "frozen", ySplit: 1 }],
    });

    const pftCols = [
      { header: "Test Date",         key: "testDate",        width: 14, align: "center" as const },
      { header: "FEV1/FVC Ratio",    key: "fev1FvcRatio",    width: 16, align: "right" as const },
      { header: "Observed FEV1 (L)", key: "observedFev",     width: 16, align: "right" as const },
      { header: "% Pred FEV1",       key: "pctPredictedFev1",width: 16, align: "right" as const },
      { header: "Observed FVC (L)",  key: "observedFvc",     width: 16, align: "right" as const },
      { header: "% Pred FVC",        key: "pctPredictedFvc", width: 16, align: "right" as const },
      { header: "DLCO",              key: "dlco",            width: 12, align: "right" as const },
      { header: "6MWD (meters)",     key: "sixMwd",          width: 16, align: "right" as const },
      { header: "Baseline SpO2 (%)", key: "baselineSpo2",    width: 16, align: "right" as const },
      { header: "Baseline HR (bpm)", key: "baselineHr",      width: 16, align: "right" as const },
    ];

    wsPft.columns = pftCols.map((c) => ({ header: c.header, key: c.key, width: c.width }));
    applyHeaderStyle(wsPft.getRow(1), "FF1E293B", pftCols.length);

    bundle.singlePatientPfts.forEach((p, idx) => {
      const row = wsPft.addRow({ ...p });
      applyStandardDataRowStyle(row, idx % 2 === 1, pftCols);
    });
  }

  if (bundle.singlePatientAlerts && bundle.singlePatientAlerts.length > 0) {
    const wsAlerts = wb.addWorksheet("Clinical Alerts & Events", {
      properties: { defaultRowHeight: 22 },
      views: [{ state: "frozen", ySplit: 1 }],
    });

    const alertCols = [
      { header: "Alert Date", key: "date",      width: 14, align: "center" as const },
      { header: "Alert Type", key: "alertType", width: 22, align: "left" as const },
      { header: "Severity",   key: "severity",  width: 14, align: "center" as const },
      { header: "Status",     key: "status",    width: 14, align: "center" as const },
      { header: "Reason",     key: "reason",    width: 44, align: "left" as const, wrapText: true },
    ];

    wsAlerts.columns = alertCols.map((c) => ({ header: c.header, key: c.key, width: c.width }));
    applyHeaderStyle(wsAlerts.getRow(1), "FF991B1B", alertCols.length);

    bundle.singlePatientAlerts.forEach((a, idx) => {
      const row = wsAlerts.addRow({ ...a });
      applyStandardDataRowStyle(row, idx % 2 === 1, alertCols);
    });
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
