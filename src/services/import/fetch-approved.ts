/**
 * Restricted outbound fetch for approved import providers.
 * Enforces host allowlists, timeouts, size limits, and blocks open redirects.
 */

import {
  IMPORT_FETCH_TIMEOUT_MS,
  IMPORT_MAX_RESPONSE_BYTES,
} from "./types";

export class ImportFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportFetchError";
  }
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }

  // Block obvious private IPv4 literals.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const parts = host.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0) return true;
  }

  return false;
}

export function assertAllowedImportUrl(
  rawUrl: string,
  allowedHosts: string[],
  options?: { allowLocalhost?: boolean },
): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new ImportFetchError("Enter a valid source URL.");
  }

  const allowLocal = options?.allowLocalhost === true;
  const protocolOk =
    parsed.protocol === "https:" ||
    (allowLocal &&
      parsed.protocol === "http:" &&
      isPrivateOrLocalHostname(parsed.hostname));

  if (!protocolOk) {
    throw new ImportFetchError("Only HTTPS URLs are allowed for imports.");
  }

  const host = parsed.hostname.toLowerCase();
  const allowed = allowedHosts.map((h) => h.toLowerCase());
  if (!allowed.includes(host)) {
    throw new ImportFetchError(
      "This URL is not on the approved host list for the selected provider.",
    );
  }

  if (isPrivateOrLocalHostname(host) && !allowLocal) {
    throw new ImportFetchError(
      "Local and private network URLs are not allowed.",
    );
  }

  return parsed;
}

export async function fetchApprovedJson(input: {
  url: string;
  allowedHosts: string[];
  allowLocalhost?: boolean;
  timeoutMs?: number;
  maxBytes?: number;
  headers?: Record<string, string>;
  /** Injectable for tests */
  fetchImpl?: typeof fetch;
}): Promise<unknown> {
  const timeoutMs = input.timeoutMs ?? IMPORT_FETCH_TIMEOUT_MS;
  const maxBytes = input.maxBytes ?? IMPORT_MAX_RESPONSE_BYTES;
  const url = assertAllowedImportUrl(input.url, input.allowedHosts, {
    allowLocalhost: input.allowLocalhost,
  });

  const fetchFn = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(url.toString(), {
      method: "GET",
      redirect: "error",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...input.headers,
      },
    });

    if (!response.ok) {
      throw new ImportFetchError(
        `Source returned HTTP ${response.status}. Try again later.`,
      );
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > maxBytes) {
      throw new ImportFetchError("Source response is too large to import.");
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) {
      throw new ImportFetchError("Source response is too large to import.");
    }

    const text = new TextDecoder().decode(buffer);
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new ImportFetchError("Source did not return valid JSON.");
    }
  } catch (error) {
    if (error instanceof ImportFetchError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new ImportFetchError("The source request timed out.");
    }
    throw new ImportFetchError(
      "Could not reach the approved source. Check the URL and try again.",
    );
  } finally {
    clearTimeout(timer);
  }
}
