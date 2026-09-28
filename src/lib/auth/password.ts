import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, BCRYPT_COST);
}

export async function verifyPassword(
  plainText: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plainText, passwordHash);
}
