import { prisma } from "../src/infra/prisma/client";

async function main() {
  const projects = await prisma.project.findMany({ select: { id: true, userId: true } });
  let transferred = 0;
  let unassigned = 0;

  for (const project of projects) {
    const members = await prisma.projectMember.findMany({ where: { projectId: project.id }, select: { userId: true } });
    const memberIds = new Set(members.map((m) => m.userId));
    const memberList = [...memberIds];

    const result = await prisma.task.updateMany({
      where: {
        projectId: project.id,
        userId: { not: project.userId },
        NOT: { userId: { in: memberList } },
      },
      data: { userId: project.userId },
    });
    if (result.count > 0) {
      transferred += result.count;
      console.log(`Proyecto ${project.id}: ${result.count} tareas transferidas al owner`);
    }

    const unassign = await prisma.task.updateMany({
      where: {
        projectId: project.id,
        assigneeId: { not: null },
        NOT: { assigneeId: { in: [...memberList, project.userId] } },
      },
      data: { assigneeId: null },
    });
    unassigned += unassign.count;
  }

  console.log(`Total: ${transferred} tareas transferidas, ${unassigned} asignaciones limpiadas.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
