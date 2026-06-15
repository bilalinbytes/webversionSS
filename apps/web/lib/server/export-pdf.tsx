import React from "react";
import {
  type DocumentProps,
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

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

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    color: "#17212b",
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 20,
    marginBottom: 8,
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 10,
    marginBottom: 2,
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
  },
  card: {
    border: "1 solid #d5dde5",
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  patientList: {
    marginTop: 4,
    lineHeight: 1.5,
  },
  table: {
    border: "1 solid #d5dde5",
    borderRadius: 6,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
  },
  tableHeader: {
    backgroundColor: "#edf3f7",
    fontWeight: 700,
  },
  cell: {
    flex: 1,
    padding: 6,
    borderRight: "1 solid #d5dde5",
    borderBottom: "1 solid #d5dde5",
  },
  lastCell: {
    borderRight: 0,
  },
  note: {
    marginBottom: 4,
    lineHeight: 1.4,
  },
  kvGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  kvItem: {
    width: "48%",
    marginBottom: 4,
  },
  kvLabel: {
    fontSize: 8,
    color: "#607080",
    marginBottom: 1,
  },
  kvValue: {
    fontSize: 9,
    lineHeight: 1.3,
  },
  smallSectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginTop: 8,
    marginBottom: 5,
  },
});

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.tableHeader]}>
        {headers.map((header, index) => (
          <Text
            key={header}
            style={index === headers.length - 1 ? [styles.cell, styles.lastCell] : styles.cell}
          >
            {header}
          </Text>
        ))}
      </View>
      {rows.length === 0 ? (
        <View style={styles.tableRow}>
          <Text style={[styles.cell, styles.lastCell]}>
            No rows available for this export.
          </Text>
        </View>
      ) : (
        rows.map((row, rowIndex) => (
          <View key={`${row.join("-")}-${rowIndex}`} style={styles.tableRow}>
            {row.map((value, index) => (
              <Text
                key={`${value}-${index}`}
                style={index === row.length - 1 ? [styles.cell, styles.lastCell] : styles.cell}
              >
                {value}
              </Text>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

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
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>O2Plus Clinical Export</Text>
        <Text style={styles.subtitle}>Export type: {exportType}</Text>
        <Text style={styles.subtitle}>Doctor: {doctorName}</Text>
        <Text style={styles.subtitle}>Generated at: {generatedAt}</Text>
        <Text style={styles.subtitle}>Date range: {dateRangeLabel}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Coverage</Text>
          <View style={styles.card}>
            <Text>Total patients included: {patientNames.length}</Text>
            <Text style={styles.patientList}>
              {patientNames.length > 0
                ? patientNames.join(", ")
                : "No patients matched the selected filters."}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Red Flag Summary</Text>
          <Table
            headers={["Patient", "Diagnosis", "Risk", "Score", "Alert"]}
            rows={summaryRows.map((row) => [
              row.patientName,
              row.diagnosis,
              row.riskLevel,
              row.score,
              row.alert,
            ])}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medication Compliance</Text>
          <Table
            headers={["Patient", "Taken", "Total", "Compliance"]}
            rows={medicationRows.map((row) => [
              row.patientName,
              String(row.taken),
              String(row.total),
              row.rateLabel,
            ])}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operational Notes</Text>
          <View style={styles.card}>
            {notes.map((note) => (
              <Text key={note} style={styles.note}>
                - {note}
              </Text>
            ))}
          </View>
        </View>
      </Page>
      {patientDetails.map((patient) => (
        <Page key={patient.patientName} size="A4" style={styles.page}>
          <Text style={styles.title}>{patient.patientName}</Text>
          <Text style={styles.subtitle}>Complete patient record</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Patient Information</Text>
            <View style={[styles.card, styles.kvGrid]}>
              {patient.demographics.map(([label, value]) => (
                <View key={label} style={styles.kvItem}>
                  <Text style={styles.kvLabel}>{label}</Text>
                  <Text style={styles.kvValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diagnosis</Text>
            <View style={[styles.card, styles.kvGrid]}>
              {patient.diagnosis.map(([label, value]) => (
                <View key={label} style={styles.kvItem}>
                  <Text style={styles.kvLabel}>{label}</Text>
                  <Text style={styles.kvValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Respiratory Support</Text>
            <View style={[styles.card, styles.kvGrid]}>
              {patient.respiratorySupport.map(([label, value]) => (
                <View key={label} style={styles.kvItem}>
                  <Text style={styles.kvLabel}>{label}</Text>
                  <Text style={styles.kvValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PFT History</Text>
            <Table
              headers={["Date", "FEV1/FVC", "FEV1", "FVC", "DLCO", "Other fields"]}
              rows={patient.pftRows}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medication / Prescription History</Text>
            <Table
              headers={["Drug", "Route", "Dose", "Frequency", "Start", "End"]}
              rows={patient.medicationRows}
            />
          </View>
        </Page>
      ))}

      {patientDetails.map((patient) => (
        <Page key={`${patient.patientName}-activity`} size="A4" style={styles.page}>
          <Text style={styles.title}>{patient.patientName}</Text>
          <Text style={styles.subtitle}>Logs, alerts, and doctor instructions</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Logs</Text>
            <Table
              headers={["Date", "SpO2 Rest", "SpO2 Walk", "mMRC", "AQI", "Symptoms"]}
              rows={patient.logRows}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alerts / Red Flags</Text>
            <Table
              headers={["Date", "Type", "Severity", "Message"]}
              rows={patient.alertRows}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Doctor Instructions</Text>
            <Table
              headers={["Date", "Instruction", "Read by patient"]}
              rows={patient.instructionRows}
            />
          </View>
        </Page>
      ))}
    </Document>
  );
}
