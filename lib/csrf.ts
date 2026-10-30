import { NextRequest } from "next/server";
import { env } from "./env";

/**
 * Validates Origin and Referer headers against expected application hosts
 * to protect state-changing routes (POST, PUT, DELETE) against CSRF attacks.
 */
export function verifyCsrfOrigin(req: NextRequest): { valid: boolean; reason?: string } {
  // Safe HTTP methods do not change state
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return { valid: true };
  }

  // Exempt webhooks which authenticate via cryptographic signatures rather than browser sessions
  if (req.nextUrl.pathname.startsWith("/api/webhooks/")) {
    return { valid: true };
  }

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");

  // In standard browser API calls, at least Origin or Referer is supplied
  const sourceUrl = origin || referer;
  if (!sourceUrl) {
    // If neither is present in production, flag potential untrusted cross-origin invocation
    if (process.env.NODE_ENV === "production") {
      return { valid: false, reason: "Missing Origin and Referer headers on state-changing request" };
    }
    // Allow in test/dev environments
    return { valid: true };
  }

  try {
    const parsedSource = new URL(sourceUrl);
    const appUrl = new URL(env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

    // Match either the incoming Host header or configured NEXT_PUBLIC_APP_URL host
    const isHostMatch = host && (parsedSource.host === host || parsedSource.host === host.split(":")[0]);
    const isAppMatch = parsedSource.host === appUrl.host;
    const isLocalhost =
      parsedSource.hostname === "localhost" ||
      parsedSource.hostname === "127.0.0.1" ||
      parsedSource.hostname === "[::1]";

    if (isHostMatch || isAppMatch || (process.env.NODE_ENV !== "production" && isLocalhost)) {
      return { valid: true };
    }

    return {
      valid: false,
      reason: `Untrusted cross-origin request from "${parsedSource.origin}"`,
    };
  } catch {
    return { valid: false, reason: "Malformed Origin or Referer header" };
  }
}

