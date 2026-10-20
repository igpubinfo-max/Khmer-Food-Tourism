/**
 * Cryptographic utility for secure password hashing using SHA-256 with salt.
 * Ensures passwords are never stored or handled in plain text.
 */

const SALT = 'KhmerFoodTourism_2026_SecureSalt_!@#';

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function verifyPassword(password: string, expectedHash: string): Promise<boolean> {
  const hash = await hashPassword(password);
  return hash === expectedHash;
}
