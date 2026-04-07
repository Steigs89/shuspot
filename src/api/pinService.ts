import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hash a PIN for secure storage
 */
export async function hashPin(pin: string): Promise<string> {
  try {
    if (!/^\d{4}$/.test(pin)) {
      throw new Error('PIN must be exactly 4 digits');
    }

    const hash = await bcrypt.hash(pin, SALT_ROUNDS);
    return hash;
  } catch (error) {
    console.error('Error hashing PIN:', error);
    throw error;
  }
}

/**
 * Verify a PIN against a stored hash
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  try {
    if (!/^\d{4}$/.test(pin)) {
      return false;
    }

    const isValid = await bcrypt.compare(pin, hash);
    return isValid;
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return false;
  }
}

/**
 * Validate PIN format
 */
export function validatePinFormat(pin: string): { valid: boolean; error?: string } {
  if (!pin) {
    return { valid: false, error: 'Please enter a PIN' };
  }

  if (pin.length !== 4) {
    return { valid: false, error: 'PIN must be 4 digits' };
  }

  if (!/^\d{4}$/.test(pin)) {
    return { valid: false, error: 'PIN can only contain numbers' };
  }

  return { valid: true };
}

/**
 * Generate a random PIN (for testing/demo purposes)
 */
export function generateRandomPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Check PIN strength (basic check for common patterns)
 * Updated to allow sequential numbers but block all same digits
 */
export function checkPinStrength(pin: string): {
  strength: 'weak' | 'medium' | 'strong';
  message: string;
} {
  if (!/^\d{4}$/.test(pin)) {
    return { strength: 'weak', message: 'Invalid PIN format' };
  }

  // Check for all same digits (e.g., 1111, 2222, etc.)
  const allSame = /^(\d)\1{3}$/.test(pin);
  if (allSame) {
    return { strength: 'weak', message: 'Cannot use repeating digits (e.g., 1111, 2222)' };
  }

  // Check for repeated pairs
  if (pin[0] === pin[1] && pin[2] === pin[3]) {
    return { strength: 'medium', message: 'PIN strength is moderate' };
  }

  return { strength: 'strong', message: 'PIN strength is good' };
}
