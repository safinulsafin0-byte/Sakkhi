import { describe, it, expect } from "vitest";
import { env } from "@/lib/env";

describe("Environment Validation", () => {
  it("loads default environment correctly", () => {
    expect(env).toBeDefined();
    expect(env.DATABASE_URL).toBeDefined();
    expect(env.AI_PROVIDER).toBeDefined();
  });

  it("handles demo and mock mode appropriately", () => {
    expect(env.DEMO_MODE).toBe(true);
    expect(env.AI_PROVIDER).toBe("mock");
  });
});

