import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/server/supabase-admin";

/**
 * POST /api/patients/provision-auth
 *
 * Called immediately after a patient record is created by a doctor.
 * Creates (or confirms) a Supabase Auth user for the patient's phone number
 * so they can log in via OTP.
 *
 * Body: { patientId: string; mobile_number: string }
 *
 * Uses the admin client (service role) to create the auth user without
 * sending an OTP — the patient will receive their first OTP when they
 * actually try to log in.
 */
export async function POST(request: Request): Promise<NextResponse> {
  // Verify the caller is an authenticated doctor
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Confirm caller is a doctor
  const { data: doctorRow } = await supabase
    .from("doctors")
    .select("id, name")
    .eq("id", user.id)
    .maybeSingle();

  if (!doctorRow) {
    return NextResponse.json({ error: "Forbidden — doctors only" }, { status: 403 });
  }

  // Parse body
  let body: { patientId?: string; mobile_number?: string };
  try {
    body = await request.json() as { patientId?: string; mobile_number?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { patientId, mobile_number } = body;

  if (!patientId || !mobile_number) {
    return NextResponse.json(
      { error: "patientId and mobile_number are required" },
      { status: 400 }
    );
  }

  // Normalize the phone number to E.164 (+91XXXXXXXXXX)
  const digits = mobile_number.replace(/\D/g, "");
  let nationalNumber = digits;
  if (digits.startsWith("91") && digits.length === 12) {
    nationalNumber = digits.slice(2);
  }
  if (!/^[6-9]\d{9}$/.test(nationalNumber)) {
    return NextResponse.json(
      { error: "Invalid Indian mobile number" },
      { status: 400 }
    );
  }
  const normalizedPhone = `+91${nationalNumber}`;

  // Verify the patient record belongs to this doctor
  const { data: patientRow } = await supabase
    .from("patients")
    .select("id, name, doctor_id, mobile_number")
    .eq("id", patientId)
    .maybeSingle();

  if (!patientRow) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  if (patientRow.doctor_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Check if an auth user already exists with this phone
  // (handles re-registration or duplicate attempts gracefully)
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const alreadyExists = existingUsers?.users?.some(
    (u) => u.phone === normalizedPhone
  );

  let isCreated = false;
  if (!alreadyExists) {
    // Create the Supabase Auth user with the patient's UUID as their auth ID.
    // This ensures auth.uid() === patients.id, which is what the middleware
    // and PatientContext rely on.
    const { error: createError } = await admin.auth.admin.createUser({
      id: patientId,          // Force the auth UUID to match the patients table PK
      phone: normalizedPhone,
      phone_confirm: true,    // Mark phone as confirmed — no OTP needed at creation
      user_metadata: {
        name: patientRow.name || patientRow.mobile_number, // store for reference
        role: "patient",
      },
    });

    if (createError) {
      if (
        !createError.message.includes("already exists") &&
        !createError.message.includes("duplicate")
      ) {
        return NextResponse.json(
          { error: `Auth provisioning failed: ${createError.message}` },
          { status: 500 }
        );
      }
    } else {
      isCreated = true;
    }
  }

  // Dispatch Welcome Onboarding SMS (Twilio Gateway with graceful mock fallback)
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  const hasTwilioCredentials =
    accountSid &&
    authToken &&
    fromNumber &&
    !accountSid.includes("your-twilio") &&
    !authToken.includes("your-twilio") &&
    !fromNumber.includes("your-twilio");

  const doctorName = doctorRow?.name || "Dr. Irfan";
  const patientDisplayName = patientRow.name || "Patient";
  const welcomeMessage = `Welcome to O2Plus Respiratory Care, ${patientDisplayName}! You have been registered by ${doctorName}. Log in to view your prescriptions & lung care plan: https://o2plus.app/login`;

  if (hasTwilioCredentials) {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;

      const smsRes = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: authHeader,
        },
        body: new URLSearchParams({
          To: normalizedPhone,
          From: fromNumber,
          Body: welcomeMessage,
        }),
      });

      if (!smsRes.ok) {
        const errorText = await smsRes.text();
        console.error("[Twilio Onboarding SMS Gateway Error]:", errorText);
      } else {
        console.log(`[Twilio Onboarding SMS] Successfully dispatched to ${normalizedPhone}`);
      }
    } catch (smsErr) {
      console.error("[Twilio Onboarding SMS Gateway Exception]:", smsErr);
    }
  } else {
    console.log("\n==================================================");
    console.log(`[SMS ONBOARDING MOCK] Dispatching welcome SMS to patient...`);
    console.log(`[SMS ONBOARDING MOCK] Destination: ${normalizedPhone}`);
    console.log(`[SMS ONBOARDING MOCK] Message: ${welcomeMessage}`);
    console.log("==================================================\n");
  }

  return NextResponse.json({ ok: true, created: isCreated, sms_dispatched: true });
}
