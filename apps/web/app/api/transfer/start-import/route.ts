import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/server/supabase-admin";
import { generateOtp, hashOtp } from "@/lib/server/patient-auth";

export const dynamic = "force-dynamic";

const cooldowns = new Map<string, number>();

function normalizedIndiaMobile(value: string): string {
  const digits = value.replace(/\D/g, "").slice(-10);
  return `+91${digits}`;
}

function cooldownActive(key: string): boolean {
  const now = Date.now();
  const last = cooldowns.get(key) ?? 0;
  if (now - last < 60_000) return true;
  cooldowns.set(key, now);
  return false;
}

async function sendOtp(to: string, otp: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber || accountSid.includes("your-twilio")) {
    console.log(`[IMPORT OTP MOCK] ${to}: ${otp}`);
    return;
  }

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
  const response = await fetch(twilioUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: authHeader,
    },
    body: new URLSearchParams({
      To: to,
      From: fromNumber,
      Body: `Your O2Plus patient import verification code is ${otp}. Share it only with the doctor you want to consult.`,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Twilio import OTP error:", text);
    console.log(`[IMPORT OTP FALLBACK] ${to}: ${otp}`);
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: doctor } = await admin.from("doctors").select("id").eq("id", user.id).single();
  if (!doctor) {
    return NextResponse.json({ error: "Forbidden - not a doctor" }, { status: 403 });
  }

  const body = await request.json() as { patient_mobile?: string };
  if (!body.patient_mobile) {
    return NextResponse.json({ error: "patient_mobile is required" }, { status: 400 });
  }

  const mobile = normalizedIndiaMobile(body.patient_mobile);
  if (mobile.length !== 13) {
    return NextResponse.json({ error: "Enter a valid 10-digit patient phone number" }, { status: 400 });
  }

  if (cooldownActive(`${user.id}:${mobile}`)) {
    return NextResponse.json({ error: "Please wait 60 seconds before requesting another OTP." }, { status: 429 });
  }

  const { data: patient } = await admin
    .from("patients")
    .select("id, doctor_id, mobile_number")
    .eq("mobile_number", mobile)
    .single();

  if (!patient) {
    return NextResponse.json({ error: "No patient found with that registered phone number" }, { status: 404 });
  }
  if (patient.doctor_id === user.id) {
    return NextResponse.json({ error: "Patient is already visible in your dashboard" }, { status: 409 });
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await admin.from("audit_logs").insert({
    action: "patient_import_otp_sent",
    actor_id: user.id,
    actor_role: "doctor",
    target_patient_id: patient.id,
    metadata: {
      patient_mobile: mobile,
      otp_hash: hashOtp(otp),
      expires_at: expiresAt,
      attempts: 0,
      used: false,
    },
  });

  await sendOtp(mobile, otp);

  return NextResponse.json({ message: "OTP sent to the patient's registered phone number" });
}
