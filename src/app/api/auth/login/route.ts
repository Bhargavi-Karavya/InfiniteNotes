import { jsonError, jsonOk } from "@/lib/api";
import { loginSchema } from "@/validations/auth";
import {
  AuthError,
  authenticateUser,
  createUserSession,
} from "@/services/auth";
import { AUTH_ERROR_MESSAGE } from "@/lib/auth/constants";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  try {
    const user = await authenticateUser(parsed.data);

    if (user.role !== "ADMIN") {
      // Same generic message — do not reveal account details or role.
      return jsonError(AUTH_ERROR_MESSAGE, 401);
    }

    await createUserSession(user);

    return jsonOk({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (
      error instanceof AuthError ||
      (error instanceof Error && error.name === "AuthError")
    ) {
      return jsonError(AUTH_ERROR_MESSAGE, 401);
    }

    return jsonError("Unable to sign in", 500);
  }
}
