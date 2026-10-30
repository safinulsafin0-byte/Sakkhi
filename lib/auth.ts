import * as jose from "jose";
import { env } from "@/lib/env";

const getSecretKey = () => {
  const secret = process.env.AUTH_SECRET || env.AUTH_SECRET || "sakkhi-witness-secret-salt-key-2026";
  return new TextEncoder().encode(secret);
};

export interface VolunteerTokenPayload {
  volunteerId: string;
  volunteerEmail: string;
  volunteerName: string;
  role: "VOLUNTEER";
}

/**
 * Creates a signed JWT invite token for a volunteer, valid for 7 days by default.
 */
export async function createVolunteerToken(
  payload: { volunteerId: string; volunteerEmail: string; volunteerName: string },
  expiresIn = "7d"
): Promise<string> {
  const key = getSecretKey();
  return await new jose.SignJWT({
    volunteerId: payload.volunteerId,
    volunteerEmail: payload.volunteerEmail,
    volunteerName: payload.volunteerName,
    role: "VOLUNTEER",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

/**
 * Verifies and decodes a volunteer invite token. Returns null if invalid or expired.
 */
export async function verifyVolunteerToken(
  token: string
): Promise<VolunteerTokenPayload | null> {
  try {
    const key = getSecretKey();
    const { payload } = await jose.jwtVerify(token, key);

    if (
      typeof payload.volunteerId === "string" &&
      typeof payload.volunteerEmail === "string" &&
      typeof payload.volunteerName === "string"
    ) {
      return {
        volunteerId: payload.volunteerId,
        volunteerEmail: payload.volunteerEmail,
        volunteerName: payload.volunteerName,
        role: "VOLUNTEER",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const ADMIN_COOKIE_NAME = "sakkhi_admin_session";

/**
 * Verifies an admin passcode against configured environment variable.
 */
export function verifyAdminPasscode(passcode: string): boolean {
  const expected = process.env.ADMIN_PASSCODE || env.ADMIN_PASSCODE || "sakkhi2026";
  return passcode.trim() === expected.trim();
}

/**
 * Generates an admin session token stored in an httpOnly cookie.
 */
export async function createAdminSessionToken(): Promise<string> {
  const key = getSecretKey();
  return await new jose.SignJWT({ role: "ADMIN" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(key);
}

/**
 * Verifies whether an admin session token is valid.
 */
export async function verifyAdminSessionToken(token: string): Promise<boolean> {
  try {
    const key = getSecretKey();
    const { payload } = await jose.jwtVerify(token, key);
    return payload.role === "ADMIN";
  } catch {
    return false;
  }
}

