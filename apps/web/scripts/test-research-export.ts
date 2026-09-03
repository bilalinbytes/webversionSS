import ExcelJS from "exceljs";
import {
  COMMON_EXPORT_COLUMNS,
  ASTHMA_EXPORT_COLUMNS,
  COPD_EXPORT_COLUMNS,
  ILD_EXPORT_COLUMNS,
  BRONCHIECTASIS_EXPORT_COLUMNS,
  POST_ICU_EXPORT_COLUMNS,
  DISEASE_FIELD_CODEBOOK,
  REQUIRED_SHEET_NAMES,
  validateWorkbookStructure,
} from "../lib/server/exports/codebook";
import {
  transformPatientToLongitudinal,
  type PatientSourceBundle,
  type LongitudinalPatientData,
} from "../lib/server/exports/aggregation/longitudinal-transformer";
import { renderExcelRegistry } from "../lib/server/exports/renderers/excel.renderer";
import type { ExportDataBundle } from "../lib/server/exports/export.types";

async function runTests() {
  console.log("=================================================");
  console.log("STARTING O2PLUS RESEARCH EXPORT VALIDATION SUITE");
  console.log("=================================================");

  // ── TEST 1: Codebook & Column Definitions Validation ───────────────────────
  console.log("\n[TEST 1] Validating Codebook and Sheet Column Structure...");
  const mockSheetsForValidation = [
    { name: "Read Me", columns: [] },
    { name: "All Patients", columns: COMMON_EXPORT_COLUMNS.map((c) => c.header) },
    { name: "Asthma", columns: ASTHMA_EXPORT_COLUMNS.map((c) => c.header) },
    { name: "COPD", columns: COPD_EXPORT_COLUMNS.map((c) => c.header) },
    { name: "ILD", columns: ILD_EXPORT_COLUMNS.map((c) => c.header) },
    { name: "Bronchiectasis", columns: BRONCHIECTASIS_EXPORT_COLUMNS.map((c) => c.header) },
    { name: "Post ICU", columns: POST_ICU_EXPORT_COLUMNS.map((c) => c.header) },
    { name: "Disease Field Codebook", columns: [] },
  ];

  const validationResult = validateWorkbookStructure(mockSheetsForValidation);
  if (!validationResult.valid) {
    console.error("❌ Codebook validation failed:", validationResult.errors);
    process.exit(1);
  }
  console.log("✓ Codebook validation passed! Exactly 8 sheets and all column counts & names matched perfectly.");
  console.log(`  - Common Columns: ${COMMON_EXPORT_COLUMNS.length} (Expected: 66)`);
  console.log(`  - Asthma Columns: ${ASTHMA_EXPORT_COLUMNS.length} (66 + 24 = 90)`);
  console.log(`  - COPD Columns: ${COPD_EXPORT_COLUMNS.length} (66 + 30 = 96)`);
  console.log(`  - ILD Columns: ${ILD_EXPORT_COLUMNS.length} (66 + 20 = 86)`);
  console.log(`  - Bronchiectasis Columns: ${BRONCHIECTASIS_EXPORT_COLUMNS.length} (66 + 22 = 88)`);
  console.log(`  - Post ICU Columns: ${POST_ICU_EXPORT_COLUMNS.length} (66 + 32 = 98)`);
  console.log(`  - Codebook Definitions: ${DISEASE_FIELD_CODEBOOK.length}`);

  if (COMMON_EXPORT_COLUMNS.length !== 66) {
    throw new Error(`Expected 66 common columns, got ${COMMON_EXPORT_COLUMNS.length}`);
  }


  // ── TEST 2: Data Transformation Engine ─────────────────────────────────────
  console.log("\n[TEST 2] Testing Longitudinal Patient Transformation with Diverse Patient Profiles...");

  // Patient 1: Complete multi-log Asthma patient
  const patient1Bundle: PatientSourceBundle = {
    patient: {
      id: "11111111-2222-3333-4444-555555555555",
      name: "Aarav Sharma",
      date_of_birth: "1985-06-15",
      gender: "Male",
      mobile_number: "+91 9876543210",
      created_at: "2026-05-10T10:00:00Z",
      doctor_id: "doc-1",
      address: "Delhi",
      occupation: "Software Engineer",
      significant_exposure: "Traffic dust and construction smoke",
      smoking_status: "Yes",
      smoking_index: "150",
      alcohol_status: "No",
      past_history: "None",
      past_history_years_ago: null,
      alternate_mobile_number: null,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      expo_push_token: null,
      updated_at: null,
      wants_appointments: true,
      preferred_appointment_time: null,
      appointment_preference_set_at: null,
    },


    diagnosis: {
      id: "diag-1",
      patient_id: "11111111-2222-3333-4444-555555555555",
      primary_diagnosis: "Bronchial Asthma",
      effective_dashboard: "asthma",
      post_icu_sub_diagnosis: null,
      comorbidities: ["Hypertension"],
      comorbidities_other_text: null,
      created_at: "2026-05-10T10:00:00Z",
      diagnosed_at: "2026-05-10",
    },
    logs: [
      {
        id: "log-1",
        patient_id: "11111111-2222-3333-4444-555555555555",
        logged_at: "2026-08-20T08:00:00Z",
        spo2_rest: 96,
        spo2_exertion: 92,
        mmrc_today: 1,
        aqi_value: 120,
        medication_compliance: { "med-1": true, "med-2": true },
        vas_symptoms: { breathlessness: 3, cough: 2 },
        side_effects: null,
        pedal_edema: false,
        step_count_today: 4500,
        oxygen_change_litres: null,
        oxygen_change_direction: null,
        oxygen_condition_static: null,
        aqi_is_cached: false,
        dqi_score: null,
        fi_score: null,
        is_duplicate_suppressed: false,
        is_outlier_suppressed: false,
        offline_queued_at: null,
        pm10: null,
        pm25: null,
        submitted_at: null,
        disease_specific_data: {
          rescue_inhaler_puffs: 2,
          pefr_reading: 380,
          pefr_personal_best: 450,
          night_waking: false,
          controller_taken: true,
          asthma_control_responses: [false, false, false, false],
          asthma_control_yes_count: 0,
          asthma_control_status: "well_controlled",
          heart_rate: 76,
        },
      },
      {
        id: "log-2",
        patient_id: "11111111-2222-3333-4444-555555555555",
        logged_at: "2026-08-28T08:00:00Z",
        spo2_rest: 98,
        spo2_exertion: 95,
        mmrc_today: 0,
        aqi_value: 95,
        medication_compliance: { "med-1": true, "med-2": true },
        vas_symptoms: { breathlessness: 1, cough: 0 },
        side_effects: null,
        pedal_edema: false,
        step_count_today: 6000,
        oxygen_change_litres: null,
        oxygen_change_direction: null,
        oxygen_condition_static: null,
        aqi_is_cached: false,
        dqi_score: null,
        fi_score: null,
        is_duplicate_suppressed: false,
        is_outlier_suppressed: false,
        offline_queued_at: null,
        pm10: null,
        pm25: null,
        submitted_at: null,
        disease_specific_data: {
          rescue_inhaler_puffs: 0,
          pefr_reading: 420,
          pefr_personal_best: 450,
          night_waking: false,
          controller_taken: true,
          asthma_control_responses: [false, false, false, false],
          asthma_control_yes_count: 0,
          asthma_control_status: "well_controlled",
          heart_rate: 72,
        },
      },
    ],
    scores: [
      {
        id: "sc-1",
        patient_id: "11111111-2222-3333-4444-555555555555",
        global_score: 1,
        risk_level: "low",
        indicator_color: "green",
        computed_at: "2026-08-28T08:00:00Z",
        log_id: "log-2",
        score_breakdown: null,
      },
    ],
    alerts: [],
    medications: [
      {
        id: "med-1",
        patient_id: "11111111-2222-3333-4444-555555555555",
        drug_name: "Budesonide/Formoterol",
        dose: 200,
        dose_unit: "mcg",
        route: "Inhalation",
        frequency: "BD",
        serial_number: 1,
        start_date: "2026-05-10",
        end_date: null,
        prescribed_by_doctor_id: "doc-1",
        created_at: "2026-05-10T10:00:00Z",
      },
    ],
    pfts: [
      {
        id: "pft-1",
        patient_id: "11111111-2222-3333-4444-555555555555",
        test_date: "2026-05-10",
        fev1: 2.8,
        fvc: 3.5,
        fev1_fvc_ratio: 80,
        dlco: 85,
        created_at: "2026-05-10T10:00:00Z",
        created_by_doctor_id: "doc-1",
        other_fields: { six_mwd: 520, baseline_spo2: 97, baseline_heart_rate: 74 },
      },
    ],
    respiratorySupport: null,
    instructions: [
      {
        id: "ins-1",
        patient_id: "11111111-2222-3333-4444-555555555555",
        instruction_text: "Continue controller inhaler twice daily.",
        created_at: "2026-05-10T10:30:00Z",
        doctor_id: "doc-1",
        read_by_patient_at: "2026-05-10T11:00:00Z",
      },
    ],
    appointments: [
      {
        id: "apt-1",
        patient_id: "11111111-2222-3333-4444-555555555555",
        doctor_id: "doc-1",
        scheduled_at: "2026-09-15T10:00:00Z",
        title: "Asthma Follow-up",
        notes: "Review PEFR diary",
        status: "scheduled",
        created_at: "2026-08-28T08:30:00Z",
        updated_at: null,
      },
    ],
  };

  const p1Transformed = transformPatientToLongitudinal(patient1Bundle, 1);
  console.log("✓ Patient 1 (Asthma) transformed successfully.");
  console.log("  - SpO2 First:", p1Transformed.commonRow["Resting SpO2 — first (%)"], "Latest:", p1Transformed.commonRow["Resting SpO2 — latest (%)"], "Change:", p1Transformed.commonRow["Resting SpO2 — change (%)"]);
  console.log("  - SpO2 History:", p1Transformed.commonRow["Resting SpO2 — dated history (YYYY-MM-DD=value)"]);
  console.log("  - PEFR First:", p1Transformed.asthmaRow?.["PEFR reading [mobile] — first (L/min)"], "Latest:", p1Transformed.asthmaRow?.["PEFR reading [mobile] — latest (L/min)"], "Change:", p1Transformed.asthmaRow?.["PEFR reading [mobile] — change (L/min)"]);
  console.log("  - PEFR History:", p1Transformed.asthmaRow?.["PEFR reading [mobile] — dated history (YYYY-MM-DD=value)"]);

  if (p1Transformed.commonRow["Resting SpO2 — change (%)"] !== 2) {
    throw new Error(`Expected SpO2 change 2 (98 - 96), got ${p1Transformed.commonRow["Resting SpO2 — change (%)"]}`);
  }
  if (p1Transformed.asthmaRow?.["PEFR reading [mobile] — change (L/min)"] !== 40) {
    throw new Error(`Expected PEFR change 40 (420 - 380), got ${p1Transformed.asthmaRow?.["PEFR reading [mobile] — change (L/min)"]}`);
  }
  if (p1Transformed.commonRow["Occupation"] !== "Software Engineer") {
    throw new Error(`Expected Occupation 'Software Engineer', got '${p1Transformed.commonRow["Occupation"]}'`);
  }
  if (p1Transformed.commonRow["Significant Exposure"] !== "Traffic dust and construction smoke") {
    throw new Error(`Expected Significant Exposure 'Traffic dust and construction smoke', got '${p1Transformed.commonRow["Significant Exposure"]}'`);
  }
  if (p1Transformed.commonRow["Smoking Status"] !== "Yes") {
    throw new Error(`Expected Smoking Status 'Yes', got '${p1Transformed.commonRow["Smoking Status"]}'`);
  }
  if (p1Transformed.commonRow["Smoking Index"] !== "150") {
    throw new Error(`Expected Smoking Index '150', got '${p1Transformed.commonRow["Smoking Index"]}'`);
  }
  if (p1Transformed.commonRow["Alcohol Status"] !== "No") {
    throw new Error(`Expected Alcohol Status 'No', got '${p1Transformed.commonRow["Alcohol Status"]}'`);
  }
  if (p1Transformed.commonRow["Past Medical History"] !== "None") {
    throw new Error(`Expected Past Medical History 'None', got '${p1Transformed.commonRow["Past Medical History"]}'`);
  }



  // Patient 2: Sparse patient with single log (ILD, no schema responses)
  const patient2Bundle: PatientSourceBundle = {
    patient: {
      id: "22222222-3333-4444-5555-666666666666",
      name: "Priya Patel",
      date_of_birth: "1960-03-22",
      gender: "Female",
      mobile_number: "9876500000",
      created_at: "2026-06-01T09:00:00Z",
      doctor_id: "doc-1",
      address: null,
      occupation: null,
      significant_exposure: null,
      smoking_status: null,
      smoking_index: null,
      alcohol_status: null,
      past_history: null,
      past_history_years_ago: null,
      alternate_mobile_number: null,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      expo_push_token: null,
      updated_at: null,
      wants_appointments: null,
      preferred_appointment_time: null,
      appointment_preference_set_at: null,
    },


    diagnosis: {
      id: "diag-2",
      patient_id: "22222222-3333-4444-5555-666666666666",
      primary_diagnosis: "Idiopathic Pulmonary Fibrosis (IPF)",
      effective_dashboard: "ild",
      post_icu_sub_diagnosis: null,
      comorbidities: null,
      comorbidities_other_text: null,
      created_at: "2026-06-01T09:00:00Z",
      diagnosed_at: "2026-06-01",
    },
    logs: [
      {
        id: "log-3",
        patient_id: "22222222-3333-4444-5555-666666666666",
        logged_at: "2026-08-25T09:00:00Z",
        spo2_rest: 93,
        spo2_exertion: 88,
        mmrc_today: 2,
        aqi_value: null, // Test unrecorded value
        medication_compliance: { "med-2": true },
        vas_symptoms: { breathlessness: 5 },
        side_effects: ["nausea"],
        pedal_edema: false,
        step_count_today: null,
        oxygen_change_litres: 2,
        oxygen_change_direction: "increase",
        oxygen_condition_static: false,
        aqi_is_cached: null,
        dqi_score: null,
        fi_score: null,
        is_duplicate_suppressed: null,
        is_outlier_suppressed: null,
        offline_queued_at: null,
        pm10: null,
        pm25: null,
        submitted_at: null,
        disease_specific_data: {
          kbild_score: 55,
          antifibrotic_taken: true,
          rash: false,
          diarrhoea: false,
          // No schema responses recorded -> should stay blank!
        },
      },
    ],
    scores: [],
    alerts: [
      {
        id: "alt-1",
        patient_id: "22222222-3333-4444-5555-666666666666",
        alert_type: "Desaturation Alert",
        reason_text: "Exertional SpO2 dropped to 88%",
        acknowledged_by_doctor: false,
        acknowledged_at: null,
        is_suppressed: false,
        created_at: "2026-08-25T09:15:00Z",
        log_id: "log-3",
        score_id: null,
        suppressed_until: null,
        triggering_metrics: null,
      },
    ],
    medications: [
      {
        id: "med-2",
        patient_id: "22222222-3333-4444-5555-666666666666",
        drug_name: "Pirfenidone",
        dose: 200,
        dose_unit: "mg",
        route: "Oral",
        frequency: "TDS",
        serial_number: 1,
        start_date: "2026-06-01",
        end_date: null,
        prescribed_by_doctor_id: "doc-1",
        created_at: "2026-06-01T09:00:00Z",
      },
    ],
    pfts: [],
    respiratorySupport: {
      id: "resp-1",
      patient_id: "22222222-3333-4444-5555-666666666666",
      requires_support: true,
      ltot_enabled: true,
      ltot_litres: 2,
      bipap_enabled: false,
      bipap_ipap: null,
      bipap_epap: null,
      bipap_requires_oxygen: null,
      bipap_oxygen_litres: null,
      bipap_all_time: null,
      bipap_overnight: null,
      bipap_pressure_support: null,
      bipap_respiratory_rate: null,
      invasive_vent_enabled: false,
      tracheostomy_enabled: false,
      trach_for_airway_patency: null,
      trach_oxygen_litres: null,
      trach_requires_oxygen: null,
      trach_requires_vent: null,
      trach_vent_epap: null,
      trach_vent_fio2_percent: null,
      trach_vent_ipap: null,
      trach_vent_pressure_support: null,
      trach_vent_respiratory_rate: null,
      trach_vent_tidal_volume: null,
      vent_epap: null,
      vent_fio2_percent: null,
      vent_ipap: null,
      vent_pressure_support: null,
      vent_respiratory_rate: null,
      created_at: "2026-06-01T09:00:00Z",
      updated_at: null,
    },
    instructions: [],
    appointments: [],
  };

  const p2Transformed = transformPatientToLongitudinal(patient2Bundle, 2);
  console.log("✓ Patient 2 (Sparse ILD) transformed successfully.");
  console.log("  - SpO2 First:", p2Transformed.commonRow["Resting SpO2 — first (%)"], "Change:", p2Transformed.commonRow["Resting SpO2 — change (%)"] ?? "BLANK (Expected for 1 entry)");
  console.log("  - AQI:", p2Transformed.commonRow["AQI — first"] ?? "BLANK (Expected unrecorded)");
  console.log("  - K-BILD Score:", p2Transformed.ildRow?.["K-BILD score [mobile] — first (0–100)"]);
  console.log("  - K-BILD Q1-Q15 Schema Responses:", p2Transformed.ildRow?.["K-BILD Q1–Q15 responses [schema, when recorded] — latest"] ?? "BLANK (Expected unrecorded)");

  if (p2Transformed.commonRow["Occupation"] !== null) {
    throw new Error(`Expected unrecorded Occupation to be null, got '${p2Transformed.commonRow["Occupation"]}'`);
  }
  if (p2Transformed.commonRow["Significant Exposure"] !== null) {
    throw new Error(`Expected unrecorded Significant Exposure to be null, got '${p2Transformed.commonRow["Significant Exposure"]}'`);
  }
  if (p2Transformed.commonRow["Smoking Status"] !== null) {
    throw new Error(`Expected unrecorded Smoking Status to be null, got '${p2Transformed.commonRow["Smoking Status"]}'`);
  }
  if (p2Transformed.commonRow["Smoking Index"] !== null) {
    throw new Error(`Expected unrecorded Smoking Index to be null, got '${p2Transformed.commonRow["Smoking Index"]}'`);
  }
  if (p2Transformed.commonRow["Alcohol Status"] !== null) {
    throw new Error(`Expected unrecorded Alcohol Status to be null, got '${p2Transformed.commonRow["Alcohol Status"]}'`);
  }
  if (p2Transformed.commonRow["Past Medical History"] !== null) {
    throw new Error(`Expected unrecorded Past Medical History to be null, got '${p2Transformed.commonRow["Past Medical History"]}'`);
  }
  if (p2Transformed.commonRow["Respiratory Support"] !== "LTOT 2 L/min") {
    throw new Error(`Expected Respiratory Support 'LTOT 2 L/min', got '${p2Transformed.commonRow["Respiratory Support"]}'`);
  }




  // ── TEST 3: Generate Excel Workbook & Verify with ExcelJS ──────────────────
  console.log("\n[TEST 3] Rendering Full 8-Sheet Workbook with ExcelJS...");
  const bundle: ExportDataBundle = {
    records: [],
    scope: "all_patients",
    format: "excel",
    doctorName: "Dr. Alok Verma",
    longitudinalPatients: [p1Transformed, p2Transformed],
  };

  const excelBuffer = await renderExcelRegistry(bundle);
  console.log(`✓ Workbook successfully rendered! File size: ${excelBuffer.byteLength} bytes.`);

  // Load back workbook to test structure
  const testWb = new ExcelJS.Workbook();
  await testWb.xlsx.load(excelBuffer as unknown as Parameters<typeof testWb.xlsx.load>[0]);


  const sheetNames = testWb.worksheets.map((ws) => ws.name);
  console.log("Generated Sheet Names:", sheetNames);

  for (const name of REQUIRED_SHEET_NAMES) {
    if (!sheetNames.includes(name)) {
      throw new Error(`Missing expected worksheet: "${name}"`);
    }
  }

  // Check freeze panes on All Patients sheet
  const allPatientsSheet = testWb.getWorksheet("All Patients");
  if (!allPatientsSheet) throw new Error("Could not find All Patients sheet");
  const views = allPatientsSheet.views;
  console.log("All Patients Views / Freeze Panes:", JSON.stringify(views));
  if (!views || views.length === 0 || views[0]?.state !== "frozen") {
    throw new Error("Expected freeze pane on All Patients sheet");
  }

  // Check cell content on All Patients
  const cellA1 = allPatientsSheet.getCell(1, 1).value;
  console.log("All Patients Row 1 Banner:", cellA1);
  if (cellA1 !== "O2Plus All Patients — longitudinal research export") {
    throw new Error(`Unexpected title banner: ${cellA1}`);
  }

  const patient1NameCell = allPatientsSheet.getCell(5, 4).value; // Row 5 (First data row), Col 4 (Patient Name)
  console.log("Patient 1 Name Cell (Row 5, Col 4):", patient1NameCell);
  if (patient1NameCell !== "Aarav Sharma") {
    throw new Error(`Expected Aarav Sharma, got ${patient1NameCell}`);
  }

  // Check Codebook sheet
  const codebookSheet = testWb.getWorksheet("Disease Field Codebook");
  if (!codebookSheet) throw new Error("Could not find Codebook sheet");
  console.log("Codebook Sheet Total Rows:", codebookSheet.rowCount);
  if (codebookSheet.rowCount < 40) {
    throw new Error(`Expected at least 40 rows in Codebook sheet, got ${codebookSheet.rowCount}`);
  }

  console.log("\n=================================================");
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================\n");
}

runTests().catch((err) => {
  console.error("FATAL ERROR IN TEST SUITE:", err);
  process.exit(1);
});
