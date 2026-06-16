import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/server/supabase-admin";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/admin-auth";

export const runtime = "nodejs";

function isAdminAuthorized(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`));
  return verifyAdminToken(match?.[1]);
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "n/a";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Prefix phone numbers with ' so Excel renders them as text not scientific notation */
function safePhone(value: unknown): string {
  const s = displayValue(value);
  if (s === "n/a") return s;
  const digits = s.replace(/\D/g, "");
  return digits.length > 0 ? `'${digits}` : s;
}

function csvCell(value: unknown): string {
  const text = displayValue(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function htmlEscape(value: unknown): string {
  return displayValue(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function rowsToExcelHtml(rows: string[][]): string {
  // First row of each table section is the header row (immediately after a blank or start)
  let prevWasBlank = true;

  const tableRows = rows.map((row) => {
    if (row.length === 0) {
      prevWasBlank = true;
      return `<tr><td style="padding:5px;border:none">&nbsp;</td></tr>`;
    }

    const isHeader = prevWasBlank;
    prevWasBlank = false;

    if (isHeader) {
      const cells = row.map(
        (cell) => `<td style="background:#1a3a4a;color:#ffffff;font-family:Calibri,Arial,sans-serif;font-size:10pt;font-weight:bold;padding:7px 10px;border:1px solid #0d2535;white-space:nowrap">${htmlEscape(cell)}</td>`
      ).join("");
      return `<tr>${cells}</tr>`;
    }

    const cells = row.map(
      (cell) => `<td style="font-family:Calibri,Arial,sans-serif;font-size:10pt;color:#1a1a1a;padding:5px 10px;border:1px solid #d0dde2;vertical-align:top">${htmlEscape(cell)}</td>`
    ).join("");
    return `<tr>${cells}</tr>`;
  });

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; margin: 0; }
    table { border-collapse: collapse; width: 100%; }
    tr:nth-child(even) td[style*="color:#1a1a1a"] { background-color: #f4f8fa; }
    tr:nth-child(odd)  td[style*="color:#1a1a1a"] { background-color: #ffffff; }
  </style>
</head>
<body>
<table>${tableRows.join("\n")}</table>
</body>
</html>`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "n/a";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format    = searchParams.get("format") ?? "csv";
  const scope     = searchParams.get("scope")  ?? "patients";

  const admin     = createAdminClient();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  // ── Doctors export ──────────────────────────────────────────────────────────
  if (scope === "doctors") {
    const { data: doctors } = await admin
      .from("doctors")
      .select("id, name, email, hospital, specialisation, created_at")
      .order("created_at", { ascending: false });

    const { data: patientCounts } = await admin
      .from("patients")
      .select("doctor_id");

    const countMap = new Map<string, number>();
    for (const p of patientCounts ?? []) {
      if (p.doctor_id)
        countMap.set(p.doctor_id, (countMap.get(p.doctor_id) ?? 0) + 1);
    }

    const rows: string[][] = [
      ["Doctor ID", "Name", "Email", "Hospital", "Specialisation", "Patient Count", "Date of Enrollment"],
    ];
    for (const d of doctors ?? []) {
      rows.push([
        d.id,
        d.name,
        d.email ?? "n/a",
        d.hospital,
        d.specialisation,
        String(countMap.get(d.id) ?? 0),
        formatDate(d.created_at),
      ]);
    }

    if (format === "excel") {
      return new NextResponse(rowsToExcelHtml(rows), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.ms-excel",
          "Content-Disposition": `attachment; filename="admin-doctors-${timestamp}.xls"`,
        },
      });
    }

    return new NextResponse("\uFEFF" + rowsToCsv(rows), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="admin-doctors-${timestamp}.csv"`,
      },
    });
  }

  // ── Patients export (default) ───────────────────────────────────────────────
  const { data: patients } = await admin
    .from("patients")
    .select(`
      id, name, mobile_number, gender, date_of_birth, created_at, doctor_id,
      patient_diagnoses ( primary_diagnosis, effective_dashboard )
    `)
    .order("created_at", { ascending: false });

  const { data: doctors } = await admin
    .from("doctors")
    .select("id, name, hospital");

  const doctorMap = new Map<string, { name: string; hospital: string }>();
  for (const d of doctors ?? []) {
    doctorMap.set(d.id, { name: d.name, hospital: d.hospital });
  }

  const rows: string[][] = [
    [
      "Patient ID", "Name", "Gender", "Date of Birth", "Mobile",
      "Primary Diagnosis", "Dashboard", "Doctor Name", "Hospital",
      "Date of Enrollment",
    ],
  ];

  for (const p of patients ?? []) {
    const diag = Array.isArray(p.patient_diagnoses) ? p.patient_diagnoses[0] : null;
    const doc  = p.doctor_id ? doctorMap.get(p.doctor_id) : null;
    rows.push([
      p.id,
      p.name,
      p.gender             ?? "n/a",
      p.date_of_birth      ?? "n/a",
      safePhone(p.mobile_number),
      diag?.primary_diagnosis  ?? "n/a",
      diag?.effective_dashboard ?? "n/a",
      doc?.name     ?? "n/a",
      doc?.hospital ?? "n/a",
      formatDate(p.created_at),
    ]);
  }

  if (format === "excel") {
    return new NextResponse(rowsToExcelHtml(rows), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.ms-excel",
        "Content-Disposition": `attachment; filename="admin-patients-${timestamp}.xls"`,
      },
    });
  }

  return new NextResponse("\uFEFF" + rowsToCsv(rows), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="admin-patients-${timestamp}.csv"`,
    },
  });
}
