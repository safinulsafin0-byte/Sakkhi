import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbConnected = false;
  let dbError: string | null = null;

  try {
    // Run simple lightweight query to verify SQLite connection
    await prisma.$queryRawUnsafe("SELECT 1");
    dbConnected = true;
  } catch (error) {
    dbConnected = false;
    dbError = error instanceof Error ? error.message : "Database connection failed";
  }

  const hasAiConfigured =
    env.AI_PROVIDER === "mock" ||
    Boolean(env.AI_API_KEY || env.GEMINI_API_KEY || env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY);

  const hasPaypalConfigured = Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);

  const isHealthy = dbConnected;

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: env.NODE_ENV,
      database: {
        status: dbConnected ? "connected" : "disconnected",
        connected: dbConnected,
        ...(dbError && env.NODE_ENV === "development" ? { error: dbError } : {}),
      },
      integrations: {
        ai: hasAiConfigured,
        paypal: hasPaypalConfigured,
        demoMode: env.DEMO_MODE,
      },
    },
    { status: isHealthy ? 200 : 503 }
  );
}

