export function normalizeIndianPhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");

  let nationalNumber: string;

  if (trimmed.startsWith("+")) {
    if (!digits.startsWith("91")) {
      throw new Error("Phone number must use the +91 country code.");
    }
    nationalNumber = digits.slice(2);
  } else if (digits.length === 12 && digits.startsWith("91")) {
    nationalNumber = digits.slice(2);
  } else {
    nationalNumber = digits;
  }

  if (!/^[6-9]\d{9}$/.test(nationalNumber)) {
    throw new Error("Please enter a valid Indian mobile number.");
  }

  return `+91${nationalNumber}`;
}
