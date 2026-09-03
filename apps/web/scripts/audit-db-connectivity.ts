import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "apps/web/.env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });


async function auditSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("=== SUPABASE CONNECTIVITY AUDIT ===");
  console.log("Supabase URL configured:", Boolean(url), url ? `(${url.split(".")[0]})` : "");
  console.log("Anon Key configured:", Boolean(anonKey));
  console.log("Service Role Key configured:", Boolean(serviceKey));

  if (!url || !serviceKey) {
    console.error("Missing Supabase credentials in .env.local");
    return;
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const tables = [
    "patients",
    "doctors",
    "patient_diagnoses",
    "daily_logs",
    "red_flag_scores",
    "disease_alerts",
    "medications",
    "pft_records",
    "respiratory_support",
    "doctor_instructions",
    "appointments",
    "patient_baselines",
    "platform_admins",
    "audit_logs",
    "export_records",
  ];

  console.log("\n--- Testing Table Accessibility & Row Counts ---");
  for (const table of tables) {
    try {
      const { data, count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      if (error) {
        console.log(`❌ Table [${table}]: ERROR - ${error.message} (code: ${error.code})`);
      } else {
        console.log(`✓ Table [${table}]: ACCESSIBLE (Row Count: ${count ?? 0})`);
      }
    } catch (err: any) {
      console.log(`❌ Table [${table}]: EXCEPTION - ${err.message}`);
    }
  }

  // Test sample schema columns on patients
  console.log("\n--- Checking Sample Patient Columns ---");
  const { data: samplePatients, error: pError } = await supabase
    .from("patients")
    .select("*")
    .limit(2);

  if (pError) {
    console.log("Error querying patients:", pError.message);
  } else if (samplePatients && samplePatients.length > 0) {
    console.log("Found sample patients. Columns available:", Object.keys(samplePatients[0]));
    console.log("Sample Patient IDs:", samplePatients.map(p => p.id));
  } else {
    console.log("Patients table is empty (0 rows).");
  }

  // Test sample daily logs
  console.log("\n--- Checking Sample Daily Logs ---");
  const { data: sampleLogs, error: lError } = await supabase
    .from("daily_logs")
    .select("*")
    .limit(2);

  if (lError) {
    console.log("Error querying daily_logs:", lError.message);
  } else if (sampleLogs && sampleLogs.length > 0) {
    console.log("Found sample daily logs. Columns available:", Object.keys(sampleLogs[0]));
    console.log("Sample Log IDs:", sampleLogs.map(l => l.id));
  } else {
    console.log("Daily logs table is empty (0 rows).");
  }
}

auditSupabase().catch(console.error);
