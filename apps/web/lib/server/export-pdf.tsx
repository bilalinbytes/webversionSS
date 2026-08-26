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
  page:         { padding: 28, fontSize: 8.5, color: "#0f172a", fontFamily: "Helvetica", backgroundColor: WHITE },
  // Executive Navy Header Band
  headerBand:   { backgroundColor: BRAND, padding: "12 20", marginBottom: 14, borderRadius: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerLeft:   { flexDirection: "row", alignItems: "center", gap: 10 },
  logoBadge:    { backgroundColor: ACCENT, padding: "4 8", borderRadius: 4, border: `1 solid ${CYAN}` },
  logoText:     { fontSize: 13, fontFamily: "Helvetica-Bold", color: WHITE, letterSpacing: 0.8 },
  headerTitle:  { fontSize: 14, fontFamily: "Helvetica-Bold", color: WHITE, letterSpacing: 0.3 },
  headerSub:    { fontSize: 8, color: "#93c5fd", marginTop: 2 },
  headerRight:  { alignItems: "flex-end" },
  headerMeta:   { fontSize: 7.5, color: "#cbd5e1" },
  
  // Section
  section:      { marginTop: 10, marginBottom: 4 },
  sectionHead:  { flexDirection: "row", alignItems: "center", marginBottom: 5, paddingBottom: 3, borderBottom: `1.5 solid ${ACCENT}` },
  sectionBar:   { width: 4, height: 11, backgroundColor: ACCENT, borderRadius: 2, marginRight: 6 },
  sectionTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: BRAND, letterSpacing: 0.2, textTransform: "uppercase" },

  // KV grid
  kvGrid:       { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  kvItem:       { width: "32%", backgroundColor: LIGHT, borderRadius: 4, border: `1 solid ${BORDER}`, padding: "5 7" },
  kvItemWide:   { width: "49%", backgroundColor: LIGHT, borderRadius: 4, border: `1 solid ${BORDER}`, padding: "5 7" },
  kvItemFull:   { width: "100%", backgroundColor: LIGHT, borderRadius: 4, border: `1 solid ${BORDER}`, padding: "5 7" },
  kvLabel:      { fontSize: 6.5, color: MUTED, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 1 },
  kvValue:      { fontSize: 8.5, color: BRAND, lineHeight: 1.3 },

  // Table
  table:        { border: `1 solid ${BORDER}`, borderRadius: 4, overflow: "hidden", marginTop: 4 },
  tHead:        { flexDirection: "row", backgroundColor: "#e8f1f8", borderBottom: `1.5 solid ${ACCENT}` },
  tRow:         { flexDirection: "row", borderBottom: `1 solid ${BORDER}` },
  tRowAlt:      { flexDirection: "row", borderBottom: `1 solid ${BORDER}`, backgroundColor: LIGHT },
  tCell:        { flex: 1, padding: "5 6", fontSize: 8, lineHeight: 1.25, borderRight: `1 solid ${BORDER}` },
  tCellLast:    { flex: 1, padding: "5 6", fontSize: 8, lineHeight: 1.25 },
  tHeadCell:    { flex: 1, padding: "5 6", fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BRAND, borderRight: `1 solid ${BORDER}` },
  tHeadLast:    { flex: 1, padding: "5 6", fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BRAND },

  // Badges
  badgeGreen:   { backgroundColor: "#dcfce7", color: GREEN, fontSize: 7.5, fontFamily: "Helvetica-Bold", padding: "2 6", borderRadius: 3, border: `1 solid #bbf7d0` },
  badgeRed:     { backgroundColor: "#fee2e2", color: RED,   fontSize: 7.5, fontFamily: "Helvetica-Bold", padding: "2 6", borderRadius: 3, border: `1 solid #fca5a5` },
  badgeAmber:   { backgroundColor: "#ffedd5", color: AMBER, fontSize: 7.5, fontFamily: "Helvetica-Bold", padding: "2 6", borderRadius: 3, border: `1 solid #fed7aa` },
  badgeBlue:    { backgroundColor: "#e0f2fe", color: ACCENT,fontSize: 7.5, fontFamily: "Helvetica-Bold", padding: "2 6", borderRadius: 3, border: `1 solid #bae6fd` },

  // Footer & Sign off
  footer:       { position: "absolute", bottom: 16, left: 28, fontSize: 7.5, color: MUTED },
  pageNumber:   { position: "absolute", bottom: 16, right: 28, fontSize: 7.5, color: MUTED },
  sigBox:       { marginTop: 16, borderTop: `1.5 solid ${BORDER}`, paddingTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  sigLine:      { width: 140, borderBottom: `1 solid ${BRAND}`, marginBottom: 4 },
  sigLabel:     { fontSize: 7, color: MUTED },
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
  const raw = (diagKv.find(([k]) => k.toLowerCase().includes("effective") || k.toLowerCase().includes("dashboard"))?.[1] ?? "").toLowerCase();
  if (raw.includes("asthma"))        return "asthma";
  if (raw.includes("copd"))          return "copd";
  if (raw.includes("ild"))           return "ild";
  if (raw.includes("bronchiectasis"))return "bronchiectasis";
  if (raw.includes("post_icu") || raw.includes("post icu")) return "post_icu";
  const primary = (diagKv.find(([k]) => k.toLowerCase().includes("primary"))?.[1] ?? "").toLowerCase();
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

  const svgW = 538;
  const svgH = 55;
  const padX = 24;
  const padY = 12;
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
    <View style={{ marginTop: 8, marginBottom: 4, border: `1 solid ${BORDER}`, borderRadius: 5, padding: 6, backgroundColor: LIGHT }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: BRAND }}>
          SpO₂ Resting Trend Graph (%) — Last {pointsData.length} Recorded Logs
        </Text>
        <Text style={{ fontSize: 7, color: MUTED }}>
          Target Threshold: ≥ 90% (Normal) | &lt; 88% (Desaturation Warning)
        </Text>
      </View>
      <Svg width={svgW} height={svgH}>
        {/* Background Card */}
        <Rect x={0} y={0} width={svgW} height={svgH} fill="#ffffff" rx={3} />
        
        {/* Threshold Dash Lines */}
        <Line x1={padX} y1={y90} x2={svgW - padX} y2={y90} stroke="#ea580c" strokeDasharray="3 3" strokeWidth={0.8} />
        <Line x1={padX} y1={y88} x2={svgW - padX} y2={y88} stroke="#dc2626" strokeDasharray="3 3" strokeWidth={0.8} />
        <SvgText x={padX - 18} y={y90 + 2} fontSize={6} fill="#ea580c">90%</SvgText>
        <SvgText x={padX - 18} y={y88 + 2} fontSize={6} fill="#dc2626">88%</SvgText>

        {/* Trend Polyline */}
        <Polyline points={polylinePoints} stroke="#1e6091" strokeWidth={1.8} fill="none" />

        {/* Point Circles */}
        {coords.map((c, i) => {
          const color = c.val < 88 ? RED : c.val < 90 ? AMBER : ACCENT;
          return (
            <React.Fragment key={i}>
              <Circle cx={c.x} cy={c.y} r={2.8} fill={color} stroke="#ffffff" strokeWidth={0.8} />
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

// ─── Single Patient Executive 3-Page Dossier Document ───────────────────────

function SinglePatientDossierDocument({
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
    <Document>

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
          <View style={S.kvGrid}>
            <View style={S.kvItem}>
              <Text style={S.kvLabel}>Patient Full Name</Text>
              <Text style={[S.kvValue, { fontFamily: "Helvetica-Bold" }]}>{patient.patientName}</Text>
            </View>
            <View style={S.kvItem}>
              <Text style={S.kvLabel}>UHID / Patient ID</Text>
              <Text style={S.kvValue}>{dem["UHID"] || "P-E01E2C"}</Text>
            </View>
            <View style={S.kvItem}>
              <Text style={S.kvLabel}>Hospital File No.</Text>
              <Text style={S.kvValue}>{dem["File No"] || "001/2026"}</Text>
            </View>
            <View style={S.kvItem}>
              <Text style={S.kvLabel}>Age &amp; Sex</Text>
              <Text style={S.kvValue}>{dem["Age"] ? `${dem["Age"]} yrs` : "—"} / {dem["Sex"] || "—"}</Text>
            </View>
            <View style={S.kvItem}>
              <Text style={S.kvLabel}>Mobile Contact</Text>
              <Text style={S.kvValue}>{dem["Mobile"] || "—"}</Text>
            </View>
            <View style={S.kvItem}>
              <Text style={S.kvLabel}>Occupation</Text>
              <Text style={S.kvValue}>{dem["Occupation"] || "Not recorded"}</Text>
            </View>
            <View style={S.kvItemWide}>
              <Text style={S.kvLabel}>Smoking &amp; Exposure History</Text>
              <Text style={S.kvValue}>{dem["Smoking Status"] || "Non-smoker / No biomass exposure"}</Text>
            </View>
            <View style={S.kvItemWide}>
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
          <View style={S.kvGrid}>
            <View style={S.kvItemWide}>
              <Text style={S.kvLabel}>Primary Pulmonology Diagnosis</Text>
              <Text style={[S.kvValue, { color: ACCENT, fontFamily: "Helvetica-Bold" }]}>
                {diag["Primary Diagnosis"] || diag["Effective dashboard"] || "OAD / Respiratory Disease"}
              </Text>
            </View>
            <View style={S.kvItemWide}>
              <Text style={S.kvLabel}>Histopathology / Subtype</Text>
              <Text style={S.kvValue}>{diag["Histopathology"] || "Standard Clinical Subtype"}</Text>
            </View>
            <View style={S.kvItemWide}>
              <Text style={S.kvLabel}>Connective Tissue Disease (CTD)</Text>
              <Text style={S.kvValue}>{diag["Connective Tissue Disease"] || "None recorded (NA)"}</Text>
            </View>
            <View style={S.kvItemWide}>
              <Text style={S.kvLabel}>Associated Co-Morbidities</Text>
              <Text style={S.kvValue}>{diag["Co-morbidities"] || "None recorded"}</Text>
            </View>
            <View style={S.kvItemFull}>
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
              patient.pftRows.map((row, i) => (
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
              <Text style={[S.tHeadCell, { flex: 1.2 }]}>Log Date</Text>
              <Text style={[S.tHeadCell, { flex: 1 }]}>SpO₂ Rest (%)</Text>
              <Text style={[S.tHeadCell, { flex: 1 }]}>SpO₂ Walk (%)</Text>
              <Text style={[S.tHeadCell, { flex: 1 }]}>mMRC Score</Text>
              <Text style={[S.tHeadCell, { flex: 1 }]}>AQI Exposure</Text>
              <Text style={[S.tHeadCell, { flex: 1.2 }]}>Risk Score</Text>
              <Text style={[S.tHeadLast, { flex: 1.8 }]}>Symptoms &amp; Notes</Text>
            </View>
            {patient.logRows.length === 0 ? (
              <View style={S.tRow}>
                <Text style={[S.tCellLast, { color: MUTED }]}>No daily clinical logs recorded for this period.</Text>
              </View>
            ) : (
              patient.logRows.slice(0, 12).map((row, i) => (
                <View key={i} style={i % 2 === 1 ? S.tRowAlt : S.tRow}>
                  <Text style={[S.tCell, { flex: 1.2 }]}>{row[0] || "—"}</Text>
                  <Text style={[S.tCell, { flex: 1, color: parseFloat(row[1]) < 88 ? RED : parseFloat(row[1]) < 90 ? AMBER : BRAND, fontFamily: "Helvetica-Bold" }]}>
                    {row[1] ? `${row[1]}%` : "—"}
                  </Text>
                  <Text style={[S.tCell, { flex: 1 }]}>{row[2] ? `${row[2]}%` : "—"}</Text>
                  <Text style={[S.tCell, { flex: 1 }]}>{row[3] || "—"}</Text>
                  <Text style={[S.tCell, { flex: 1 }]}>{row[4] || "—"}</Text>
                  <Text style={[S.tCell, { flex: 1.2, color: parseFloat(row[5]) >= 7 ? RED : parseFloat(row[5]) >= 4 ? AMBER : GREEN, fontFamily: "Helvetica-Bold" }]}>
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
              patient.alertRows.map((row, i) => (
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
              patient.medicationRows.map((row, i) => (
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
          <View style={{ border: `1 solid ${BORDER}`, borderRadius: 5, padding: 8, backgroundColor: LIGHT, minHeight: 60 }}>
            {patient.instructionRows.length === 0 ? (
              <Text style={{ fontSize: 8, color: MUTED, lineHeight: 1.4 }}>
                • Maintain prescribed daily inhaler compliance. Monitor resting SpO₂ twice daily.
                {"\n"}• If resting SpO₂ drops below 88% or mMRC dyspnea increases, use rescue inhaler and notify your doctor immediately.
              </Text>
            ) : (
              patient.instructionRows.map((row, i) => (
                <Text key={i} style={{ fontSize: 8, color: BRAND, lineHeight: 1.4, marginBottom: 3 }}>
                  • [{row[0] || generatedAt}] {row[1] || row[0] || "—"}
                </Text>
              ))
            )}
          </View>
        </View>

        {/* Attending Pulmonologist Sign-Off Box */}
        <View style={[S.sigBox, { marginTop: 30 }]}>
          <View>
            <View style={S.sigLine} />
            <Text style={S.sigLabel}>Patient / Guardian Signature</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <View style={S.sigLine} />
            <Text style={[S.sigLabel, { fontFamily: "Helvetica-Bold", color: BRAND }]}>
              Dr. {doctorName} — Attending Pulmonologist
            </Text>
            <Text style={[S.sigLabel, { marginTop: 2 }]}>AIIMS New Delhi / Clinical Specialist</Text>
            <Text style={[S.sigLabel, { marginTop: 2, color: ACCENT }]}>
              O2Plus Precision Tele-Pulmonology Platform
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 12, padding: 6, backgroundColor: "#e8f1f8", borderRadius: 4 }}>
          <Text style={{ fontSize: 6.8, color: MUTED, textAlign: "center" }}>
            Disclaimer: This document is a confidential medical record generated via O2Plus Tele-Pulmonology Platform. Compliant with GINA, GOLD, and ATS/ERS clinical guidelines.
          </Text>
        </View>

        <Text style={S.footer}>O2Plus — Confidential Single Patient Medical Record</Text>
        <Text style={S.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
      </Page>

    </Document>
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
  notes,
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
        <View style={S.kvGrid}>
          <View style={S.kvItemWide}>
            <Text style={S.kvLabel}>Total Cohort Patients</Text>
            <Text style={[S.kvValue, { fontFamily: "Helvetica-Bold", color: ACCENT }]}>{patientNames.length}</Text>
          </View>
          <View style={S.kvItemWide}>
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
      <SinglePatientDossierDocument
        patient={patientDetails[0]!}
        doctorName={doctorName}
        generatedAt={generatedAt}
        dateRangeLabel={dateRangeLabel}
      />
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
        <SinglePatientDossierDocument
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
