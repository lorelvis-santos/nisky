import { prisma } from "../src/infra/prisma/client";
import { hostOf, universityNameFor } from "../src/modules/integrations/university-catalog";

type AccountWithUser = { id: string; userId: string; domain: string; username: string; projectId: string | null };

async function personalProjectFor(userId: string) {
  const existing = await prisma.project.findFirst({ where: { userId, isDefault: true } });
  if (existing) return existing;
  return prisma.project.create({
    data: { userId, name: "Personal", isDefault: true },
  });
}

async function universityProjectFor(account: AccountWithUser) {
  const displayName = universityNameFor(account.domain) ?? hostOf(account.domain);
  if (account.projectId) {
    const linked = await prisma.project.findFirst({ where: { id: account.projectId, userId: account.userId } });
    if (linked) {
      const legacyName = linked.name === hostOf(account.domain);
      const renamed = legacyName && linked.name !== displayName;
      if (renamed) {
        const clash = await prisma.project.findFirst({ where: { userId: account.userId, name: displayName } });
        if (clash) {
          await prisma.task.updateMany({ where: { userId: account.userId, projectId: linked.id }, data: { projectId: clash.id } });
          await prisma.timeBlock.updateMany({ where: { userId: account.userId, projectId: linked.id }, data: { projectId: null } });
          await prisma.project.delete({ where: { id: linked.id } });
          return clash;
        }
        await prisma.project.update({ where: { id: linked.id }, data: { name: displayName } });
        console.log(`Renombrado proyecto "${linked.name}" -> "${displayName}" (${account.userId})`);
      }
      return linked;
    }
  }
  const existing = await prisma.project.findFirst({ where: { userId: account.userId, name: displayName, isDefault: false } });
  if (existing) return existing;
  return prisma.project.create({
    data: { userId: account.userId, name: displayName },
  });
}

async function main() {
  const users = await prisma.user.findMany({ select: { id: true } });
  let projects = 0;
  let tasksAssigned = 0;

  for (const user of users) {
    const personal = await personalProjectFor(user.id);
    projects += 1;

    const [moodleAccounts, canvasAccounts] = await Promise.all([
      prisma.moodleAccount.findMany({ where: { userId: user.id } }),
      prisma.canvasAccount.findMany({ where: { userId: user.id } }),
    ]);

    for (const account of moodleAccounts) {
      const prefix = `moodle:${account.id}:`;
      const project = await universityProjectFor(account);
      projects += 1;
      const result = await prisma.$transaction([
        prisma.moodleAccount.update({ where: { id: account.id }, data: { projectId: project.id } }),
        prisma.task.updateMany({
          where: { userId: user.id, source: "MOODLE", sourceRef: { startsWith: prefix } },
          data: { projectId: project.id },
        }),
      ]);
      tasksAssigned += result[1].count;
    }

    for (const account of canvasAccounts) {
      const prefix = `canvas:${account.id}:`;
      const project = await universityProjectFor(account);
      projects += 1;
      const result = await prisma.$transaction([
        prisma.canvasAccount.update({ where: { id: account.id }, data: { projectId: project.id } }),
        prisma.task.updateMany({
          where: { userId: user.id, source: "CANVAS", sourceRef: { startsWith: prefix } },
          data: { projectId: project.id },
        }),
      ]);
      tasksAssigned += result[1].count;
    }

    const remaining = await prisma.task.updateMany({
      where: { userId: user.id, projectId: null },
      data: { projectId: personal.id },
    });
    tasksAssigned += remaining.count;
  }

  console.log(`Migrados ${users.length} usuarios, ${projects} proyectos, ${tasksAssigned} tareas asignadas.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
