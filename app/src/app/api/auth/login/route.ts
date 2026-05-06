import { apiError, ok } from "@/lib/api";
import { createSession, verifyCredentials } from "@/lib/auth";
import { loginSchema, zodErrorDetails } from "@/lib/validation";

export async function POST(req: Request) {
  let payload: unknown;

  try {
    payload = await req.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON payload.", 400);
  }

  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid login payload.",
      400,
      zodErrorDetails(parsed.error)
    );
  }

  const user = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!user) {
    return apiError("UNAUTHORIZED", "Invalid email or password.", 401);
  }

  await createSession(user.id);
  return ok({ user });
}
