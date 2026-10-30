import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  verifyAdminPasscode,
  createAdminSessionToken,
  ADMIN_COOKIE_NAME,
} from "@/lib/auth";
import { verifyCsrfOrigin } from "@/lib/csrf";

const loginSchema = z.object({
  passcode: z.string().min(1, "Passcode is required"),
});

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = verifyCsrfOrigin(req);
    if (!csrfCheck.valid) {
      return NextResponse.json({ error: csrfCheck.reason || "CSRF check failed" }, { status: 403 });
    }

    const json = await req.json();
    const parsed = loginSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Passcode is required" }, { status: 400 });
    }

    const { passcode } = parsed.data;

    if (!verifyAdminPasscode(passcode)) {
      return NextResponse.json({ error: "Incorrect coordinator passcode" }, { status: 401 });
    }

    const token = await createAdminSessionToken();

    const response = NextResponse.json({ success: true, message: "Logged in successfully" });
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error: any) {
    console.error("[Login error]", error?.message || "Internal error");
    return NextResponse.json({ error: "Authentication failed. Please check your passcode." }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: "Logged out" });
  response.cookies.delete(ADMIN_COOKIE_NAME);
  return response;
}

