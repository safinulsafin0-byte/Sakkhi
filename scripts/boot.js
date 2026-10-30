const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");

async function boot() {
  const isDemo = process.env.DEMO_MODE !== "false" && process.env.DEMO_MODE !== "0";

  if (isDemo) {
    const prisma = new PrismaClient();
    try {
      const count = await prisma.campaign.count();
      if (count === 0) {
        console.log("🌱 [Sakkhi Boot] Empty database detected in DEMO_MODE. Running automatic database seed...");
        execSync("npx prisma db push && npx tsx prisma/seed.ts", { stdio: "inherit" });
        console.log("✅ [Sakkhi Boot] Demo database initialized successfully.");
      } else {
        console.log(`ℹ️ [Sakkhi Boot] Database contains ${count} campaign(s). Ready.`);
      }
    } catch (err) {
      console.warn("⚠️ [Sakkhi Boot] Database check encountered notice:", err.message);
      try {
        console.log("🌱 [Sakkhi Boot] Synchronizing schema and seeding...");
        execSync("npx prisma db push && npx tsx prisma/seed.ts", { stdio: "inherit" });
      } catch (innerErr) {
        console.error("❌ [Sakkhi Boot] Initialization error:", innerErr.message);
      }
    } finally {
      await prisma.$disconnect();
    }
  }
}

boot();

