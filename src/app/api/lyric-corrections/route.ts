import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ANON_COOKIE_NAME, checkCorrectionRateLimit } from "@/lib/rate-limit";
import {
  CorrectionValidationError,
  submitLyricCorrection,
} from "@/services/lyric-corrections";
import { submitLyricCorrectionSchema } from "@/validations/lyric-corrections";

export const dynamic = "force-dynamic";

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

  const parsed = submitLyricCorrectionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid correction request.",
      },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const existingAnon = parseCookie(cookieHeader, ANON_COOKIE_NAME);
  const anonId = existingAnon && isUuid(existingAnon) ? existingAnon : randomUUID();

  const rate = checkCorrectionRateLimit({
    anonId,
    songId: parsed.data.songId,
  });
  if (!rate.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Too many correction requests. Please try again later.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec) },
      },
    );
  }

  try {
    const result = await submitLyricCorrection(parsed.data);
    const response = NextResponse.json(
      { ok: true, data: { id: result.id } },
      { status: 201 },
    );

    if (!existingAnon) {
      response.cookies.set(ANON_COOKIE_NAME, anonId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (error) {
    if (error instanceof CorrectionValidationError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 },
      );
    }
    console.error("lyric correction submit failed", error);
    return NextResponse.json(
      { ok: false, error: "Unable to submit correction. Please try again." },
      { status: 500 },
    );
  }
}

function parseCookie(header: string, name: string): string | null {
  const parts = header.split(";");
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
