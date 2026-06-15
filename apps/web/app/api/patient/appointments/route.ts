import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/server/supabase-admin";
import type { Database, Json } from "@/lib/database.types";

type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

type AppointmentNoteMeta = {
  reason?: string;
  mode?: "Clinic" | "Online Consultation";
  doctor_remarks?: string;
  workflow_status?: string;
  history?: Array<{
    action: string;
    actor: "patient" | "doctor";
    at: string;
    scheduled_at?: string;
    remarks?: string;
  }>;
};

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time_slot: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().max(500).optional(),
  mode: z.enum(["Clinic", "Online Consultation"]),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["accept_reschedule", "request_another_slot"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time_slot: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  remarks: z.string().max(500).optional(),
});

async function authenticatePatient() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

function scheduledAt(date: string, timeSlot: string) {
  return `${date}T${timeSlot}:00+05:30`;
}

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function dayKeyFromDate(date: string) {
  return DAY_KEYS[new Date(`${date}T00:00:00+05:30`).getDay()] ?? "sunday";
}

function jsonArrayOfStrings(value: Json | null): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function jsonRecord(value: Json | null): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function slotForDay(slots: Json | null, day: string): { start: string; end: string } | null {
  const slot = jsonRecord(slots)[day];
  if (!slot || typeof slot !== "object" || Array.isArray(slot)) return null;
  const record = slot as Record<string, unknown>;
  return typeof record.start === "string" && typeof record.end === "string"
    ? { start: record.start, end: record.end }
    : null;
}

function parseNotes(notes: string | null): AppointmentNoteMeta {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes) as AppointmentNoteMeta;
    return parsed && typeof parsed === "object" ? parsed : { reason: notes };
  } catch {
    return { reason: notes };
  }
}

function serializeAppointment(row: AppointmentRow) {
  return {
    ...row,
    meta: parseNotes(row.notes),
  };
}

