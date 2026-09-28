import { NextResponse } from "next/server";
import type { ApiError, ApiResult } from "@/types";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  const body: ApiResult<T> = { ok: true, data };
  return NextResponse.json(body, init);
}

export function jsonError(
  error: string,
  status = 400,
  details?: unknown,
) {
  const body: ApiError = { ok: false, error, details };
  return NextResponse.json(body, { status });
}
