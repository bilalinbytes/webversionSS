import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/server/supabase-admin";
import crypto from "crypto";

/**
 * POST /api/patient-auth/set-pin
 * 
 * Verifies a valid short-lived otp_token and saves the patient's new 4-digit PIN.
 * The raw PIN is securely hashed using PBKDF2 or SHA-256 with a unique salt and backend pepper.
 * Writes credentials to the `patient_login_security` table.
 * 
 * Body: { otp_token: string, pin: string, confirm_pin: string }
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: { otp_token?: string; pin?: string; confirm_pin?: string };
  try {
    body = await request.json() as { otp_token?: string; pin?: string; confirm_pin?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { otp_token, pin, confirm_pin } = body;
  if (!otp_token || !pin || !confirm_pin) {
    return NextResponse.json(
      { error: "otp_token, pin, and confirm_pin are required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // 1. Validate otp_token is valid and unused
  const { data: verifiedSession, error: tokenError } = await admin
    .from("otp_verified_sessions")
    .select("*")
    .eq("token", otp_token)
    .eq("used", false)
    .maybeSingle();

  if (tokenError || !verifiedSession) {
    return NextResponse.json(
      { message: "Invalid or expired verification session. Please verify OTP again." },
      { status: 401 }
    );
  }

  // Check token expiration
  const now = new Date();
  const expiresAt = new Date(verifiedSession.expires_at);
  if (now > expiresAt) {
    return NextResponse.json(
      { message: "Verification session has expired. Please verify OTP again." },
      { status: 401 }
    );
  }

  // 2. Validate pin === confirm_pin
  if (pin !== confirm_pin) {
    return NextResponse.json({ message: "PINs do not match." }, { status: 400 });
  }

  // 3. Validate PIN is exactly 4 digits, numeric
  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ message: "PIN must be exactly 4 numeric digits." }, { status: 400 });
  }

  const { patient_id } = verifiedSession;

  // 4. Generate a unique pin_salt (crypto.randomBytes(16))
  const pinSalt = crypto.randomBytes(16).toString("hex");

  // 5. Hash: pin_hash = hash(pin + pin_salt + BACKEND_PEPPER)
  const backendPepper = process.env.BACKEND_PEPPER || "SaansSyncPepper2026_SecurePepperValue";
  const pinHash = crypto
    .createHash("sha256")
    .update(pin + pinSalt + backendPepper)
    .digest("hex");

  // 6. Write credentials to patient_login_security table
  const { error: dbError } = await admin
    .from("patient_login_security")
    .upsert({
      patient_id,
      pin_hash: pinHash,
      pin_salt: pinSalt,
      pin_hash_algorithm: "sha256",
      pin_set_at: new Date().toISOString(),
      pin_last_changed_at: new Date().toISOString(),
      failed_pin_attempts: 0,
      locked_until: null,
      last_login_at: null,
      last_failed_login_at: null,
    });

  if (dbError) {
    console.error("Database error while writing patient login security:", dbError);
    return NextResponse.json(
      { error: "Database error occurred while setting the PIN." },
      { status: 500 }
    );
  }

  // 6.b Synchronize the salted, peppered pin_hash to Supabase Auth password system
  // Format the password to satisfy any possible password strength policies (uppercase, lowercase, special character, digits)
  const authPassword = "A!" + pinHash + "Z_1";

  // Get patient mobile number for provisioning
  const { data: patientData } = await admin
    .from("patients")
    .select("mobile_number")
    .eq("id", patient_id)
    .maybeSingle();

  // Try to create the Auth user with password (succeeds if new, fails if exists)
  const patientPhone = patientData?.mobile_number ?? "unknown";
  const { error: createError } = await admin.auth.admin.createUser({
    id: patient_id,
    phone: patientPhone,
    phone_confirm: true,
    password: authPassword,
    user_metadata: { role: "patient" },
  });

  if (createError) {
    // createUser failed — an auth user with this phone already exists but
    // under a different UUID. Find it by trying multiple phone formats.
    const phoneVariants = [
      patientPhone,
      patientPhone.replace(/^\+/, ""),
      patientPhone.startsWith("+") ? patientPhone : `+${patientPhone}`,
    ];

    let existingAuthUserId: string | null = null;
    let page = 1;
    const perPage = 1000;

    while (!existingAuthUserId) {
      const { data: listData } = await admin.auth.admin.listUsers({ page, perPage });
      const users = listData?.users ?? [];
      const match = users.find((u) => u.phone && phoneVariants.includes(u.phone));
      if (match) {
        existingAuthUserId = match.id;
        break;
      }
      if (users.length < perPage) break;
      page++;
    }

    if (existingAuthUserId && existingAuthUserId !== patient_id) {
      // Step 2: Delete the old mismatched auth user
      const { error: deleteError } = await admin.auth.admin.deleteUser(existingAuthUserId);
      if (deleteError) {
        console.error("Failed to delete old auth user:", deleteError);
        return NextResponse.json(
          { error: `Auth sync failed: could not clean up old auth entry. ${deleteError.message}` },
          { status: 500 }
        );
      }

      // Step 3: Recreate with the correct patient_id as the UUID
      const { error: recreateError } = await admin.auth.admin.createUser({
        id: patient_id,
        phone: patientPhone,
        phone_confirm: true,
        password: authPassword,
        user_metadata: { role: "patient" },
      });

      if (recreateError) {
        console.error("createUser error (original):", createError);
        console.error("recreateUser error:", recreateError);
        return NextResponse.json(
          { error: `Auth sync failed: ${recreateError.message}` },
          { status: 500 }
        );
      }
    } else if (existingAuthUserId === patient_id) {
      // Same UUID — just update the password
      const { error: updateError } = await admin.auth.admin.updateUserById(patient_id, {
        password: authPassword,
        phone_confirm: true,
      });

      if (updateError) {
        console.error("updateUserById error:", updateError);
        return NextResponse.json(
          { error: `Auth sync failed: ${updateError.message}` },
          { status: 500 }
        );
      }
    } else {
      // No matching auth user found by phone at all — log and continue
      // PIN is saved; the next createUser attempt should succeed
      console.error("createUser error:", createError);
      console.warn("No auth user found by phone — PIN saved, auth sync skipped.");
    }
  }

  // 7. Invalidate the otp_token (set used = true)
  const { error: invalidateError } = await admin
    .from("otp_verified_sessions")
    .update({ used: true })
    .eq("token", otp_token);

  if (invalidateError) {
    console.error("Failed to invalidate otp_verified_session token:", invalidateError);
    // Non-fatal, return success to patient anyway
  }

  return NextResponse.json({
    message: "PIN set successfully",
  });
}
