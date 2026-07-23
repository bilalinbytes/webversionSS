import { z } from "zod";
import { normalizeIndianPhone } from "./phone";
import {
  diagnosisValues,
  postIcuSubDiagnosisValues,
  medicationRouteValues,
} from "@o2plus/types";

// Re-export constants so apps importing from here don't break
export { diagnosisValues, postIcuSubDiagnosisValues, medicationRouteValues };

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const respiratorySupportSchema = z.object({
  requires_support: z.boolean(),
  ltot_enabled: z.boolean().optional(),
  ltot_litres: z.number().nullable().optional(),
  bipap_enabled: z.boolean().optional(),
  bipap_overnight: z.boolean().optional(),
  bipap_all_time: z.boolean().optional(),
  bipap_requires_oxygen: z.boolean().optional(),
  bipap_oxygen_litres: z.number().nullable().optional(),
  bipap_ipap: z.number().nullable().optional(),
  bipap_epap: z.number().nullable().optional(),
  bipap_pressure_support: z.number().nullable().optional(),
  bipap_respiratory_rate: z.number().int().nullable().optional(),
  invasive_vent_enabled: z.boolean().optional(),
  vent_ipap: z.number().nullable().optional(),
  vent_epap: z.number().nullable().optional(),
  vent_pressure_support: z.number().nullable().optional(),
  vent_respiratory_rate: z.number().int().nullable().optional(),
  vent_fio2_percent: z.number().nullable().optional(),
  tracheostomy_enabled: z.boolean().optional(),
  trach_for_airway_patency: z.boolean().optional(),
  trach_requires_oxygen: z.boolean().optional(),
  trach_oxygen_litres: z.number().nullable().optional(),
  trach_requires_vent: z.boolean().optional(),
  trach_vent_ipap: z.number().nullable().optional(),
  trach_vent_epap: z.number().nullable().optional(),
  trach_vent_pressure_support: z.number().nullable().optional(),
  trach_vent_respiratory_rate: z.number().int().nullable().optional(),
  trach_vent_tidal_volume: z.number().nullable().optional(),
  trach_vent_fio2_percent: z.number().nullable().optional(),
});

export const pftRecordSchema = z.object({
  test_date: dateStringSchema,
  fvc: z.number().nullable().optional(),
  fev1: z.number().nullable().optional(),
  fev1_fvc_ratio: z.number().nullable().optional(),
  dlco: z.number().nullable().optional(),
  other_fields: z.record(z.string(), z.unknown()).optional(),
});

export const medicationSchema = z.object({
  route: z.enum(medicationRouteValues),
  drug_name: z.string().min(1),
  dose: z.number().nullable().optional(),
  dose_unit: z.string().nullable().optional(),
  start_date: dateStringSchema,
  end_date: dateStringSchema.nullable().optional(),
});

export const patientEnrolmentSchema = z
  .object({
    name: z.string().min(2),
    date_of_birth: dateStringSchema,
    gender: z.enum(["Male", "Female", "Other"]),
    mobile_number: z.string().min(10).transform((value, context) => {
      try {
        return normalizeIndianPhone(value);
      } catch (error) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            error instanceof Error
              ? error.message
              : "Please enter a valid Indian mobile number.",
        });
        return z.NEVER;
      }
    }),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    emergency_contact_name: z.string().optional(),
    emergency_contact_phone: z.string().optional(),
    primary_diagnosis: z.enum(diagnosisValues),
    post_icu_sub_diagnosis: z
      .enum(postIcuSubDiagnosisValues)
      .nullable()
      .optional(),
    comorbidities: z.array(z.string()).default([]),
    comorbidities_other_text: z.string().nullable().optional(),
    diagnosed_at: dateStringSchema.nullable().optional(),
    respiratory_support: respiratorySupportSchema,
    pft_records: z.array(pftRecordSchema).default([]),
    medications: z.array(medicationSchema).default([]),
  })
  .superRefine((value, context) => {
    if (
      value.primary_diagnosis === "post_icu" &&
      !value.post_icu_sub_diagnosis
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["post_icu_sub_diagnosis"],
        message: "Post-ICU sub-diagnosis is required for post_icu patients.",
      });
    }
  });

export const patientUpdateSchema = z
  .object({
    name: z.string().min(2).optional(),
    date_of_birth: dateStringSchema.optional(),
    gender: z.enum(["Male", "Female", "Other"]).optional(),
    mobile_number: z.string().min(10).optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    emergency_contact_name: z.string().optional(),
    emergency_contact_phone: z.string().optional(),
    primary_diagnosis: z.enum(diagnosisValues).optional(),
    post_icu_sub_diagnosis: z
      .enum(postIcuSubDiagnosisValues)
      .nullable()
      .optional(),
    comorbidities: z.array(z.string()).optional(),
    comorbidities_other_text: z.string().nullable().optional(),
    diagnosed_at: dateStringSchema.nullable().optional(),
    respiratory_support: respiratorySupportSchema.partial().optional(),
    pft_records: z.array(pftRecordSchema).optional(),
    medications: z.array(medicationSchema).optional(),
  })
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided.",
      });
    }
  });

export type PatientEnrolmentInput = z.infer<typeof patientEnrolmentSchema>;
export type PatientUpdateInput = z.infer<typeof patientUpdateSchema>;

export function deriveEffectiveDashboard(
  primaryDiagnosis: (typeof diagnosisValues)[number],
  postIcuSubDiagnosis?: (typeof postIcuSubDiagnosisValues)[number] | null,
) {
  if (primaryDiagnosis !== "post_icu") {
    return primaryDiagnosis;
  }

  if (!postIcuSubDiagnosis) {
    throw new Error(
      "post_icu patients require post_icu_sub_diagnosis to derive effective_dashboard.",
    );
  }

  return postIcuSubDiagnosis === "post_infection"
    ? "bronchiectasis"
    : postIcuSubDiagnosis;
}

export function formatZodErrors(error: z.ZodError) {
  return error.flatten().fieldErrors;
}
