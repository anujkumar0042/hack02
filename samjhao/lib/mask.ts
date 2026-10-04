/**
 * Data Masking & Redaction Utility for Samjhao.
 * Protects citizen privacy by scrubbing sensitive Indian national identifiers
 * (Aadhaar numbers and PAN cards) from all server responses before sending to the client.
 */

// Aadhaar: 12 digits, optionally separated by spaces or dashes
// Example: 1234 5678 9012 or 123456789012 -> XXXX XXXX 9012
const AADHAAR_REGEX = /\b\d{4}[\s-]?\d{4}[\s-](\d{4})\b|\b\d{8}(\d{4})\b/g;

// PAN Card: 5 letters, 4 digits, 1 letter
// Example: ABCDE1234F -> XXXXX1234F
const PAN_REGEX = /\b[A-Za-z]{5}(\d{4}[A-Za-z])\b/g;

/**
 * Masks Aadhaar and PAN patterns within a single string.
 */
export function maskSensitiveText(input: string): string {
  if (!input || typeof input !== "string") {
    return input;
  }

  // Mask Aadhaar: preserve only the last 4 digits (e.g. XXXX XXXX 1234)
  let masked = input.replace(AADHAAR_REGEX, (_match, group1, group2) => {
    const lastFour = group1 || group2;
    return `XXXX XXXX ${lastFour}`;
  });

  // Mask PAN: preserve the 4 digits and final letter (e.g. XXXXX1234F)
  masked = masked.replace(PAN_REGEX, (_match, suffix) => {
    return `XXXXX${suffix.toUpperCase()}`;
  });

  return masked;
}

/**
 * Recursively traverses any JavaScript object or array and applies
 * sensitive data masking to every string field.
 */
export function maskSensitiveData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    return maskSensitiveText(data) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item)) as unknown as T;
  }

  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = maskSensitiveData(value);
    }
    return result as T;
  }

  return data;
}
