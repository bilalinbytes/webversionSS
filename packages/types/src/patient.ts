/**
 * Patient-facing DTO types — lightweight data transfer shapes used in
 * features like patient transfer and patient list views. These are separate
 * from the full DB row types in domain.ts because they represent API
 * response shapes, not raw DB rows.
 */

/** Simplified patient DTO used in transfer and cross-doctor lookup flows. */
export interface PatientData {
  id: string;
  fullName: string;
  age: number;
  sex: "Male" | "Female" | "Other";
  mobileNumber: string;
  emailId: string;
  diagnosis: {
    primaryCategory: string;
    subtype?: string;
  };
  condition: string;
  lastDoctor?: string;
}
