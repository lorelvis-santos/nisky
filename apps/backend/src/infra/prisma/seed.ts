import bcrypt from "bcrypt";
import { prisma } from "./client";

async function main() {
  const isProduction = process.env.NODE_ENV === "production";
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim() || (!isProduction ? "admin@nisky.local" : "");
  const password = process.env.INITIAL_ADMIN_PASSWORD || (!isProduction ? "admin123456" : "");

  if (!email || !password) {
    throw new Error("INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are required in production");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN" },
    create: { email, passwordHash, name: "Admin Nisky", role: "ADMIN" },
  });

  await prisma.setting.upsert({
    where: { key: "publicSignup" },
    update: {},
    create: { key: "publicSignup", value: "true", description: "Permite que cualquier persona cree una cuenta" },
  });

  console.log(`Nisky seed complete: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error("Nisky seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
