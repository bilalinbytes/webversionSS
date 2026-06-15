import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/server/supabase-admin";
import type { Json } from "@/lib/database.types";

const dayValues = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

const settingsSchema = z.object({
  accepts_appointments: z.boolean(),
  consultation_type: z.enum(["online", "offline", "both"]),
  available_days: z.array(z.enum(dayValues)),
  time_slots: z.record(z.string(), z.object({
    start: timeSchema,
    end: timeSchema,
  }).partial()).default({}),
  slot_duration: z.number().int().min(5).max(180),
  max_patients_per_slot: z.number().int().min(1).max(25),
}).superRefine((value, ctx) => {
  if (!value.accepts_appointments) return;
  if (value.available_days.length === 0) {
    ctx.addIssue({ code: "custom", path: ["available_days"], message: "Select at least one available day." });
  }
  value.available_days.forEach((day) => {
    const slot = value.time_slots[day];
    if (!slot?.start || !slot?.end) {
      ctx.addIssue({ code: "custom", path: ["time_slots", day], message: "Start and end time are required." });
      return;
    }
    if (slot.end <= slot.start) {
      ctx.addIssue({ code: "custom", path: ["time_slots", day], message: "End time must be after start time." });
    }
  });
});

async function authenticateDoctor() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

function hasAvailability(doctor: {
  accepts_appointments: boolean | null;
  appointment_available_days: Json | null;
  appointment_time_slots: Json | null;
}) {
  if (!doctor.accepts_appointments) return false;
  const days = Array.isArray(doctor.appointment_available_days) ? doctor.appointment_available_days : [];
  const slots = doctor.appointment_time_slots && typeof doctor.appointment_time_slots === "object" && !Array.isArray(doctor.appointment_time_slots)
    ? doctor.appointment_time_slots as Record<string, unknown>
    : {};
  return days.some((day) => {
    if (typeof day !== "string") return false;
    const slot = slots[day];
    return Boolean(slot && typeof slot === "object" && "start" in slot && "end" in slot);
  });
}

export async function GET(): Promise<NextResponse> {
  const user = await authenticateDoctor();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("doctors")
    .select("accepts_appointments, appointment_consultation_type, appointment_available_days, appointment_time_slots, appointment_slot_duration, appointment_max_patients_per_slot, appointment_preferences_set_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

  return NextResponse.json({
    settings: {
      accepts_appointments: data.accepts_appointments ?? false,
      consultation_type: data.appointment_consultation_type ?? "both",
      available_days: Array.isArray(data.appointment_available_days) ? data.appointment_available_days : [],
      time_slots: data.appointment_time_slots ?? {},
      slot_duration: data.appointment_slot_duration ?? 15,
      max_patients_per_slot: data.appointment_max_patients_per_slot ?? 1,
      preferences_set_at: data.appointment_preferences_set_at,
      availability_configured: hasAvailability(data),
    },
  });
}

export async function PUT(request: Request): Promise<NextResponse> {
  const user = await authenticateDoctor();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as unknown;
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const value = parsed.data;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("doctors")
    .update({
      accepts_appointments: value.accepts_appointments,
      appointment_consultation_type: value.consultation_type,
      appointment_available_days: value.available_days as Json,
      appointment_time_slots: value.time_slots as Json,
      appointment_slot_duration: value.slot_duration,
      appointment_max_patients_per_slot: value.max_patients_per_slot,
      appointment_preferences_set_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select("accepts_appointments, appointment_consultation_type, appointment_available_days, appointment_time_slots, appointment_slot_duration, appointment_max_patients_per_slot, appointment_preferences_set_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
