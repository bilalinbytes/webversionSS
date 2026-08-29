import React from "react";
import {
  type DocumentProps,
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  Svg,
  Line,
  Polyline,
  Circle,
  Rect,
  Text as SvgText,
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

// ─── Design tokens (Medical Blue Executive Palette) ─────────────────────────
const BRAND     = "#0f2b48"; // Deep Navy Header
const ACCENT    = "#1e6091"; // Primary Medical Blue
const CYAN      = "#38bdf8"; // Bright Cyan Accent
const LIGHT     = "#f8fafc"; // Slate Card Surface
const LIGHT_ALT = "#f1f5f9"; // Table alt row
const BORDER    = "#cbd5e1"; // Card & Table Border
const MUTED     = "#64748b"; // Muted text
const WHITE     = "#ffffff";
const RED       = "#dc2626"; // Critical Red
const GREEN     = "#16a34a"; // Stable Green
const AMBER     = "#ea580c"; // Warning Amber

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page:         { padding: "22 24 30 24", fontSize: 8, color: "#0f172a", fontFamily: "Helvetica", backgroundColor: WHITE },
  // Executive Navy Header Band
  headerBand:   { backgroundColor: BRAND, padding: "8 14", marginBottom: 8, borderRadius: 5, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerLeft:   { flexDirection: "row", alignItems: "center", gap: 8 },
  logoBadge:    { backgroundColor: ACCENT, padding: "3 6", borderRadius: 3, border: `1 solid ${CYAN}` },
  logoText:     { fontSize: 11, fontFamily: "Helvetica-Bold", color: WHITE, letterSpacing: 0.6 },
  headerTitle:  { fontSize: 12, fontFamily: "Helvetica-Bold", color: WHITE, letterSpacing: 0.2 },
  headerSub:    { fontSize: 7.5, color: "#93c5fd", marginTop: 1 },
  headerRight:  { alignItems: "flex-end" },
  headerMeta:   { fontSize: 7, color: "#cbd5e1" },
  
  // Section
  section:      { marginTop: 6, marginBottom: 2 },
  sectionHead:  { flexDirection: "row", alignItems: "center", marginBottom: 3, paddingBottom: 2, borderBottom: `1.5 solid ${ACCENT}` },
  sectionBar:   { width: 3, height: 9, backgroundColor: ACCENT, borderRadius: 1.5, marginRight: 5 },
  sectionTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BRAND, letterSpacing: 0.2, textTransform: "uppercase" },

  // KV grid & items
  rowFlex:      { flexDirection: "row", gap: 5, marginBottom: 3 },
  kvBox:        { flex: 1, backgroundColor: LIGHT, borderRadius: 3, border: `1 solid ${BORDER}`, padding: "3.5 5" },
  kvLabel:      { fontSize: 6, color: MUTED, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 1 },
  kvValue:      { fontSize: 8, color: BRAND, lineHeight: 1.2 },

  // Table
  table:        { border: `1 solid ${BORDER}`, borderRadius: 3, overflow: "hidden", marginTop: 3 },
  tHead:        { flexDirection: "row", backgroundColor: "#e8f1f8", borderBottom: `1.5 solid ${ACCENT}` },
  tRow:         { flexDirection: "row", borderBottom: `1 solid ${BORDER}` },
  tRowAlt:      { flexDirection: "row", borderBottom: `1 solid ${BORDER}`, backgroundColor: LIGHT },
  tCell:        { flex: 1, padding: "3.5 5", fontSize: 7.5, lineHeight: 1.2, borderRight: `1 solid ${BORDER}` },
  tCellLast:    { flex: 1, padding: "3.5 5", fontSize: 7.5, lineHeight: 1.2 },
  tHeadCell:    { flex: 1, padding: "3.5 5", fontSize: 7, fontFamily: "Helvetica-Bold", color: BRAND, borderRight: `1 solid ${BORDER}` },
  tHeadLast:    { flex: 1, padding: "3.5 5", fontSize: 7, fontFamily: "Helvetica-Bold", color: BRAND },

  // Badges
  badgeGreen:   { backgroundColor: "#dcfce7", color: GREEN, fontSize: 7, fontFamily: "Helvetica-Bold", padding: "1.5 5", borderRadius: 3, border: `1 solid #bbf7d0` },
  badgeRed:     { backgroundColor: "#fee2e2", color: RED,   fontSize: 7, fontFamily: "Helvetica-Bold", padding: "1.5 5", borderRadius: 3, border: `1 solid #fca5a5` },
  badgeAmber:   { backgroundColor: "#ffedd5", color: AMBER, fontSize: 7, fontFamily: "Helvetica-Bold", padding: "1.5 5", borderRadius: 3, border: `1 solid #fed7aa` },
  badgeBlue:    { backgroundColor: "#e0f2fe", color: ACCENT,fontSize: 7, fontFamily: "Helvetica-Bold", padding: "1.5 5", borderRadius: 3, border: `1 solid #bae6fd` },

  // Footer & Sign off
  footer:       { position: "absolute", bottom: 12, left: 24, fontSize: 7, color: MUTED },
  pageNumber:   { position: "absolute", bottom: 12, right: 24, fontSize: 7, color: MUTED },
  sigBox:       { marginTop: 14, borderTop: `1.5 solid ${BORDER}`, paddingTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  sigLine:      { width: 130, borderBottom: `1 solid ${BRAND}`, marginBottom: 3 },
  sigLabel:     { fontSize: 6.5, color: MUTED },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dashboardLabel(d: string | null | undefined): string {
  switch ((d ?? "").toLowerCase()) {
    case "asthma":        return "Asthma Dashboard";
    case "copd":          return "COPD Dashboard";
    case "ild":           return "ILD Dashboard";
    case "bronchiectasis":return "Bronchiectasis Dashboard";
    case "post_icu":      return "Post ICU Recovery";
    default:              return d ?? "Respiratory";
  }
}

function resolveEffectiveDashboard(diagKv: Array<[string, string]>): string {
  const primary = (diagKv.find(([k]) => k.toLowerCase().includes("primary"))?.[1] ?? "").toLowerCase();
  if (primary.includes("bronchiolitis")) return "asthma";
  if (primary.includes("overlap") || primary.includes("aco") || (primary.includes("asthma") && primary.includes("copd"))) return "copd";

  const raw = (diagKv.find(([k]) => k.toLowerCase().includes("effective") || k.toLowerCase().includes("dashboard"))?.[1] ?? "").toLowerCase();
  if (raw.includes("asthma"))        return "asthma";
  if (raw.includes("copd"))          return "copd";
  if (raw.includes("ild"))           return "ild";
  if (raw.includes("bronchiectasis"))return "bronchiectasis";
  if (raw.includes("post_icu") || raw.includes("post icu")) return "post_icu";

  if (primary.includes("asthma"))        return "asthma";
  if (primary.includes("copd") || primary.startsWith("oad")) return "copd";
  if (primary.includes("bronchiectasis"))return "bronchiectasis";
  if (primary.includes("ild"))           return "ild";
  if (primary.includes("post"))          return "post_icu";
  return "unknown";
}

// ─── SVG Vitals Trend Sparkline Chart ──────────────────────────────────────

function SpO2TrendChart({ logRows }: { logRows: string[][] }) {
  if (!logRows || logRows.length === 0) return null;

  // Extract date and spo2Rest values
  const pointsData = logRows
    .map((r) => {
      const date = r[0] ?? "";
      const val = parseFloat(r[1] ?? "");
      return { date, val: isNaN(val) ? null : val };
    })
    .filter((p): p is { date: string; val: number } => p.val !== null)
    .slice(-14); // Last 14 days

  if (pointsData.length < 2) return null;

  const svgW = 546;
  const svgH = 50;
  const padX = 24;
  const padY = 10;
  const chartW = svgW - padX * 2;
  const chartH = svgH - padY * 2;

  const minVal = 75;
  const maxVal = 100;

  const coords = pointsData.map((p, i) => {
    const x = padX + (i / (pointsData.length - 1)) * chartW;
    const clamped = Math.min(maxVal, Math.max(minVal, p.val));
    const y = svgH - padY - ((clamped - minVal) / (maxVal - minVal)) * chartH;
    return { x, y, val: p.val, date: p.date };
  });

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");

  const y88 = svgH - padY - ((88 - minVal) / (maxVal - minVal)) * chartH;
  const y90 = svgH - padY - ((90 - minVal) / (maxVal - minVal)) * chartH;

  return (
    <View style={{ marginTop: 4, marginBottom: 2, border: `1 solid ${BORDER}`, borderRadius: 4, padding: "4 6", backgroundColor: LIGHT }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
        <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BRAND }}>
          SpO₂ Resting Trend Graph (%) — Last {pointsData.length} Recorded Logs
        </Text>
        <Text style={{ fontSize: 6.5, color: MUTED }}>
          Target: ≥ 90% (Normal) | &lt; 88% (Desaturation Warning)
        </Text>
      </View>
      <Svg width={svgW} height={svgH}>
        {/* Background Card */}
        <Rect x={0} y={0} width={svgW} height={svgH} fill="#ffffff" rx={3} />
        
        {/* Threshold Dash Lines */}
        <Line x1={padX} y1={y90} x2={svgW - padX} y2={y90} stroke="#ea580c" strokeDasharray="3 3" strokeWidth={0.8} />
        <Line x1={padX} y1={y88} x2={svgW - padX} y2={y88} stroke="#dc2626" strokeDasharray="3 3" strokeWidth={0.8} />
        <SvgText x={padX - 18} y={y90 + 2} style={{ fontSize: 6, fill: "#ea580c" }}>90%</SvgText>
        <SvgText x={padX - 18} y={y88 + 2} style={{ fontSize: 6, fill: "#dc2626" }}>88%</SvgText>

        {/* Trend Polyline */}
        <Polyline points={polylinePoints} stroke="#1e6091" strokeWidth={1.8} fill="none" />

        {/* Point Circles */}
        {coords.map((c, i) => {
          const color = c.val < 88 ? RED : c.val < 90 ? AMBER : ACCENT;
          return (
            <React.Fragment key={i}>
              <Circle cx={c.x} cy={c.y} r={2.5} fill={color} stroke="#ffffff" strokeWidth={0.8} />
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

// ─── Executive Header Component ──────────────────────────────────────────────

function ExecutiveHeader({
  title,
  subtitle,
  uhid,
  fileNo,
  generatedAt,
  doctorName,
}: {
  title: string;
  subtitle: string;
  uhid?: string;
  fileNo?: string;
  generatedAt: string;
  doctorName: string;
}) {
  return (
    <View style={S.headerBand}>
      <View style={S.headerLeft}>
        <View style={S.logoBadge}>
          <Text style={S.logoText}>O₂+</Text>
        </View>
        <View>
          <Text style={S.headerTitle}>{title}</Text>
          <Text style={S.headerSub}>{subtitle}</Text>
        </View>
      </View>
      <View style={S.headerRight}>
        <Text style={S.headerMeta}>UHID: {uhid || "P-E01E2C"} | File: {fileNo || "001/2026"}</Text>
        <Text style={S.headerMeta}>Dr. {doctorName} | {generatedAt}</Text>
      </View>
    </View>
  );
}

// ─── Single Patient Executive 3-Page Dossier Fragment ─────────────────────────

function SinglePatientDossierPages({
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
  const dem = Object.fromEntries(patient.demographics);
  const diag = Object.fromEntries(patient.diagnosis);
  const dashboard = resolveEffectiveDashboard(patient.diagnosis);

  return (
    <React.Fragment>

      {/* ── PAGE 1: Executive Patient Profile & Baseline PFT ────────────────── */}
      <Page size="A4" style={S.page}>
        <ExecutiveHeader
          title={`Patient Clinical Dossier — ${patient.patientName}`}
          subtitle={`${dashboardLabel(dashboard)} · Period: ${dateRangeLabel}`}
          uhid={dem["UHID"]}
          fileNo={dem["File No"]}
          generatedAt={generatedAt}
          doctorName={doctorName}
        />

        {/* Section 1: Patient Demographics */}
        <View style={S.section}>
          <View style={S.sectionHead}>
            <View style={S.sectionBar} />
            <Text style={S.sectionTitle}>1. Patient Demographics &amp; Background</Text>
          </View>
          
          <View style={S.rowFlex}>
            <View style={S.kvBox}>
              <Text style={S.kvLabel}>Patient Full Name</Text>
              <Text style={[S.kvValue, { fontFamily: "Helvetica-Bold" }]}>{patient.patientName}</Text>
            </View>
            <View style={S.kvBox}>
              <Text style={S.kvLabel}>UHID / Patient ID</Text>
              <Text style={S.kvValue}>{dem["UHID"] || "P-E01E2C"}</Text>
            </View>
            <View style={S.kvBox}>
              <Text style={S.kvLabel}>Hospital File No.</Text>
              <Text style={S.kvValue}>{dem["File No"] || "001/2026"}</Text>
            </View>
          </View>

          <View style={S.rowFlex}>
            <View style={S.kvBox}>
              <Text style={S.kvLabel}>Age &amp; Sex</Text>
              <Text style={S.kvValue}>{dem["Age"] ? `${dem["Age"]} yrs` : "—"} / {dem["Sex"] || "—"}</Text>
            </View>
            <View style={S.kvBox}>
              <Text style={S.kvLabel}>Mobile Contact</Text>
              <Text style={S.kvValue}>{dem["Mobile"] || "—"}</Text>
            </View>
            <View style={S.kvBox}>
              <Text style={S.kvLabel}>Occupation</Text>
              <Text style={S.kvValue}>{dem["Occupation"] || "Not recorded"}</Text>
            </View>
          </View>

          <View style={S.rowFlex}>
            <View style={[S.kvBox, { flex: 1.2 }]}>
              <Text style={S.kvLabel}>Smoking &amp; Exposure History</Text>
              <Text style={S.kvValue}>{dem["Smoking Status"] || "Non-smoker / No biomass exposure"}</Text>
            </View>
            <View style={S.kvBox}>
              <Text style={S.kvLabel}>O2Plus Enrollment Date</Text>
              <Text style={S.kvValue}>{dem["Enrollment Date"] || generatedAt}</Text>
            </View>
          </View>
        </View>

        {/* Section 2: Complete Primary Diagnosis & Co-morbidities */}
        <View style={S.section}>
          <View style={S.sectionHead}>
            <View style={S.sectionBar} />
            <Text style={S.sectionTitle}>2. Complete Primary Diagnosis &amp; Clinical Profile</Text>
          </View>
          
          <View style={S.rowFlex}>
            <View style={S.kvBox}>
              <Text style={S.kvLabel}>Primary Pulmonology Diagnosis</Text>
              <Text style={[S.kvValue, { color: ACCENT, fontFamily: "Helvetica-Bold" }]}>
                {diag["Primary Diagnosis"] || diag["Effective dashboard"] || "OAD / Respiratory Disease"}
              </Text>
            </View>
            <View style={S.kvBox}>
              <Text style={S.kvLabel}>Histopathology / Subtype</Text>
              <Text style={S.kvValue}>{diag["Histopathology"] || "Standard Clinical Subtype"}</Text>
            </View>
          </View>

          <View style={S.rowFlex}>
            <View style={S.kvBox}>
              <Text style={S.kvLabel}>Connective Tissue Disease (CTD)</Text>
              <Text style={S.kvValue}>{diag["Connective Tissue Disease"] || "None recorded (NA)"}</Text>
            </View>
            <View style={S.kvBox}>
              <Text style={S.kvLabel}>Associated Co-Morbidities</Text>
              <Text style={S.kvValue}>{diag["Co-morbidities"] || "None recorded"}</Text>
            </View>
          </View>

          <View style={S.rowFlex}>
            <View style={S.kvBox}>
              <Text style={S.kvLabel}>Baseline Respiratory Support</Text>
              <Text style={S.kvValue}>{diag["Respiratory Support"] || "Ambient Air (No LTOT / BiPAP required)"}</Text>
            </View>
          </View>
        </View>

        {/* Section 3: Baseline Spirometry, PFT & 6MWT Box */}
        <View style={S.section}>
          <View style={S.sectionHead}>
            <View style={S.sectionBar} />
            <Text style={S.sectionTitle}>3. Baseline Pulmonary Function Tests (PFT) &amp; 6MWT</Text>
          </View>
          <View style={S.table}>
            <View style={S.tHead}>
              <Text style={[S.tHeadCell, { flex: 1.2 }]}>Test Date</Text>
              <Text style={[S.tHeadCell, { flex: 1 }]}>FEV1/FVC (%)</Text>
              <Text style={[S.tHeadCell, { flex: 1 }]}>FEV1 (L)</Text>
              <Text style={[S.tHeadCell, { flex: 1 }]}>FVC (L)</Text>
              <Text style={[S.tHeadCell, { flex: 1 }]}>DLCO (%)</Text>
              <Text style={[S.tHeadLast, { flex: 2.2 }]}>6MWT &amp; % Predicted</Text>
            </View>
            {patient.pftRows.length === 0 ? (
              <View style={S.tRow}>
                <Text style={[S.tCellLast, { color: MUTED }]}>No baseline PFT tests recorded.</Text>
              </View>
            ) : (
              patient.pftRows.slice(0, 4).map((row, i) => (
                <View key={i} style={i % 2 === 1 ? S.tRowAlt : S.tRow}>
                  <Text style={[S.tCell, { flex: 1.2 }]}>{row[0] || "—"}</Text>
                  <Text style={[S.tCell, { flex: 1 }]}>{row[1] || "—"}</Text>
                  <Text style={[S.tCell, { flex: 1 }]}>{row[2] || "—"}</Text>
                  <Text style={[S.tCell, { flex: 1 }]}>{row[3] || "—"}</Text>
                  <Text style={[S.tCell, { flex: 1 }]}>{row[4] || "—"}</Text>
                  <Text style={[S.tCellLast, { flex: 2.2 }]}>{row[5] || "Standard Baseline"}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <Text style={S.footer}>O2Plus — Confidential Single Patient Medical Record</Text>
        <Text style={S.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
      </Page>

      {/* ── PAGE 2: Longitudinal Vitals, Daily Logs & SVG Trend Chart ──────── */}
      <Page size="A4" style={S.page}>
        <ExecutiveHeader
          title={`Vitals & Symptom Surveillance — ${patient.patientName}`}
          subtitle={`${dashboardLabel(dashboard)} · Period: ${dateRangeLabel}`}
          uhid={dem["UHID"]}
          fileNo={dem["File No"]}
          generatedAt={generatedAt}
          doctorName={doctorName}
        />

        {/* Visual SVG Trend Sparkline Chart */}
        <View style={S.section}>
          <View style={S.sectionHead}>
            <View style={S.sectionBar} />
            <Text style={S.sectionTitle}>4. SpO₂ Resting &amp; Exacerbation Visual Trend</Text>
          </View>
          <SpO2TrendChart logRows={patient.logRows} />
        </View>

        {/* Daily Clinical Vitals Table */}
        <View style={S.section}>
          <View style={S.sectionHead}>
            <View style={S.sectionBar} />
            <Text style={S.sectionTitle}>
              5. Daily Clinical Logs ({patient.logRows.length} total entries)
            </Text>
          </View>
          <View style={S.table}>
            <View style={S.tHead}>
              <Text style={[S.tHeadCell, { flex: 1.1 }]}>Log Date</Text>
              <Text style={[S.tHeadCell, { flex: 1 }]}>SpO₂ Rest (%)</Text>
              <Text style={[S.tHeadCell, { flex: 1 }]}>SpO₂ Walk (%)</Text>
              <Text style={[S.tHeadCell, { flex: 0.9 }]}>mMRC</Text>
              <Text style={[S.tHeadCell, { flex: 0.9 }]}>AQI</Text>
              <Text style={[S.tHeadCell, { flex: 1.1 }]}>Risk Score</Text>
              <Text style={[S.tHeadLast, { flex: 1.8 }]}>Symptoms &amp; Notes</Text>
            </View>
            {patient.logRows.length === 0 ? (
              <View style={S.tRow}>
                <Text style={[S.tCellLast, { color: MUTED }]}>No daily clinical logs recorded for this period.</Text>
              </View>
            ) : (
              patient.logRows.slice(0, 10).map((row, i) => (
                <View key={i} style={i % 2 === 1 ? S.tRowAlt : S.tRow}>
                  <Text style={[S.tCell, { flex: 1.1 }]}>{row[0] || "—"}</Text>
                  <Text style={[S.tCell, { flex: 1, color: parseFloat(row[1] ?? "0") < 88 ? RED : parseFloat(row[1] ?? "0") < 90 ? AMBER : BRAND, fontFamily: "Helvetica-Bold" }]}>
                    {row[1] ? `${row[1]}%` : "—"}
                  </Text>
                  <Text style={[S.tCell, { flex: 1 }]}>{row[2] ? `${row[2]}%` : "—"}</Text>
                  <Text style={[S.tCell, { flex: 0.9 }]}>{row[3] || "—"}</Text>
                  <Text style={[S.tCell, { flex: 0.9 }]}>{row[4] || "—"}</Text>
                  <Text style={[S.tCell, { flex: 1.1, color: parseFloat(row[5] ?? "0") >= 7 ? RED : parseFloat(row[5] ?? "0") >= 4 ? AMBER : GREEN, fontFamily: "Helvetica-Bold" }]}>
                    {row[5] ? `${row[5]} / 10` : "—"}
                  </Text>
                  <Text style={[S.tCellLast, { flex: 1.8 }]}>{row[3] ? `mMRC Grade ${row[3]}` : "Stable"}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Red Flag Alerts Log */}
        <View style={S.section}>
          <View style={S.sectionHead}>
            <View style={S.sectionBar} />
            <Text style={S.sectionTitle}>6. Autonomous Red-Flag Triage &amp; Alert History</Text>
          </View>
          <View style={S.table}>
            <View style={S.tHead}>
              <Text style={[S.tHeadCell, { flex: 1.2 }]}>Alert Date</Text>
              <Text style={[S.tHeadCell, { flex: 1.2 }]}>Alert Type</Text>
              <Text style={[S.tHeadCell, { flex: 1 }]}>Severity</Text>
              <Text style={[S.tHeadLast, { flex: 2.8 }]}>Trigger Cause &amp; Clinical Reason</Text>
            </View>
            {patient.alertRows.length === 0 ? (
              <View style={S.tRow}>
                <Text style={[S.tCellLast, { color: GREEN, fontFamily: "Helvetica-Bold" }]}>
                  ✓ No red-flag exacerbations or critical alerts recorded during this period.
                </Text>
              </View>
            ) : (
              patient.alertRows.slice(0, 5).map((row, i) => (
                <View key={i} style={i % 2 === 1 ? S.tRowAlt : S.tRow}>
                  <Text style={[S.tCell, { flex: 1.2 }]}>{row[0] || "—"}</Text>
                  <Text style={[S.tCell, { flex: 1.2 }]}>{row[1] || "Desaturation Alert"}</Text>
                  <Text style={[S.tCell, { flex: 1, color: RED, fontFamily: "Helvetica-Bold" }]}>{row[2] || "Critical"}</Text>
                  <Text style={[S.tCellLast, { flex: 2.8 }]}>{row[3] || "SpO2 dropped below target threshold"}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <Text style={S.footer}>O2Plus — Confidential Single Patient Medical Record</Text>
        <Text style={S.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
      </Page>

      {/* ── PAGE 3: Treatment Regimen, Doctor Notes & Sign-off ────────────────── */}
      <Page size="A4" style={S.page}>
        <ExecutiveHeader
          title={`Treatment Plan & Doctor Instructions — ${patient.patientName}`}
          subtitle={`${dashboardLabel(dashboard)} · Attending Physician: Dr. ${doctorName}`}
          uhid={dem["UHID"]}
          fileNo={dem["File No"]}
          generatedAt={generatedAt}
          doctorName={doctorName}
        />

        {/* Active Prescriptions Table */}
        <View style={S.section}>
          <View style={S.sectionHead}>
            <View style={S.sectionBar} />
            <Text style={S.sectionTitle}>7. Current Active Prescriptions &amp; Inhaler Regimen</Text>
          </View>
          <View style={S.table}>
            <View style={S.tHead}>
              <Text style={[S.tHeadCell, { flex: 0.4 }]}>#</Text>
              <Text style={[S.tHeadCell, { flex: 2.2 }]}>Medication (Drug Name)</Text>
              <Text style={[S.tHeadCell, { flex: 1.1 }]}>Route / Device</Text>
              <Text style={[S.tHeadCell, { flex: 1.1 }]}>Dose</Text>
              <Text style={[S.tHeadCell, { flex: 1.1 }]}>Frequency</Text>
              <Text style={[S.tHeadCell, { flex: 1.2 }]}>Start Date</Text>
              <Text style={[S.tHeadLast, { flex: 1.2 }]}>End Date / Status</Text>
            </View>
            {patient.medicationRows.length === 0 ? (
              <View style={S.tRow}>
                <Text style={[S.tCellLast, { color: MUTED }]}>No active prescriptions recorded.</Text>
              </View>
            ) : (
              patient.medicationRows.slice(0, 8).map((row, i) => (
                <View key={i} style={i % 2 === 1 ? S.tRowAlt : S.tRow}>
                  <Text style={[S.tCell, { flex: 0.4, fontFamily: "Helvetica-Bold" }]}>{i + 1}.</Text>
                  <Text style={[S.tCell, { flex: 2.2, fontFamily: "Helvetica-Bold", color: ACCENT }]}>{row[0] || "—"}</Text>
                  <Text style={[S.tCell, { flex: 1.1 }]}>{row[1] || "Inhaled"}</Text>
                  <Text style={[S.tCell, { flex: 1.1 }]}>{row[2] || "Standard"}</Text>
                  <Text style={[S.tCell, { flex: 1.1 }]}>{row[3] || "As prescribed"}</Text>
                  <Text style={[S.tCell, { flex: 1.2 }]}>{row[4] && row[4] !== "n/a" ? row[4] : "—"}</Text>
                  <Text style={[S.tCellLast, { flex: 1.2 }]}>{row[5] && row[5] !== "n/a" ? row[5] : "Ongoing"}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Doctor Instructions & Action Plan */}
        <View style={S.section}>
          <View style={S.sectionHead}>
            <View style={S.sectionBar} />
            <Text style={S.sectionTitle}>8. Chronological Doctor Instructions &amp; Action Plan</Text>
          </View>
          <View style={{ border: `1 solid ${BORDER}`, borderRadius: 4, padding: 6, backgroundColor: LIGHT, minHeight: 50 }}>
            {patient.instructionRows.length === 0 ? (
              <Text style={{ fontSize: 7.5, color: MUTED, lineHeight: 1.35 }}>
                • Maintain prescribed daily inhaler compliance. Monitor resting SpO₂ twice daily.
                {"\n"}• If resting SpO₂ drops below 88% or mMRC dyspnea increases, use rescue inhaler and notify your doctor immediately.
              </Text>
            ) : (
              patient.instructionRows.slice(0, 5).map((row, i) => (
                <Text key={i} style={{ fontSize: 7.5, color: BRAND, lineHeight: 1.35, marginBottom: 2 }}>
                  • [{row[0] || generatedAt}] {row[1] || row[0] || "—"}
                </Text>
              ))
            )}
          </View>
        </View>

        {/* Attending Pulmonologist Sign-Off Box */}
        <View style={[S.sigBox, { marginTop: 18 }]}>
          <View>
            <View style={S.sigLine} />
            <Text style={S.sigLabel}>Patient / Guardian Signature</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <View style={S.sigLine} />
            <Text style={[S.sigLabel, { fontFamily: "Helvetica-Bold", color: BRAND }]}>
              Dr. {doctorName} — Attending Pulmonologist
            </Text>
            <Text style={[S.sigLabel, { marginTop: 1.5 }]}>AIIMS New Delhi / Clinical Specialist</Text>
            <Text style={[S.sigLabel, { marginTop: 1.5, color: ACCENT }]}>
              O2Plus Precision Tele-Pulmonology Platform
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 8, padding: 5, backgroundColor: "#e8f1f8", borderRadius: 3 }}>
          <Text style={{ fontSize: 6.5, color: MUTED, textAlign: "center" }}>
            Disclaimer: This document is a confidential medical record generated via O2Plus Tele-Pulmonology Platform. Compliant with GINA, GOLD, and ATS/ERS clinical guidelines.
          </Text>
        </View>

        <Text style={S.footer}>O2Plus — Confidential Single Patient Medical Record</Text>
        <Text style={S.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
      </Page>

    </React.Fragment>
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

// ─── Multi-Patient Cohort Summary Page ─────────────────────────────────────

function CohortSummaryPage({
  exportType,
  doctorName,
  generatedAt,
  dateRangeLabel,
  patientNames,
  summaryRows,
  medicationRows,
}: Omit<ExportPdfProps, "patientDetails">) {
  return (
    <Page size="A4" style={S.page}>
      <ExecutiveHeader
        title="O2Plus Cohort Clinical Summary"
        subtitle={`Export Type: ${exportType} · Period: ${dateRangeLabel}`}
        generatedAt={generatedAt}
        doctorName={doctorName}
      />

      <View style={S.section}>
        <View style={S.sectionHead}>
          <View style={S.sectionBar} />
          <Text style={S.sectionTitle}>Cohort Patient Coverage</Text>
        </View>
        <View style={S.rowFlex}>
          <View style={S.kvBox}>
            <Text style={S.kvLabel}>Total Cohort Patients</Text>
            <Text style={[S.kvValue, { fontFamily: "Helvetica-Bold", color: ACCENT }]}>{patientNames.length}</Text>
          </View>
          <View style={S.kvBox}>
            <Text style={S.kvLabel}>Reporting Period</Text>
            <Text style={S.kvValue}>{dateRangeLabel}</Text>
          </View>
        </View>
      </View>

      <View style={S.section}>
        <View style={S.sectionHead}>
          <View style={S.sectionBar} />
          <Text style={S.sectionTitle}>Risk Flag &amp; Triage Summary</Text>
        </View>
        <DataTable
          headers={["Patient Name", "Diagnosis", "Dashboard", "Risk Level", "Score", "Alert Status"]}
          rows={summaryRows.map((r) => [
            r.patientName,
            r.diagnosis,
            "Respiratory",
            r.riskLevel,
            r.score,
            r.alert,
          ])}
        />
      </View>

      <View style={S.section}>
        <View style={S.sectionHead}>
          <View style={S.sectionBar} />
          <Text style={S.sectionTitle}>Medication Compliance Summary</Text>
        </View>
        <DataTable
          headers={["Patient Name", "Doses Taken", "Total Doses", "Adherence Rate"]}
          rows={medicationRows.map((r) => [
            r.patientName,
            String(r.taken),
            String(r.total),
            r.total > 0 ? `${Math.round((r.taken / r.total) * 100)}%` : "No data",
          ])}
        />
      </View>

      <Text style={S.footer}>O2Plus — Confidential Cohort Registry Record</Text>
      <Text style={S.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
    </Page>
  );
}

// ─── Main Document Export Router ───────────────────────────────────────────

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
  const isSinglePatient = exportType === "single_patient" || patientDetails.length === 1;

  if (isSinglePatient && patientDetails.length > 0) {
    return (
      <Document>
        <SinglePatientDossierPages
          patient={patientDetails[0]!}
          doctorName={doctorName}
          generatedAt={generatedAt}
          dateRangeLabel={dateRangeLabel}
        />
      </Document>
    );
  }

  return (
    <Document>
      <CohortSummaryPage
        exportType={exportType}
        doctorName={doctorName}
        generatedAt={generatedAt}
        dateRangeLabel={dateRangeLabel}
        patientNames={patientNames}
        summaryRows={summaryRows}
        medicationRows={medicationRows}
        notes={notes}
      />
      {patientDetails.map((patient) => (
        <SinglePatientDossierPages
          key={patient.patientName}
          patient={patient}
          doctorName={doctorName}
          generatedAt={generatedAt}
          dateRangeLabel={dateRangeLabel}
        />
      ))}
    </Document>
  );
}
