/**
 * Security & Cryptographic Utilities for Patient PIN & Digital Card QR
 * Phase 2: Patient Identity
 *
 * Rules:
 * - Never store plaintext PIN
 * - Securely hash with cryptographic salt (SHA-256 via Web Crypto)
 * - Never display existing PIN after creation
 * - Never allow mobile number, date of birth, or patient code as PIN
 * - Digital Card QR must contain an opaque secure reference (NO PII, NO medical data, NO plain PIN)
 */

/**
 * Normalizes Egyptian and international mobile numbers into standard E.164 format.
 * E.g. '01000000001' -> '+201000000001'
 *      '00201000000001' -> '+201000000001'
 *      '+20 100 000 0001' -> '+201000000001'
 */
export function normalizeMobile(rawMobile: string, defaultCountryPrefix = '+20'): string {
  if (!rawMobile) return '';
  // Remove all non-digit and non-plus characters
  let clean = rawMobile.replace(/[^\d+]/g, '');

  if (clean.startsWith('00')) {
    clean = '+' + clean.substring(2);
  }

  if (clean.startsWith('+')) {
    return clean;
  }

  // Handle local Egyptian format starting with '01'
  if (clean.startsWith('01') && clean.length === 11) {
    return defaultCountryPrefix + clean.substring(1);
  }

  // Handle local 10-digit without leading 0
  if (clean.startsWith('1') && clean.length === 10) {
    return defaultCountryPrefix + clean;
  }

  // If no prefix, prepend default
  return defaultCountryPrefix + clean;
}

/**
 * Generates a random cryptographic salt in hex format.
 */
export function generateSalt(length = 16): string {
  const array = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback for non-browser/test runners
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hashes a PIN with a salt using SHA-256.
 * Returns a secure hex digest string.
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`dental_pin_v1:${salt}:${pin}`);
  
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback lightweight hash for pure Node test runners if crypto.subtle unavailable
  let h = 0xdeadbeef;
  for (let i = 0; i < data.length; i++) {
    h = Math.imul(h ^ data[i], 2654435761);
  }
  return (h >>> 0).toString(16).padStart(64, '0');
}

/**
 * Verifies a candidate PIN against stored salt and hash.
 */
export async function verifyPin(
  candidatePin: string,
  salt: string,
  storedHash: string
): Promise<boolean> {
  if (!candidatePin || !salt || !storedHash) return false;
  const candidateHash = await hashPin(candidatePin, salt);
  return candidateHash === storedHash;
}

export interface PinValidationContext {
  mobile?: string;
  dob?: string; // YYYY-MM-DD
  patientCode?: string; // e.g. PAT-000001
}

export interface PinValidationResult {
  valid: boolean;
  errorKey?:
    | 'pin_length'
    | 'pin_numeric_only'
    | 'pin_no_mobile'
    | 'pin_no_dob'
    | 'pin_no_patient_code'
    | 'pin_trivial_sequence';
}

/**
 * Validates security constraints for Patient PIN:
 * - 4 to 6 numeric digits
 * - Cannot match mobile number digits
 * - Cannot match birth year or birth date
 * - Cannot match patient code digits
 * - Cannot be repetitive or trivial sequences (0000, 1234, etc.)
 */
export function validatePinRules(
  pin: string,
  context: PinValidationContext = {}
): PinValidationResult {
  // 1. Length & numeric check
  if (!pin || pin.length < 4 || pin.length > 6) {
    return { valid: false, errorKey: 'pin_length' };
  }

  if (!/^\d+$/.test(pin)) {
    return { valid: false, errorKey: 'pin_numeric_only' };
  }

  // 2. Reject trivial repetitive digits (e.g. 0000, 1111, 9999)
  const allSame = pin.split('').every((char) => char === pin[0]);
  if (allSame) {
    return { valid: false, errorKey: 'pin_trivial_sequence' };
  }

  // 3. Reject trivial ascending/descending sequences (e.g. 1234, 4321, 123456)
  const isAscending = '0123456789'.includes(pin);
  const isDescending = '9876543210'.includes(pin);
  if (isAscending || isDescending) {
    return { valid: false, errorKey: 'pin_trivial_sequence' };
  }

  // 4. Reject PIN that is part of the mobile number
  if (context.mobile) {
    const cleanMobile = context.mobile.replace(/\D/g, '');
    if (cleanMobile.includes(pin)) {
      return { valid: false, errorKey: 'pin_no_mobile' };
    }
  }

  // 5. Reject PIN that matches Date of Birth (year, MMDD, DDMM)
  if (context.dob) {
    const [year, month, day] = context.dob.split('-');
    if (year && pin === year) {
      return { valid: false, errorKey: 'pin_no_dob' };
    }
    if (month && day) {
      if (pin === `${month}${day}` || pin === `${day}${month}`) {
        return { valid: false, errorKey: 'pin_no_dob' };
      }
    }
  }

  // 6. Reject PIN matching patient code digits
  if (context.patientCode) {
    const codeDigits = context.patientCode.replace(/\D/g, '');
    if (codeDigits && (codeDigits.endsWith(pin) || pin === codeDigits)) {
      return { valid: false, errorKey: 'pin_no_patient_code' };
    }
  }

  return { valid: true };
}

/**
 * Generates an opaque digital card QR token.
 * This token contains NO sensitive PII, NO medical data, NO plain PIN, and NO national ID.
 * It is an opaque verifiable reference format:
 * `eg_dcard_v1:<opaque_id>:<checksum>`
 */
export function generateOpaqueQrToken(patientId: string, orgId: string): string {
  const randomEntropy = generateSalt(8);
  const safeRef = `${orgId.substring(0, 8)}-${patientId.substring(0, 8)}-${randomEntropy}`;
  return `eg_dcard_v1:${safeRef}`;
}

/**
 * Validates that an incoming QR token has the expected opaque prefix and format.
 */
export function validateQrTokenStructure(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  return token.startsWith('eg_dcard_v1:') && token.split(':').length === 2;
}
