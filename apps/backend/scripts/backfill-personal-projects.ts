import { prisma } from "../src/infra/prisma/client";

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  let created = 0;

  for (const user of users) {
    const existing = await prisma.project.findFirst({ where: { userId: user.id, isDefault: true } });
    if (existing) continue;
    await prisma.project.create({
      data: { userId: user.id, name: "Personal", isDefault: true },
    });
    created += 1;
    console.log(`Proyecto "Personal" creado para ${user.email}`);
  }

  console.log(`Backfill completo: ${created} proyecto(s) creado(s) para ${users.length} usuario(s).`);
}

main()
  .catch((error) => {
    console.error("Backfill de proyectos personales falló", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
