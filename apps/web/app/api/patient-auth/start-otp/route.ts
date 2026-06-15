import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/server/supabase-admin";
import { lookupPatientByMobile, generateOtp, hashOtp } from "@/lib/server/patient-auth";

// Lightweight, in-memory rate limiter for server runtime
const cooldowns = new Map<string, number>();

function isCooldownActive(key: string, cooldownSeconds = 60): boolean {
  const now = Date.now();
  const lastTime = cooldowns.get(key) || 0;
  if (now - lastTime < cooldownSeconds * 1000) {
    return true;
  }
  cooldowns.set(key, now);
  return false;
}

/**
 * POST /api/patient-auth/start-otp
 * 
 * Initiates the OTP flow by generating a 6-digit OTP, hashing it, and 
 * sending it to the patient's primary mobile number.
 * 
 * Enforces a 60-second cooldown rate-limit per client IP and per patient ID.
 * The OTP is valid for 30 days.
 * 
 * Body: { mobile_number: string }
 */
export async function POST(request: Request): Promise<NextResponse> {
  // 1. Enforce IP-based rate limiting
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] || 
                   request.headers.get("x-real-ip") || 
                   "127.0.0.1";
  
  if (isCooldownActive(`ip:${clientIp}`)) {
    return NextResponse.json(
      { message: "Please wait 60 seconds before requesting another code." },
      { status: 429 }
    );
  }

  let body: { mobile_number?: string };
  try {
    body = await request.json() as { mobile_number?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { mobile_number } = body;
  if (!mobile_number) {
    return NextResponse.json({ error: "mobile_number is required" }, { status: 400 });
  }

  // 2. Call lookup utility to get patient
  const patient = await lookupPatientByMobile(mobile_number);
  if (!patient) {
    return NextResponse.json(
      { message: "No patient found with this number" },
      { status: 404 }
    );
  }

  const { patient_id, primary_mobile_number } = patient;

  // 3. Enforce Patient-based rate limiting
  if (isCooldownActive(`patient:${patient_id}`)) {
    // Revert IP-based rate limiter entry so the user is not locked out on IP for subsequent attempts after lockout expires
    cooldowns.delete(`ip:${clientIp}`);
    return NextResponse.json(
      { message: "Please wait 60 seconds before requesting another code." },
      { status: 429 }
    );
  }

  // 4. Generate 6-digit OTP and SHA-256 hash
  const rawOtp = generateOtp();
  const hashedOtp = hashOtp(rawOtp);

  // 5. Expiration set to 30 days
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // 6. Store/upsert OTP session (Scenario A: overwrites previous sessions cleanly)
  const admin = createAdminClient();
  const { error: dbError } = await admin
    .from("otp_sessions")
    .upsert({
      patient_id,
      otp_hash: hashedOtp,
      expires_at: expiresAt,
      attempts: 0,
    });

  if (dbError) {
    console.error("Database error when storing OTP session:", dbError);
    return NextResponse.json(
      { error: "Database error during OTP creation" },
      { status: 500 }
    );
  }

  // 7. SMS dispatch (Real Twilio API with Graceful Console Fallback)
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

  if (hasTwilioCredentials) {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;

      const response = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: authHeader,
        },
        body: new URLSearchParams({
          To: primary_mobile_number,
          From: fromNumber,
          Body: `Your O2Plus verification code is ${rawOtp}. Valid for 30 days.`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Twilio API error response:", errorText);
        // We log the error but print the fallback OTP so testing/dev flow doesn't break if API fails
        console.log(`[TWILIO ERROR FALLBACK] Raw OTP for testing: ${rawOtp}`);
      } else {
        console.log(`[Twilio SMS] SMS successfully dispatched to ${primary_mobile_number}`);
      }
    } catch (err) {
      console.error("Failed to connect to Twilio SMS gateway:", err);
      console.log(`[TWILIO EXCEPTION FALLBACK] Raw OTP for testing: ${rawOtp}`);
    }
  } else {
    // Graceful console fallback for development/testing when keys are not configured yet
    console.log("\n==================================================");
    console.log(`[SMS PROVIDER MOCK] Sending Onboarding SMS via Gateway...`);
    console.log(`[SMS PROVIDER MOCK] Destination: ${primary_mobile_number}`);
    console.log(`[SMS PROVIDER MOCK] Message: Your O2Plus verification code is ${rawOtp}. Valid for 30 days.`);
    console.log("==================================================\n");
  }

  return NextResponse.json({
    message: "OTP sent to registered primary number",
  });
}
