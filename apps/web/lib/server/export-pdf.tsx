import React from "react";
import {
  type DocumentProps,
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

// ─── Public types ────────────────────────────────────────────────────────────

export interface ExportSummaryRow {
  patientName: string;
  diagnosis: string;
  riskLevel: string;
  score: string;
  alert: string;
}

export interface MedicationComplianceRow {
  patientName: string;
  taken: number;
  total: number;
  rateLabel: string;
}

export interface PatientDetailSection {
  patientName: string;
  demographics: Array<[string, string]>;
  diagnosis: Array<[string, string]>;
  respiratorySupport: Array<[string, string]>;
  pftRows: string[][];
  medicationRows: string[][];
  logRows: string[][];
  alertRows: string[][];
  instructionRows: string[][];
}

export interface ExportPdfProps {
  exportType: string;
  doctorName: string;
  generatedAt: string;
  dateRangeLabel: string;
  patientNames: string[];
  summaryRows: ExportSummaryRow[];
  medicationRows: MedicationComplianceRow[];
  patientDetails: PatientDetailSection[];
  notes: string[];
}

export type ExportPdfDocumentElement = React.ReactElement<DocumentProps>;

// ─── Design tokens ───────────────────────────────────────────────────────────
const BRAND   = "#132d36";
const ACCENT  = "#126969";
const LIGHT   = "#f7fafb";
const BORDER  = "#d4dfe3";
const MUTED   = "#6d8794";
const WHITE   = "#ffffff";
const RED     = "#c94d49";
const GREEN   = "#0f6e56";
const AMBER   = "#b7791f";

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page:         { padding: 36, fontSize: 9, color: BRAND, fontFamily: "Helvetica", backgroundColor: WHITE },
  // Header band
  headerBand:   { backgroundColor: BRAND, padding: "14 28", marginBottom: 0 },
  headerTop:    { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerTitle:  { fontSize: 16, color: WHITE, fontFamily: "Helvetica-Bold", letterSpacing: 0.4 },
  headerSub:    { fontSize: 8, color: "#7ec8c8", marginTop: 2 },
  headerRight:  { alignItems: "flex-end" },
  headerMeta:   { fontSize: 7.5, color: "#b0cdd2" },
  headerStrip:  { backgroundColor: ACCENT, height: 3, marginBottom: 16 },
  // Section
  section:      { marginTop: 14 },
  sectionHead:  { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  sectionBar:   { width: 4, height: 12, backgroundColor: ACCENT, borderRadius: 2, marginRight: 6 },
  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: BRAND },
  // KV grid
  kvGrid:       { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  kvItem:       { width: "32%", backgroundColor: LIGHT, borderRadius: 4, padding: "5 6", marginBottom: 4 },
  kvItemWide:   { width: "49%", backgroundColor: LIGHT, borderRadius: 4, padding: "5 6", marginBottom: 4 },
  kvLabel:      { fontSize: 7, color: MUTED, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 1 },
  kvValue:      { fontSize: 8.5, color: BRAND, lineHeight: 1.35 },
  // Table
  table:        { border: `1 solid ${BORDER}`, borderRadius: 4, overflow: "hidden", marginTop: 4 },
  tHead:        { flexDirection: "row", backgroundColor: "#e8f0f3" },
  tRow:         { flexDirection: "row", borderTop: `1 solid ${BORDER}` },
  tRowAlt:      { flexDirection: "row", borderTop: `1 solid ${BORDER}`, backgroundColor: LIGHT },
  tCell:        { flex: 1, padding: "5 6", fontSize: 8, lineHeight: 1.3, borderRight: `1 solid ${BORDER}` },
  tCellLast:    { flex: 1, padding: "5 6", fontSize: 8, lineHeight: 1.3 },
  tHeadCell:    { flex: 1, padding: "5 6", fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BRAND, borderRight: `1 solid ${BORDER}` },
  tHeadLast:    { flex: 1, padding: "5 6", fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BRAND },
  // Badges
  badgeGreen:   { backgroundColor: "rgba(15,110,86,0.12)", color: GREEN, fontSize: 7.5, fontFamily: "Helvetica-Bold", padding: "2 6", borderRadius: 3 },
  badgeRed:     { backgroundColor: "rgba(201,77,73,0.12)", color: RED,   fontSize: 7.5, fontFamily: "Helvetica-Bold", padding: "2 6", borderRadius: 3 },
  badgeAmber:   { backgroundColor: "rgba(183,121,31,0.12)", color: AMBER,fontSize: 7.5, fontFamily: "Helvetica-Bold", padding: "2 6", borderRadius: 3 },
  badgeTeal:    { backgroundColor: "rgba(18,105,105,0.12)", color: ACCENT,fontSize: 7.5, fontFamily: "Helvetica-Bold", padding: "2 6", borderRadius: 3 },
  // Misc
  divider:      { borderBottom: `1 solid ${BORDER}`, marginVertical: 10 },
  note:         { fontSize: 7.5, color: MUTED, marginBottom: 3, lineHeight: 1.4 },
  pageNumber:   { position: "absolute", bottom: 18, right: 36, fontSize: 7.5, color: MUTED },
  footer:       { position: "absolute", bottom: 18, left: 36, fontSize: 7.5, color: MUTED },
  // Prescription-specific
  rxHeader:     { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", backgroundColor: LIGHT, border: `1 solid ${BORDER}`, borderRadius: 6, padding: "10 14", marginBottom: 8 },
  rxRxSymbol:   { fontSize: 22, color: ACCENT, fontFamily: "Helvetica-Bold", marginRight: 8 },
  rxPatRow:     { flexDirection: "row", gap: 12 },
  medRow:       { flexDirection: "row", alignItems: "flex-start", padding: "7 8", borderBottom: `1 solid ${BORDER}` },
  medNum:       { width: 18, fontSize: 9, color: MUTED, fontFamily: "Helvetica-Bold" },
  medName:      { flex: 2, fontSize: 9, fontFamily: "Helvetica-Bold", color: BRAND },
  medDetail:    { flex: 1, fontSize: 8, color: MUTED },
  sigBox:       { marginTop: 24, borderTop: `1 solid ${BORDER}`, paddingTop: 10, flexDirection: "row", justifyContent: "space-between" },
  sigLine:      { width: 140, borderBottom: `1 solid ${BRAND}`, marginBottom: 4 },
  sigLabel:     { fontSize: 7, color: MUTED },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map effective_dashboard to a human display label */
function dashboardLabel(d: string | null | undefined): string {
  switch ((d ?? "").toLowerCase()) {
    case "asthma":        return "Asthma";
    case "copd":          return "COPD";
    case "ild":           return "ILD";
    case "bronchiectasis":return "Bronchiectasis";
    case "post_icu":      return "Post ICU";
    default:              return d ?? "—";
  }
}

/** Resolve effective dashboard from diagnosis KV pairs in PatientDetailSection */
function resolveEffectiveDashboard(diagKv: Array<[string, string]>): string {
  const raw = (diagKv.find(([k]) => k.toLowerCase().includes("effective") || k.toLowerCase().includes("dashboard"))?.[1] ?? "").toLowerCase();
  if (raw.includes("asthma"))        return "asthma";
  if (raw.includes("copd"))          return "copd";
  if (raw.includes("ild"))           return "ild";
  if (raw.includes("bronchiectasis"))return "bronchiectasis";
  if (raw.includes("post_icu") || raw.includes("post icu")) return "post_icu";
  // Try primary_diagnosis
  const primary = (diagKv.find(([k]) => k.toLowerCase().includes("primary"))?.[1] ?? "").toLowerCase();
  if (primary.includes("bronchiolitis")) return "asthma";
  if (primary.includes("overlap") || primary.includes("aco") || (primary.includes("asthma") && primary.includes("copd"))) return "copd";
  if (primary.includes("asthma"))        return "asthma";
  if (primary.includes("copd") || primary.startsWith("oad")) return "copd";
  if (primary.includes("bronchiectasis"))return "bronchiectasis";
  if (primary.includes("ild"))           return "ild";
  if (primary.includes("post"))          return "post_icu";
  return "unknown";
}

function riskBadgeStyle(level: string) {
  const l = level.toLowerCase();
  if (l.includes("critical") || l.includes("high")) return S.badgeRed;
  if (l.includes("moderate"))                        return S.badgeAmber;
  return S.badgeGreen;
}

function adherenceColor(pct: number): string {
  if (pct >= 80) return GREEN;
  if (pct >= 50) return AMBER;
  return RED;
}

// ─── Reusable components ─────────────────────────────────────────────────────

function PdfHeader({ doctorName, generatedAt, title, subtitle }: {
  doctorName: string; generatedAt: string; title: string; subtitle: string;
}) {
  return (
    <>
      <View style={S.headerBand}>
        <View style={S.headerTop}>
          <View>
            <Text style={S.headerTitle}>{title}</Text>
            <Text style={S.headerSub}>{subtitle}</Text>
          </View>
          <View style={S.headerRight}>
            <Text style={S.headerMeta}>O2Plus Clinical Platform</Text>
            <Text style={S.headerMeta}>Dr. {doctorName}</Text>
            <Text style={S.headerMeta}>{generatedAt}</Text>
          </View>
        </View>
      </View>
      <View style={S.headerStrip} />
    </>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <View style={S.sectionHead}>
      <View style={S.sectionBar} />
      <Text style={S.sectionTitle}>{title}</Text>
    </View>
  );
}

function KVGrid({ pairs, wide }: { pairs: Array<[string, string]>; wide?: boolean }) {
  return (
    <View style={S.kvGrid}>
      {pairs.map(([label, value]) => (
        <View key={label} style={wide ? S.kvItemWide : S.kvItem}>
          <Text style={S.kvLabel}>{label}</Text>
          <Text style={S.kvValue}>{value || "—"}</Text>
        </View>
      ))}
    </View>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (rows.length === 0) {
    return (
      <View style={S.table}>
        <View style={S.tRow}>
          <Text style={[S.tCellLast, { color: MUTED }]}>No records available.</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={S.table}>
      <View style={S.tHead}>
        {headers.map((h, i) => (
          <Text key={h} style={i === headers.length - 1 ? S.tHeadLast : S.tHeadCell}>{h}</Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={ri % 2 === 0 ? S.tRow : S.tRowAlt}>
          {row.map((cell, ci) => (
            <Text key={ci} style={ci === row.length - 1 ? S.tCellLast : S.tCell}>{cell}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── Disease-specific clinical summary ───────────────────────────────────────

function DiseaseMetrics({ dashboard, logRows }: { dashboard: string; logRows: string[][] }) {
  if (logRows.length === 0) return null;

  const isAsthma = dashboard === "asthma";
  const isCOPD   = dashboard === "copd";

  const recentLogs = logRows.slice(-7); // last 7 entries

  return (
    <View style={S.section}>
      <SectionHeading title={isAsthma ? "Asthma Clinical Summary" : isCOPD ? "COPD Clinical Summary" : "Clinical Summary"} />
      <View style={S.kvGrid}>
        <View style={S.kvItem}>
          <Text style={S.kvLabel}>Dashboard Type</Text>
          <Text style={[S.kvValue, { color: ACCENT, fontFamily: "Helvetica-Bold" }]}>{dashboardLabel(dashboard)}</Text>
        </View>
        <View style={S.kvItem}>
          <Text style={S.kvLabel}>Recent Logs</Text>
          <Text style={S.kvValue}>{recentLogs.length} of {logRows.length} entries shown</Text>
        </View>
        {isAsthma && (
          <View style={S.kvItem}>
            <Text style={S.kvLabel}>Key Metrics</Text>
            <Text style={S.kvValue}>ACT, PEFR, Rescue Inhaler</Text>
          </View>
        )}
        {isCOPD && (
          <View style={S.kvItem}>
            <Text style={S.kvLabel}>Key Metrics</Text>
            <Text style={S.kvValue}>CAT, mMRC, Sputum, Energy</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Prescription page ───────────────────────────────────────────────────────

function PrescriptionPage({
  patient,
  doctorName,
  generatedAt,
}: {
  patient: PatientDetailSection;
  doctorName: string;
  generatedAt: string;
}) {
  const dem = Object.fromEntries(patient.demographics);
  const diag = Object.fromEntries(patient.diagnosis);
  const dashboard = resolveEffectiveDashboard(patient.diagnosis);
  const meds = patient.medicationRows;

  return (
    <Page size="A4" style={S.page}>
      <PdfHeader
        doctorName={doctorName}
        generatedAt={generatedAt}
        title="Medical Prescription"
        subtitle={`O2Plus • ${dashboardLabel(dashboard)} Dashboard`}
      />

      {/* Rx header box */}
      <View style={S.rxHeader}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <Text style={S.rxRxSymbol}>℞</Text>
          <View>
            <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: BRAND }}>{patient.patientName}</Text>
            <View style={S.rxPatRow}>
              {dem["Age"] && <Text style={{ fontSize: 8, color: MUTED }}>Age: {dem["Age"]}</Text>}
              {dem["Gender"] && <Text style={{ fontSize: 8, color: MUTED }}>  Gender: {dem["Gender"]}</Text>}
              {dem["Mobile"] && <Text style={{ fontSize: 8, color: MUTED }}>  Mob: {dem["Mobile"]}</Text>}
            </View>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 8, color: MUTED }}>Date: {generatedAt}</Text>
          <Text style={{ fontSize: 8, color: MUTED }}>Diagnosis: {diag["Primary diagnosis"] ?? diag["Effective dashboard"] ?? "—"}</Text>
          <View style={[S.badgeTeal, { marginTop: 4 }]}>
            <Text>{dashboardLabel(dashboard)} Dashboard</Text>
          </View>
        </View>
      </View>

      {/* Medications */}
      <View style={S.section}>
        <SectionHeading title="Prescribed Medications" />
        <View style={{ border: `1 solid ${BORDER}`, borderRadius: 4, overflow: "hidden" }}>
          {/* Table header */}
          <View style={[S.tHead, { padding: "5 8" }]}>
            <Text style={[S.tHeadCell, { flex: 0.3 }]}>#</Text>
            <Text style={[S.tHeadCell, { flex: 2 }]}>Medication (Drug Name)</Text>
            <Text style={[S.tHeadCell, { flex: 1 }]}>Route</Text>
            <Text style={[S.tHeadCell, { flex: 1 }]}>Dose</Text>
            <Text style={[S.tHeadCell, { flex: 1 }]}>Frequency</Text>
            <Text style={[S.tHeadCell, { flex: 1 }]}>Duration</Text>
            <Text style={S.tHeadLast}>Instructions</Text>
          </View>
          {meds.length === 0 ? (
            <View style={S.medRow}>
              <Text style={[S.tCellLast, { color: MUTED }]}>No medications prescribed.</Text>
            </View>
          ) : (
            meds.map((row, i) => (
              <View key={i} style={[S.medRow, i % 2 === 1 ? { backgroundColor: LIGHT } : {}]}>
                <Text style={[S.medNum]}>{i + 1}.</Text>
                <Text style={[S.medName, { flex: 2 }]}>{row[0] ?? "—"}</Text>
                <Text style={[S.medDetail, { flex: 1 }]}>{row[1] ?? "—"}</Text>
                <Text style={[S.medDetail, { flex: 1 }]}>{row[2] ?? "—"}</Text>
                <Text style={[S.medDetail, { flex: 1 }]}>{row[3] ?? "—"}</Text>
                <Text style={[S.medDetail, { flex: 1 }]}>{row[4] !== "n/a" ? row[4] : "—"}</Text>
                <Text style={[S.medDetail, { flex: 1 }]}>{row[5] !== "n/a" ? row[5] : "—"}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Follow-up */}
      <View style={[S.section, { marginTop: 18 }]}>
        <SectionHeading title="Clinical Notes & Follow-Up" />
        <View style={{ border: `1 solid ${BORDER}`, borderRadius: 4, padding: "8 10", minHeight: 48 }}>
          {patient.instructionRows.length > 0 ? (
            patient.instructionRows.map((row, i) => (
              <Text key={i} style={S.note}>• {row[1] ?? row[0] ?? "—"}</Text>
            ))
          ) : (
            <Text style={S.note}>No special instructions recorded.</Text>
          )}
        </View>
      </View>

      {/* Signature */}
      <View style={S.sigBox}>
        <View>
          <View style={S.sigLine} />
          <Text style={S.sigLabel}>Patient / Guardian Signature</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <View style={S.sigLine} />
          <Text style={S.sigLabel}>Dr. {doctorName} — Signature & Stamp</Text>
          <Text style={[S.sigLabel, { marginTop: 3 }]}>O2Plus Clinical Platform</Text>
        </View>
      </View>

      <Text style={S.footer}>O2Plus — Confidential Medical Record</Text>
      <Text style={S.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
    </Page>
  );
}

// ─── Patient clinical report page ────────────────────────────────────────────

function PatientReportPage({
  patient,
  doctorName,
  generatedAt,
  dateRangeLabel,
}: {
  patient: PatientDetailSection;
  doctorName: string;
  generatedAt: string;
  dateRangeLabel: string;
}) {
  const dashboard = resolveEffectiveDashboard(patient.diagnosis);
  const diag = Object.fromEntries(patient.diagnosis);

  // Adherence summary from logRows
  const medCompliance = patient.medicationRows.map((row) => row[0] ?? "").filter(Boolean);
  const totalMeds = medCompliance.length;

  return (
    <Page size="A4" style={S.page}>
      <PdfHeader
        doctorName={doctorName}
        generatedAt={generatedAt}
        title={`Clinical Report — ${patient.patientName}`}
        subtitle={`${dashboardLabel(dashboard)} Dashboard  •  Period: ${dateRangeLabel}`}
      />

      {/* Demographics */}
      <View style={S.section}>
        <SectionHeading title="Patient Information" />
        <KVGrid pairs={patient.demographics} />
      </View>

      {/* Diagnosis */}
      <View style={S.section}>
        <SectionHeading title="Diagnosis & Dashboard" />
        <View style={S.kvGrid}>
          {patient.diagnosis.map(([label, value]) => (
            <View key={label} style={S.kvItemWide}>
              <Text style={S.kvLabel}>{label}</Text>
              <Text style={S.kvValue}>{value || "—"}</Text>
            </View>
          ))}
          <View style={S.kvItemWide}>
            <Text style={S.kvLabel}>Assigned Dashboard</Text>
            <Text style={[S.kvValue, { color: ACCENT, fontFamily: "Helvetica-Bold" }]}>{dashboardLabel(dashboard)}</Text>
          </View>
        </View>
        {dashboard === "asthma" && (
          <View style={[S.badgeTeal, { marginTop: 6, alignSelf: "flex-start" }]}>
            <Text>Asthma Dashboard — includes Bronchiolitis Obliterans</Text>
          </View>
        )}
        {dashboard === "copd" && (
          <View style={[S.badgeTeal, { marginTop: 6, alignSelf: "flex-start" }]}>
            <Text>COPD Dashboard — includes Asthma-COPD Overlap (ACO)</Text>
          </View>
        )}
      </View>

      {/* Respiratory support */}
      {patient.respiratorySupport.length > 0 && (
        <View style={S.section}>
          <SectionHeading title="Respiratory Support" />
          <KVGrid pairs={patient.respiratorySupport} />
        </View>
      )}

      {/* PFT */}
      <View style={S.section}>
        <SectionHeading title="Pulmonary Function Tests (PFT)" />
        <DataTable
          headers={["Date", "FEV1/FVC (%)", "FEV1 (L)", "FVC (L)", "DLCO (%)", "Notes"]}
          rows={patient.pftRows}
        />
      </View>

      {/* Disease-specific metrics note */}
      <DiseaseMetrics dashboard={dashboard} logRows={patient.logRows} />

      <Text style={S.footer}>O2Plus — Confidential Medical Record</Text>
      <Text style={S.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
    </Page>
  );
}

function PatientActivityPage({
  patient,
  doctorName,
  generatedAt,
}: {
  patient: PatientDetailSection;
  doctorName: string;
  generatedAt: string;
}) {
  const dashboard = resolveEffectiveDashboard(patient.diagnosis);

  // Adherence from logRows (if available)
  const totalLogs = patient.logRows.length;
  const logsToShow = patient.logRows.slice(0, 30);

  return (
    <Page size="A4" style={S.page}>
      <PdfHeader
        doctorName={doctorName}
        generatedAt={generatedAt}
        title={`Activity Report — ${patient.patientName}`}
        subtitle={`${dashboardLabel(dashboard)} Dashboard  •  ${totalLogs} log entries`}
      />

      {/* Adherence summary */}
      <View style={S.section}>
        <SectionHeading title="Medication Adherence Summary" />
        <View style={S.kvGrid}>
          <View style={S.kvItemWide}>
            <Text style={S.kvLabel}>Total Prescribed Medications</Text>
            <Text style={S.kvValue}>{patient.medicationRows.length > 0 ? patient.medicationRows.length : "—"}</Text>
          </View>
          <View style={S.kvItemWide}>
            <Text style={S.kvLabel}>Log Entries with Compliance Data</Text>
            <Text style={S.kvValue}>{totalLogs}</Text>
          </View>
        </View>
        <DataTable
          headers={["Drug", "Route", "Dose", "Frequency", "Start", "End"]}
          rows={patient.medicationRows}
        />
      </View>

      {/* Daily Logs */}
      <View style={S.section}>
        <SectionHeading title={`Daily Logs${totalLogs > 30 ? ` (showing latest 30 of ${totalLogs})` : ""}`} />
        <DataTable
          headers={["Date", "SpO2 Rest", "SpO2 Walk", "mMRC", "AQI", "Symptoms"]}
          rows={logsToShow}
        />
      </View>

      {/* Alerts */}
      <View style={S.section}>
        <SectionHeading title="Red Flag Alerts" />
        <DataTable
          headers={["Date", "Type", "Severity", "Message"]}
          rows={patient.alertRows}
        />
      </View>

      {/* Doctor instructions */}
      {patient.instructionRows.length > 0 && (
        <View style={S.section}>
          <SectionHeading title="Doctor Instructions" />
          <DataTable
            headers={["Date", "Instruction", "Read by Patient"]}
            rows={patient.instructionRows}
          />
        </View>
      )}

      <Text style={S.footer}>O2Plus — Confidential Medical Record</Text>
      <Text style={S.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
    </Page>
  );
}

// ─── Cover / summary page ────────────────────────────────────────────────────

function SummaryPage({
  exportType,
  doctorName,
  generatedAt,
  dateRangeLabel,
  patientNames,
  summaryRows,
  medicationRows,
  notes,
}: Omit<ExportPdfProps, "patientDetails">) {
  return (
    <Page size="A4" style={S.page}>
      <PdfHeader
        doctorName={doctorName}
        generatedAt={generatedAt}
        title="O2Plus Clinical Report"
        subtitle={`Export type: ${exportType}  •  Period: ${dateRangeLabel}`}
      />

      {/* Patient coverage */}
      <View style={S.section}>
        <SectionHeading title="Patient Coverage" />
        <View style={S.kvGrid}>
          <View style={S.kvItemWide}>
            <Text style={S.kvLabel}>Total Patients</Text>
            <Text style={S.kvValue}>{patientNames.length}</Text>
          </View>
          <View style={S.kvItemWide}>
            <Text style={S.kvLabel}>Reporting Period</Text>
            <Text style={S.kvValue}>{dateRangeLabel}</Text>
          </View>
        </View>
        {patientNames.length > 0 && (
          <View style={{ marginTop: 6, border: `1 solid ${BORDER}`, borderRadius: 4, padding: "6 8" }}>
            <Text style={S.note}>{patientNames.join("  •  ")}</Text>
          </View>
        )}
      </View>

      <View style={S.divider} />

      {/* Risk summary table */}
      <View style={S.section}>
        <SectionHeading title="Risk Flag Summary" />
        <DataTable
          headers={["Patient", "Diagnosis", "Dashboard", "Risk Level", "Score", "Alert"]}
          rows={summaryRows.map((r) => [
            r.patientName,
            r.diagnosis,
            r.diagnosis ? dashboardLabel(
              r.diagnosis.toLowerCase().includes("asthma") && !r.diagnosis.toLowerCase().includes("copd") ? "asthma"
              : r.diagnosis.toLowerCase().includes("copd") ? "copd"
              : r.diagnosis.toLowerCase().includes("ild") ? "ild"
              : r.diagnosis.toLowerCase().includes("bronch") ? "bronchiectasis"
              : ""
            ) : "—",
            r.riskLevel,
            r.score,
            r.alert,
          ])}
        />
      </View>

      <View style={S.divider} />

      {/* Adherence summary */}
      <View style={S.section}>
        <SectionHeading title="Medication Adherence Summary" />
        <DataTable
          headers={["Patient", "Doses Taken", "Total Doses", "Adherence %"]}
          rows={medicationRows.map((r) => {
            const pct = r.total > 0 ? Math.round((r.taken / r.total) * 100) : 0;
            return [r.patientName, String(r.taken), String(r.total), r.total > 0 ? `${pct}%` : "No data"];
          })}
        />
      </View>

      {notes.length > 0 && (
        <View style={S.section}>
          <SectionHeading title="Notes" />
          {notes.map((n, i) => <Text key={i} style={S.note}>• {n}</Text>)}
        </View>
      )}

      <Text style={S.footer}>O2Plus — Confidential Medical Record</Text>
      <Text style={S.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
    </Page>
  );
}

// ─── Main document export ────────────────────────────────────────────────────

export function ExportPdfDocument({
  exportType,
  doctorName,
  generatedAt,
  dateRangeLabel,
  patientNames,
  summaryRows,
  medicationRows,
  patientDetails,
  notes,
}: ExportPdfProps): ExportPdfDocumentElement {
  return (
    <Document>
      {/* Page 1: Cover / Summary */}
      <SummaryPage
        exportType={exportType}
        doctorName={doctorName}
        generatedAt={generatedAt}
        dateRangeLabel={dateRangeLabel}
        patientNames={patientNames}
        summaryRows={summaryRows}
        medicationRows={medicationRows}
        notes={notes}
      />

      {/* Per-patient: Clinical Report + Prescription + Activity */}
      {patientDetails.map((patient) => (
        <React.Fragment key={patient.patientName}>
          <PatientReportPage
            patient={patient}
            doctorName={doctorName}
            generatedAt={generatedAt}
            dateRangeLabel={dateRangeLabel}
          />
          <PrescriptionPage
            patient={patient}
            doctorName={doctorName}
            generatedAt={generatedAt}
          />
          <PatientActivityPage
            patient={patient}
            doctorName={doctorName}
            generatedAt={generatedAt}
          />
        </React.Fragment>
      ))}
    </Document>
  );
}
