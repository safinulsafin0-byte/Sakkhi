import { z } from "zod";

const rawEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    NEXT_PUBLIC_APP_URL: z
      .string()
      .url()
      .default(process.env.APP_URL || "http://localhost:3000"),
    APP_URL: z.string().url().optional(),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required").default("file:./dev.db"),
    DEMO_MODE: z
      .string()
      .optional()
      .transform((val) => val === "true" || val === "1")
      .default("true"),
    AI_PROVIDER: z.enum(["mock", "gemini", "openai", "anthropic"]).default("mock"),
    AI_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    PAYPAL_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
    PAYPAL_CLIENT_ID: z.string().optional(),
    PAYPAL_CLIENT_SECRET: z.string().optional(),
    PAYPAL_WEBHOOK_ID: z.string().optional(),
    NEXT_PUBLIC_PAYPAL_CLIENT_ID: z.string().optional(),
    ADMIN_PASSCODE: z.string().default("sakkhi2026"),
    AUTH_SECRET: z.string().default("sakkhi-witness-secret-salt-key-2026"),
    UPLOAD_DIR: z.string().default("./public/uploads"),
  })
  .superRefine((data, ctx) => {
    const isMockOrDemo = data.AI_PROVIDER === "mock" || data.DEMO_MODE === true;

    if (!isMockOrDemo) {
      // Validate AI keys based on selected AI provider
      const hasSpecificAiKey =
        (data.AI_PROVIDER === "gemini" && (!!data.GEMINI_API_KEY || !!data.AI_API_KEY)) ||
        (data.AI_PROVIDER === "openai" && (!!data.OPENAI_API_KEY || !!data.AI_API_KEY)) ||
        (data.AI_PROVIDER === "anthropic" && (!!data.ANTHROPIC_API_KEY || !!data.AI_API_KEY));

      if (!hasSpecificAiKey && !data.AI_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [data.AI_PROVIDER === "gemini" ? "GEMINI_API_KEY" : data.AI_PROVIDER === "openai" ? "OPENAI_API_KEY" : "AI_API_KEY"],
          message: `API key is required for AI_PROVIDER="${data.AI_PROVIDER}" when not running in mock/demo mode.`,
        });
      }

      // Validate PayPal keys
      if (!data.PAYPAL_CLIENT_ID || data.PAYPAL_CLIENT_ID.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["PAYPAL_CLIENT_ID"],
          message: "PAYPAL_CLIENT_ID is required for production payments when not running in mock/demo mode.",
        });
      }

      if (!data.PAYPAL_CLIENT_SECRET || data.PAYPAL_CLIENT_SECRET.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["PAYPAL_CLIENT_SECRET"],
          message: "PAYPAL_CLIENT_SECRET is required for production payments when not running in mock/demo mode.",
        });
      }
    }
  });

function validateEnv() {
  const result = rawEnvSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    const message = `
================================================================================
❌ [SakkhiAI Environment Validation Failed]
The following environment variables are missing or invalid:
${issues}

Tip: To run locally without external credentials, set in your .env:
  AI_PROVIDER=mock
  DEMO_MODE=true
================================================================================
`;
    throw new Error(message);
  }

  return result.data;
}

export const env = validateEnv();
export type Env = z.infer<typeof rawEnvSchema>;

