import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking Workflow Executions...');

  const executions = await prisma.workflowExecution.findMany({
    orderBy: { completedAt: 'desc' },
    take: 5,
    include: { workflow: true },
  });

  if (executions.length === 0) {
    console.log('❌ No execution logs found!');
  } else {
    console.log(`Found ${executions.length} executions:`);
    executions.forEach((exec) => {
      console.log(`\n---------------------------------`);
      console.log(`ID: ${exec.id}`);
      console.log(`Workflow: ${exec.workflow.name} (${exec.workflowId})`);
      console.log(`Status: ${exec.status}`);
      console.log(`Time: ${exec.completedAt}`);
      console.log(`Logs:`);
      console.dir(exec.logs, { depth: null, colors: true });
    });
  }

  // Also check if the table exists and triggers are active
  const workflowCount = await prisma.workflow.count({ where: { isActive: true } });
  console.log(`\nActive Workflows: ${workflowCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
