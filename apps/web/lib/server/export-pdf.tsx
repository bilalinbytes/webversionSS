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

// ─── Public Types ────────────────────────────────────────────────────────────

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

export interface DynamicSymptomPoint {
  date: string;
  val: number;
}

export interface DynamicSymptomItem {
  symptomName: string;
  points: DynamicSymptomPoint[];
  currentSeverity: number;
  isResolved: boolean;
}

export interface PrescribedMedAdherenceItem {
  drugName: string;
  route: string;
  dose: string;
  frequency: string;
  startDate: string;
  endDate: string;
  status: string;
  daysTaken: number;
  daysPrescribed: number;
  adherencePct: string;
}

export interface MultiPftProgressionItem {
  testDate: string;
  fev1?: number | null;
  fvc?: number | null;
  fev1Pct?: number | null;
  fvcPct?: number | null;
  fev1FvcRatio?: number | null;
  dlco?: number | null;
  sixMwd?: number | null;
  baselineSpo2?: number | null;
  baselineHr?: number | null;
}

export interface DetailedLogItem {
  date: string;
  spo2Rest: number | string;
  spo2Walk: number | string;
  heartRate: number | string;
  mmrc: number | string;
  aqi: number | string;
  vasSymptoms: string;
  diseaseSpecificData?: Record<string, unknown>;
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

  // Enhanced Parity Fields
  adherenceStats?: {
    totalDays: number;
    loggedDays: number;
    pct: string;
  };
  dynamicSymptoms?: DynamicSymptomItem[];
  prescribedMedsWithAdherence?: PrescribedMedAdherenceItem[];
  multiPftsProgression?: MultiPftProgressionItem[];
  detailedLogs?: DetailedLogItem[];
  trackRecords?: {
    ild?: any[];
    asthma?: any[];
    copd?: any[];
    bronch?: any[];
    postIcu?: any[];
  };
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

// ─── Design Tokens (Medical Blue Executive Palette) ─────────────────────────
const BRAND     = "#0f2b48"; // Deep Navy Header
const ACCENT    = "#1e6091"; // Primary Medical Blue
const CYAN      = "#0284c7"; // Cyan Accent
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
  page:         { padding: "18 20 26 20", fontSize: 7.5, color: "#0f172a", fontFamily: "Helvetica", backgroundColor: WHITE },
  
  // Executive Header Band
  headerBand:   { backgroundColor: BRAND, padding: "7 12", marginBottom: 7, borderRadius: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerLeft:   { flexDirection: "row", alignItems: "center", gap: 7 },
  logoBadge:    { backgroundColor: ACCENT, padding: "2.5 5", borderRadius: 3, border: `1 solid ${CYAN}` },
  logoText:     { fontSize: 10, fontFamily: "Helvetica-Bold", color: WHITE, letterSpacing: 0.5 },
  headerTitle:  { fontSize: 11, fontFamily: "Helvetica-Bold", color: WHITE, letterSpacing: 0.2 },
  headerSub:    { fontSize: 7, color: "#93c5fd", marginTop: 1 },
  headerRight:  { alignItems: "flex-end" },
  headerMeta:   { fontSize: 6.5, color: "#cbd5e1" },
  
  // Section Headings
  section:      { marginTop: 5, marginBottom: 3 },
  sectionHead:  { flexDirection: "row", alignItems: "center", marginBottom: 3, paddingBottom: 2, borderBottom: `1.2 solid ${ACCENT}` },
  sectionBar:   { width: 3, height: 8, backgroundColor: ACCENT, borderRadius: 1.5, marginRight: 4 },
  sectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: BRAND, letterSpacing: 0.2, textTransform: "uppercase" },

  // KV Grids
  rowFlex:      { flexDirection: "row", gap: 4, marginBottom: 2.5 },
  kvBox:        { flex: 1, backgroundColor: LIGHT, borderRadius: 3, border: `1 solid ${BORDER}`, padding: "3 4.5" },
  kvLabel:      { fontSize: 5.5, color: MUTED, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 1 },
  kvValue:      { fontSize: 7.5, color: BRAND, lineHeight: 1.15 },

  // Tables
  table:        { border: `1 solid ${BORDER}`, borderRadius: 3, overflow: "hidden", marginTop: 2 },
  tHead:        { flexDirection: "row", backgroundColor: "#e8f1f8", borderBottom: `1.2 solid ${ACCENT}` },
  tRow:         { flexDirection: "row", borderBottom: `1 solid ${BORDER}` },
  tRowAlt:      { flexDirection: "row", borderBottom: `1 solid ${BORDER}`, backgroundColor: LIGHT },
  tCell:        { flex: 1, padding: "3 4", fontSize: 7, lineHeight: 1.15, borderRight: `1 solid ${BORDER}` },
  tCellLast:    { flex: 1, padding: "3 4", fontSize: 7, lineHeight: 1.15 },
  tHeadCell:    { flex: 1, padding: "3 4", fontSize: 6.5, fontFamily: "Helvetica-Bold", color: BRAND, borderRight: `1 solid ${BORDER}` },
  tHeadLast:    { flex: 1, padding: "3 4", fontSize: 6.5, fontFamily: "Helvetica-Bold", color: BRAND },

