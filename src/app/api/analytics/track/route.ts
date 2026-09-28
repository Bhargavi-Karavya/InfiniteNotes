import { NextResponse } from "next/server";
import {
  AnalyticsValidationError,
  trackEvent,
} from "@/services/analytics";
import { trackEventSchema } from "@/validations/analytics";

export const dynamic = "force-dynamic";

/**
 * Public anonymous event intake.
 * Failures return 4xx but never affect page rendering (client fire-and-forget).
 */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = trackEventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid analytics payload." },
      { status: 400 },
    );
  }

  try {
    await trackEvent(parsed.data);
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    if (error instanceof AnalyticsValidationError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 },
      );
    }
    console.error("analytics track failed", error);
    return NextResponse.json(
      { ok: false, error: "Unable to record event." },
      { status: 500 },
    );
  }
}
