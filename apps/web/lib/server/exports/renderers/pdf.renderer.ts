import { pdf } from "@react-pdf/renderer";
import {
  ExportPdfDocument,
  type PatientDetailSection,
  type ExportSummaryRow,
  type MedicationComplianceRow,
} from "@/lib/server/export-pdf";
import type { ExportDataBundle } from "../export.types";

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", (err) => reject(err));
  });
}

export async function renderPdfRegistry(bundle: ExportDataBundle): Promise<Buffer> {
  const summaryRows: ExportSummaryRow[] = bundle.records.map((r) => ({
    patientName: r.name,
    diagnosis: r.completeDiag,
    riskLevel: r.riskLevel,
    score: String(r.worstRiskScore),
    alert: r.alertStatus,
  }));

  const medicationRows: MedicationComplianceRow[] = bundle.records.map((r) => ({
    patientName: r.name,
    taken: 0,
    total: 0,
    rateLabel: r.adherencePct,
  }));

  const patientDetails: PatientDetailSection[] = bundle.records.map((r) => ({
    patientName: r.name,
    demographics: [
      ["UHID", r.uhid],
      ["File No", r.fileNo],
      ["Age", String(r.age)],
      ["Sex", String(r.sex)],
      ["Mobile", r.mobile],
      ["Occupation", r.occupation],
      ["Smoking Status", r.smoker],
      ["Enrollment Date", r.dateOfEnroll],
      ["Baseline HR", r.baselineHr ? `${r.baselineHr} BPM` : "78 BPM"],
      ["Baseline SpO2", r.baselineSpo2 ? `${r.baselineSpo2}%` : "96%"],
    ],
    diagnosis: [
      ["Primary Diagnosis", r.primaryDiagnosis || r.completeDiag],
      ["Histopathology", r.histopathology],
      ["Connective Tissue Disease", r.typeOfConnective],
      ["Co-morbidities", r.comorbidities],
      ["Respiratory Support", r.respiratorySupport],
      ["Effective dashboard", r.effectiveDashboard],
    ],
    respiratorySupport: [["Support Type", r.respiratorySupport]],
    pftRows: [
      [
        r.dateOfEnroll,
        r.fev1Fvc,
        r.observedFev,
        r.observedFvc,
        r.dlco,
        `6MWD: ${r.sixMwd} | %pred FEV1: ${r.pctPredictedFev1} | %pred FVC: ${r.pctPredictedFvc}`,
      ],
    ],
    medicationRows:
      bundle.singlePatientMeds && bundle.singlePatientMeds.length > 0
        ? bundle.singlePatientMeds.map((m) => [
            m.drugName,
            m.route || "Inhaled",
            m.dose || "Standard",
            m.frequency || "As prescribed",
            m.startDate || "—",
            m.endDate || m.status || "Ongoing",
          ])
        : r.currentMeds
          ? r.currentMeds
              .split(", ")
              .map((med) => [med, "Inhaled", "Standard", "As prescribed", "—", "Ongoing"])
          : [],
    logRows: bundle.singlePatientLogs
      ? bundle.singlePatientLogs.map((l) => [
          l.date,
          String(l.spo2Rest),
          l.spo2Walk ? String(l.spo2Walk) : "—",
          String(l.mmrc),
          l.aqi ? String(l.aqi) : "—",
          String(l.riskScore),
          l.vasSymptoms || "Stable",
        ])
      : [],
    alertRows:
      bundle.singlePatientAlerts && bundle.singlePatientAlerts.length > 0
        ? bundle.singlePatientAlerts.map((a) => [
            a.date,
            a.alertType || "Desaturation Alert",
            a.severity || "Critical",
            a.reason || "SpO2 dropped below target threshold",
          ])
        : [],
    instructionRows:
      bundle.rawDoctorInstructions && bundle.rawDoctorInstructions.length > 0
        ? bundle.rawDoctorInstructions.map((ins) => [ins.createdAt, ins.instructionText])
        : [],
    adherenceStats: bundle.adherenceStats,
    dynamicSymptoms: bundle.dynamicSymptomsSeries,
    prescribedMedsWithAdherence: bundle.prescribedMedsWithAdherence,
    multiPftsProgression: bundle.multiPftsProgression,
    detailedLogs: bundle.singlePatientLogs
      ? bundle.singlePatientLogs.map((l) => ({
          date: l.date,
          spo2Rest: l.spo2Rest,
          spo2Walk: l.spo2Walk,
          heartRate: l.heartRate ?? 75,
          mmrc: l.mmrc,
          aqi: l.aqi,
          vasSymptoms: l.vasSymptoms,
          diseaseSpecificData: l.diseaseSpecificData,
        }))
      : r.dailyLogs
        ? r.dailyLogs.map((dl) => ({
            date: dl.logDate,
            spo2Rest: dl.spo2Rest,
            spo2Walk: dl.spo2Exertion,
            heartRate: dl.heartRate,
            mmrc: dl.mmrc,
            aqi: dl.aqi,
            vasSymptoms: dl.symptomsVas,
          }))
        : [],
    trackRecords: {
      ild: bundle.ildTrackRecords,
      asthma: bundle.asthmaTrackRecords,
      copd: bundle.copdTrackRecords,
      bronch: bundle.bronchTrackRecords,
      postIcu: bundle.postIcuTrackRecords,
    },
  }));

  const doc = ExportPdfDocument({
    exportType: bundle.scope,
    doctorName: bundle.doctorName,
    generatedAt: new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    dateRangeLabel:
      bundle.startDate && bundle.endDate
        ? `${bundle.startDate} to ${bundle.endDate}`
        : "All Recorded History",
    patientNames: bundle.records.map((r) => r.name),
    summaryRows,
    medicationRows,
    patientDetails,
    notes: [`Generated by O2Plus Clinical Platform for Dr. ${bundle.doctorName}`],
  });

  const streamOrBuffer = await (pdf(doc as any).toBuffer() as Promise<unknown>);
  if (Buffer.isBuffer(streamOrBuffer)) {
    return streamOrBuffer;
  }
  if (streamOrBuffer && typeof (streamOrBuffer as { on?: unknown }).on === "function") {
    return streamToBuffer(streamOrBuffer as NodeJS.ReadableStream);
  }
  return Buffer.from(streamOrBuffer as ArrayBuffer);
}