  // Badges
  badgeGreen:   { backgroundColor: "#dcfce7", color: GREEN, fontSize: 6.5, fontFamily: "Helvetica-Bold", padding: "1.5 4", borderRadius: 2.5, border: `1 solid #bbf7d0` },
  badgeRed:     { backgroundColor: "#fee2e2", color: RED,   fontSize: 6.5, fontFamily: "Helvetica-Bold", padding: "1.5 4", borderRadius: 2.5, border: `1 solid #fca5a5` },
  badgeAmber:   { backgroundColor: "#ffedd5", color: AMBER, fontSize: 6.5, fontFamily: "Helvetica-Bold", padding: "1.5 4", borderRadius: 2.5, border: `1 solid #fed7aa` },
  badgeBlue:    { backgroundColor: "#e0f2fe", color: ACCENT,fontSize: 6.5, fontFamily: "Helvetica-Bold", padding: "1.5 4", borderRadius: 2.5, border: `1 solid #bae6fd` },

  // Footer & Sign-off
  footer:       { position: "absolute", bottom: 10, left: 20, fontSize: 6.5, color: MUTED },
  pageNumber:   { position: "absolute", bottom: 10, right: 20, fontSize: 6.5, color: MUTED },
  sigBox:       { marginTop: 10, borderTop: `1.2 solid ${BORDER}`, paddingTop: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  sigLine:      { width: 120, borderBottom: `1 solid ${BRAND}`, marginBottom: 2.5 },
  sigLabel:     { fontSize: 6, color: MUTED },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dashboardLabel(d: string | null | undefined): string {
  switch ((d ?? "").toLowerCase()) {
    case "asthma":        return "Asthma Surveillance";
    case "copd":          return "COPD Surveillance";
    case "ild":           return "ILD & Fibrosis Surveillance";
    case "bronchiectasis":return "Bronchiectasis Surveillance";
    case "post_icu":      return "Post ICU Recovery Surveillance";
    default:              return "Precision Pulmonology Surveillance";
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
  return "ild";
}

// ─── Reusable SVG Sparkline & Trend Component ───────────────────────────────

interface SparklineProps {
  title: string;
  subtitle?: string;
  points: Array<{ date: string; val: number | null }>;
  minVal?: number;
  maxVal?: number;
  targetLine?: number;
  targetLineColor?: string;
  targetLabel?: string;
  secondaryTargetLine?: number;
  secondaryTargetColor?: string;
  secondaryTargetLabel?: string;
  lineColor?: string;
  fillColor?: string;
  unit?: string;
  width?: number;
  height?: number;
  criticalLowThreshold?: number;
  criticalHighThreshold?: number;
}

function GenericTrendChart({
  title,
  subtitle,
  points,
  minVal = 0,
  maxVal = 100,
  targetLine,
  targetLineColor = AMBER,
  targetLabel,
  secondaryTargetLine,
  secondaryTargetColor = RED,
  secondaryTargetLabel,
  lineColor = ACCENT,
  unit = "",
  width = 264,
  height = 56,
  criticalLowThreshold,
  criticalHighThreshold,
}: SparklineProps) {
  const validPoints = points.filter((p): p is { date: string; val: number } => p.val !== null && !isNaN(p.val));

  if (validPoints.length === 0) {
    return (
      <View style={{ width, height, border: `1 solid ${BORDER}`, borderRadius: 3, padding: 4, backgroundColor: LIGHT, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: BRAND }}>{title}</Text>
        <Text style={{ fontSize: 5.5, color: MUTED, marginTop: 2 }}>No recorded data in this period</Text>
      </View>
    );
  }

  // Calculate dynamic bounds if needed
  const values = validPoints.map((p) => p.val);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const computedMin = minVal !== undefined ? minVal : Math.floor(dataMin * 0.9);
  const computedMax = maxVal !== undefined ? maxVal : Math.ceil(dataMax * 1.1) || 10;
  const range = computedMax - computedMin || 1;

  const padX = 22;
  const padY = 8;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const coords = validPoints.map((p, i) => {
    const x = validPoints.length === 1 ? padX + chartW / 2 : padX + (i / (validPoints.length - 1)) * chartW;
    const clamped = Math.min(computedMax, Math.max(computedMin, p.val));
    const y = height - padY - ((clamped - computedMin) / range) * chartH;
    return { x, y, val: p.val, date: p.date };
  });

  const polylineStr = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

  const targetY = targetLine !== undefined ? height - padY - ((targetLine - computedMin) / range) * chartH : null;
  const secTargetY = secondaryTargetLine !== undefined ? height - padY - ((secondaryTargetLine - computedMin) / range) * chartH : null;

  const latestVal = validPoints[validPoints.length - 1]!.val;

  return (
    <View style={{ width, marginBottom: 4, border: `1 solid ${BORDER}`, borderRadius: 3, padding: "3.5 4", backgroundColor: LIGHT }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
        <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: BRAND }}>
          {title} {unit ? `(${unit})` : ""}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          {subtitle ? <Text style={{ fontSize: 5.5, color: MUTED }}>{subtitle}</Text> : null}
          <Text style={{ fontSize: 6, fontFamily: "Helvetica-Bold", color: lineColor }}>
            Latest: {latestVal} {unit}
          </Text>
        </View>
      </View>

      <Svg width={width - 8} height={height}>
        <Rect x={0} y={0} width={width - 8} height={height} fill="#ffffff" rx={2.5} />

        {/* Target Threshold Dash Lines */}
        {targetY !== null && targetY >= padY && targetY <= height - padY ? (
          <>
            <Line x1={padX} y1={targetY} x2={width - 8 - padX} y2={targetY} stroke={targetLineColor} strokeDasharray="2 2" strokeWidth={0.7} />
            <SvgText x={2} y={targetY + 2} style={{ fontSize: 5, fill: targetLineColor }}>{targetLabel || `${targetLine}`}</SvgText>
          </>
        ) : null}

        {secTargetY !== null && secTargetY >= padY && secTargetY <= height - padY ? (
          <>
            <Line x1={padX} y1={secTargetY} x2={width - 8 - padX} y2={secTargetY} stroke={secondaryTargetColor} strokeDasharray="2 2" strokeWidth={0.7} />
            <SvgText x={2} y={secTargetY + 2} style={{ fontSize: 5, fill: secondaryTargetColor }}>{secondaryTargetLabel || `${secondaryTargetLine}`}</SvgText>
          </>
        ) : null}

        {/* Trend Polyline */}
        {coords.length > 1 ? (
          <Polyline points={polylineStr} stroke={lineColor} strokeWidth={1.5} fill="none" />
        ) : null}

        {/* Data Point Circles */}
        {coords.map((c, i) => {
          let dotColor = lineColor;
          if (criticalLowThreshold !== undefined && c.val < criticalLowThreshold) dotColor = RED;
          else if (criticalHighThreshold !== undefined && c.val > criticalHighThreshold) dotColor = RED;
          else if (targetLine !== undefined && c.val < targetLine) dotColor = AMBER;

          return (
            <React.Fragment key={i}>
              <Circle cx={c.x} cy={c.y} r={2} fill={dotColor} stroke="#ffffff" strokeWidth={0.6} />
            </React.Fragment>
          );
        })}
      </Svg>

      {/* X-Axis Date Range Footnote */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 1 }}>
        <Text style={{ fontSize: 5, color: MUTED }}>{validPoints[0]?.date || ""}</Text>
        <Text style={{ fontSize: 5, color: MUTED }}>{validPoints.length} check-ins</Text>
        <Text style={{ fontSize: 5, color: MUTED }}>{validPoints[validPoints.length - 1]?.date || ""}</Text>
      </View>
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

// ─── Single Patient Comprehensive Clinical Dossier ──────────────────────────

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

  // Extract structured logs for charts
  const logs = patient.detailedLogs || [];
  const aqiPoints = logs.map((l) => ({ date: l.date, val: parseFloat(String(l.aqi)) || null }));
  const spo2RestPoints = logs.map((l) => ({ date: l.date, val: parseFloat(String(l.spo2Rest)) || null }));
  const spo2WalkPoints = logs.map((l) => ({ date: l.date, val: parseFloat(String(l.spo2Walk)) || null }));
  const hrPoints = logs.map((l) => ({ date: l.date, val: parseFloat(String(l.heartRate)) || null }));
  const mmrcPoints = logs.map((l) => ({ date: l.date, val: parseFloat(String(l.mmrc)) || null }));

  const adh = patient.adherenceStats || { totalDays: 30, loggedDays: logs.length, pct: "100%" };
  const adhVal = parseInt(adh.pct, 10) || 0;
  const adhBadgeStyle = adhVal >= 80 ? S.badgeGreen : adhVal >= 50 ? S.badgeAmber : S.badgeRed;

  const dynamicSymptoms = patient.dynamicSymptoms || [];
  const prescribedMeds = patient.prescribedMedsWithAdherence || [];
  const multiPfts = patient.multiPftsProgression || [];

  return (
    <React.Fragment>

      {/* ════════ PAGE 1: DEMOGRAPHICS, CLINICAL PROFILE & ADHERENCE ════════ */}
      <Page size="A4" style={S.page}>
        <ExecutiveHeader
          title={`Clinical Dossier — ${patient.patientName}`}
          subtitle={`${dashboardLabel(dashboard)} · Reporting Period: ${dateRangeLabel}`}
          uhid={dem["UHID"]}
          fileNo={dem["File No"]}
          generatedAt={generatedAt}
          doctorName={doctorName}
        />

        {/* Section 1: Demographics */}
        <View style={S.section}>
          <View style={S.sectionHead}>
            <View style={S.sectionBar} />
            <Text style={S.sectionTitle}>1. Patient Demographics &amp; Registration Profile</Text>
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
            <View style={S.kvBox}>
              <Text style={S.kvLabel}>Age &amp; Sex</Text>
              <Text style={S.kvValue}>{dem["Age"] ? `${dem["Age"]} yrs` : "—"} / {dem["Sex"] || "—"}</Text>
            </View>
          </View>

          <View style={S.rowFlex}>
            <View style={S.kvBox}>
              <Text style={S.kvLabel}>Mobile Number</Text>
              <Text style={S.kvValue}>{dem["Mobile"] || "—"}</Text>
            </View>
            <View style={S.kvBox}>
              <Text style={S.kvLabel}>Occupation</Text>
              <Text style={S.kvValue}>{dem["Occupation"] || "Not recorded"}</Text>
            </View>
            <View style={[S.kvBox, { flex: 1.2 }]}>
              <Text style={S.kvLabel}>Smoking &amp; Biomass Exposure</Text>
              <Text style={S.kvValue}>{dem["Smoking Status"] || "Non-smoker / No biomass exposure"}</Text>
            </View>
            <View style={S.kvBox}>
              <Text style={S.kvLabel}>Enrollment Date</Text>
              <Text style={S.kvValue}>{dem["Enrollment Date"] || generatedAt}</Text>
            </View>
          </View>
        </View>

        {/* Section 2: Complete Primary Diagnosis & Co-morbidities */}
        <View style={S.section}>
          <View style={S.sectionHead}>
            <View style={S.sectionBar} />
            <Text style={S.sectionTitle}>2. Complete Pulmonology Diagnosis &amp; Clinical Baseline</Text>
          </View>
          
          <View style={S.rowFlex}>
            <View style={[S.kvBox, { flex: 1.5 }]}>
              <Text style={S.kvLabel}>Primary Pulmonology Diagnosis</Text>
              <Text style={[S.kvValue, { color: ACCENT, fontFamily: "Helvetica-Bold" }]}>
                {diag["Primary Diagnosis"] || "OAD / Respiratory Disease"}
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
            <View style={[S.kvBox, { flex: 1.5 }]}>
              <Text style={S.kvLabel}>Associated Co-Morbidities</Text>
              <Text style={S.kvValue}>{diag["Co-morbidities"] || "None recorded"}</Text>
            </View>
          </View>

          <View style={S.rowFlex}>
            <View style={S.kvBox}>
              <Text style={S.kvLabel}>Baseline Heart Rate</Text>
              <Text style={S.kvValue}>{dem["Baseline HR"] || "78 BPM (Resting)"}</Text>
            </View>
            <View style={S.kvBox}>
              <Text style={S.kvLabel}>Baseline SpO₂</Text>
              <Text style={S.kvValue}>{dem["Baseline SpO2"] || "96% (Ambient Air)"}</Text>
            </View>
            <View style={[S.kvBox, { flex: 1.5 }]}>
              <Text style={S.kvLabel}>Respiratory Support Plan</Text>
              <Text style={S.kvValue}>{diag["Respiratory Support"] || "Ambient Air (No LTOT / BiPAP required)"}</Text>
            </View>
          </View>
        </View>

        {/* Section 3: App Log Adherence & Engagement in Selected Duration */}
        <View style={S.section}>
          <View style={S.sectionHead}>
            <View style={S.sectionBar} />
            <Text style={S.sectionTitle}>3. App Log Adherence &amp; Tele-Monitoring Engagement</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 5, backgroundColor: "#f0fdf4", border: `1 solid #bbf7d0`, borderRadius: 3, padding: "5 7", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BRAND }}>
                Reporting Window: {dateRangeLabel} ({adh.totalDays} Total Calendar Days)
              </Text>
              <Text style={{ fontSize: 6.5, color: MUTED, marginTop: 1 }}>
                Patient submitted {adh.loggedDays} daily surveillance logs ({adh.pct} reporting compliance)
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 6.5, color: MUTED }}>Adherence Status:</Text>
              <Text style={adhBadgeStyle}>{adh.pct} ({adhVal >= 80 ? "Excellent" : adhVal >= 50 ? "Moderate" : "Low Compliance"})</Text>
            </View>
          </View>
        </View>

        {/* Section 4: Baseline Spirometry & PFT Summary */}
        <View style={S.section}>
          <View style={S.sectionHead}>
            <View style={S.sectionBar} />
            <Text style={S.sectionTitle}>4. Baseline Pulmonary Function Tests (PFT) &amp; 6MWT</Text>
          </View>
          <View style={S.table}>
            <View style={S.tHead}>
              <Text style={[S.tHeadCell, { flex: 1.2 }]}>Test Date</Text>
              <Text style={[S.tHeadCell, { flex: 1 }]}>FEV1/FVC (%)</Text>
              <Text style={[S.tHeadCell, { flex: 1 }]}>FEV1 (L)</Text>
              <Text style={[S.tHeadCell, { flex: 1 }]}>FVC (L)</Text>
              <Text style={[S.tHeadCell, { flex: 1 }]}>DLCO (%)</Text>
              <Text style={[S.tHeadLast, { flex: 2.2 }]}>6MWD &amp; Predicted Metrics</Text>
            </View>
            {patient.pftRows.length === 0 ? (
              <View style={S.tRow}>
                <Text style={[S.tCellLast, { color: MUTED }]}>No baseline PFT tests recorded.</Text>
              </View>
            ) : (
              patient.pftRows.slice(0, 3).map((row, i) => (
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

        <Text style={S.footer}>O2Plus — Confidential Clinical Dossier</Text>
        <Text style={S.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
      </Page>

      {/* ════════ PAGE 2: CORE VITALS & DYNAMIC SYMPTOMS SURVEILLANCE ════════ */}
      <Page size="A4" style={S.page}>
        <ExecutiveHeader
          title={`Vitals & Symptom Surveillance Graphs — ${patient.patientName}`}
          subtitle={`${dashboardLabel(dashboard)} · Period: ${dateRangeLabel}`}
          uhid={dem["UHID"]}
          fileNo={dem["File No"]}
          generatedAt={generatedAt}
          doctorName={doctorName}
        />

        {/* Section 5: Core Vitals & AQI Graphs (Points 1–5) */}
        <View style={S.section}>
          <View style={S.sectionHead}>
            <View style={S.sectionBar} />
            <Text style={S.sectionTitle}>5. Core Longitudinal Vitals &amp; Environmental AQI Graphs</Text>
          </View>

          {/* Row 1: SpO2 Rest & Heart Rate */}
          <View style={{ flexDirection: "row", gap: 6 }}>
            <GenericTrendChart
              title="1. SpO₂ at Rest"
              subtitle="Target: ≥90%"
              points={spo2RestPoints}
              minVal={75}
              maxVal={100}
              targetLine={90}
              targetLineColor={AMBER}
              targetLabel="90%"
              secondaryTargetLine={88}
              secondaryTargetColor={RED}
              secondaryTargetLabel="88%"
              lineColor={ACCENT}
              criticalLowThreshold={88}
              unit="%"
              width={264}
              height={52}
            />
            <GenericTrendChart
              title="2. Heart Rate (Resting Pulse)"
              subtitle="Normal: 60-100 BPM"
              points={hrPoints}
              minVal={45}
              maxVal={130}
              targetLine={100}
              targetLineColor={AMBER}
              targetLabel="100"
              secondaryTargetLine={60}
              secondaryTargetColor={CYAN}
              secondaryTargetLabel="60"
              lineColor="#0284c7"
              unit="BPM"
              width={264}
              height={52}
            />
          </View>

          {/* Row 2: SpO2 Exertion & AQI */}
          <View style={{ flexDirection: "row", gap: 6 }}>
            <GenericTrendChart
              title="3. SpO₂ After Walking / Exertion"
              subtitle="Desaturation Alert: <88%"
              points={spo2WalkPoints}
              minVal={75}
              maxVal={100}
              targetLine={88}
              targetLineColor={RED}
              targetLabel="88%"
              lineColor="#7c3aed"
              criticalLowThreshold={88}
              unit="%"
              width={264}
              height={52}
            />
            <GenericTrendChart
              title="4. Live Air Quality Index (AQI)"
              subtitle="Good: ≤50 | Mod: ≤100"
              points={aqiPoints}
              minVal={0}
              maxVal={300}
              targetLine={100}
              targetLineColor={AMBER}
              targetLabel="100"
              secondaryTargetLine={150}
              secondaryTargetColor={RED}
              secondaryTargetLabel="150"
              lineColor="#ea580c"
              unit="AQI"
              width={264}
              height={52}
            />
          </View>

          {/* Row 3: mMRC Dyspnoea Scale */}
          <View style={{ flexDirection: "row", gap: 6 }}>
            <GenericTrendChart
              title="5. mMRC Dyspnoea Breathlessness Grade (0–4)"
              subtitle="Grade 0 (None) to Grade 4 (Severe)"
              points={mmrcPoints}
              minVal={0}
              maxVal={4}
              targetLine={2}
              targetLineColor={AMBER}
              targetLabel="Gr 2"
              lineColor="#059669"
              unit="Grade"
              width={534}
              height={46}
            />
          </View>
        </View>

        {/* Section 6: Dynamic Symptoms Graphs (Point 6 with Zero-Drop Rule) */}
        <View style={S.section}>
          <View style={S.sectionHead}>
            <View style={S.sectionBar} />
            <Text style={S.sectionTitle}>
              6. Dynamic Symptoms Severity Surveillance ({dynamicSymptoms.length} Reported Symptoms)
            </Text>
          </View>
          {dynamicSymptoms.length === 0 ? (
            <View style={{ padding: 6, border: `1 solid ${BORDER}`, borderRadius: 3, backgroundColor: LIGHT }}>
              <Text style={{ fontSize: 7, color: GREEN, fontFamily: "Helvetica-Bold" }}>
                ✓ No acute exacerbation symptoms (cough, wheezing, chest pain, fatigue) reported during this period.
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {dynamicSymptoms.slice(0, 6).map((sym) => (
                <GenericTrendChart
                  key={sym.symptomName}
                  title={`Symptom: ${sym.symptomName}`}
                  subtitle={sym.isResolved ? "Resolved (0/10)" : `Active (${sym.currentSeverity}/10)`}
                  points={sym.points}
                  minVal={0}
                  maxVal={10}
                  targetLine={5}
                  targetLineColor={AMBER}
                  targetLabel="5"
                  lineColor={sym.isResolved ? GREEN : RED}
                  unit="VAS"
                  width={264}
                  height={46}
                />
              ))}
            </View>
          )}
        </View>

        <Text style={S.footer}>O2Plus — Confidential Clinical Dossier</Text>
        <Text style={S.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
      </Page>

      {/* ════════ PAGE 3: MEDICATIONS ADHERENCE, PFT PROGRESSION & DISEASE TRACK ════════ */}
      <Page size="A4" style={S.page}>
        <ExecutiveHeader
          title={`Medications, PFT Progression & Track Metrics — ${patient.patientName}`}
          subtitle={`${dashboardLabel(dashboard)} · Attending: Dr. ${doctorName}`}
          uhid={dem["UHID"]}
          fileNo={dem["File No"]}
          generatedAt={generatedAt}
          doctorName={doctorName}
        />

        {/* Section 7: Medications Prescribed in Selected Duration & Adherence (Point 7) */}
        <View style={S.section}>
          <View style={S.sectionHead}>
            <View style={S.sectionBar} />
            <Text style={S.sectionTitle}>7. Medications Prescribed by Doctor &amp; Days Taken Adherence</Text>
          </View>
          <View style={S.table}>
            <View style={S.tHead}>
              <Text style={[S.tHeadCell, { flex: 0.3 }]}>#</Text>
              <Text style={[S.tHeadCell, { flex: 2 }]}>Medication (Drug Name)</Text>
              <Text style={[S.tHeadCell, { flex: 0.9 }]}>Route</Text>
              <Text style={[S.tHeadCell, { flex: 0.9 }]}>Dose / Freq</Text>
              <Text style={[S.tHeadCell, { flex: 1.1 }]}>Prescribed Period</Text>
              <Text style={[S.tHeadCell, { flex: 0.9 }]}>Status</Text>
              <Text style={[S.tHeadLast, { flex: 1.2 }]}>Days Taken (Adherence)</Text>
            </View>
            {prescribedMeds.length === 0 ? (
              <View style={S.tRow}>
                <Text style={[S.tCellLast, { color: MUTED }]}>No prescriptions recorded for this period.</Text>
              </View>
            ) : (
              prescribedMeds.slice(0, 6).map((med, i) => (
                <View key={i} style={i % 2 === 1 ? S.tRowAlt : S.tRow}>
                  <Text style={[S.tCell, { flex: 0.3, fontFamily: "Helvetica-Bold" }]}>{i + 1}.</Text>
                  <Text style={[S.tCell, { flex: 2, fontFamily: "Helvetica-Bold", color: ACCENT }]}>{med.drugName}</Text>
                  <Text style={[S.tCell, { flex: 0.9 }]}>{med.route}</Text>
                  <Text style={[S.tCell, { flex: 0.9 }]}>{med.dose} · {med.frequency}</Text>
                  <Text style={[S.tCell, { flex: 1.1 }]}>{med.startDate} → {med.endDate}</Text>
                  <Text style={[S.tCell, { flex: 0.9, color: med.status === "Active" ? GREEN : RED, fontFamily: "Helvetica-Bold" }]}>
                    {med.status}
                  </Text>
                  <Text style={[S.tCellLast, { flex: 1.2, fontFamily: "Helvetica-Bold", color: parseInt(med.adherencePct, 10) >= 80 ? GREEN : AMBER }]}>
                    {med.daysTaken}/{med.daysPrescribed} days ({med.adherencePct})
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Section 8: Longitudinal PFT Progression (Point 8) */}
        <View style={S.section}>
          <View style={S.sectionHead}>
            <View style={S.sectionBar} />
            <Text style={S.sectionTitle}>8. Longitudinal PFT &amp; Spirometry Progression Curves</Text>
          </View>
          {multiPfts.length > 1 ? (
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              <GenericTrendChart
                title="FEV1 (Liters) Progression"
                points={multiPfts.map((p) => ({ date: p.testDate, val: p.fev1 ?? null }))}
                minVal={0.5}
                maxVal={4.5}
                lineColor={ACCENT}
                unit="L"
                width={264}
                height={46}
              />
              <GenericTrendChart
                title="FVC (Liters) Progression"
                points={multiPfts.map((p) => ({ date: p.testDate, val: p.fvc ?? null }))}
                minVal={0.5}
                maxVal={5.5}
                lineColor={CYAN}
                unit="L"
                width={264}
                height={46}
              />
              <GenericTrendChart
                title="FEV1/FVC Ratio (%)"
                points={multiPfts.map((p) => ({ date: p.testDate, val: p.fev1FvcRatio ?? null }))}
                minVal={40}
                maxVal={100}
                targetLine={70}
                targetLabel="70%"
                lineColor={AMBER}
                unit="%"
                width={264}
                height={46}
              />
              <GenericTrendChart
                title="6-Minute Walk Distance (6MWD)"
                points={multiPfts.map((p) => ({ date: p.testDate, val: p.sixMwd ?? null }))}
                minVal={100}
                maxVal={700}
                lineColor={GREEN}
                unit="m"
                width={264}
                height={46}
              />
            </View>
          ) : (
            <View style={{ padding: 4, border: `1 solid ${BORDER}`, borderRadius: 3, backgroundColor: LIGHT }}>
              <Text style={{ fontSize: 6.5, color: MUTED }}>
                Single Baseline Assessment Recorded ({multiPfts[0]?.testDate || "Baseline"}): FEV1 {multiPfts[0]?.fev1 || "—"}L | FVC {multiPfts[0]?.fvc || "—"}L | FEV1/FVC {multiPfts[0]?.fev1FvcRatio || "—"}% | DLCO {multiPfts[0]?.dlco || "—"}% | 6MWD {multiPfts[0]?.sixMwd || "—"}m. Subsequent PFT check-ups will plot progression curves.
              </Text>
            </View>
          )}
        </View>

        {/* Section 9: Disease-Specific Track Metrics (Point 9) */}
        <View style={S.section}>
          <View style={S.sectionHead}>
            <View style={S.sectionBar} />
            <Text style={S.sectionTitle}>
              9. Disease Track Metrics: {dashboardLabel(dashboard)}
            </Text>
          </View>

          {/* ILD Track: K-BILD Total Score Trend */}
          {dashboard === "ild" ? (
            <View style={{ flexDirection: "row", gap: 6 }}>
              <GenericTrendChart
                title="K-BILD Total Score (Sum of All Question Responses)"
                subtitle="Scale: 0-100 (Higher is Better)"
                points={logs.map((l) => ({ date: l.date, val: parseFloat(String(l.diseaseSpecificData?.kbild_score ?? l.diseaseSpecificData?.kbild_total ?? "")) || null }))}
                minVal={0}
                maxVal={100}
                targetLine={50}
                targetLineColor={AMBER}
                targetLabel="50"
                lineColor="#0284c7"
                unit="/100"
                width={534}
                height={48}
              />
            </View>
          ) : null}

          {/* Asthma Track: Asthma Control Questionnaire & Interpretation */}
          {dashboard === "asthma" ? (
            <View style={{ flexDirection: "row", gap: 6 }}>
              <GenericTrendChart
                title="PEFR (Peak Expiratory Flow Rate) Trend"
                subtitle="Personal Best Target Reference"
                points={logs.map((l) => ({ date: l.date, val: parseFloat(String(l.diseaseSpecificData?.pefr_reading ?? l.diseaseSpecificData?.pefr_lpm ?? "")) || null }))}
                minVal={100}
                maxVal={600}
                lineColor={GREEN}
                unit="L/min"
                width={264}
                height={48}
              />
              <GenericTrendChart
                title="Rescue Inhaler Puffs per Day"
                subtitle="Target: 0 puffs/day"
                points={logs.map((l) => ({ date: l.date, val: parseFloat(String(l.diseaseSpecificData?.rescue_inhaler_puffs ?? l.diseaseSpecificData?.rescue_puffs_count ?? "")) || null }))}
                minVal={0}
                maxVal={10}
                targetLine={2}
                targetLineColor={RED}
                targetLabel="2 puffs"
                lineColor={RED}
                unit="puffs"
                width={264}
                height={48}
              />
            </View>
          ) : null}

          {/* COPD Track: Cough Frequency, Sputum, Energy, Chest Heaviness */}
          {dashboard === "copd" ? (
            <View style={{ flexDirection: "row", gap: 6 }}>
              <GenericTrendChart
                title="Energy Level (0-10 Scale)"
                subtitle="Higher is Better"
                points={logs.map((l) => ({ date: l.date, val: parseFloat(String(l.diseaseSpecificData?.energy_level ?? "")) || null }))}
                minVal={0}
                maxVal={10}
                lineColor={GREEN}
                unit="/10"
                width={264}
                height={48}
              />
              <GenericTrendChart
                title="Chest Heaviness (0-10 Scale)"
                subtitle="Lower is Better"
                points={logs.map((l) => ({ date: l.date, val: parseFloat(String(l.diseaseSpecificData?.chest_heaviness ?? "")) || null }))}
                minVal={0}
                maxVal={10}
                targetLine={5}
                targetLineColor={AMBER}
                targetLabel="5"
                lineColor={AMBER}
                unit="/10"
                width={264}
                height={48}
              />
            </View>
          ) : null}

          {/* Bronchiectasis & Post-ICU: Sputum Clearance, Temperature */}
          {dashboard === "bronchiectasis" || dashboard === "post_icu" ? (
            <View style={{ flexDirection: "row", gap: 6 }}>
              <GenericTrendChart
                title="Ease of Sputum Clearance (1-5 Scale)"
                subtitle="1 (Difficult) to 5 (Easy)"
                points={logs.map((l) => ({ date: l.date, val: parseFloat(String(l.diseaseSpecificData?.ease_of_clearance ?? l.diseaseSpecificData?.ease_of_sputum_clearance ?? "")) || null }))}
                minVal={1}
                maxVal={5}
                lineColor={CYAN}
                unit="/5"
                width={264}
                height={48}
              />
              <GenericTrendChart
                title="Recorded Temperature (°F)"
                subtitle="Fever Threshold: ≥100.4°F"
                points={logs.map((l) => ({ date: l.date, val: parseFloat(String(l.diseaseSpecificData?.recorded_temperature_f ?? l.diseaseSpecificData?.temperature_f ?? "")) || null }))}
                minVal={96}
                maxVal={104}
                targetLine={100.4}
                targetLineColor={RED}
                targetLabel="100.4°F"
                lineColor={RED}
                unit="°F"
                width={264}
                height={48}
              />
            </View>
          ) : null}
        </View>

        {/* Section 10: Doctor Instructions & Official Verification */}
        <View style={S.section}>
          <View style={S.sectionHead}>
            <View style={S.sectionBar} />
            <Text style={S.sectionTitle}>10. Attending Pulmonologist Action Plan &amp; Sign-off</Text>
          </View>
          <View style={{ border: `1 solid ${BORDER}`, borderRadius: 3, padding: "4 6", backgroundColor: LIGHT }}>
            {patient.instructionRows.length === 0 ? (
              <Text style={{ fontSize: 6.5, color: BRAND, lineHeight: 1.3 }}>
                • Maintain strict inhaler compliance as prescribed above. Continue daily resting SpO₂ &amp; pulse monitoring.
                {"\n"}• If resting SpO₂ drops below 88% or mMRC dyspnea increases, use prescribed rescue reliever and alert doctor immediately.
              </Text>
            ) : (
              patient.instructionRows.slice(0, 3).map((row, i) => (
                <Text key={i} style={{ fontSize: 6.5, color: BRAND, lineHeight: 1.3, marginBottom: 1.5 }}>
                  • [{row[0] || generatedAt}] {row[1] || row[0] || "—"}
                </Text>
              ))
            )}
          </View>
        </View>

        {/* Official Sign-off Box */}
        <View style={S.sigBox}>
          <View>
            <View style={S.sigLine} />
            <Text style={S.sigLabel}>Patient / Guardian Signature</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <View style={S.sigLine} />
            <Text style={[S.sigLabel, { fontFamily: "Helvetica-Bold", color: BRAND }]}>
              Dr. {doctorName} — Attending Pulmonologist
            </Text>
            <Text style={[S.sigLabel, { marginTop: 1, color: ACCENT }]}>
              O2Plus Precision Tele-Pulmonology Platform
            </Text>
          </View>
        </View>

        <Text style={S.footer}>O2Plus — Confidential Clinical Dossier</Text>
        <Text style={S.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
      </Page>

    </React.Fragment>
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
        title="O2Plus Cohort Clinical Registry"
        subtitle={`Export Type: ${exportType} · Reporting Period: ${dateRangeLabel}`}
        generatedAt={generatedAt}
        doctorName={doctorName}
      />

      <View style={S.section}>
        <View style={S.sectionHead}>
          <View style={S.sectionBar} />
          <Text style={S.sectionTitle}>Cohort Coverage</Text>
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
          <Text style={S.sectionTitle}>Risk Triage &amp; Surveillance Status</Text>
        </View>
        <View style={S.table}>
          <View style={S.tHead}>
            <Text style={[S.tHeadCell, { flex: 1.5 }]}>Patient Name</Text>
            <Text style={[S.tHeadCell, { flex: 2 }]}>Diagnosis</Text>
            <Text style={[S.tHeadCell, { flex: 1 }]}>Risk Level</Text>
            <Text style={[S.tHeadCell, { flex: 0.8 }]}>Score</Text>
            <Text style={[S.tHeadLast, { flex: 1.2 }]}>Alert Status</Text>
          </View>
          {summaryRows.map((r, i) => (
            <View key={i} style={i % 2 === 1 ? S.tRowAlt : S.tRow}>
              <Text style={[S.tCell, { flex: 1.5, fontFamily: "Helvetica-Bold" }]}>{r.patientName}</Text>
              <Text style={[S.tCell, { flex: 2 }]}>{r.diagnosis}</Text>
              <Text style={[S.tCell, { flex: 1, color: r.riskLevel === "Critical" ? RED : r.riskLevel === "High" ? AMBER : GREEN, fontFamily: "Helvetica-Bold" }]}>
                {r.riskLevel}
              </Text>
              <Text style={[S.tCell, { flex: 0.8 }]}>{r.score}</Text>
              <Text style={[S.tCellLast, { flex: 1.2 }]}>{r.alert}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={S.section}>
        <View style={S.sectionHead}>
          <View style={S.sectionBar} />
          <Text style={S.sectionTitle}>Medication Compliance Summary</Text>
        </View>
        <View style={S.table}>
          <View style={S.tHead}>
            <Text style={[S.tHeadCell, { flex: 2 }]}>Patient Name</Text>
            <Text style={[S.tHeadLast, { flex: 1.5 }]}>Adherence Rate</Text>
          </View>
          {medicationRows.map((r, i) => (
            <View key={i} style={i % 2 === 1 ? S.tRowAlt : S.tRow}>
              <Text style={[S.tCell, { flex: 2, fontFamily: "Helvetica-Bold" }]}>{r.patientName}</Text>
              <Text style={[S.tCellLast, { flex: 1.5 }]}>{r.rateLabel}</Text>
            </View>
          ))}
        </View>
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
