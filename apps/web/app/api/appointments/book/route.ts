import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/server/supabase-admin";
import type { Database, Json } from "@/lib/database.types";

type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

const bookAppointmentSchema = z.object({
  doctor_id: z.string().uuid(),
  scheduled_at: z.string().datetime({ offset: true }),
  title: z.string().min(1).max(200),
  reason: z.string().max(500).optional(),
});

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function jsonArrayOfStrings(value: Json | null): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function jsonRecord(value: Json | null): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

// POST /api/appointments/book — patient books an appointment with a doctor
export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bookAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Verify the requesting user is a patient
  const { data: patientData } = await admin
    .from("patients")
    .select("id, doctor_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!patientData) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  // Check if the doctor accepts appointments
  const { data: doctorData } = await admin
    .from("doctors")
    .select("id, accepts_appointments, appointment_available_days, appointment_time_slots, appointment_max_patients_per_slot")
    .eq("id", parsed.data.doctor_id)
    .maybeSingle();

  if (!doctorData) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  if (!doctorData.accepts_appointments) {
    return NextResponse.json(
      { error: "This doctor does not accept appointment requests through the app" },
      { status: 403 }
    );
  }

  const scheduledDate = new Date(parsed.data.scheduled_at);
  const day = DAY_KEYS[scheduledDate.getDay()] ?? "sunday";
  const time = scheduledDate.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
  const days = jsonArrayOfStrings(doctorData.appointment_available_days);
  const slots = jsonRecord(doctorData.appointment_time_slots);
  const slot = slots[day];
  const configuredSlot = slot && typeof slot === "object" && !Array.isArray(slot)
    ? slot as Record<string, unknown>
    : null;
  if (!days.includes(day) || typeof configuredSlot?.start !== "string" || typeof configuredSlot.end !== "string") {
    return NextResponse.json(
      { error: "Appointment booking is enabled, but availability has not been configured." },
      { status: 409 },
    );
  }
  if (time < configuredSlot.start || time >= configuredSlot.end) {
    return NextResponse.json({ error: `Please choose a time between ${configuredSlot.start} and ${configuredSlot.end}.` }, { status: 400 });
  }

  const { count: slotCount } = await admin
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("doctor_id", parsed.data.doctor_id)
    .eq("scheduled_at", parsed.data.scheduled_at)
    .neq("status", "cancelled");
  if ((slotCount ?? 0) >= (doctorData.appointment_max_patients_per_slot ?? 1)) {
    return NextResponse.json({ error: "This slot is full. Please choose another time." }, { status: 409 });
  }

  // Create the appointment request
  const notesMeta = {
    reason: parsed.data.reason,
    workflow_status: "requested",
    history: [
      {
        action: "Appointment requested",
        actor: "patient" as const,
        at: new Date().toISOString(),
        scheduled_at: parsed.data.scheduled_at,
      },
    ],
  };

  const { data, error } = await admin
    .from("appointments")
    .insert({
      patient_id: user.id,
      doctor_id: parsed.data.doctor_id,
      scheduled_at: parsed.data.scheduled_at,
      title: parsed.data.title,
      notes: JSON.stringify(notesMeta),
      status: "requested",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ appointment: data as AppointmentRow }, { status: 201 });
}
