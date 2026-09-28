import { redirect } from "next/navigation";
import type { LoginInput } from "@/validations/auth";
import type { SessionUser } from "@/types";
import { AUTH_ERROR_MESSAGE } from "@/lib/auth/constants";
import { verifyPassword } from "@/lib/auth/password";
import {
  clearSessionCookie,
  createSessionToken,
  readSessionFromCookies,
  setSessionCookie,
  verifySessionToken,
} from "@/lib/auth/session";
import { findUserByEmail, findUserById, toPublicUser } from "@/repositories/users";

export class AuthError extends Error {
  constructor(message = AUTH_ERROR_MESSAGE) {
    super(message);
    this.name = "AuthError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

function toSessionUser(user: {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
}): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

/**
 * Verify email/password and return a session-safe user.
 * Always throws AuthError with a generic message on failure.
 */
export async function authenticateUser(
  input: LoginInput,
): Promise<SessionUser> {
  const user = await findUserByEmail(input.email);

  // Always run a password check to reduce obvious timing leaks when the
  // email is missing. Dummy hash is a valid bcrypt string for "invalid".
  const passwordHash =
    user?.passwordHash ??
    "$2b$12$vKRB0Mtryi8OXuMGuc13leFBZz0as1jmpnOj94Ou/wAABCw0H1jdu";

  let passwordValid = false;
  try {
    passwordValid = await verifyPassword(input.password, passwordHash);
  } catch {
    passwordValid = false;
  }

  if (!user || !passwordValid) {
    throw new AuthError();
  }

  return toSessionUser(user);
}

/** Create a signed httpOnly session cookie for the authenticated user. */
export async function createUserSession(user: SessionUser): Promise<void> {
  const token = await createSessionToken(user);
  await setSessionCookie(token);
}

/** Read and verify the current session from cookies. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  return readSessionFromCookies();
}

/**
 * Load the current user and ensure the account still exists with the same role.
 * Role is always taken from the database when possible — never trusted from the client.
 */
export async function getCurrentUserVerified(): Promise<SessionUser | null> {
  const session = await getCurrentUser();
  if (!session) {
    return null;
  }

  const user = await findUserById(session.id);
  if (!user) {
    await clearSessionCookie();
    return null;
  }

  return toSessionUser(user);
}

/** Require an authenticated ADMIN. Redirects to login otherwise. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUserVerified();

  if (!user || user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  return user;
}

/**
 * Require ADMIN for mutations/APIs without redirecting.
 * Throws UnauthorizedError when the caller is not an authenticated admin.
 */
export async function assertAdmin(): Promise<SessionUser> {
  const user = await getCurrentUserVerified();

  if (!user || user.role !== "ADMIN") {
    throw new UnauthorizedError();
  }

  return user;
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
}

/** Verify a raw session token (used by the edge/proxy layer). */
export async function getSessionFromToken(
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export { toPublicUser };
