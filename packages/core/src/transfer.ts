export function validatePatientId(id: string): boolean {
  return /^\d{10}$/.test(id);
}
