import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { executeMilestonePayout } from "@/lib/paypal/payouts";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";
import { verifyCsrfOrigin } from "@/lib/csrf";

interface RouteParams {
  params: {
    milestoneId: string;
  };
}

const paramsSchema = z.object({
  milestoneId: z.string().min(1, "milestoneId path parameter is required"),
});

const payoutBodySchema = z.object({
  coordinatorOverrideReason: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    // 1. CSRF Protection
    const csrfCheck = verifyCsrfOrigin(req);
    if (!csrfCheck.valid) {
      return NextResponse.json({ error: csrfCheck.reason || "CSRF check failed" }, { status: 403 });
    }

    // 2. Validate Path Params
    const parsedParams = paramsSchema.safeParse(params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsedParams.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { milestoneId } = parsedParams.data;

    // 3. Optional Body Validation
    let coordinatorOverrideReason: string | undefined;
    try {
      const body = await req.json().catch(() => ({}));
      const parsedBody = payoutBodySchema.safeParse(body);
      if (parsedBody.success) {
        coordinatorOverrideReason = parsedBody.data.coordinatorOverrideReason;
      }
    } catch {
      // Body is optional
    }

    // 4. Check if coordinator is making release request
    const cookieStore = cookies();
    const adminToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    const isCoordinator = adminToken ? await verifyAdminSessionToken(adminToken) : false;

    const result = await executeMilestonePayout({
      milestoneId,
      actorId: isCoordinator ? "coordinator" : undefined,
      actorRole: isCoordinator ? "coordinator" : "system",
      coordinatorOverrideReason,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("Payout error:", err?.message || "Internal error");
    return NextResponse.json(
      {
        error: "Milestone payout could not be processed",
        message: err?.message || "Payout processing failed",
      },
      { status: 400 }
    );
  }
}
