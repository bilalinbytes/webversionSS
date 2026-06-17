import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/server/supabase-admin";
import { lookupPatientByMobile } from "@/lib/server/patient-auth";
import crypto from "crypto";

/**
 * POST /api/patient-auth/pin-login
 * 
 * Secure patient login via phone and 4-digit PIN.
 * Verifies lockout status, handles failed pin attempt increments,
 * and logs the user in via Supabase Auth when credentials match.
 * 
 * Body: { mobile_number: string, pin: string }
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: { mobile_number?: string; pin?: string };
  try {
    body = await request.json() as { mobile_number?: string; pin?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { mobile_number, pin } = body;
  if (!mobile_number || !pin) {
    return NextResponse.json(
      { error: "mobile_number and pin are required" },
      { status: 400 }
    );
  }

  // 1. Call lookup utility to get patient ID & primary mobile number
  const patient = await lookupPatientByMobile(mobile_number);
  if (!patient) {
    return NextResponse.json(
      { message: "No patient found with this number." },
      { status: 404 }
    );
  }

  const { patient_id, primary_mobile_number } = patient;
  const admin = createAdminClient();

  // 2. Fetch login security record
  let { data: security, error: securityError } = await admin
    .from("patient_login_security")
    .select("*")
    .eq("patient_id", patient_id)
    .maybeSingle();

  if (securityError || !security) {
    return NextResponse.json(
      { message: "PIN has not been set for this account. Please select first-time setup." },
      { status: 400 }
    );
  }

  const now = new Date();
  let failedAttempts = security.failed_pin_attempts ?? 0;

  // 3. Check lockout: failedAttempts >= 5 AND lockout_until > now
  if (failedAttempts >= 5 && security.locked_until) {
    const lockedUntil = new Date(security.locked_until);
    if (now < lockedUntil) {
      const minutesLeft = Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000);
      return NextResponse.json(
        { message: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minutes.` },
        { status: 423 }
      );
    } else {
      // Lockout duration has expired, reset attempts in security table and proceed
      await admin
        .from("patient_login_security")
        .update({
          failed_pin_attempts: 0,
          locked_until: null,
        })
        .eq("patient_id", patient_id);
      
      // Update our local security variables as well
      failedAttempts = 0;
      security.locked_until = null;
    }
  }

  // 4. Fetch salt, pepper, and recompute PIN hash
  const { pin_salt, pin_hash } = security;
  if (!pin_salt || !pin_hash) {
    return NextResponse.json(
      { message: "Account configuration incomplete. Please reset your PIN." },
      { status: 400 }
    );
  }

  const backendPepper = process.env.BACKEND_PEPPER || "SaansSyncPepper2026_SecurePepperValue";
  const computedPinHash = crypto
    .createHash("sha256")
    .update(pin + pin_salt + backendPepper)
    .digest("hex");

  // 5. Verify PIN against our DB hash first
  if (computedPinHash !== pin_hash) {
    const nextAttempts = failedAttempts + 1;
    const isLocked = nextAttempts >= 5;
    const lockoutTime = isLocked
      ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
      : null;

    await admin
      .from("patient_login_security")
      .update({
        failed_pin_attempts: nextAttempts,
        locked_until: lockoutTime,
        last_failed_login_at: now.toISOString(),
      })
      .eq("patient_id", patient_id);

    if (isLocked) {
      return NextResponse.json(
        { message: "Too many incorrect PIN attempts. Your account has been locked for 15 minutes." },
        { status: 423 }
      );
    }
    const remaining = 5 - nextAttempts;
    return NextResponse.json(
      { message: `Incorrect PIN. You have ${remaining} attempts remaining.` },
      { status: 401 }
    );
  }

  // 6. PIN is correct — sync the auth password and sign in
  // We re-sync on every login to ensure auth password always matches DB hash.
  const authPassword = "A!" + computedPinHash + "Z_1";

  // Ensure the auth user exists and has the correct password
  const { error: updateAuthError } = await admin.auth.admin.updateUserById(patient_id, {
    password: authPassword,
    phone_confirm: true,
  });

  if (updateAuthError) {
    // Auth user doesn't exist yet — create it
    const { error: createAuthError } = await admin.auth.admin.createUser({
      id: patient_id,
      phone: primary_mobile_number,
      phone_confirm: true,
      password: authPassword,
      user_metadata: { role: "patient" },
    });

    if (createAuthError) {
      console.error("Failed to provision auth user on login:", createAuthError);
      return NextResponse.json(
        { message: "Login failed. Could not initialize session." },
        { status: 500 }
      );
    }
  }

  // Now sign in with the synced password
  const supabase = await createClient();
  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    phone: primary_mobile_number,
    password: authPassword,
  });

  if (signInError || !authData.session) {
    console.error("signInWithPassword failed after sync:", signInError);
    return NextResponse.json(
      { message: "Login failed. Please try again." },
      { status: 500 }
    );
  }

  // Reset failed attempts on success
  await admin
    .from("patient_login_security")
    .update({
      failed_pin_attempts: 0,
      locked_until: null,
      last_login_at: now.toISOString(),
    })
    .eq("patient_id", patient_id);

  return NextResponse.json({
    message: "Login successful",
    session: authData.session,
  });
}