export async function GET(): Promise<NextResponse> {
  const user = await authenticatePatient();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: patient } = await admin
    .from("patients")
    .select("doctor_id")
    .eq("id", user.id)
    .maybeSingle();

  const { data, error } = await admin
    .from("appointments")
    .select("*")
    .eq("patient_id", user.id)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: doctor } = patient?.doctor_id
    ? await admin
      .from("doctors")
      .select("name, email, accepts_appointments, appointment_consultation_type, appointment_available_days, appointment_time_slots, appointment_slot_duration, appointment_max_patients_per_slot")
      .eq("id", patient.doctor_id)
      .maybeSingle()
    : { data: null };

  const days = doctor ? jsonArrayOfStrings(doctor.appointment_available_days) : [];
  const slots = doctor ? jsonRecord(doctor.appointment_time_slots) : {};
  const availabilityConfigured = Boolean(
    doctor?.accepts_appointments &&
    days.some((day) => {
      const slot = slots[day];
      return Boolean(slot && typeof slot === "object" && "start" in slot && "end" in slot);
    }),
  );

  return NextResponse.json({
    appointments: (data as AppointmentRow[]).map(serializeAppointment),
    doctor_settings: doctor ? {
      accepts_appointments: doctor.accepts_appointments ?? false,
      consultation_type: doctor.appointment_consultation_type ?? "both",
      available_days: days,
      time_slots: doctor.appointment_time_slots ?? {},
      slot_duration: doctor.appointment_slot_duration ?? 15,
      max_patients_per_slot: doctor.appointment_max_patients_per_slot ?? 1,
      availability_configured: availabilityConfigured,
      doctor_name: doctor.name ?? null,
      doctor_email: doctor.email ?? null,
    } : null,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await authenticatePatient();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as unknown;
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: patient } = await admin
    .from("patients")
    .select("doctor_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!patient?.doctor_id) {
    return NextResponse.json({ error: "No doctor assigned to this patient." }, { status: 400 });
  }

  const { data: doctor } = await admin
    .from("doctors")
    .select("accepts_appointments, appointment_consultation_type, appointment_available_days, appointment_time_slots, appointment_max_patients_per_slot")
    .eq("id", patient.doctor_id)
    .maybeSingle();

  if (!doctor?.accepts_appointments) {
    return NextResponse.json(
      { error: "Appointments are not available for this doctor. Please contact the hospital directly." },
      { status: 403 },
    );
  }

  const requestedMode = parsed.data.mode === "Clinic" ? "offline" : "online";
  const consultationType = doctor.appointment_consultation_type ?? "both";
  if (consultationType !== "both" && consultationType !== requestedMode) {
    return NextResponse.json({ error: `This doctor does not accept ${parsed.data.mode} appointments.` }, { status: 400 });
  }

  const day = dayKeyFromDate(parsed.data.date);
  const availableDays = jsonArrayOfStrings(doctor.appointment_available_days);
  const slot = slotForDay(doctor.appointment_time_slots, day);
  if (availableDays.length === 0 || !availableDays.includes(day) || !slot) {
    return NextResponse.json(
      { error: "Appointment booking is enabled, but availability has not been configured for this day." },
      { status: 409 },
    );
  }
  if (parsed.data.time_slot < slot.start || parsed.data.time_slot >= slot.end) {
    return NextResponse.json({ error: `Please choose a time between ${slot.start} and ${slot.end}.` }, { status: 400 });
  }

  const appointmentTime = scheduledAt(parsed.data.date, parsed.data.time_slot);
  const slotStart = appointmentTime;
  const slotEnd = `${parsed.data.date}T${parsed.data.time_slot}:59+05:30`;
  const { count: slotCount } = await admin
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("doctor_id", patient.doctor_id)
    .gte("scheduled_at", slotStart)
    .lte("scheduled_at", slotEnd)
    .neq("status", "cancelled");

  if ((slotCount ?? 0) >= (doctor.appointment_max_patients_per_slot ?? 1)) {
    return NextResponse.json({ error: "This slot is full. Please choose another time." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const meta: AppointmentNoteMeta = {
    reason: parsed.data.reason?.trim() || undefined,
    mode: parsed.data.mode,
    workflow_status: "requested",
    history: [{
      action: "Appointment requested",
      actor: "patient",
      at: now,
      scheduled_at: appointmentTime,
      remarks: parsed.data.reason?.trim() || undefined,
    }],
  };

  const { data, error } = await admin
    .from("appointments")
    .insert({
      patient_id: user.id,
      doctor_id: patient.doctor_id,
      scheduled_at: appointmentTime,
      title: `Appointment Request - ${parsed.data.mode}`,
      notes: JSON.stringify(meta),
      status: "upcoming",
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ appointment: serializeAppointment(data as AppointmentRow) }, { status: 201 });
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const user = await authenticatePatient();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as unknown;
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("appointments")
    .select("*")
    .eq("id", parsed.data.id)
    .eq("patient_id", user.id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  const row = existing as AppointmentRow;
  const meta = parseNotes(row.notes);
  const now = new Date().toISOString();
  let status = "upcoming";
  let workflowStatus = "patient_accepted";
  let nextScheduledAt = row.scheduled_at;
  let action = "Patient accepted suggested appointment";

  if (parsed.data.action === "request_another_slot") {
    if (!parsed.data.date || !parsed.data.time_slot) {
      return NextResponse.json({ error: "Date and time are required for another slot." }, { status: 400 });
    }
    workflowStatus = "patient_requested_another";
    nextScheduledAt = scheduledAt(parsed.data.date, parsed.data.time_slot);
    action = "Patient requested another slot";
  }

  meta.history = [
    ...(meta.history ?? []),
    {
      action,
      actor: "patient",
      at: now,
      scheduled_at: nextScheduledAt,
      remarks: parsed.data.remarks?.trim() || undefined,
    },
  ];
  meta.workflow_status = workflowStatus;

  const { data, error } = await admin
    .from("appointments")
    .update({
      status,
      scheduled_at: nextScheduledAt,
      notes: JSON.stringify(meta),
      updated_at: now,
    })
    .eq("id", row.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ appointment: serializeAppointment(data as AppointmentRow) });
}
